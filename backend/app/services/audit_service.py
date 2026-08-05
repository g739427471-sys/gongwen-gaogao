"""
五层深度审校服务 — 从字符到事实的全方位检测。

层1: 错别字与标点检测
层2: 语法病句检测
层3: 格式规范检测（GB/T 9704-2012）
层4: 敏感表述预警（内置敏感词库）
层5: 事实核验（标记待确认内容）
"""
import re
import json
from .llm_service import generate_full

# ========== 层1: 错别字与标点 ==========

TYPO_RULES = [
    ("的的","重复用字「的的」"), ("了了","重复用字「了了」"), ("是是","重复用字「是是」"),
    ("，，","重复逗号"), ("。。","重复句号"), ("！！","感叹号在公文中不宜使用"),
    ("？？","问号在公文中不宜使用"), ("：：","重复冒号"),
]

COMMON_TYPOS = {
    "截止": "「截止」后如不加「到」应改用「截至」",
    "其它": "公文中应使用「其他」",
    "做为": "应使用「作为」",
    "即然": "应使用「既然」",
    "在即": "注意「在即」表示即将到来",
    "必需": "区分「必须」(副词)和「必需」(动词)",
}

def _layer1_typo_check(content: str) -> list:
    """层1: 错别字与标点"""
    issues = []
    for pattern, msg in TYPO_RULES:
        if pattern in content:
            issues.append({"layer":1,"type":"typo","severity":"P2","message":msg})
    for word, fix in COMMON_TYPOS.items():
        if word in content:
            issues.append({"layer":1,"type":"typo","severity":"P2","message":f"「{word}」可能误用","suggestion":fix})
    return issues


# ========== 层2: 语法病句 ==========

def _layer2_grammar_check(content: str) -> list:
    """层2: 语法病句检测"""
    issues = []
    # 成分残缺
    if re.search(r'通过.{0,20}使', content):
        issues.append({"layer":2,"type":"grammar","severity":"P1","message":"「通过……使……」缺少主语","suggestion":"删去「通过」或「使」，补全主语"})
    # 搭配不当
    pairs = [("水平.{0,5}改善","「水平」应与「提高」搭配，非「改善」"),
             ("问题.{0,5}改善","「问题」应与「解决」搭配，非「改善」")]
    for p, msg in pairs:
        if re.search(p, content):
            issues.append({"layer":2,"type":"grammar","severity":"P1","message":msg})
    # 句式杂糅
    if re.search(r'之所以.{0,30}的原因', content):
        issues.append({"layer":2,"type":"grammar","severity":"P1","message":"「之所以……的原因」句式杂糅","suggestion":"改为「之所以……是因为」或「……的原因是……」"})
    return issues


# ========== 层3: 格式规范（GB/T 9704-2012） ==========

def _layer3_format_check(content: str) -> list:
    """层3: 格式规范检测"""
    issues = []
    # 层次序数
    has_chinese_num = bool(re.search(r'[一二三四五六七八九十]、', content))
    has_paren_num = bool(re.search(r'（[一二三四五六七八九十]）', content))
    has_arabic = bool(re.search(r'\d\.', content))
    if has_chinese_num and has_arabic and has_paren_num:
        pass  # 多级序数正确
    elif has_chinese_num and not has_paren_num and len(content) > 500:
        issues.append({"layer":3,"type":"format","severity":"P1","message":"较长文稿建议多级层次序数：一、（一）1.（1）"})

    # 标题中不应有逗号（检查假标题）
    for line in content.split('\n'):
        if re.match(r'^.{2,30}，', line):
            issues.append({"layer":3,"type":"format","severity":"P1","message":f"疑似标题中含逗号：{line[:40]}","suggestion":"公文标题中不应用逗号"})

    # 发文字号格式检查
    if re.search(r'〔\d{4}〕', content):
        pass  # 六角括号正确
    elif re.search(r'\[\d{4}\]|（\d{4}）|\(\d{4}\)', content):
        issues.append({"layer":3,"type":"format","severity":"P1","message":"发文字号年份应使用六角括号「〔〕」，非方括号或圆括号"})

    # 成文日期检查
    if re.search(r'\d{4}年\d{1,2}月\d{1,2}日', content):
        pass  # 汉字日期
    elif re.search(r'\d{4}-\d{2}-\d{2}', content):
        issues.append({"layer":3,"type":"format","severity":"P1","message":"成文日期应使用汉字小写数字，如「二〇二六年八月五日」","suggestion":"阿拉伯数字日期可用于附件、表格，正文成文日期应用汉字"})

    return issues


# ========== 层4: 敏感表述预警 ==========

SENSITIVE_DB = [
    ("习近平主席","正式公文应使用「习近平总书记」"),
    ("习总书记","正式公文应使用「习近平总书记」"),
    ("习大大","正式公文严禁使用"),
    ("两个确立","须完整表述：确立习近平同志党中央的核心、全党的核心地位，确立习近平新时代中国特色社会主义思想的指导地位"),
    ("两个维护","须完整表述"),
    ("四个意识","须完整表述：政治意识、大局意识、核心意识、看齐意识"),
    ("四个自信","须完整表述：道路自信、理论自信、制度自信、文化自信"),
    ("四个全面","须完整表述：全面建设社会主义现代化国家、全面深化改革、全面依法治国、全面从严治党"),
    ("五位一体","须完整表述：经济建设、政治建设、文化建设、社会建设、生态文明建设"),
    ("中国梦","注意语境，须积极正面"),
    ("一国两制","须完整表述为「一国两制」方针"),
    ("新疆","注意涉疆表述规范"),
    ("西藏","注意涉藏表述规范"),
    ("台湾","注意涉台表述规范，须使用「台湾地区」或「中国台湾」"),
    ("民主","注意语境，区分「全过程人民民主」「人民民主」等规范表述"),
]

