"""
写作业务逻辑服务。
编排框架生成、内容生成、润色、文种识别的完整流程。
"""
import json
import re
from typing import AsyncGenerator, Optional

from .llm_service import stream_generate, generate_full
from .prompts import (
    FRAMEWORK_SYSTEM_PROMPT, CONTENT_SYSTEM_PROMPT, NATURAL_SYSTEM_PROMPT,
    REFINE_SYSTEM_PROMPT,
    build_framework_user_message, build_content_user_message, build_refine_user_message,
)
from .knowledge_service import search_knowledge
from ..models import Document
from ..database import SessionLocal


async def generate_framework(
    topic: str,
    doc_type: str,
    keywords: list = None,
) -> dict:
    """生成公文框架（使用流式调用，避免超时）"""
    knowledge_results = search_knowledge(query=topic, top_k=3)
    knowledge_context = _format_knowledge_context(knowledge_results)

    user_message = build_framework_user_message(
        topic=topic,
        doc_type=doc_type,
        keywords=keywords,
        knowledge_context=knowledge_context,
    )

    response_text = await generate_full(
        system_prompt=FRAMEWORK_SYSTEM_PROMPT,
        user_message=user_message,
    )

    result = _parse_json_response(response_text)
    return {
        "title_suggestion": result.get("title_suggestion", f"关于{topic}的{doc_type}"),
        "framework": result.get("framework", []),
        "references": _extract_references(knowledge_results),
    }


async def detect_doc_type(topic: str) -> dict:
    """根据主题自动识别文种"""
    prompt = f"""请根据以下写作主题，判断最合适的公文文种。

主题：{topic}

可选文种包括：通知、报告、请示、批复、意见、决定、决议、通报、通告、公告、公报、函、纪要、议案、命令、工作总结、实施方案、工作计划、汇报材料、讲话稿、调研报告、述职报告、对照检查材料、心得体会

请以 JSON 格式返回：
```json
{{"doc_type": "文种名称", "reason": "判断理由（一句话）"}}
```"""
    text = await generate_full(system_prompt="你是公文写作专家，请准确判断文种。", user_message=prompt)
    result = _parse_json_response(text)
    return {
        "doc_type": result.get("doc_type", "通用"),
        "reason": result.get("reason", ""),
    }


async def generate_content_stream(
    topic: str,
    doc_type: str,
    keywords: list = None,
    framework: list = None,
    custom_instructions: str = None,
    reference_material: str = "",
) -> AsyncGenerator[dict, None]:
    """流式生成公文内容。"""
    knowledge_results = search_knowledge(query=topic, top_k=5)
    knowledge_context = _format_knowledge_context(knowledge_results)

    if reference_material:
        knowledge_context = f"## 用户上传的参考材料\n{reference_material}\n\n## 知识库参考\n{knowledge_context}"

    user_message = build_content_user_message(
        topic=topic,
        doc_type=doc_type,
        keywords=keywords,
        framework=framework,
        knowledge_context=knowledge_context,
        custom_instructions=custom_instructions,
    )
    # 注入用户风格画像（Writer's Loop "Learn" 阶段的应用端）
    user_message = inject_style_prompt(user_id, user_message)

    # 根据AI风格档位注入去AI味指令
    flavor = ""
    if custom_instructions and "AI风格" in custom_instructions:
        if "自然" in custom_instructions or "natural" in custom_instructions:
            flavor = "natural"
        elif "官方" in custom_instructions or "official" in custom_instructions:
            flavor = "official"
        else:
            flavor = "standard"

    from ..services.deai_service import deai_transform

    yield {"type": "status", "data": "正在生成..."}

    # 选择风格对应的系统提示词
    flavor = "standard"
    if custom_instructions and "natural" in custom_instructions.lower():
        flavor = "natural"
    system_prompt = NATURAL_SYSTEM_PROMPT if flavor == "natural" else CONTENT_SYSTEM_PROMPT

    full_text = ""
    try:
        async for chunk in stream_generate(
            system_prompt=system_prompt,
            user_message=user_message,
        ):
            full_text += chunk
            yield {"type": "content_delta", "data": chunk}
    except Exception as e:
        yield {"type": "error", "data": str(e)}
        return

    result = _parse_json_response(full_text)

    yield {
        "type": "complete",
        "data": {
            "title": result.get("title", f"关于{topic}的{doc_type}"),
            "framework": result.get("framework", framework or []),
            "content": result.get("content", ""),
            "references": result.get("references", []) + _extract_references(knowledge_results),
        },
    }


