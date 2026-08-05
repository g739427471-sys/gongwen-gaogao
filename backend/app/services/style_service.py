"""
用户风格画像与学习引擎 — 深度集成 Writer's Loop "Learn" 阶段设计

核心原则（来自 Writer's Loop）：
1. 只从用户确认的决策中学习 — 不学习未审查的AI原始输出
2. 差分学习 — 记录「用户改了什么」，而不是「AI写了什么」
3. 加权累积 — 新修改权重递增，旧偏好逐步衰减
4. 用户可控 — 随时查看、调整、重置画像

学习维度（7维）：
  词汇偏好 | 句式习惯 | 段落结构 | 开头结尾 | 标点使用 | 篇幅偏好 | 层次序数
"""
import json
import difflib
import re
from datetime import datetime
from typing import Optional, List, Dict, Any

from ..database import SessionLocal, generate_uuid
from sqlalchemy import Integer, Float
from ..models import Base, Column, String, Text, DateTime

# ====================================================================
# 一、数据结构设计
# ====================================================================

class WritingStyle(Base):
    """用户风格画像 — 多维特征存储"""
    __tablename__ = "writing_styles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False, unique=True, index=True)

    # 画像元数据
    sample_count = Column(Integer, default=0)       # 已学习样本数
    last_learned_at = Column(DateTime, nullable=True)
    version = Column(Integer, default=1)             # 画像版本号

    # 7维特征 — 存储为JSON字符串以支持灵活扩展
    # 1. 词汇偏好: {"preferred":["贯彻落实","扎实推进"],"avoided":["大概","差不多"],"replacements":{"大家":"全体同志"}}
    vocab_prefs = Column(Text, default="{}")
    # 2. 句式习惯: {"avg_sentence_len":45,"prefer_short":true,"pattern":"动宾+补充","complex_ratio":0.3}
    syntax_habits = Column(Text, default="{}")
    # 3. 段落结构: {"avg_para_len":200,"prefer_bullet":true,"opening_style":"目的式"}
    para_structure = Column(Text, default="{}")
    # 4. 开头/结尾: {"opening":"根据……为……现将……通知如下","closing":"特此通知","open_len":80}
    open_close = Column(Text, default="{}")
    # 5. 标点习惯: {"use_dunhao":true,"semicolon_freq":0.1,"quote_style":"double"}
    punct_habits = Column(Text, default="{}")
    # 6. 篇幅偏好: {"typical_len":1500,"min_len":500,"max_len":3000,"prefer_concise":true}
    length_prefs = Column(Text, default="{}")
    # 7. 层次序数: {"pattern":"一、（一）1.","use_bullet":false}
    structure_patterns = Column(Text, default="{}")

    # 学习历史（最近N次学习事件）— JSON数组
    learn_history = Column(Text, default="[]")
    # 用户主动设置的偏好覆盖
    user_overrides = Column(Text, default="{}")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


# ====================================================================
# 二、学习引擎 — 差分分析与特征提取
# ====================================================================

def diff_and_learn(original: str, edited: str, user_id: str) -> dict:
    """
    分析用户编辑 = 从 diff 中提取风格特征。
    这是 Writer's Loop "Learn" 阶段的核心实现。
    """
    # 1. 逐行差分
    d = difflib.Differ()
    diff = list(d.compare(original.splitlines(keepends=True),
                          edited.splitlines(keepends=True)))

    additions = []    # 用户新增的
    deletions = []    # 用户删除的
    replacements = []  # 用户替换的

    # 2. 解析diff标记
    i = 0
    while i < len(diff):
        line = diff[i]
        if line.startswith('- ') and i + 1 < len(diff) and diff[i + 1].startswith('+ '):
            old_text = line[2:].strip()
            new_text = diff[i + 1][2:].strip()
            if old_text and new_text:
                replacements.append((old_text, new_text))
            i += 2
        elif line.startswith('- '):
            deletions.append(line[2:].strip())
            i += 1
        elif line.startswith('+ '):
            additions.append(line[2:].strip())
            i += 1
        else:
            i += 1

    # 3. 提取特征
    features = {
        "learned_at": datetime.utcnow().isoformat(),
        "diff_summary": f"+{len(additions)}  -{len(deletions)}  ~{len(replacements)}",
        "vocab": _extract_vocab_changes(replacements, additions, deletions),
        "syntax": _extract_syntax_changes(replacements, additions, deletions),
        "structure": _extract_structure_changes(replacements, additions),
        "opening_closing": _extract_open_close_changes(edited, original),
        "length": {"before": len(original), "after": len(edited)},
    }

    # 4. 累积到数据库
    _accumulate_preferences(user_id, features)
    return features