def _layer4_sensitive_check(content: str) -> list:
    """层4: 敏感表述预警"""
    issues = []
    for term, advice in SENSITIVE_DB:
        if term in content:
            issues.append({"layer":4,"type":"sensitive","severity":"P0","message":f"政治术语「{term}」须核实","suggestion":advice})
    return issues


# ========== 层5: 事实核验 ==========

def _layer5_fact_check(content: str) -> list:
    """层5: 事实核验 — 标记需要用户确认的内容"""
    issues = []
    # 模糊词
    fuzzy = ["大概","可能","差不多","也许","左右","大约","估计","好像","似乎"]
    found = [w for w in fuzzy if w in content]
    if found:
        issues.append({"layer":5,"type":"fact","severity":"P0","message":f"模糊词语：{'、'.join(found)}","suggestion":"替换为精确数据或标记〖待补：…〗"})

    # 数据无来源
    if re.search(r'\d+%', content) or re.search(r'\d+亿元', content) or re.search(r'\d+万元', content):
        if not re.search(r'据|根据|统计|数据显示|来源', content):
            issues.append({"layer":5,"type":"fact","severity":"P0","message":"文中含数据但未标注来源","suggestion":"标注数据来源或标记〖待核：数据来源〗"})

    # 引用未标注
    if re.search(r'指出|强调|要求', content):
        if not re.search(r'习近平总书记|党中央|国务院|会议要求|文件指出', content):
            issues.append({"layer":5,"type":"fact","severity":"P0","message":"「指出/强调/要求」前未指明主体","suggestion":"明确「谁指出」，如「习近平总书记指出」"})

    # 占位符核查
    placeholders = re.findall(r'〖[^〗]+〗', content)
    if placeholders:
        issues.append({"layer":5,"type":"fact","severity":"P0","message":f"有{len(placeholders)}个占位符待处理：{', '.join(placeholders[:5])}","suggestion":"补充信息后定稿"})

    return issues


# ========== 审校主函数 ==========

async def audit_document(content: str, doc_type: str = "通用") -> dict:
    """五层深度审校"""
    all_issues = []

    # L1-L5 本地检测
    all_issues.extend(_layer1_typo_check(content))
    all_issues.extend(_layer2_grammar_check(content))
    all_issues.extend(_layer3_format_check(content))
    all_issues.extend(_layer4_sensitive_check(content))
    all_issues.extend(_layer5_fact_check(content))

    # AI深度补充审核
    summary = ""
    try:
        prompt = f"""请对以下公文稿件进行补充审核（P0/P1/P2分级）：

文稿类型：{doc_type}
文稿内容：
{content[:2500]}

检查重点（仅报告本地检测可能遗漏的问题）：
1. 政治表述是否完全准确？
2. 逻辑是否严密（前后矛盾、以偏概全、论证跳跃）？
3. 语言是否规范（口语、空话、套话、长句缠绕）？

输出JSON：
{{"issues":[{{"layer":6,"level":"P0|P1|P2","type":"ai_logic|ai_politics|ai_language","message":"问题描述","suggestion":"修改建议"}}],"summary":"总体评价"}}
如果没有问题返回空issues。"""

        text = await generate_full(
            system_prompt="你是资深公文审校专家，只输出JSON。不重复本地已检出的问题。",
            user_message=prompt, max_tokens=2000, temperature=0.1,
        )
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            ai = json.loads(json_match.group(0))
            all_issues.extend(ai.get("issues", []))
            summary = ai.get("summary", "")
    except Exception:
        pass

    # 统计
    cats = {"P0":0,"P1":0,"P2":0,"L1":0,"L2":0,"L3":0,"L4":0,"L5":0,"L6":0}
    for i in all_issues:
        lv = i.get("severity","") or i.get("level","")
        if lv in ("P0","P1","P2"): cats[lv] += 1
        layer = i.get("layer",0)
        if layer and f"L{layer}" in cats: cats[f"L{layer}"] += 1

    return {
        "total_issues": len(all_issues),
        "issues": all_issues,
        "summary": summary or f"L1:{cats['L1']} L2:{cats['L2']} L3:{cats['L3']} L4:{cats['L4']} L5:{cats['L5']}",
        "categories": cats,
    }


# ========== 润色增强 ==========

async def enhanced_refine(content: str, doc_type: str = "通用") -> dict:
    """增强润色：文风一致性+术语规范+逻辑连贯+精简度"""
    prompt = f"""请对以下公文稿件进行深度润色（{doc_type}），按以下四项逐项优化：

1. **文风一致性**：全文语气、句式、用词风格是否统一？发现不一致处统一调整。
2. **术语规范性**：政治术语是否准确？行业术语是否规范？不规范处逐一修正。
3. **逻辑连贯性**：段落之间过渡是否自然？逻辑链条是否完整？断裂处补过渡句。
4. **精简度**：逐句检查——删掉意思不变的句子，压缩冗余表述，替换空话套话为具体内容。

输出JSON：
{{"refined_content":"润色后全文","changes":[{{"aspect":"style|term|logic|compress","original":"原文","revised":"修改后","reason":"修改原因"}}],"suggestions":["改进建议"]}}"""

    text = await generate_full(
        system_prompt="你是资深公文审校专家，擅长让公文更加精炼、规范、好读。只输出JSON。",
        user_message=prompt, max_tokens=4000, temperature=0.2,
    )
    try:
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
    except Exception:
        pass
    return {"refined_content": content, "changes": [], "suggestions": ["润色未能完成，请重试"]}