async def refine_document(
    content: str,
    doc_type: str = "通知",
    instructions: str = "",
) -> dict:
    """润色文稿（流式调用）"""
    user_message = build_refine_user_message(
        content=content,
        doc_type=doc_type,
        instructions=instructions,
    )

    response_text = await generate_full(
        system_prompt=REFINE_SYSTEM_PROMPT,
        user_message=user_message,
    )

    result = _parse_json_response(response_text)
    return {
        "refined_content": result.get("refined_content", content),
        "changes_summary": result.get("changes_summary", []),
        "issues_found": result.get("issues_found", []),
        "suggestions": result.get("suggestions", []),
    }


def save_document(
    user_id: str,
    title: str,
    doc_type: str,
    keywords: list,
    framework: list,
    content: str,
) -> str:
    """保存文稿到数据库，同时触发样式学习"""
    db = SessionLocal()
    try:
        doc = Document(
            user_id=user_id,
            title=title,
            doc_type=doc_type,
            content=content,
            status="completed",
        )
        doc.set_keywords(keywords)
        doc.set_framework(framework)
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # 样式学习：记录用户确认的文稿
        try:
            from .style_service import diff_and_learn
            # 当前只记录最终确认的文稿特征作为基线
            # 后续用户编辑时，通过 /api/style/learn 做差分学习
            from .style_service import WritingStyle
            from ..database import SessionLocal as SL
            sdb = SL()
            style = sdb.query(WritingStyle).filter(WritingStyle.user_id == user_id).first()
            if style is None:
                _record_baseline(user_id, content)
            sdb.close()
        except Exception:
            pass

        return doc.id
    finally:
        db.close()


def _record_baseline(user_id: str, content: str):
    """记录用户首次确认的文稿作为风格基线"""
    from .style_service import WritingStyle
    from ..database import SessionLocal as SL
    sdb = SL()
    try:
        style = sdb.query(WritingStyle).filter(WritingStyle.user_id == user_id).first()
        if not style:
            style = WritingStyle(user_id=user_id, sample_count=1)
            style.length_prefs = json.dumps({"after": len(content)}, ensure_ascii=False)
            sdb.add(style)
            sdb.commit()
    finally:
        sdb.close()


def inject_style_prompt(user_id: str, base_prompt: str) -> str:
    """注入用户风格偏好的提示词"""
    try:
        from .style_service import build_style_prompt
        style_instructions = build_style_prompt(user_id)
        if style_instructions:
            return base_prompt + "\n" + style_instructions
    except Exception:
        pass
    return base_prompt


def _format_knowledge_context(results: list) -> str:
    """将知识库搜索结果格式化为上下文字符串"""
    if not results:
        return ""
    parts = []
    for i, r in enumerate(results[:5]):
        parts.append(f"[{i+1}] 来源：{r.get('source', r.get('title', '未知'))}\n{r.get('content', '')}")
    return "\n\n".join(parts)


def _extract_references(results: list) -> list:
    """从搜索结果提取参考文献列表"""
    refs = []
    for r in results:
        source = r.get("source", "") or r.get("title", "")
        if source and source not in refs:
            refs.append(source)
    return refs


def _parse_json_response(text: str) -> dict:
    """从 Claude 响应中解析 JSON"""
    json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    brace_match = re.search(r'\{.*\}', text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    return {"content": text, "framework": [], "title": "", "references": []}