def _extract_vocab_changes(replacements, additions, deletions) -> dict:
    """词汇维度：提取替换的词对"""
    learned = {"replacements": {}, "avoided": [], "preferred": []}
    for old, new in replacements:
        if len(old) < 30 and len(new) < 30:  # 词级别替换
            learned["replacements"][old] = new
            learned["avoided"].append(old)
            learned["preferred"].append(new)
    return learned


def _extract_syntax_changes(replacements, additions, deletions) -> dict:
    """句法维度：分析句式调整"""
    sentences_shortened = 0
    sentences_lengthened = 0
    for old, new in replacements:
        if len(new) < len(old) * 0.8:
            sentences_shortened += 1
        elif len(new) > len(old) * 1.2:
            sentences_lengthened += 1
    return {
        "shorten_count": sentences_shortened,
        "lengthen_count": sentences_lengthened,
        "prefer_concise": sentences_shortened > sentences_lengthened,
    }


def _extract_structure_changes(replacements, additions) -> dict:
    """结构维度：段落层次变化"""
    result = {}
    # 检测用户是否添加了分条标记
    new_structured = sum(1 for a in additions if re.match(r'[一二三四五六七八九十]、', a))
    result["added_structure"] = new_structured
    # 检测层次序数风格
    for _, new in replacements:
        if re.search(r'[一二三四五六七八九十]、', new):
            result["structure_style"] = "一、式"
        elif re.search(r'（[一二三四五六七八九十]）', new):
            result["structure_style"] = "（一）式"
    return result


def _extract_open_close_changes(edited, original) -> dict:
    """开头/结尾维度"""
    result = {}
    e_lines = edited.split('\n')
    o_lines = original.split('\n')
    if e_lines and o_lines:
        if e_lines[0] != o_lines[0]:
            result["opening_changed"] = True
            result["new_opening_snippet"] = e_lines[0][:80] if e_lines else ""
        if e_lines[-1] != o_lines[-1]:
            result["closing_changed"] = True
            result["new_closing_snippet"] = e_lines[-1][:80] if e_lines else ""
    return result


# ====================================================================
# 三、偏好累积 — 加权衰减算法
# ====================================================================

def _accumulate_preferences(user_id: str, new_features: dict):
    """累积偏好到数据库 — 新修改权重0.6，历史0.4"""
    db = SessionLocal()
    try:
        style = db.query(WritingStyle).filter(WritingStyle.user_id == user_id).first()
        if not style:
            style = WritingStyle(user_id=user_id, sample_count=0)
            db.add(style)

        # 更新每个维度（加权合并）
        alpha = 0.6  # 新数据权重
        beta = 0.4   # 历史权重

        style.vocab_prefs = _merge_json(style.vocab_prefs, new_features.get("vocab", {}), "replacements", alpha, beta)
        style.syntax_habits = _merge_json(style.syntax_habits, new_features.get("syntax", {}), None, alpha, beta)
        style.para_structure = _merge_json(style.para_structure, new_features.get("structure", {}), None, alpha, beta)
        style.open_close = _merge_json(style.open_close, new_features.get("opening_closing", {}), None, alpha, beta)
        style.length_prefs = _merge_json(style.length_prefs, new_features.get("length", {}), None, alpha, beta)

        # 更新历史记录（保留最近20条）
        history = json.loads(style.learn_history) if style.learn_history else []
        history.append({"ts": datetime.utcnow().isoformat(), "summary": new_features.get("diff_summary", "")})
        style.learn_history = json.dumps(history[-20:], ensure_ascii=False)

        style.sample_count = str((int(style.sample_count or 0)) + 1)  # store as string for DB compat
        style.last_learned_at = datetime.utcnow()
        style.updated_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


def _merge_json(existing_json: str, new_data: dict, key_for_list: str, alpha: float, beta: float) -> str:
    """加权合并JSON特征"""
    try:
        old = json.loads(existing_json) if existing_json else {}
    except (json.JSONDecodeError, TypeError):
        old = {}

    merged = {}
    for k in set(list(old.keys()) + list(new_data.keys())):
        old_val = old.get(k)
        new_val = new_data.get(k)

        if isinstance(old_val, list) and isinstance(new_val, list):
            # 列表合并：新项优先，去重
            merged[k] = list(dict.fromkeys(new_val + old_val))[:30]
        elif isinstance(old_val, dict) and isinstance(new_val, dict):
            merged[k] = {**old_val, **new_val}
        elif isinstance(old_val, (int, float)) and isinstance(new_val, (int, float)):
            merged[k] = round(alpha * new_val + beta * old_val, 2)
        elif isinstance(new_val, bool):
            merged[k] = new_val  # bool用最新的
        else:
            merged[k] = new_val if new_val is not None else old_val

    return json.dumps(merged, ensure_ascii=False)


