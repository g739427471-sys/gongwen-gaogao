"""
知识库 API 路由。
"""
from fastapi import APIRouter, HTTPException, Query

from ..schemas import (
    KnowledgeSearchResponse,
    KnowledgeChunkResponse, KnowledgeCategoriesResponse,
)
from ..services.knowledge_service import search_knowledge, get_categories_stats

router = APIRouter(prefix="/api/knowledge", tags=["知识库"])


@router.get("/search", response_model=KnowledgeSearchResponse)
async def api_search_knowledge(
    q: str = Query(..., description="搜索关键词"),
    category: str = Query(default=None, description="分类筛选：policy/speech/article/standard"),
    top_k: int = Query(default=5, ge=1, le=20),
):
    """搜索知识库"""
    try:
        results = search_knowledge(query=q, category=category, top_k=top_k)
        items = [
            KnowledgeChunkResponse(
                id=r["id"],
                category=r["category"],
                title=r["title"],
                content=r["content"],
                source=r["source"],
                score=r["score"],
            )
            for r in results
        ]
        return KnowledgeSearchResponse(results=items, total=len(items))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索失败：{str(e)}")


@router.get("/categories", response_model=KnowledgeCategoriesResponse)
async def api_get_categories():
    """获取知识库分类统计"""
    try:
        stats = get_categories_stats()
        return KnowledgeCategoriesResponse(
            categories=stats["categories"],
            total_chunks=stats["total_chunks"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计失败：{str(e)}")
