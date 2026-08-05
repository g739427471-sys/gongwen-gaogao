"""
去AI味引擎 — 识别并改写AI生成的程式化表达，让公文更像人写的。

核心策略：
1. 黑名单匹配 → 白名单替换
2. 句式解构 → 长短结合
3. 空话识别 → 具体化建议
4. AI味指数 → 量化评分

风格档位：
- official: 不激活（保持最规范表述）
- standard: 部分激活（仅处理最明显的AI味）
- natural:  完全激活（全面去AI味）
"""
import re
from typing import List, Tuple, Dict

# ====================================================================
# 一、AI味词汇/句式黑名单 → 人工表达白名单
# ====================================================================

# 程式化连接词（AI最爱，公文中应适当但不泛滥）
CONNECTOR_BLACKLIST: Dict[str, str] = {
    "首先，": "一是",
    "其次，": "二是",
    "再次，": "三是",
    "最后，": "",
    "综上所述，": "",
    "总而言之，": "",
    "与此同时，": "同时，",
    "在此基础上，": "",
    "值得注意的是，": "",
    "需要指出的是，": "",
    "毋庸置疑，": "",
    "众所周知，": "",
}

# 空话套话 → 具体化指引
BUZZWORD_BLACKLIST: Dict[str, str] = {
    "高度重视": "",     # 删掉不影响意思 → 空话
    "切实加强": "",     # 同上
    "大力推动": "推进",
    "进一步强化": "强化",
    "全面深化": "深化",
    "持续深入": "深入",
    "坚定不移地": "",
    "始终坚持以": "坚持以",
    "积极稳妥推进": "推进",
    "扎实有效开展": "开展",
    "不断优化完善": "优化",
    "显著提升": "提升",
}

# AI句式模板 → 人性化改写
SENTENCE_PATTERNS: List[Tuple[str, str]] = [
    # 并列堆砌
    (r'不仅.{2,15}而且.{2,30}', '⚠并列堆砌'),      # 不仅...而且...
    (r'既.{2,10}又.{2,20}', '⚠并列堆砌'),           # 既...又...
    (r'一方面.{2,15}另一方面.{2,30}', '⚠套路对比'),
    # 因果套话
    (r'之所以.{2,20}是因为', '⚠套话因果'),
    (r'正是由于.{2,20}才使得', '⚠套话因果'),
    # 排比过度（连续3个以上"要……"）
    (r'(要.{2,20})(要.{2,20})(要.{2,20})', '⚠排比过度'),
    # 万能过渡
    (r'具体来说[，,].{2,30}', '⚠万能过渡'),       # 具体来说
    (r'换句话[说讲][，,].{2,30}', '⚠万能过渡'),    # 换句话说
]

# 正式度偏低 → 公文提升
INFORMAL_TO_FORMAL: Dict[str, str] = {
    "挺多": "较多",
    "很多": "大量",
    "不少": "若干",
    "好多": "诸多",
    "很棒": "显著",
    "不错": "良好",
    "特别好": "突出",
    "非常快": "迅速",
    "真的": "",
    "确实": "",
}

# 长句标记（>120字拆）
LONG_SENTENCE_THRESHOLD = 120


# ====================================================================
# 二、AI味指数评分算法（0-100，越高AI味越重）
# ====================================================================

def calculate_ai_score(text: str) -> dict:
    """
    计算AI味指数。
    维度：
    - 连接词密度（15分）
    - 空话套话密度（20分）
    - 句式套路密度（20分）
    - 排比句密度（15分）
    - 长句占比（15分）
    - "的"字密度（10分）
    - 万能词密度（5分）
    """
    total_chars = max(len(text), 1)
    scores = {}

    # 1. 连接词密度
    connector_count = sum(text.count(k) for k in CONNECTOR_BLACKLIST)
    scores["connectors"] = min(connector_count * 3, 15)

    # 2. 空话套话密度
    buzzword_count = sum(text.count(k) for k in BUZZWORD_BLACKLIST)
    scores["buzzwords"] = min(buzzword_count * 2.5, 20)

    # 3. 句式套路密度
    pattern_count = 0
    for pat, _ in SENTENCE_PATTERNS:
        if re.search(pat, text):
            pattern_count += 1
    scores["patterns"] = min(pattern_count * 4, 20)

    # 4. 排比句密度
    yao_count = len(re.findall(r'要.{2,20}', text))
    scores["parallelism"] = min(max(0, yao_count - 2) * 3, 15)

    # 5. 长句占比
    sentences = [s.strip() for s in re.split(r'[。！？；]', text) if s.strip()]
    long_count = sum(1 for s in sentences if len(s) > LONG_SENTENCE_THRESHOLD)
    scores["long_sentences"] = min(long_count * 3, 15) if sentences else 0

    # 6. "的"字密度
    de_count = text.count("的")
    de_ratio = de_count / total_chars
    scores["de_density"] = min(int(de_ratio * 1000), 10)

    # 7. 万能词密度
    universal = ["相关","有关","各种","一系列","多种","多项","大量"]
    uni_count = sum(text.count(w) for w in universal)
    scores["universal"] = min(uni_count, 5)

    total = sum(scores.values())
    return {
        "score": min(total, 100),
        "level": _score_level(total),
        "breakdown": scores,
        "details": _generate_details(scores, text),
    }


