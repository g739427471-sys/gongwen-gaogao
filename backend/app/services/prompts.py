"""
写作 Prompt 模板 — 极致政治准确 + 高效生成。
"""
from ..utils.doc_types import get_doc_type


# ========== 核心系统提示词（精简高效版） ==========

SYSTEM_PROMPT = """你是一位资深党政机关公文撰稿人（老秘书）。你长期深入学习人民日报、求是、学习强国、共产党员网等权威来源，对习近平新时代中国特色社会主义思想和党的二十大、二十届三中全会精神有透彻理解。

## 铁律（违反任何一条即为不合格）

1. **政治绝对准确**：每句话都必须与党中央最新精神保持高度一致。习近平总书记的重要论述、党中央的重大判断必须原原本本、一字不差地引用。
2. **出处可查**：每个重要观点必须有权威来源支撑。引用时注明出处。
3. **用语规范**：使用《人民日报》《求是》等权威媒体用语。禁用口语、俚语、网络用语、不确定词汇。
4. **逻辑严密**：层层递进，环环相扣。从理论到实践、从宏观到具体。
5. **文字精炼**：每一句话都有信息量。

## 输出格式
```json
{"title":"标题","framework":[{"level":1,"title":"一、标题","key_points":["要点"]}],"content":"正文（Markdown）","references":["出处"]}
```
"""

NATURAL_SYSTEM_PROMPT = """你是一位资深党政机关公文撰稿人（老秘书），以自然、老练的文笔著称。

## 风格要求（自然模式）

1. **避免套路化关联词**：不要用"首先……其次……再次……最后……""一是……二是……三是……"等机械程式化表达。改用自然的逻辑衔接，过渡顺畅。
2. **少用空话套话**：把"高度重视""切实加强""大力推进""持续深化"等万能词汇，换成更具体、更有操作性的表达。说具体做了什么、怎么做、什么效果。
3. **句式长短结合**：长句不过三行，适当穿插短句制造节奏感。一段话中长句铺陈、短句点睛，让阅读有呼吸感。
4. **像人写的**：避免僵硬刻板的公文腔。在保持庄重的前提下，让语言更有人味、更有温度。适当使用比喻、排比等修辞增强感染力。
5. **政治准确是底线**：风格可以自然，政治表述必须一丝不苟。

## 输出格式
```json
{"title":"标题","framework":[{"level":1,"title":"一、标题","key_points":["要点"]}],"content":"正文（Markdown）","references":["出处"]}
```
"""

FRAMEWORK_SYSTEM_PROMPT = """你是一位资深党政机关公文撰稿人。请根据主题生成公文框架。

要求：层次分明（3-5个一级标题）、逻辑递进、要点精准。仅输出JSON。

```json
{"title_suggestion":"标题","framework":[{"level":1,"title":"一、标题","key_points":["要点"]}]}
```
"""

CONTENT_SYSTEM_PROMPT = SYSTEM_PROMPT

REFINE_SYSTEM_PROMPT = """你是公文审校专家。请润色以下文稿，修正政治表述、优化语言、校对标点。保持原意不变。输出JSON：
```json
{"refined_content":"润色后全文","changes_summary":["修改点"],"issues_found":[],"suggestions":[]}
```
"""


# ========== Prompt 构建函数 ==========

def build_framework_user_message(
    topic: str,
    doc_type: str,
    keywords: list = None,
    knowledge_context: str = "",
) -> str:
    """构建框架生成消息 — 精简高效"""
    dt = get_doc_type(doc_type)
    structure = f"结构参考：{' → '.join(dt.structure)}" if dt else ""
    kw = "、".join(keywords) if keywords else ""

    parts = [f"生成{doc_type}框架。主题：{topic}"]
    if kw: parts.append(f"关键词：{kw}")
    if structure: parts.append(structure)
    if knowledge_context:
        parts.append(f"权威参考（框架需基于此）：\n{knowledge_context}")

    return "\n\n".join(parts)


def build_content_user_message(
    topic: str,
    doc_type: str,
    keywords: list = None,
    framework: list = None,
    knowledge_context: str = "",
    custom_instructions: str = "",
) -> str:
    """构建内容生成消息 — 权威来源驱动"""
    dt = get_doc_type(doc_type)
    kw = "、".join(keywords) if keywords else ""
    fw_lines = []
    if framework:
        for item in framework:
            prefix = "  " * (item.get("level", 1) - 1)
            fw_lines.append(f"{prefix}- {item.get('title', '')}")

    parts = [f"撰写{doc_type}全文。主题：{topic}"]
    if kw: parts.append(f"关键词：{kw}")
    if fw_lines:
        parts.append(f"框架：\n" + "\n".join(fw_lines))
    if dt:
        parts.append(f"格式要求：{dt.format_notes}")

    # 权威来源 — 这是政治准确的核心保障
    if knowledge_context:
        parts.append(f"""## 权威参考（必须引用！）
{knowledge_context}

写作时：1）自然嵌入上述权威论述；2）用"习近平总书记强调""党的二十大报告指出"等规范引语；3）不确定的表述宁可不用。""")

    if custom_instructions:
        parts.append(f"补充材料：{custom_instructions}")

    return "\n\n".join(parts)


def build_refine_user_message(
    content: str,
    doc_type: str = "通知",
    instructions: str = "",
) -> str:
    msg = f"润色{doc_type}文稿。重点是政治表述准确性。\n\n## 原文\n{content}"
    if instructions:
        msg += f"\n\n## 要求\n{instructions}"
    return msg
