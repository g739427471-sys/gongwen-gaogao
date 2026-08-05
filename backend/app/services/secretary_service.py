"""
智能文秘引擎 — 让公文高高像一个经验丰富的老秘书。

功能：
1. 服务状态统计（服务天数、已学习篇数、风格匹配度）
2. 智能任务推荐（基于历史习惯 + 时间节点感知）
3. 拟人化进度反馈（生成文案模拟真人秘书口吻）
4. 主动提醒（重复修改检测 + 闲置超时提醒）
5. 个人风格报告（写作习惯全景分析）
"""
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

from ..database import SessionLocal
from ..models import User, Document

# ========== 1. 服务状态统计 ==========

def get_secretary_status(user_id: str) -> dict:
    """获取文秘状态摘要"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        docs_count = db.query(Document).filter(Document.user_id == user_id).count()

        # 计算服务天数
        if user and user.created_at:
            days = (datetime.utcnow() - user.created_at).days + 1
        else:
            days = 1

        # 已学习篇数（从style_service获取）
        learn_count = 0
        style_match = 0
        try:
            from .style_service import get_style_profile
            profile = get_style_profile(user_id)
            learn_count = profile.get("sample_count", 0)
            style_match = min(100, learn_count * 8) if learn_count > 0 else 0
        except Exception:
            pass

        # 本月写作篇数
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        month_docs = db.query(Document).filter(
            Document.user_id == user_id,
            Document.created_at >= month_start,
        ).count()

        return {
            "service_days": days,
            "total_docs": docs_count,
            "month_docs": month_docs,
            "learned_samples": learn_count,
            "style_match": style_match,
            "level": _level_name(learn_count),
        }
    finally:
        db.close()


def _level_name(samples: int) -> str:
    if samples < 2: return "新手上路"
    if samples < 5: return "初识文风"
    if samples < 10: return "渐入佳境"
    if samples < 20: return "配合默契"
    return "心有灵犀"


# ========== 2. 智能任务推荐 ==========

def get_smart_recommendations(user_id: str) -> dict:
    """基于历史习惯和时间节点的智能推荐"""
    db = SessionLocal()
    try:
        docs = db.query(Document).filter(Document.user_id == user_id).order_by(Document.created_at.desc()).limit(20).all()

        recommendations = []
        now = datetime.utcnow()

        # 频率分析
        doc_type_counts = {}
        for d in docs:
            dt = d.doc_type or "通用"
            doc_type_counts[dt] = doc_type_counts.get(dt, 0) + 1

        top_type = max(doc_type_counts, key=doc_type_counts.get) if doc_type_counts else None

        # 1. 基于常用文种推荐
        if top_type and doc_type_counts[top_type] >= 3:
            recommendations.append({
                "type": "habit",
                "title": f"您经常写「{top_type}」",
                "action": f"需要再写一篇{top_type}吗？",
                "priority": 1,
            })

        # 2. 时间节点推荐
        if now.month in [3, 6, 9, 12]:
            recommendations.append({
                "type": "seasonal",
                "title": f"当前{now.month}月末/季末",
                "action": "建议撰写季度工作总结或下季度计划",
                "priority": 2,
            })
        elif now.month == 1:
            recommendations.append({
                "type": "seasonal",
                "title": "新的一年开始了",
                "action": "建议撰写年度工作计划",
                "priority": 1,
            })
        elif now.month == 12:
            recommendations.append({
                "type": "seasonal",
                "title": "临近年末",
                "action": "建议撰写年度工作总结",
                "priority": 1,
            })

        # 3. 政策热点提醒（8月常见）
        if now.month == 8:
            recommendations.append({
                "type": "hotspot",
                "title": "近期政策关注",
                "action": "建议关注年中经济形势分析、防汛抗旱等主题材料",
                "priority": 3,
            })

        # 4. 连续写作提醒
        if len(docs) >= 5:
            recent_dates = [d.created_at for d in docs[:5] if d.created_at]
            if recent_dates and (now - recent_dates[0]).days > 7:
                recommendations.append({
                    "type": "reminder",
                    "title": "您已一周未写作",
                    "action": "要保持手感，要不要写点什么？",
                    "priority": 4,
                })

        return {
            "recommendations": sorted(recommendations, key=lambda x: x["priority"])[:5],
            "top_doc_types": list(doc_type_counts.keys())[:3],
            "total_written": len(docs),
        }
    finally:
        db.close()


# ========== 3. 拟人化进度反馈 ==========

PROGRESS_MESSAGES = {
    "framework_start": [
        "正在理解您的要求...",
        "让我想想怎么组织这篇文章...",
        "我先梳理一个框架..."
    ],
    "framework_done": [
        "大纲出来了，您先看看结构合不合适？",
        "我整理了一份大纲，需要调整随时说",
        "框架搭好了，您确认一下，我再往下写"
    ],
    "content_start": [
        "大纲确认了，开始动笔...",
        "好的，我根据这个框架来写",
        "我查了相关政策，开始组织内容..."
    ],
    "content_mid": [
        "正在撰写中，稍等一下...",
        "写到核心部分了...",
        "根据您的风格偏好，我这样组织..."
    ],
    "content_done": [
        "写完了，您看看哪些地方需要调整？",
        "初稿已完成，请您审阅",
        "这一稿写好了，您再润色润色"
    ],
    "refine_start": [
        "让我帮您润色一下...",
        "好的，我看看哪些地方能写得更好"
    ],
    "audit_done": [
        f"审核完毕，发现了一些需要关注的地方",
        "我都查了一遍，给您标出了要注意的地方"
    ],
}

def get_human_message(phase: str) -> str:
    """获取拟人化进度消息"""
    import random
    msgs = PROGRESS_MESSAGES.get(phase, ["正在处理..."])
    return random.choice(msgs)


# ========== 4. 主动提醒 ==========

def check_attention_needed(user_id: str, content: str, edit_count: int = 0) -> dict:
    """检测是否需要主动帮助"""
    alerts = []

    # 重复修改检测
    if edit_count >= 3:
        alerts.append({
            "type": "repeated_edit",
            "message": f"您修改了这个段落 {edit_count} 次，需要我给您一些建议吗？",
            "action": "suggest_rewrite",
        })

    # 长文检测
    if len(content) > 2000:
        alerts.append({
            "type": "long_doc",
            "message": "这篇文稿比较长，要不要我帮您拆成章节？",
            "action": "suggest_chapters",
        })

    return {"alerts": alerts, "has_alerts": len(alerts) > 0}


# ========== 5. 个人风格报告 ==========

def generate_style_report(user_id: str) -> dict:
    """生成个人写作风格全景报告"""
    db = SessionLocal()
    try:
        docs = db.query(Document).filter(Document.user_id == user_id).order_by(Document.created_at.desc()).limit(50).all()

        if len(docs) < 3:
            return {"ready": False, "message": "样本不足（需至少3篇），多写几篇后回来查看"}

        # 常用文种TOP5
        type_counts = {}
        for d in docs:
            dt = d.doc_type or "通用"
            type_counts[dt] = type_counts.get(dt, 0) + 1
        top_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        # 篇幅趋势
        lengths = []
        for d in docs:
            if d.content:
                lengths.append({"date": d.created_at.strftime("%Y-%m-%d") if d.created_at else "", "len": len(d.content)})
        lengths.reverse()

        recent_avg = sum(l["len"] for l in lengths[:10]) // max(len(lengths[:10]), 1) if lengths else 0
        older_avg = sum(l["len"] for l in lengths[10:]) // max(len(lengths[10:]), 1) if len(lengths) > 10 else recent_avg

        if recent_avg < older_avg * 0.8:
            trend = "您的文稿越来越精简了，言简意赅是好事"
        elif recent_avg > older_avg * 1.2:
            trend = "您的文稿篇幅在增长，可能内容更丰富了"
        else:
            trend = "您的篇幅习惯稳定，风格成熟"

        # 从风格服务获取词汇偏好
        vocab_top = []
        try:
            from .style_service import get_style_profile
            profile = get_style_profile(user_id)
            vocab = profile.get("vocab", {})
            preferred = vocab.get("preferred", [])[:10]
            avoided = vocab.get("avoided", [])[:5]
            vocab_top = preferred
        except Exception:
            avoided = []

        # 生成报告
        return {
            "ready": True,
            "total_analyzed": len(docs),
            "top_doc_types": [{"type": t, "count": c} for t, c in top_types],
            "length_trend": trend,
            "recent_avg_length": recent_avg,
            "vocab_top10": vocab_top,
            "avoided_words": avoided,
            "suggestions": _generate_report_suggestions(docs, type_counts, recent_avg),
        }
    finally:
        db.close()


def _generate_report_suggestions(docs, type_counts, avg_len) -> List[str]:
    suggestions = []
    if "工作总结" in type_counts and type_counts["工作总结"] >= 5:
        suggestions.append("您是写总结的高手，建议尝试写写调研报告，丰富文稿类型")
    if avg_len > 2000:
        suggestions.append("您的文稿偏长，考虑使用'先大纲后填充'的步骤模式，控制篇幅")
    if avg_len < 500:
        suggestions.append("您的文稿偏短，注意检查是否有遗漏的关键内容")
    if len(suggestions) == 0:
        suggestions.append("您的写作习惯良好，继续保持！")
    return suggestions
