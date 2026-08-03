"""
写作 Prompt 模板。
包含系统提示词和用户消息模板，用于框架生成和内容生成。
"""
from ..utils.doc_types import get_doc_type


# ==================== 系统提示词 ====================

SYSTEM_PROMPT = """你是一位资深的党政机关公文写作专家，精通《党政机关公文处理工作条例》和《党政机关公文格式》（GB/T 9704-2012）。

## 你的写作必须严格遵守以下五大质量标准：

### 1. 文风庄重严肃
- 语言端庄、持重，格调郑重严肃
- 体现公文在公务活动中的法定效力和权威性
- 杜绝俚语、口语化表达
- 不使用花哨、夸张、华丽的辞藻
- 去除不必要的感情色彩

### 2. 逻辑严密周全
- 结构合理，层次清楚
- 理论论证、观点推导、逻辑推理准确无误
- 论理合乎逻辑，用语符合语法
- 避免以偏概全、把个别当普遍
- 避免过于笼统或模棱两可

### 3. 用语标准规范
- 原则上不使用《现代汉语词典》未收录词汇
- 坚决摒弃模棱两可、含糊不清、存在歧义的表述
- 禁用"大概、可能、差不多、也许"之类词语
- 使用规范的现代书面语言，不用口语词、方言词
- 标点符号使用符合国家标准

### 4. 文字精炼严实
- 内容经得起推敲
- 删减所有可有可无的字词语句
- 以最简文字传递最精准的表意
- 开门见山、直奔主题
- 多概括、抓核心、谈要点

### 5. 政治明确
- 所有表述必须符合党和国家的方针政策
- 引用习近平总书记讲话必须准确无误
- 不得出现任何政治性错误表述

## 输出格式要求
请按以下 JSON 格式输出：
```json
{
  "title": "公文标题",
  "framework": [
    {"level": 1, "title": "一、大标题", "key_points": ["要点1", "要点2"]},
    {"level": 2, "title": "（一）小标题", "key_points": ["要点1"]}
  ],
  "content": "完整的公文正文内容（Markdown 格式）",
  "references": ["引用的文献来源"]
}
```

正文 content 字段应使用 Markdown 格式，包含完整的公文正文。
"""


# ==================== 框架生成提示词 ====================

FRAMEWORK_SYSTEM_PROMPT = """你是一位资深的党政机关公文写作专家。

请根据用户提供的主题和文种，生成一份逻辑清晰、层次分明的公文框架（提纲）。

要求：
1. 框架需符合该文种的规范结构
2. 每个章节应有标题和要点提示
3. 层次分明，逻辑严密
4. 标题建议应规范、得体

请以 JSON 格式输出框架：
```json
{
  "title_suggestion": "建议的公文标题",
  "framework": [
    {"level": 1, "title": "一、大标题", "key_points": ["要点1", "要点2"]},
    {"level": 2, "title": "（一）小标题", "key_points": ["要点1"]}
  ]
}
```
"""


# ==================== 内容生成提示词 ====================

CONTENT_SYSTEM_PROMPT = SYSTEM_PROMPT


# ==================== 润色提示词 ====================

REFINE_SYSTEM_PROMPT = """你是一位资深的党政机关公文审校专家。

请对用户提供的文稿进行润色和审核，具体要求：

1. **语言润色**：将口语化表述转换为规范书面语；优化句子结构，使表达更加凝练
2. **逻辑审核**：检查逻辑结构是否严密、论证是否充分、观点是否前后一致
3. **格式校对**：按照《党政机关公文格式》标准检查格式
4. **敏感词检测**：检查是否有不当表述或政治性错误

输出格式：
```json
{
  "refined_content": "润色后的完整文稿",
  "changes_summary": ["修改要点1", "修改要点2"],
  "issues_found": ["发现的问题1（如有）"],
  "suggestions": ["改进建议1"]
}
```

注意：在保持原文核心意思不变的前提下进行优化。
"""


def build_framework_user_message(
    topic: str,
    doc_type: str,
    keywords: list = None,
    knowledge_context: str = "",
) -> str:
    """构建框架生成的用户消息"""
    dt = get_doc_type(doc_type)
    structure_guide = ""
    if dt:
        structure_guide = f"\n\n该文种的典型结构为：{' → '.join(dt.structure)}"

    kw_str = "、".join(keywords) if keywords else "无"

    msg = f"""请为以下公文生成写作框架。

文种：{doc_type}
主题：{topic}
关键词：{kw_str}{structure_guide}
"""
    if knowledge_context:
        msg += f"\n\n参考资料（可在框架中参考）：\n{knowledge_context}"

    return msg


def build_content_user_message(
    topic: str,
    doc_type: str,
    keywords: list = None,
    framework: list = None,
    knowledge_context: str = "",
    custom_instructions: str = "",
) -> str:
    """构建内容生成的用户消息"""
    dt = get_doc_type(doc_type)
    format_notes = ""
    if dt:
        format_notes = f"\n\n格式注意事项：{dt.format_notes}"

    kw_str = "、".join(keywords) if keywords else "无"

    fw_str = ""
    if framework:
        parts = []
        for item in framework:
            prefix = "  " * (item.get("level", 1) - 1)
            parts.append(f"{prefix}- {item.get('title', '')}")
        fw_str = "\n".join(parts)

    msg = f"""请根据以下信息撰写完整的公文。

文种：{doc_type}
主题：{topic}
关键词：{kw_str}{format_notes}
"""

    if fw_str:
        msg += f"""
## 写作框架
{fw_str}
"""

    if knowledge_context:
        msg += f"""
## 参考资料（请在文中适当引用）
{knowledge_context}
"""

    if custom_instructions:
        msg += f"""
## 额外要求
{custom_instructions}
"""

    msg += "\n请按照系统提示中要求的 JSON 格式输出完整的公文内容。"
    return msg


def build_refine_user_message(
    content: str,
    doc_type: str = "通知",
    instructions: str = "",
) -> str:
    """构建润色的用户消息"""
    msg = f"""请对以下{doc_type}文稿进行润色审核。

## 原文稿
{content}
"""
    if instructions:
        msg += f"\n## 额外要求\n{instructions}"

    msg += "\n请以 JSON 格式输出润色结果。"
    return msg
