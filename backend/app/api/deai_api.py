"""去AI味API — AI味指数评分 + 风格改写"""
from fastapi import APIRouter
from pydantic import BaseModel
from ..services.deai_service import calculate_ai_score, deai_transform

router = APIRouter(prefix="/api/deai", tags=["去AI味"])

class ScoreRequest(BaseModel):
    content: str

class TransformRequest(BaseModel):
    content: str
    flavor: str = "standard"

@router.post("/score")
async def api_score(req: ScoreRequest):
    """计算AI味指数"""
    return calculate_ai_score(req.content)

@router.post("/transform")
async def api_transform(req: TransformRequest):
    """去AI味改写"""
    result = deai_transform(req.content, req.flavor)
    score_before = calculate_ai_score(req.content)
    score_after = calculate_ai_score(result)
    return {
        "transformed_content": result,
        "score_before": score_before["score"],
        "score_after": score_after["score"],
        "improvement": score_before["score"] - score_after["score"],
        "level_before": score_before["level"],
        "level_after": score_after["level"],
    }