def _score_level(score: int) -> str:
    if score <= 20: return "自然"
    if score <= 40: return "轻微AI味"
    if score <= 60: return "明显AI味"
    if score <= 80: return "严重AI味"
    return "纯AI生成"


def _generate_details(scores: dict, text: str) -> List[str]:
    details = []
    if scores["connectors"] > 6:
        details.append(f"程式化连接词偏多（-{scores['connectors']}分）→ 建议用序号或自然过渡")
    if scores["buzzwords"] > 8:
        details.append(f"空话套话偏多（-{scores['buzzwords']}分）→ 删减或替换为具体措施")
    if scores["patterns"] > 8:
        details.append(f"句式套路化（-{scores['patterns']}分）→ 简化并列结构")
    if scores["parallelism"] > 6:
        details.append(f"排比句过多（-{scores['parallelism']}分）→ 减少'要……要……要……'")
    if scores["long_sentences"] > 6:
        details.append(f"长句偏多（-{scores['long_sentences']}分）→ 拆分超过120字的句子")
    if scores["de_density"] > 5:
        details.append(f"'的'字密度偏高（-{scores['de_density']}分）→ 检查定语嵌套")
    return details


# ====================================================================
# 三、去AI味改写引擎
# ====================================================================

def deai_transform(text: str, flavor: str = "standard") -> str:
    """
    根据风格档位去AI味改写。
    - official: 不做任何改写（回原样）
    - standard: 移除最明显的程式化连接词和空话
    - natural:  全面改写（黑名单替换 + 句式优化 + 长句拆分）
    """
    if flavor == "official":
        return text

    result = text

    # === 所有档位: 修正正式度 ===
    for informal, formal in INFORMAL_TO_FORMAL.items():
        result = result.replace(informal, formal)

    # === standard + natural: 连接词替换 ===
    for ai_word, human_word in CONNECTOR_BLACKLIST.items():
        if ai_word in result:
            result = result.replace(ai_word, human_word)

    # === standard + natural: 空话替换 ===
    for buzzword, replacement in BUZZWORD_BLACKLIST.items():
        if buzzword in result:
            if replacement:
                result = result.replace(buzzword, replacement)
            else:
                # 删除纯空话
                result = _remove_buzzword_phrase(result, buzzword)

    # === natural only: 句式深度改写 ===
    if flavor == "natural":
        result = _break_long_sentences(result)
        result = _reduce_parallelism(result)
        result = _add_concrete_markers(result)

    return result.strip()


def _remove_buzzword_phrase(text: str, buzzword: str) -> str:
    """删除空话短语（保留句子结构）"""
    # 匹配 "高度重视XXX" → 删除"高度重视"
    patterns = [
        rf'{buzzword}[，,]?\s*',  # "高度重视，"
        rf'[，,]\s*{buzzword}',  # "，高度重视"
        rf'{buzzword}',           # 独立出现
    ]
    for pat in patterns:
        text = re.sub(pat, '', text)
    return text


def _break_long_sentences(text: str) -> str:
    """拆分超过120字的句子"""
    sentences = re.split(r'([。！？])', text)
    result = []
    for i, s in enumerate(sentences):
        if len(s) > LONG_SENTENCE_THRESHOLD and not re.match(r'[。！？]', s):
            # 在逗号处拆分
            parts = s.split('，')
            mid = len(parts) // 2
            first = '，'.join(parts[:mid])
            second = '，'.join(parts[mid:])
            result.append(first + '。')
            result.append(second)
        else:
            result.append(s)
    return ''.join(result)


def _reduce_parallelism(text: str) -> str:
    """减少排比句：连续3个以上'要……'改为更自然的表述"""
    # 替换 "要A，要B，要C" → "要A、B、C"
    text = re.sub(r'要(.{2,20})，要(.{2,20})，要(.{2,20})', r'要\1、\2、\3', text)
    return text


def _add_concrete_markers(text: str) -> str:
    """在可操作化处增加具体性标记"""
    # 给空泛表述添加可操作建议标记
    vague_patterns = [
        (r'加强(.{2,10})工作', r'加强\1工作（明确具体措施和时限）'),
        (r'完善(.{2,10})机制', r'完善\1机制（指定牵头部门和完成节点）'),
    ]
    result = text
    for pat, repl in vague_patterns:
        # 只在natural模式提示，不强制修改原文
        if re.search(pat, result):
            result = re.sub(pat, repl, result)
    return result
