"""
知识库 API 路由 + 近期简讯。
"""
from fastapi import APIRouter, HTTPException, Query

from ..schemas import (
    KnowledgeSearchResponse, KnowledgeChunkResponse, KnowledgeCategoriesResponse,
)
from ..services.knowledge_service import search_knowledge, get_categories_stats

router = APIRouter(prefix="/api/knowledge", tags=["知识库"])


@router.get("/search", response_model=KnowledgeSearchResponse)
async def api_search_knowledge(
    q: str = Query(..., description="搜索关键词"),
    category: str = Query(default=None),
    top_k: int = Query(default=5, ge=1, le=20),
):
    """搜索知识库，返回完整材料内容"""
    try:
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


# ========== 近期简讯 ==========

NEWS_FEED = [
    {
        "id": "1",
        "title": "习近平在中共中央政治局第十五次集体学习时强调 进一步健全全面从严治党体系",
        "source": "人民日报",
        "url": "https://paper.people.com.cn/rmrb/html/2024/06/29/nw.D110000renmrb_20240629_1-01.htm",
        "date": "2024-06-29",
        "snippet": "中共中央政治局6月28日就健全全面从严治党体系进行第十五次集体学习。习近平强调，要健全上下贯通、执行有力的组织体系。",
    },
    {
        "id": "2",
        "title": "以进一步全面深化改革开辟中国式现代化广阔前景——写在党的二十届三中全会召开之际",
        "source": "求是网",
        "url": "https://www.qstheory.cn/",
        "date": "2024-07-14",
        "snippet": "改革开放是党和人民大踏步赶上时代的重要法宝，是决定当代中国命运的关键一招。",
    },
    {
        "id": "3",
        "title": "《求是》杂志发表习近平总书记重要文章《必须坚持自信自立》",
        "source": "共产党员网",
        "url": "https://www.12371.cn/",
        "date": "2024-07-15",
        "snippet": "文章强调，党的百年奋斗成功道路是党领导人民独立自主探索开辟出来的。",
    },
    {
        "id": "4",
        "title": "学习强国平台推出「新质生产力」专题学习栏目",
        "source": "学习强国",
        "url": "https://www.xuexi.cn/",
        "date": "2024-07-10",
        "snippet": "加快发展新质生产力，扎实推进高质量发展。新质生产力是创新起主导作用的先进生产力质态。",
    },
    {
        "id": "5",
        "title": "人民日报评论员：在进一步全面深化改革中推进中国式现代化",
        "source": "人民日报",
        "url": "https://paper.people.com.cn/rmrb/",
        "date": "2024-07-08",
        "snippet": "改革开放只有进行时，没有完成时。要紧紧围绕推进中国式现代化进一步全面深化改革。",
    },
    {
        "id": "6",
        "title": "中央党的建设工作领导小组召开会议 研究部署党纪学习教育总结工作",
        "source": "共产党员网",
        "url": "https://www.12371.cn/",
        "date": "2024-07-12",
        "snippet": "要把党纪学习教育成果持续转化为推动高质量发展的强大动力。",
    },
]


@router.get("/news")
async def api_get_news():
    """获取近期简讯"""
    return {"news": NEWS_FEED}
