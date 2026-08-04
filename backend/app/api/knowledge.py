"""
知识库 API 路由 + 近期简讯。
"""
from fastapi import APIRouter, HTTPException, Query

from ..schemas import (
    KnowledgeSearchResponse, KnowledgeChunkResponse, KnowledgeCategoriesResponse,
)
from ..services.knowledge_service import (
    search_knowledge, get_categories_stats, _has_deepseek, _deepseek_search,
)

router = APIRouter(prefix="/api/knowledge", tags=["知识库"])


@router.get("/search", response_model=KnowledgeSearchResponse)
async def api_search_knowledge(
    q: str = Query(..., description="搜索关键词"),
    category: str = Query(default=None),
    top_k: int = Query(default=5, ge=1, le=20),
):
    """搜索知识库（DeepSeek AI 优先，无配置则本地搜索）"""
    try:
        # 优先使用 DeepSeek AI 搜索
        if _has_deepseek():
            results = await _deepseek_search(query=q, top_k=top_k)
        else:
            results = search_knowledge(query=q, category=category, top_k=top_k)
        items = [
            KnowledgeChunkResponse(
                id=r["id"],
                category=r["category"],
                title=r["title"],
                content=r["content"],  # 返回完整内容
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


# ========== 近期简讯（每日自动更新） ==========

import asyncio
from ..services.news_service import (
    get_news_from_db, refresh_news, should_refresh, _init_default_news,
)

# 启动时初始化
_init_default_news()


@router.get("/news")
async def api_get_news(page: int = 1, page_size: int = 10):
    """获取近期简讯（支持分页，超12小时自动触发后台更新）"""
    # 检查是否需要后台更新
    if should_refresh():
        asyncio.create_task(refresh_news())

    return get_news_from_db(page, page_size)


@router.post("/news/refresh")
async def api_refresh_news():
    """手动强制刷新简讯"""
    result = await refresh_news()
    return result
