"""
样式学习服务 — 从用户确认的文稿中提取格式偏好并自动应用。

学习维度：
1. 标题格式（是否加粗、居中、字号偏好）
2. 段落缩进（首行缩进字符数、段间距）
3. 版式布局（开头方式、结尾方式、层次序数风格）
"""
import json
import re
from datetime import datetime
from ..database import SessionLocal, generate_uuid as _default_uuid
from ..models import Base, Column, String, Text, DateTime
from sqlalchemy import func

# 样式特征存储表（动态创建）
class WritingStyle(Base):
    __tablename__ = "writing_styles"
    id = Column(String(36), primary_key=True, default=_default_uuid)
    user_id = Column(String(36), nullable=False, index=True)
    features = Column(Text, default="{}")  # JSON特征
    sample_count = Column(String(10), default="0")
    updated_at = Column(DateTime, default=datetime.utcnow)


def extract_style_features(content: str, title: str = "") -> dict:
    """从文稿中提取格式特征"""
    features = {
        "extracted_at": datetime.utcnow().isoformat(),
        "title_format": {},
        "paragraph_style": {},
        "layout_prefs": {},
        "common_phrases": [],
        "structure_patterns": [],
    }

    # 1. 标题格式
    if title:
        features["title_format"]["has_prefix"] = "关于" in title or "在" in title[:3]
        features["title_format"]["typical_length"] = len(title)

    # 2. 段落特征
    lines = content.split('\n')
    non_empty = [l.strip() for l in lines if l.strip()]
    if non_empty:
        features["paragraph_style"]["avg_line_length"] = sum(len(l) for l in non_empty) // max(len(non_empty), 1)
        features["paragraph_style"]["total_paragraphs"] = len(non_empty)

    # 3. 层次序数风格
    has_dunhao = bool(re.search(r'[一二三四五六七八九十]、', content))
    has_kuohao = bool(re.search(r'（[一二三四五六七八九十]）', content))
    has_number = bool(re.search(r'\d+[\.\、]', content))
    features["structure_patterns"] = []
    if has_dunhao: features["structure_patterns"].append("一、式")
    if has_kuohao: features["structure_patterns"].append("（一）式")
    if has_number: features["structure_patterns"].append("数字式")

    # 4. 开头方式
    if content.strip().startswith("为"):
        features["layout_prefs"]["opening_style"] = "目的式"
    elif content.strip().startswith("根据"):
        features["layout_prefs"]["opening_style"] = "依据式"
    elif content.strip().startswith("在"):
        features["layout_prefs"]["opening_style"] = "背景式"
    elif "：\n" in content[:200] or "：\r" in content[:200]:
        features["layout_prefs"]["opening_style"] = "冒号分条式"

    # 5. 结尾方式
    last_lines = content[-200:]
    if "特此通知" in last_lines: features["layout_prefs"]["closing_style"] = "特此式"
    elif "请批示" in last_lines: features["layout_prefs"]["closing_style"] = "请求式"
    elif "请审阅" in last_lines: features["layout_prefs"]["closing_style"] = "审阅式"
    elif "为……而不懈奋斗" in last_lines or "让我们" in last_lines:
        features["layout_prefs"]["closing_style"] = "号召式"

    # 6. 常用短语模式
    common = ["贯彻落实","扎实推进","持续深化","着力","聚焦","坚持以","深入贯彻"]
    for phrase in common:
        if phrase in content:
            features["common_phrases"].append(phrase)

    return features


def save_style(user_id: str, features: dict):
    """保存或更新用户样式"""
    db = SessionLocal()
    try:
        style = db.query(WritingStyle).filter(WritingStyle.user_id == user_id).first()
        if style:
            # 合并特征（增量学习）
            old_features = json.loads(style.features) if style.features else {}
            old_features.update(features)
            style.features = json.dumps(old_features, ensure_ascii=False)
            style.sample_count = str(int(style.sample_count or "0") + 1)
        else:
            style = WritingStyle(
                user_id=user_id,
                features=json.dumps(features, ensure_ascii=False),
                sample_count="1",
            )
            db.add(style)
        db.commit()
    finally:
        db.close()


def get_style(user_id: str) -> dict:
    """获取用户样式特征"""
    db = SessionLocal()
    try:
        style = db.query(WritingStyle).filter(WritingStyle.user_id == user_id).first()
        if style:
            return {
                "features": json.loads(style.features) if style.features else {},
                "sample_count": int(style.sample_count or "0"),
                "updated_at": style.updated_at.isoformat() if style.updated_at else None,
            }
        return {"features": {}, "sample_count": 0, "updated_at": None}
    finally:
        db.close()


def build_style_instructions(user_id: str) -> str:
    """根据用户样式特征构建生成指令"""
    style = get_style(user_id)
    features = style.get("features", {})
    if not features or style.get("sample_count", 0) < 2:
        return ""  # 样本不足，不应用样式

    instructions = []
    lp = features.get("layout_prefs", {})
    sp = features.get("structure_patterns", [])

    if lp.get("opening_style"):
        instructions.append(f"开头倾向{lp['opening_style']}")
    if lp.get("closing_style"):
        instructions.append(f"结尾倾向{lp['closing_style']}")
    if sp:
        instructions.append(f"层次序数倾向{'、'.join(sp)}")

    cp = features.get("common_phrases", [])
    if cp:
        instructions.append(f"常用表述：{'、'.join(cp[:5])}")

    if instructions:
        return "## 用户写作偏好（基于历史学习）\n" + "\n".join(f"- {i}" for i in instructions)
    return ""
