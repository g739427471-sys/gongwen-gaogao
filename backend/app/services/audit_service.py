"""
文稿审校服务 — 深度融合 negative-checklist.md 的 P0/P1/P2 分级。
P0 = 事实/文种/政策硬伤 / P1 = 格式/行文规则 / P2 = 语言/标点
"""
import re
from .llm_service import generate_full

# ========== P0 硬项 ==========

def _check_genre_rules(content: str, doc_type: str) -> list:
    """文种与行文规则检查"""
    issues = []
    if doc_type == "请示":
        if "报告" in content[:200] and "请示" not in content[:200]:
            issues.append({"type":"genre","severity":"P0","message":"请示不得夹带大段汇报内容","suggestion":"请示重在'请求什么'，工作情况简要说明即可"})
    elif doc_type == "报告":
        if "请批示" in content or "请批准" in content or "请审示" in content:
            issues.append({"type":"genre","severity":"P0","message":"报告中似乎包含请示事项——报告不得夹带请示。如有请求事项，应改文种为请示或单独行文","suggestion":"去掉请示语，或改用请示文种"})
    return issues


def _check_facts(content: str) -> list:
    """事实/数据风险检查"""
    issues = []
    fuzzy_words = ["大概","可能","差不多","也许","左右","大约","估计","好像","似乎"]
    found = [w for w in fuzzy_words if w in content]
    if found:
        issues.append({"type":"fact","severity":"P0","message":f"发现模糊词语：{'、'.join(found)}。公文中必须用精确表述或〖待补：…〗占位符","suggestion":"替换为精确数据，或标记〖待补：具体数值〗"})
    return issues


def _check_politics(content: str) -> list:
    """政治性表述检查"""
    issues = []
    checks = {
        "习近平主席": "正式公文应使用「习近平总书记」",
        "习总书记": "正式公文应使用「习近平总书记」",
        "习大大": "正式公文严禁使用",
        "两个确立": "必须完整表述为「两个确立」：确立习近平同志党中央的核心、全党的核心地位，确立习近平新时代中国特色社会主义思想的指导地位",
        "两个维护": "必须完整表述",
        "四个意识": "必须完整表述：政治意识、大局意识、核心意识、看齐意识",
        "四个自信": "必须完整表述：道路自信、理论自信、制度自信、文化自信",
    }
    for term, advice in checks.items():
        if term in content:
            issues.append({"type":"politics","severity":"P0","message":f"政治术语「{term}」需核实","suggestion":advice})
    return issues


# ========== P1 硬项 ==========

def _check_format(content: str) -> list:
    """格式与版式检查"""
    issues = []
    # 层次序数检查
    has_dunhao = bool(re.search(r'[一二三四五六七八九十]、', content))
    has_kuohao = bool(re.search(r'（[一二三四五六七八九十]）', content))
    if has_dunhao and not has_kuohao and len(content) > 500:
        issues.append({"type":"format","severity":"P1","message":"较长文稿建议使用多级层次序数：一、（一）1.（1）","suggestion":"在一、之下增加（一）层次"})
    # 假标题三要素
    # (skip complex check for now)
    return issues


def _check_logic(content: str) -> list:
    """逻辑检查"""
    issues = []
    # 前后矛盾检测
    if "显著成效" in content and "问题依然突出" in content:
        issues.append({"type":"logic","severity":"P1","message":"可能前后矛盾：既说'显著成效'又说'问题突出'","suggestion":"用具体数据区分：哪些方面成效显著，哪些方面还有问题"})
    # 长句
    sentences = [s.strip() for s in re.split(r'[。！？]', content) if s.strip()]
    long_ones = [s for s in sentences if len(s) > 120]
    if len(long_ones) > 3:
        issues.append({"type":"logic","severity":"P1","message":f"有{len(long_ones)}个句子超过120字，影响可读性","suggestion":"长句拆分，断句点放在语义完整处"})
    return issues


# ========== P2 语言 ==========

