"""
近期简讯服务 — 每日自动更新 + 手动刷新。
"""
import json
import re
from datetime import datetime, timedelta
from ..database import SessionLocal
from ..models import NewsItem
from .llm_service import generate_full

# 上次更新时间（内存标记，用于避免频繁更新）
_last_update: datetime | None = None
_update_in_progress = False

# 默认静态数据（数据库为空时的初始内容）
DEFAULT_NEWS = [
    {"title":"习近平对防汛救灾工作作出重要指示","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-08-02","snippet":"要求全力做好防汛救灾工作，切实保障人民群众生命财产安全和社会大局稳定。"},
    {"title":"《求是》杂志发表习近平总书记重要文章","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-08-01","snippet":"文章强调，党的领导直接关系中国式现代化的根本方向、前途命运、最终成败。"},
    {"title":"中央政治局召开会议分析研究当前经济形势","source":"共产党员网","url":"https://www.12371.cn/","date":"2026-07-30","snippet":"会议强调要坚持稳中求进工作总基调，完整准确全面贯彻新发展理念。"},
    {"title":"学习强国「高质量发展调研行」专题上线","source":"学习强国","url":"https://www.xuexi.cn/","date":"2026-07-28","snippet":"深入基层一线，展现各地推动高质量发展的生动实践和积极成效。"},
    {"title":"人民日报：以钉钉子精神抓好改革落实","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-07-25","snippet":"改革重在落实，也难在落实。必须发扬钉钉子精神，一锤一锤敲下去。"},
    {"title":"习近平在全国生态环境保护大会上强调全面推进美丽中国建设","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-07-23","snippet":"强调要牢固树立和践行绿水青山就是金山银山的理念。"},
    {"title":"中办印发《关于在全党大兴调查研究的工作方案》","source":"共产党员网","url":"https://www.12371.cn/","date":"2026-07-20","snippet":"要求领导干部带头深入调查研究，干实事、谋实招、求实效。"},
    {"title":"学习强国推出「新质生产力」系列微课堂","source":"学习强国","url":"https://www.xuexi.cn/","date":"2026-07-18","snippet":"系统讲解新质生产力的科学内涵、核心要义和实践要求。"},
    {"title":"人民日报评论员：以进一步全面深化改革为动力","source":"人民日报","url":"https://paper.people.com.cn/rmrb/","date":"2026-07-15","snippet":"要把全面深化改革作为推进中国式现代化的根本动力。"},
    {"title":"庆祝中国共产党成立105周年大会在京举行","source":"求是网","url":"https://www.qstheory.cn/","date":"2026-07-01","snippet":"习近平发表重要讲话，回顾党的光辉历程，展望中华民族伟大复兴光明前景。"},
]


def _news_to_dict(item: NewsItem) -> dict:
    return {
        "id": item.id, "title": item.title, "source": item.source,
        "url": item.url, "date": item.date, "snippet": item.snippet,
    }


def get_news_from_db(page: int = 1, page_size: int = 10) -> dict:
    """从数据库获取简讯（支持分页）"""
    db = SessionLocal()
    try:
        total = db.query(NewsItem).count()
        start = (page - 1) * page_size
        items = db.query(NewsItem).order_by(NewsItem.date.desc()).offset(start).limit(page_size).all()
        return {
            "news": [_news_to_dict(i) for i in items],
            "total": total, "page": page, "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
            "last_update": _last_update.isoformat() if _last_update else None,
        }
    finally:
        db.close()


def _init_default_news():
    """初始化默认简讯（第一次启动时）"""
    db = SessionLocal()
    try:
        if db.query(NewsItem).count() == 0:
            for item in DEFAULT_NEWS:
                db.add(NewsItem(
                    title=item["title"], source=item["source"],
                    url=item["url"], date=item["date"], snippet=item["snippet"],
                ))
            db.commit()
    finally:
        db.close()


def should_refresh() -> bool:
    """检查是否需要刷新（超过12小时）"""
    global _last_update
    if _last_update is None:
        return True
    return datetime.utcnow() - _last_update > timedelta(hours=12)


async def refresh_news() -> dict:
    """用 Claude 生成最新简讯条目"""
    global _last_update, _update_in_progress
    if _update_in_progress:
        return {"status": "already_updating"}
    _update_in_progress = True

    try:
        today = datetime.utcnow()
        today_str = today.strftime('%Y-%m-%d')
        month_str = today.strftime('%Y年%m月')

        # 官网首页URL映射
        SITE_URLS = {
            "人民日报": "https://paper.people.com.cn/rmrb/",
            "求是网": "https://www.qstheory.cn/",
            "共产党员网": "https://www.12371.cn/",
            "学习强国": "https://www.xuexi.cn/",
        }

        prompt = f"""请以JSON数组格式生成10条{today_str}及之前一周内的权威时政简讯。

每条格式：{{"title":"标题","source":"人民日报|求是网|共产党员网|学习强国","date":"YYYY-MM-DD","snippet":"80字以内的内容概要"}}

硬性要求：
1. 所有date必须 ≤ {today_str}（绝对不能超过今天！）
2. 来源均匀分布在四个平台
3. 内容符合{month_str}重大时政热点
4. snippet要像真实新闻导语，具体、有信息量
5. 只输出JSON数组，不要其他文字"""

        text = await generate_full(
            system_prompt=f"你是新华社资深时政编辑。今天是{today_str}。只输出JSON数组。",
            user_message=prompt,
            max_tokens=3000,
            temperature=0.2,
        )

        # 解析JSON
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if not json_match:
            return {"status": "parse_error", "detail": "无法解析生成结果"}

        items = json.loads(json_match.group(0))

        # 过滤+修正
        valid_items = []
        for item in items:
            item_date = item.get("date", "")
            if item_date > today_str:
                continue  # 跳过未来日期

            # 强制修正URL：用官网首页替代不可靠的详情链接
            source = item.get("source", "人民日报")
            item["url"] = SITE_URLS.get(source, "https://paper.people.com.cn/rmrb/")

            valid_items.append(item)

        items = valid_items
        if not items:
            return {"status": "error", "detail": "所有生成的条目日期都超过今天，已过滤"}

        # 写入数据库（替换旧的）
        db = SessionLocal()
        try:
            # 保留前20条旧数据，避免全部丢失
            old_items = db.query(NewsItem).order_by(NewsItem.date.desc()).limit(20).all()
            old_ids = {i.id for i in old_items}

            for item in items:
                n = NewsItem(
                    title=item.get("title", ""),
                    source=item.get("source", "人民日报"),
                    url=item.get("url", ""),
                    date=item.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
                    snippet=item.get("snippet", ""),
                )
                db.add(n)

            # 删除过旧的数据（超过100条时清理）
            total = db.query(NewsItem).count()
            if total > 100:
                to_delete = db.query(NewsItem).order_by(NewsItem.date.asc()).limit(total - 80).all()
                for d in to_delete:
                    db.delete(d)

            db.commit()
        finally:
            db.close()

        _last_update = datetime.utcnow()
        return {"status": "ok", "count": len(items), "updated_at": _last_update.isoformat()}

    except Exception as e:
        return {"status": "error", "detail": str(e)}
    finally:
        _update_in_progress = False
