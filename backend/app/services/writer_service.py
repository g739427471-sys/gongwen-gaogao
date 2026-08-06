"""
写作业务逻辑服务 — 速度优化版。
"""
import json
import re
from typing import AsyncGenerator, Optional

from .llm_service import stream_generate, generate_full
from .prompts import (
    FRAMEWORK_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT, SYSTEM_PROMPT,
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
    """生成公文框架（速度优先：只检索3条知识，限制max_tokens）"""
    # 知识库只取3条，每条款式截断
    knowledge_results = search_knowledge(query=topic, top_k=3)
    knowledge_context = _format_knowledge_context(knowledge_results, max_items=3, max_chars=500)

    user_message = build_framework_user_message(
        topic=topic, doc_type=doc_type, keywords=keywords,
        knowledge_context=knowledge_context,
    )

    # 框架用更少的 max_tokens（不需要长输出）
    response_text = await generate_full(
        system_prompt=FRAMEWORK_SYSTEM_PROMPT,
        user_message=user_message,
        max_tokens=2000,    # 大纲不需要32000 token
        temperature=0.4,
    )

    result = _parse_json_response(response_text)
    return {
        "title_suggestion": result.get("title_suggestion", f"关于{topic}的{doc_type}"),
        "framework": result.get("framework", []),
        "references": _extract_references(knowledge_results),
    }


async def detect_doc_type(topic: str) -> dict:
    """根据主题自动识别文种（轻量）"""
    prompt = f"""根据主题判断最合适的公文文种。

主题：{topic}
可选：通知、报告、请示、批复、意见、决定、决议、通报、通告、公告、公报、函、纪要、议案、命令、工作总结、实施方案、工作计划、汇报材料、讲话稿、调研报告、述职报告、对照检查材料、心得体会

输出JSON：
{{"doc_type":"文种","reason":"理由（一句话）"}}"""
    text = await generate_full(
        system_prompt="你是公文写作专家，请准确判断文种。",
        user_message=prompt,
        max_tokens=200,   # 只需要一小段JSON
        temperature=0.1,
    )
    result = _parse_json_response(text)
    return {"doc_type": result.get("doc_type", "通用"), "reason": result.get("reason", "")}


async def generate_content_stream(
    topic: str,
    doc_type: str,
    keywords: list = None,
    framework: list = None,
    custom_instructions: str = None,
    reference_material: str = "",
) -> AsyncGenerator[dict, None]:
    """流式生成公文内容（速度优化版）"""
    # 知识库只取3条
    knowledge_results = search_knowledge(query=topic, top_k=3)
    knowledge_context = _format_knowledge_context(knowledge_results, max_items=3, max_chars=600)

    if reference_material:
        # 参考资料截断到1000字
        ref = reference_material[:1000]
        knowledge_context = f"用户资料：\n{ref}\n\n{knowledge_context}"

    user_message = build_content_user_message(
        topic=topic, doc_type=doc_type, keywords=keywords,
        framework=framework, knowledge_context=knowledge_context,
        custom_instructions=custom_instructions,
    )

    # 风格画像注入（仅在有效时）
    try:
        user_message = _inject_style_fast(user_message, custom_instructions)
    except Exception:
        pass

    # 根据风格选择 system prompt
    flavor = "standard"
    if custom_instructions and "natural" in custom_instructions.lower():
        flavor = "natural"
    system_prompt = SYSTEM_PROMPT  # 默认
    if flavor == "natural":
        from .prompts import NATURAL_STYLE_APPENDIX
        system_prompt = SYSTEM_PROMPT + NATURAL_STYLE_APPENDIX

    # 立即发送进度事件
    yield {"type": "status", "data": "正在分析主题..."}
    yield {"type": "progress", "data": {"step": 1, "total": len(framework) if framework else 1, "msg": "开始撰写"}}

    full_text = ""
    try:
        async for chunk in stream_generate(
            system_prompt=system_prompt,
            user_message=user_message,
            max_tokens=8000,  # 降低 max_tokens（原来是32000）
            temperature=0.5,
        ):
            full_text += chunk
            yield {"type": "content_delta", "data": chunk}
    except Exception as e:
        yield {"type": "error", "data": str(e)}
        return

    # 提取标题（第一行 # 或第一行非空文本）
    title = f"关于{topic}的{doc_type}"
    content = full_text.strip()

    # 如果内容以 # 开头，提取为标题
    first_line = content.split('\n')[0].strip()
    if first_line.startswith('#'):
        title = first_line.lstrip('#').strip()
        content = content[len(first_line) + 1:].strip()

    yield {
        "type": "complete",
        "data": {
            "title": title,
            "framework": framework or [],
            "content": content,
            "references": _extract_references(knowledge_results),
        },
    }


async def refine_document(
    content: str, doc_type: str = "通知", instructions: str = "",
) -> dict:
    """润色文稿（速度优先）"""
    user_message = build_refine_user_message(
        content=content, doc_type=doc_type, instructions=instructions,
    )
    response_text = await generate_full(
        system_prompt=REFINE_SYSTEM_PROMPT,
        user_message=user_message,
        max_tokens=4000,
        temperature=0.3,
    )
    result = _parse_json_response(response_text)
    return {
        "refined_content": result.get("refined_content", content),
        "changes_summary": result.get("changes_summary", []),
        "issues_found": result.get("issues_found", []),
        "suggestions": result.get("suggestions", []),
    }


def save_document(
    user_id: str, title: str, doc_type: str, keywords: list,
    framework: list, content: str,
) -> str:
    db = SessionLocal()
    try:
        doc = Document(
            user_id=user_id, title=title, doc_type=doc_type,
            content=content, status="completed",
        )
        doc.set_keywords(keywords)
        doc.set_framework(framework)
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc.id
    finally:
        db.close()


# ====================================================================
# 内部工具函数
# ====================================================================

def _format_knowledge_context(results: list, max_items: int = 3, max_chars: int = 600) -> str:
    """格式化和压缩知识库上下文"""
    if not results:
        return ""
    parts = []
    total = 0
    for i, r in enumerate(results[:max_items]):
        content = r.get('content', '')[:200]  # 每条最多200字
        source = r.get('source', r.get('title', '未知'))
        part = f"[{i+1}] {source}：{content}"
        total += len(part)
        if total > max_chars:
            break
        parts.append(part)
    return "\n".join(parts)


def _extract_references(results: list) -> list:
    refs = []
    for r in results:
        source = r.get("source", "") or r.get("title", "")
        if source and source not in refs:
            refs.append(source)
    return refs


def _inject_style_fast(user_message: str, custom_instructions: str = None) -> str:
    """轻量风格注入（仅提取核心偏好，避免大查询）"""
    try:
        from .style_service import WritingStyle
        db = SessionLocal()
        try:
            style = db.query(WritingStyle).first()
            if style and style.sample_count > 0:
                # 只注入一句话偏好
                prefs = _extract_core_prefs(style)
                if prefs:
                    return f"【写作偏好提醒：{prefs}】\n\n{user_message}"
        finally:
            db.close()
    except Exception:
        pass
    return user_message


def _extract_core_prefs(style) -> str:
    """提取5个核心偏好特征"""
    prefs = []
    try:
        import json
        top_words = json.loads(style.top_words or "{}")
        if top_words:
            words = sorted(top_words.items(), key=lambda x: x[1], reverse=True)[:3]
            prefs.append(f"常用词：{', '.join(w[0] for w in words)}")
        length = json.loads(style.length_prefs or "{}")
        if length:
            prefs.append(f"偏{length.get('preference', '标准')}篇幅")
    except Exception:
        pass
    return "; ".join(prefs) if prefs else ""


def _parse_json_response(text: str) -> dict:
    """从响应中解析JSON（多策略）"""
    # 策略1: ```json ... ```
    m = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if m:
        try: return json.loads(m.group(1))
        except json.JSONDecodeError: pass
    # 策略2: 纯JSON
    try: return json.loads(text)
    except json.JSONDecodeError: pass
    # 策略3: 花括号匹配
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        try: return json.loads(m.group(0))
        except json.JSONDecodeError: pass
    # 兜底
    return {"content": text, "framework": [], "title": "", "references": []}
