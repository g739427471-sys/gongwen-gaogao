"""
文稿审校服务 — 错别字、格式、敏感词、逻辑检查。
"""
from .llm_service import generate_full

SENSITIVE_WORDS = [
    # 敏感政治用语检查
    ("习近平主席", "应使用「习近平总书记」"),
    ("习总书记", "正式公文中应使用「习近平总书记」"),
    ("习大大", "正式公文中严禁使用，应使用「习近平总书记」"),
    ("中国梦", "注意语境，确保积极正面"),
    ("一国两制", "必须完整表述为「一国两制」方针"),
    # 常见错别字
    ("的得地", "注意「的」「地」「得」的正确使用"),
    ("截止", "「截止」后应加「到」，或改用「截至」"),
    ("其它", "公文中应使用「其他」"),
    ("做为", "应使用「作为」"),
    ("在即", "注意「在即」表示「即将到来」，不要错用"),
    # 不规范表述
    ("必须要", "可简化为「必须」"),
    ("进一步地", "可简化为「进一步」"),
    ("全部都", "可简化为「全部」或「都」"),
    ("目的是为了", "可简化为「目的是」或「为了」"),
    ("大概", "公文中避免使用模糊词语"),
    ("可能", "尽量用确定性表述替代"),
    ("差不多", "公文中避免使用"),
    ("也许", "公文中避免使用"),
]

COMMON_ERRORS = [
    {"pattern": "的的", "msg": "重复用字「的的」"},
    {"pattern": "了了", "msg": "重复用字「了了」"},
    {"pattern": "是是", "msg": "重复用字「是是」"},
    {"pattern": "，，", "msg": "重复标点"},
    {"pattern": "。。", "msg": "重复标点"},
    {"pattern": "！！", "msg": "感叹号在公文中不常用"},
    {"pattern": "？？", "msg": "问号在公文中不常用"},
]


async def audit_document(content: str) -> dict:
    """对文稿进行四项检查 + AI审核"""
    issues = []

    # 1. 基本错别字和标点检查
    for err in COMMON_ERRORS:
        if err["pattern"] in content:
            issues.append({"type": "typo", "severity": "low", "message": err["msg"]})

    # 2. 敏感词检查
    for word, advice in SENSITIVE_WORDS:
        if word in content:
            issues.append({"type": "sensitive", "severity": "high", "message": advice, "keyword": word})

    # 3. 基本格式检查
    if "一、" in content and "（一）" not in content and len(content) > 500:
        issues.append({"type": "format", "severity": "medium", "message": "较长文稿建议使用多级层次序数：一、（一）1.（1）"})

    if content.count("。") > 0:
        sentences = [s.strip() for s in content.split("。") if s.strip()]
        long_sentences = [s for s in sentences if len(s) > 120]
        if long_sentences:
            issues.append({"type": "readability", "severity": "low", "message": f"有{len(long_sentences)}个句子超过120字，建议拆分以增强可读性"})

    # 4. AI深度审核（逻辑、政治表述）
    try:
        prompt = f"""请对以下公文文稿进行审核，检查：
1. 政治表述是否准确（是否有不符合党中央最新精神的地方）
2. 逻辑是否严密（是否有前后矛盾、以偏概全、论证不充分的地方）
3. 语言是否规范（是否有口语化、不规范的表述）

文稿内容：
{content[:3000]}

请以JSON格式返回审核结果：
```json
{{"issues":[{{"type":"politics|logic|language","severity":"high|medium|low","message":"问题描述","suggestion":"修改建议","location":"定位到原文片段"}}],"summary":"总体评价（一句话）"}}
```

如果没有发现问题，返回空issues数组。不要编造不存在的问题。"""

        text = await generate_full(
            system_prompt="你是资深公文审校专家。你只输出JSON格式的审核结果。",
            user_message=prompt,
            max_tokens=2000,
            temperature=0.1,
        )

        import re, json
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            ai_result = json.loads(json_match.group(0))
            ai_issues = ai_result.get("issues", [])
            for issue in ai_issues:
                issue["type"] = f"ai_{issue.get('type', 'logic')}"
                issues.append(issue)
            summary = ai_result.get("summary", "")
        else:
            summary = ""
    except Exception:
        summary = ""

    # 统计
    return {
        "total_issues": len(issues),
        "issues": issues,
        "summary": summary or f"共发现{len(issues)}个问题",
        "categories": {
            "typo": len([i for i in issues if i["type"] == "typo"]),
            "sensitive": len([i for i in issues if i["type"] == "sensitive"]),
            "format": len([i for i in issues if i["type"] == "format"]),
            "logic": len([i for i in issues if "logic" in i.get("type", "")]),
            "politics": len([i for i in issues if "politics" in i.get("type", "")]),
        },
    }
