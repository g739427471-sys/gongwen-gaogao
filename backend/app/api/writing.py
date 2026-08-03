"""
写作相关 API 路由 — 需登录。
"""
import json
import base64
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from ..schemas import (
    GenerateFrameworkRequest, GenerateContentRequest, RefineRequest, FrameworkResponse,
)
from ..services.writer_service import (
    generate_framework, generate_content_stream, refine_document,
    save_document, detect_doc_type,
)
from ..utils.auth import get_current_user_id

router = APIRouter(prefix="/api/writing", tags=["写作"])


@router.post("/generate-framework")
async def api_generate_framework(
    req: GenerateFrameworkRequest,
    user_id: str = Depends(get_current_user_id),
):
    """生成公文框架/提纲（流式，避免超时）"""
    try:
        result = await generate_framework(
            topic=req.topic,
            doc_type=req.doc_type,
            keywords=req.keywords,
        )
        return {
            "title_suggestion": result["title_suggestion"],
            "framework": result["framework"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"框架生成失败：{str(e)}")


@router.post("/detect-doc-type")
async def api_detect_doc_type(
    topic: str = Form(...),
    user_id: str = Depends(get_current_user_id),
):
    """根据主题自动识别文种"""
    try:
        result = await detect_doc_type(topic)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文种识别失败：{str(e)}")


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
            reference_material=req.custom_instructions or "",
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
        result = await refine_document(
            content=req.content,
            doc_type=req.doc_type,
            instructions=req.instructions or "",
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"润色失败：{str(e)}")


@router.post("/upload-reference")
async def api_upload_reference(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """上传参考材料，返回提取的文本内容"""
    try:
        content = await file.read()
        # 尝试提取文本
        text = ""
        filename = file.filename or ""

        if filename.lower().endswith(('.txt', '.md')):
            text = content.decode('utf-8', errors='ignore')
        elif filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp')):
            # 图片：base64 编码传给 Claude 视觉能力
            b64 = base64.b64encode(content).decode()
            ext = filename.split('.')[-1].lower() or 'png'
            text = f"[图片文件: {filename}]\n用户上传了一张参考图片，请根据图片内容提取关键信息。\n"
            text += f"图片数据(base64): data:image/{ext};base64,{b64[:500]}...（截断）"
        elif filename.lower().endswith('.pdf'):
            text = f"[PDF文件: {filename}]\nPDF内容无法直接提取，请手动将关键内容粘贴到写作主题中。"
        elif filename.lower().endswith(('.doc', '.docx')):
            text = f"[Word文档: {filename}]\n文档内容无法直接提取，请手动将关键内容粘贴到写作主题中。"
        else:
            text = content.decode('utf-8', errors='ignore')

        return {
            "filename": filename,
            "text": text[:5000],  # 限制长度
            "length": len(text),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件处理失败：{str(e)}")
