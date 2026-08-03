"""
写作业务逻辑服务。
编排框架生成、内容生成、润色的完整流程。
"""
import json
import re
from typing import AsyncGenerator, Optional

from .llm_service import stream_generate, generate_sync
from .prompts import (
    FRAMEWORK_SYSTEM_PROMPT, CONTENT_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT,
    build_framework_user_message, build_content_user_message, build_refine_user_message,
)
from .knowledge_service import search_knowledge
from ..models import Document
from ..database import SessionLocal


def generate_framework(
    topic: str,
    doc_type: str,
    keywords: list = None,
) -> dict:
    """生成公文框架"""
    # 检索相关知识
    knowledge_results = search_knowledge(query=topic, top_k=3)
    knowledge_context = _format_knowledge_context(knowledge_results)

    # 构建消息
    user_message = build_framework_user_message(
        topic=topic,
        doc_type=doc_type,
        keywords=keywords,
        knowledge_context=knowledge_context,
    )

    # 调用 Claude
    response_text = generate_sync(
        system_prompt=FRAMEWORK_SYSTEM_PROMPT,
        user_message=user_message,
    )

    # 解析 JSON
    result = _parse_json_response(response_text)
    return {
        "title_suggestion": result.get("title_suggestion", f"关于{topic}的{doc_type}"),
        "framework": result.get("framework", []),
        "references": _extract_references(knowledge_results),
    }


async def generate_content_stream(
    topic: str,
    doc_type: str,
    keywords: list = None,
    framework: list = None,
    custom_instructions: str = None,
) -> AsyncGenerator[dict, None]:
    """
    流式生成公文内容。
    返回事件字典：{"type": "outline/framework/content_delta/complete/error", "data": ...}
    """
    # 检索相关知识
    knowledge_results = search_knowledge(query=topic, top_k=5)
    knowledge_context = _format_knowledge_context(knowledge_results)

    # 构建消息
    user_message = build_content_user_message(
        topic=topic,
        doc_type=doc_type,
        keywords=keywords,
        framework=framework,
        knowledge_context=knowledge_context,
        custom_instructions=custom_instructions,
    )

    yield {"type": "status", "data": "正在生成..."}

    # 流式调用
    full_text = ""
    try:
        async for chunk in stream_generate(
            system_prompt=CONTENT_SYSTEM_PROMPT,
            user_message=user_message,
        ):
            full_text += chunk
            yield {"type": "content_delta", "data": chunk}
    except Exception as e:
        yield {"type": "error", "data": str(e)}
        return

    # 解析完整响应
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


def refine_document(
    content: str,
    doc_type: str = "通知",
    instructions: str = "",
) -> dict:
    """润色文稿"""
    user_message = build_refine_user_message(
        content=content,
        doc_type=doc_type,
        instructions=instructions,
    )

    response_text = generate_sync(
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
    """保存文稿到数据库，返回文档ID"""
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
        return doc.id
    finally:
        db.close()


def _format_knowledge_context(results: list) -> str:
    """将知识库搜索结果格式化为上下文字符串"""
    if not results:
        return ""
    parts = []
    for i, r in enumerate(results[:5]):
        parts.append(f"[{i+1}] 来源：{r.get('source', r.get('title', '未知'))}\n{r.get('content', '')[:300]}")
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
    # 尝试提取 ```json ... ``` 块
    json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # 尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 尝试找到 JSON 对象
    brace_match = re.search(r'\{.*\}', text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    # 返回原始文本作为 content
    return {"content": text, "framework": [], "title": "", "references": []}
