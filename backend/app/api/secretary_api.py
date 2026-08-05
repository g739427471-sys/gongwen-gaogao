"""智能文秘 API"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from ..utils.auth import get_current_user_id
from ..services.secretary_service import (
    get_secretary_status, get_smart_recommendations,
    get_human_message, check_attention_needed, generate_style_report,
)

router = APIRouter(prefix="/api/secretary", tags=["智能文秘"])


@router.get("/status")
async def api_status(user_id: str = Depends(get_current_user_id)):
    """文秘状态摘要 — 服务天数/已学习/风格匹配度"""
    return get_secretary_status(user_id)


@router.get("/recommendations")
async def api_recommendations(user_id: str = Depends(get_current_user_id)):
    """智能任务推荐"""
    return get_smart_recommendations(user_id)


@router.get("/message/{phase}")
async def api_human_message(phase: str):
    """获取拟人化进度消息"""
    return {"message": get_human_message(phase)}


class AttentionRequest(BaseModel):
    content: str = ""
    edit_count: int = 0

@router.post("/attention-check")
async def api_attention(req: AttentionRequest, user_id: str = Depends(get_current_user_id)):
    """主动提醒检查"""
    return check_attention_needed(user_id, req.content, req.edit_count)


@router.get("/style-report")
async def api_style_report(user_id: str = Depends(get_current_user_id)):
    """个人写作风格全景报告"""
    return generate_style_report(user_id)