def _check_language(content: str) -> list:
    """语言十弊检查"""
    issues = []
    # 空话套话
    empty_phrases = {
        "高度重视": "删掉意思不变→空话。如确有必要，后面必须有具体措施支撑",
        "切实加强": "同上。换成具体做了什么",
        "大力推进": "同上。换成具体怎么推的",
        "进一步": "是否真的'进一步'？如果是第一次做，不能用'进一步'",
        "要……要……要……": "过度使用祈使句式，显得单调",
    }
    for phrase, advice in empty_phrases.items():
        if content.count(phrase) >= 3:
            issues.append({"type":"language","severity":"P2","message":f"「{phrase}」出现{content.count(phrase)}次，疑似空话堆砌","suggestion":advice})

    # 口语
    oral_words = {"大家":"建议用「全体同志」","挺好":"删除或改「良好」","不错":"改「较好」或「显著」","很多":"改具体数字或「大量」"}
    for word, fix in oral_words.items():
        if word in content:
            issues.append({"type":"language","severity":"P2","message":f"口语词「{word}」","suggestion":fix})

    # 的的不休
    de_count = content.count("的")
    if len(content) > 500 and de_count / len(content) > 0.06:
        issues.append({"type":"language","severity":"P2","message":"「的」字密度过高（每百字约6个），句子可能缠绕","suggestion":"检查定语嵌套，拆分为短句"})

    return issues


def _check_placeholders(content: str) -> list:
    """占位符检查"""
    issues = []
    markers = {"〖待补：":"待补","〖示意·待核〗":"示意·待核","〖待核对原文〗":"待核对原文"}
    found = []
    for marker, label in markers.items():
        count = content.count(marker)
        if count > 0:
            found.append(f"{label}×{count}")
    if found:
        issues.append({"type":"placeholder","severity":"P0","message":f"文稿中有未处理的占位符：{'、'.join(found)}","suggestion":"请补充对应信息后定稿"})
    return issues


# ========== 主审校函数 ==========

async def audit_document(content: str, doc_type: str = "通用") -> dict:
    """四层审校：P0硬项→P1格式→P2语言→AI深度"""
    all_issues = []

    # P0: 事实/文种/政策
    all_issues.extend(_check_genre_rules(content, doc_type))
    all_issues.extend(_check_facts(content))
    all_issues.extend(_check_politics(content))
    all_issues.extend(_check_placeholders(content))

    # P1: 格式/逻辑
    all_issues.extend(_check_format(content))
    all_issues.extend(_check_logic(content))

    # P2: 语言
    all_issues.extend(_check_language(content))

    # AI深度审核
    summary = ""
    try:
        prompt = f"""请对以下公文文稿进行审核（P0/P1/P2分级）：

P0硬项（事实/数据/政策/文种）：是否有文种错误？是否有数据不实？是否有政治表述问题？
P1硬项（格式/逻辑）：层次序数是否规范？是否有前后矛盾、以偏概全？
P2（语言/标点）：是否有口语、空话、套话？是否有标点错误？

文稿（{doc_type}）：
{content[:2500]}

输出JSON：
{{"issues":[{{"level":"P0|P1|P2","type":"genre|fact|politics|format|logic|language","message":"问题描述","suggestion":"修改建议"}}],"summary":"总体评价"}}
如果没有发现问题，issues返回空数组。"""

        text = await generate_full(
            system_prompt="你是资深公文审校专家。你只输出JSON。",
            user_message=prompt, max_tokens=2000, temperature=0.1,
        )
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            import json
            ai = json.loads(json_match.group(0))
            for issue in ai.get("issues", []):
                issue["type"] = f"ai_{issue.get('type','logic')}"
                all_issues.append(issue)
            summary = ai.get("summary", "")
    except Exception:
        summary = ""

    # 分类统计
    cats = {"P0":0,"P1":0,"P2":0,"genre":0,"fact":0,"politics":0,"format":0,"logic":0,"language":0,"placeholder":0}
    for i in all_issues:
        lv = i.get("severity","") or i.get("level","")
        if lv in ("P0","P1","P2"): cats[lv] += 1
        tp = i.get("type","")
        if tp in cats: cats[tp] += 1
        elif "genre" in tp: cats["genre"] += 1
        elif "fact" in tp: cats["fact"] += 1
        elif "politics" in tp: cats["politics"] += 1
        elif "format" in tp: cats["format"] += 1
        elif "logic" in tp: cats["logic"] += 1
        elif "language" in tp: cats["language"] += 1
        elif "placeholder" in tp: cats["placeholder"] += 1

    return {
        "total_issues": len(all_issues),
        "issues": all_issues,
        "summary": summary or f"P0:{cats['P0']}个 P1:{cats['P1']}个 P2:{cats['P2']}个",
        "categories": cats,
    }
