"""
写作相关 API 路由 — 需登录。
"""
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from ..schemas import (
    GenerateFrameworkRequest, GenerateContentRequest, RefineRequest,
    FrameworkResponse,
)
from ..services.writer_service import (
    generate_framework,
    generate_content_stream,
    refine_document,
    save_document,
)
from ..utils.auth import get_current_user_id

router = APIRouter(prefix="/api/writing", tags=["写作"])


@router.post("/generate-framework", response_model=FrameworkResponse)
async def api_generate_framework(
    req: GenerateFrameworkRequest,
    user_id: str = Depends(get_current_user_id),
):
    """生成公文框架/提纲"""
    try:
        result = generate_framework(
            topic=req.topic,
            doc_type=req.doc_type,
            keywords=req.keywords,
        )
        return FrameworkResponse(
            title_suggestion=result["title_suggestion"],
            framework=result["framework"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"框架生成失败：{str(e)}")


@router.post("/generate-content")
async def api_generate_content(
    req: GenerateContentRequest,
    user_id: str = Depends(get_current_user_id),
):
    """流式生成公文内容（SSE）"""
    async def event_stream():
        async for event in generate_content_stream(
            topic=req.topic,
            doc_type=req.doc_type,
            keywords=req.keywords,
            framework=req.framework,
            custom_instructions=req.custom_instructions,
        ):
            event_type = event["type"]
            data = event["data"]

            if event_type == "error":
                yield f"event: error\ndata: {json.dumps({'error': str(data)}, ensure_ascii=False)}\n\n"
                return

            if event_type == "complete":
                try:
                    result = data
                    doc_id = save_document(
                        user_id=user_id,
                        title=result.get("title", req.topic),
                        doc_type=req.doc_type,
                        keywords=req.keywords,
                        framework=result.get("framework", req.framework or []),
                        content=result.get("content", ""),
                    )
                    result["document_id"] = doc_id
                except Exception:
                    result = data
                    result["document_id"] = ""

                yield f"event: complete\ndata: {json.dumps(result, ensure_ascii=False)}\n\n"
                return

            yield f"event: {event_type}\ndata: {json.dumps({'text': str(data)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/refine")
async def api_refine(
    req: RefineRequest,
    user_id: str = Depends(get_current_user_id),
):
    """润色已有文稿"""
    try:
        result = refine_document(
            content=req.content,
            doc_type=req.doc_type,
            instructions=req.instructions or "",
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"润色失败：{str(e)}")
