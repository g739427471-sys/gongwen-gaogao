"""样式学习 API"""
from fastapi import APIRouter, Depends
from ..utils.auth import get_current_user_id
from ..services.style_service import get_style, build_style_instructions

router = APIRouter(prefix="/api/style", tags=["样式学习"])

@router.get("/profile")
async def api_get_style_profile(user_id: str = Depends(get_current_user_id)):
    """获取用户写作风格画像"""
    style = get_style(user_id)
    instructions = build_style_instructions(user_id) if style["sample_count"] >= 2 else ""
    return {
        **style,
        "ready": style["sample_count"] >= 2,
        "instructions": instructions,
    }
