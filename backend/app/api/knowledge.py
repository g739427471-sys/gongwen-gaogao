"""
知识库 API 路由 + 近期简讯。
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from ..utils.auth import get_current_user_id

from ..schemas import (
    KnowledgeSearchResponse, KnowledgeChunkResponse, KnowledgeCategoriesResponse,
)
from ..services.knowledge_service import (
    search_knowledge, get_categories_stats, add_to_knowledge, extract_citations,
)

router = APIRouter(prefix="/api/knowledge", tags=["知识库"])


@router.get("/search", response_model=KnowledgeSearchResponse)
async def api_search_knowledge(
    q: str = Query(..., description="搜索关键词"),
    category: str = Query(default=None),
    source: str = Query(default=None),
    top_k: int = Query(default=5, ge=1, le=20),
):
    """混合检索知识库：语义+关键词融合排序"""
    try:
        results = search_knowledge(query=q, category=category, top_k=top_k, source=source)
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


# ========== RAG增强 ==========

from pydantic import BaseModel

class AddKnowledgeRequest(BaseModel):
    title: str
    content: str
    category: str = "article"
    source: str = ""
    source_url: str = ""

@router.post("/add")
async def api_add_to_knowledge(req: AddKnowledgeRequest, user_id: str = Depends(get_current_user_id)):
    """用户上传文档到知识库 — 自动向量化"""
    ok = add_to_knowledge(
        title=req.title, content=req.content, category=req.category,
        source=req.source, source_url=req.source_url,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="添加失败")
    return {"status": "ok", "title": req.title}


class CitationRequest(BaseModel):
    content: str
    knowledge_ids: list = []

@router.post("/citations")
async def api_get_citations(req: CitationRequest):
    """获取生成内容中引用的知识库来源"""
    # 用内容检索
    results = search_knowledge(query=req.content[:200], top_k=5)
    citations = extract_citations(req.content, results)
    return {"citations": citations, "count": len(citations)}
