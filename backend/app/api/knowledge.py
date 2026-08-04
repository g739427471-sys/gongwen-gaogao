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
    # ===== 2026年8月 =====
    {"id":"35","title":"习近平对防汛救灾工作作出重要指示","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-08-02","snippet":"要求全力做好防汛救灾工作，切实保障人民群众生命财产安全和社会大局稳定。"},
    {"id":"34","title":"《求是》杂志发表习近平总书记重要文章《中国式现代化是中国共产党领导的社会主义现代化》","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-08-01","snippet":"文章强调，党的领导直接关系中国式现代化的根本方向、前途命运、最终成败。"},
    {"id":"33","title":"中央政治局召开会议 分析研究当前经济形势和经济工作","source":"共产党员网","url":"https://www.12371.cn/","date":"2026-07-30","snippet":"会议强调要坚持稳中求进工作总基调，完整准确全面贯彻新发展理念。"},
    {"id":"32","title":"学习强国「高质量发展调研行」专题上线","source":"学习强国","url":"https://www.xuexi.cn/","date":"2026-07-28","snippet":"深入基层一线，展现各地推动高质量发展的生动实践和积极成效。"},
    {"id":"31","title":"人民日报：以钉钉子精神抓好改革落实","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-07-25","snippet":"改革重在落实，也难在落实。必须发扬钉钉子精神，一锤一锤敲下去。"},
    {"id":"30","title":"习近平在全国生态环境保护大会上强调 全面推进美丽中国建设","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-07-23","snippet":"强调要牢固树立和践行绿水青山就是金山银山的理念，推动城乡人居环境明显改善。"},
    {"id":"29","title":"中办印发《关于在全党大兴调查研究的工作方案》","source":"共产党员网","url":"https://www.12371.cn/","date":"2026-07-20","snippet":"要求领导干部带头深入调查研究，干实事、谋实招、求实效。"},
    {"id":"28","title":"学习强国推出「新质生产力」系列微课堂","source":"学习强国","url":"https://www.xuexi.cn/","date":"2026-07-18","snippet":"系统讲解新质生产力的科学内涵、核心要义和实践要求。"},
    {"id":"27","title":"人民日报评论员：以进一步全面深化改革为动力","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-07-15","snippet":"要把全面深化改革作为推进中国式现代化的根本动力。"},
    {"id":"26","title":"习近平主持中央全面深化改革委员会会议","source":"共产党员网","url":"https://www.12371.cn/","date":"2026-07-12","snippet":"审议通过多项改革文件，强调要聚焦重点领域和关键环节深化改革。"},
    # ===== 2026年7月 =====
    {"id":"25","title":"习近平在中共中央政治局第十五次集体学习时强调 健全全面从严治党体系","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-07-10","snippet":"强调要健全上下贯通、执行有力的组织体系，推动全面从严治党向纵深发展。"},
    {"id":"24","title":"庆祝中国共产党成立105周年大会在京举行","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-07-01","snippet":"习近平发表重要讲话，回顾党的光辉历程，展望中华民族伟大复兴光明前景。"},
    {"id":"23","title":"人民日报：把高质量发展作为新时代的硬道理","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-06-28","snippet":"必须把坚持高质量发展作为新时代的硬道理，完整准确全面贯彻新发展理念。"},
    {"id":"22","title":"中央纪委国家监委部署群众身边不正之风和腐败问题集中整治","source":"共产党员网","url":"https://www.12371.cn/","date":"2026-06-25","snippet":"要求聚焦群众急难愁盼问题，坚决惩治「蝇贪蚁腐」。"},
    {"id":"21","title":"学习强国「党纪学习教育」专栏持续更新","source":"学习强国","url":"https://www.xuexi.cn/","date":"2026-06-22","snippet":"开设学纪、知纪、明纪、守纪四个板块，推动党纪学习教育走深走实。"},
    {"id":"20","title":"习近平主持召开中央全面深化改革委员会第六次会议","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-06-20","snippet":"强调要围绕构建高水平社会主义市场经济体制深化重点领域改革。"},
    {"id":"19","title":"《人民日报》刊发任仲平文章：以中国式现代化全面推进强国建设","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-06-18","snippet":"系统阐释中国式现代化的中国特色、本质要求和重大原则。"},
    {"id":"18","title":"中央组织部部署开展「七一」走访慰问活动","source":"共产党员网","url":"https://www.12371.cn/","date":"2026-06-15","snippet":"要求深入基层走访慰问老党员、困难党员和因公牺牲党员干部家属。"},
    {"id":"17","title":"中共中央印发《干部教育培训工作条例》","source":"学习强国","url":"https://www.xuexi.cn/","date":"2026-06-12","snippet":"新修订的条例对干部教育培训工作的指导思想、原则、内容等作出全面规范。"},
    {"id":"16","title":"习近平在内蒙古考察时强调 把握战略定位坚持绿色发展","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-06-10","snippet":"强调要坚持以生态优先、绿色发展为导向，筑牢我国北方重要生态安全屏障。"},
    # ===== 2026年6月 =====
    {"id":"15","title":"《求是》杂志发表习近平总书记重要文章《发展新质生产力是推动高质量发展的内在要求》","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-06-01","snippet":"文章指出，新质生产力已经在实践中形成并展示出对高质量发展的强劲推动力。"},
    {"id":"14","title":"国务院印发《2026—2030年数字中国建设规划》","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-05-28","snippet":"提出到2030年数字中国建设取得决定性进展，数字经济核心产业增加值占GDP比重进一步提升。"},
    {"id":"13","title":"中央政治局就加强新质生产力进行第十四次集体学习","source":"共产党员网","url":"https://www.12371.cn/","date":"2026-05-25","snippet":"习近平强调，新质生产力是推动高质量发展的核心动力和关键支撑。"},
    {"id":"12","title":"学习强国「新时代新征程新伟业」专题持续热推","source":"学习强国","url":"https://www.xuexi.cn/","date":"2026-05-22","snippet":"集中展示各地区各部门贯彻落实党的二十大精神的生动实践。"},
    {"id":"11","title":"中宣部授予「时代楷模」称号","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-05-20","snippet":"表彰先进典型，弘扬榜样精神，激励广大党员干部奋勇争先。"},
    {"id":"10","title":"习近平在山东考察时强调 加快建设绿色低碳高质量发展先行区","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-05-18","snippet":"强调要发挥山东半岛城市群龙头作用，推动黄河流域生态保护和高质量发展。"},
    {"id":"9","title":"全国组织部长会议在京召开","source":"共产党员网","url":"https://www.12371.cn/","date":"2026-05-15","snippet":"强调要建设堪当民族复兴重任的高素质干部队伍，激励干部担当作为。"},
    {"id":"8","title":"人民日报：扎实推进乡村全面振兴","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-05-12","snippet":"要锚定建设农业强国目标，学习运用「千万工程」经验，扎实推进乡村全面振兴。"},
    {"id":"7","title":"中办国办印发《关于进一步加强青年科技人才培养和使用的若干措施》","source":"学习强国","url":"https://www.xuexi.cn/","date":"2026-05-10","snippet":"要求把青年科技人才培养放在更加突出的位置，给予更多信任和更好支持。"},
    {"id":"6","title":"习近平在河北雄安新区考察","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-05-08","snippet":"强调要坚定信心、久久为功，推动雄安新区建设不断取得新进展。"},
    # ===== 2026年5月 =====
    {"id":"5","title":"《求是》杂志发表习近平总书记重要文章《加强文化遗产保护传承》","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-05-01","snippet":"文章强调，要系统梳理传统文化资源，让收藏在博物馆里的文物活起来。"},
    {"id":"4","title":"中央政治局召开会议研究部署防汛抗旱工作","source":"共产党员网","url":"https://www.12371.cn/","date":"2026-04-28","snippet":"要求立足防大汛、抗大旱、抢大险、救大灾，做好各项应急准备。"},
    {"id":"3","title":"学习强国推出「党纪学习教育」答题活动","source":"学习强国","url":"https://www.xuexi.cn/","date":"2026-04-25","snippet":"以答题促学习，帮助广大党员干部掌握《中国共产党纪律处分条例》。"},
    {"id":"2","title":"人民日报：以人民为中心推动文化建设","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-04-22","snippet":"要坚持以人民为中心的创作导向，推出更多增强人民精神力量的优秀作品。"},
    {"id":"1","title":"习近平主持召开新时代推动中部地区崛起座谈会","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-04-20","snippet":"强调要一以贯之抓好党中央推动中部地区崛起一系列政策举措的贯彻落实。"},
]


@router.get("/news")
async def api_get_news(page: int = 1, page_size: int = 10):
    """获取近期简讯（支持分页）"""
    total = len(NEWS_FEED)
    start = (page - 1) * page_size
    end = start + page_size
    items = NEWS_FEED[start:end]
    return {
        "news": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }
