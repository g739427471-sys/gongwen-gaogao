"""样式学习 API — Writer's Loop 风格的「Learn」阶段实现"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..utils.auth import get_current_user_id
from ..services.style_service import (
    get_style_profile, build_style_prompt, diff_and_learn,
    reset_style, set_override,
)

router = APIRouter(prefix="/api/style", tags=["样式学习"])

# ========== 画像查看 ==========

@router.get("/profile")
async def api_get_profile(user_id: str = Depends(get_current_user_id)):
    """获取用户完整的风格画像（7维度+学习历史）"""
    profile = get_style_profile(user_id)
    prompt = build_style_prompt(user_id) if profile.get("ready") else ""
    return {
        **profile,
        "generation_prompt": prompt,
        "summary": _build_summary(profile),
    }


def _build_summary(profile: dict) -> str:
    """生成人类可读的画像摘要"""
    if not profile.get("ready"):
        return "📝 样本不足（需≥2次确认）。每次生成后编辑修改文稿，系统会自动学习。"
    parts = [f"📚 已学习 **{profile['sample_count']}** 次"]
    vocab = profile.get("vocab", {})
    if vocab.get("replacements"):
        parts.append(f"📝 记录 **{len(vocab['replacements'])}** 组词汇替换偏好")
    syntax = profile.get("syntax", {})
    if syntax.get("prefer_concise"):
        parts.append("✂️ 倾向简洁表达")
    length = profile.get("length", {})
    if length.get("after"):
        parts.append(f"📏 篇幅偏好约{length['after']}字")
    return " · ".join(parts)


# ========== 学习触发 ==========

class LearnRequest(BaseModel):
    original_content: str
    edited_content: str

@router.post("/learn")
async def api_learn(req: LearnRequest, user_id: str = Depends(get_current_user_id)):
    """
    核心学习API — 当用户编辑修改文稿后调用。
    分析 original → edited 的差异，提取风格特征。
    这是 Writer's Loop "Learn" 阶段的触发点。
    """
    try:
        features = diff_and_learn(req.original_content, req.edited_content, user_id)
        return {
            "status": "learned",
            "summary": features.get("diff_summary", ""),
            "features": features,
            "message": "已学习您本次的编辑偏好",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"学习失败：{str(e)}")


# ========== 用户控制 ==========

@router.delete("/profile")
async def api_reset_style(user_id: str = Depends(get_current_user_id)):
    """重置风格画像"""
    reset_style(user_id)
    return {"status": "reset", "message": "风格画像已清空"}


class OverrideRequest(BaseModel):
    key: str
    value: str

@router.post("/override")
async def api_set_override(req: OverrideRequest, user_id: str = Depends(get_current_user_id)):
    """手动设置偏好覆盖"""
    set_override(user_id, req.key, req.value)
    return {"status": "ok"}


# ========== 生成时调用 ==========

@router.get("/generation-prompt")
async def api_generation_prompt(user_id: str = Depends(get_current_user_id)):
    """获取应注入生成提示词的风格指令"""
    return {"prompt": build_style_prompt(user_id)}