# ====================================================================
# 四、读取与应用 — 提示词注入
# ====================================================================

def get_style_profile(user_id: str) -> dict:
    """获取完整的用户风格画像"""
    db = SessionLocal()
    try:
        style = db.query(WritingStyle).filter(WritingStyle.user_id == user_id).first()
        sc = int(style.sample_count or 0) if style else 0
        if not style or sc < 2:
            return _empty_profile()

        def safe_json(v, default=None):
            try: return json.loads(v) if v else (default if default is not None else {})
            except: return default if default is not None else {}

        ts = style.last_learned_at
        ts_str = ts.isoformat() if hasattr(ts, 'isoformat') else str(ts) if ts else None

        return {
            "sample_count": sc,
            "last_learned_at": ts_str,
            "version": style.version or 1,
            "ready": True,
            "vocab": safe_json(style.vocab_prefs),
            "syntax": safe_json(style.syntax_habits),
            "paragraph": safe_json(style.para_structure),
            "open_close": safe_json(style.open_close),
            "punct": safe_json(style.punct_habits),
            "length": safe_json(style.length_prefs),
            "structure": safe_json(style.structure_patterns),
            "history": safe_json(style.learn_history, []),
            "overrides": safe_json(style.user_overrides),
        }
    except Exception as e:
        return {"sample_count": 0, "ready": False, "error": str(e)}
    finally:
        db.close()


def _empty_profile() -> dict:
    return {"sample_count": 0, "ready": False, "message": "样本不足，需至少2次确认后自动激活"}


def build_style_prompt(user_id: str) -> str:
    """
    将风格画像转化为提示词注入指令。
    这是 Writer's Loop 的「让AI写出更像我写的」实现。
    """
    profile = get_style_profile(user_id)
    if not profile.get("ready"):
        return ""

    parts = ["\n## 【用户写作风格偏好 — 系统已学习】\n"]

    # 词汇偏好
    vocab = profile.get("vocab", {})
    preferred = vocab.get("preferred", [])[:5]
    avoided = vocab.get("avoided", [])[:5]
    replacements = vocab.get("replacements", {})
    if preferred:
        parts.append(f"- 常用词汇：{'、'.join(preferred)}")
    if avoided:
        parts.append(f"- 避免使用：{'、'.join(avoided)}")
    if replacements:
        rp = [f"「{old}」→「{new}」" for old, new in list(replacements.items())[:5]]
        parts.append(f"- 词汇替换偏好：{'，'.join(rp)}")

    # 句式习惯
    syntax = profile.get("syntax", {})
    if syntax.get("prefer_concise"):
        parts.append("- 倾向简洁句式，避免长句缠绕")
    if syntax.get("shorten_count", 0) > syntax.get("lengthen_count", 0):
        parts.append("- 偏好短句（已学习到用户倾向精简表达）")

    # 段落结构
    para = profile.get("paragraph", {})
    if para.get("structure_style"):
        parts.append(f"- 层次序数偏好：{para['structure_style']}")
    if para.get("added_structure", 0) > 0:
        parts.append("- 偏好分条列项式结构")

    # 开头结尾
    oc = profile.get("open_close", {})
    if oc.get("new_opening_snippet"):
        parts.append(f"- 开头风格参考：{oc['new_opening_snippet'][:60]}")
    if oc.get("new_closing_snippet"):
        parts.append(f"- 结尾风格参考：{oc['new_closing_snippet'][:60]}")

    # 篇幅偏好
    length = profile.get("length", {})
    avg = length.get("after", 0)
    if avg > 0:
        parts.append(f"- 篇幅偏好：约{avg}字")

    parts.append(f"\n> 系统已学习您 {profile['sample_count']} 次写作偏好。以上偏好将自动应用于本次生成。\n")
    return "\n".join(parts)


# ====================================================================
# 五、用户控制
# ====================================================================

def reset_style(user_id: str):
    """重置用户风格画像"""
    db = SessionLocal()
    try:
        style = db.query(WritingStyle).filter(WritingStyle.user_id == user_id).first()
        if style:
            db.delete(style)
            db.commit()
    finally:
        db.close()


def set_override(user_id: str, key: str, value: str):
    """用户手动设置偏好覆盖"""
    db = SessionLocal()
    try:
        style = db.query(WritingStyle).filter(WritingStyle.user_id == user_id).first()
        if not style:
            style = WritingStyle(user_id=user_id, sample_count=0)
            db.add(style)
        overrides = json.loads(style.user_overrides) if style.user_overrides else {}
        overrides[key] = value
        style.user_overrides = json.dumps(overrides, ensure_ascii=False)
        db.commit()
    finally:
        db.close()
