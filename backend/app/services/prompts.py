"""
公文高高 — 提示词模板（极简版，速度优先）
设计原则：提示词越短 → 输入token越少 → 生成越快
"""
from ..utils.doc_types import get_doc_type


# ====================================================================
# 极简核心系统提示词（从 ~1500 token 压缩到 ~400 token）
# ====================================================================

SYSTEM_PROMPT = """你是资深党政机关公文撰稿人。

## 写作铁律
1. **防杜撰**：不确定的事实、数字、文号、人名、日期用`〖待补：内容〗`标记，绝不可编造。
2. **政治准确**：习近平总书记论述、党中央重大判断须原原本本引用，标注出处。
3. **去口语**：避免口语化表达，「尽快」→「于X月X日前」。
4. **去空话**：删掉意思不变的句子，替换放哪都适用的套话。

## 关键文种规则
- 请示：一文一事，单主送，结尾「妥否，请批示」
- 报告：陈述为主，不夹带请示，重数据+成效+问题+打算
- 函：平等协商语气，绝不混用请示口吻
- 纪要：第三人称（会议认为/决定/要求），只写议定事项
- 通知：分条列项，有落实要求

## 输出要求
你收到的是一个大纲框架。请基于大纲中每个章节的标题和要点，**展开成完整的段落内容**。每个章节写2-4个完整段落，包括理论阐述、具体做法、成效总结等。输出纯文本/Markdown格式的完整文稿，不要输出JSON。
"""

# 框架生成用轻量提示词
FRAMEWORK_SYSTEM_PROMPT = """你是资深公文撰稿人。根据主题和文种快速生成写作框架（大纲）。

规则：框架只给骨架不展开正文；不确定处用`〖待补：…〗`标记；根据文种选择合适结构。

输出JSON：
{"title_suggestion":"标题建议","framework":[{"level":1,"title":"一、标题","key_points":["要点1","要点2"]}]}
"""

# 自然风格额外指令
NATURAL_STYLE_APPENDIX = """
## 自然风格
避免「首先其次最后」「一是二是三是」等套路关联词。语言有温度有人味，但政治表述一丝不苟。
"""

# 润色用
REFINE_SYSTEM_PROMPT = """你是公文审校专家。按P0→P1→P2优先级润色：
P0：事实/政策是否准确？占位符是否标记？
P1：逻辑/结构/格式（GB/T 9704）
P2：语言规范（去口语/空话/套话）

输出JSON：
{"refined_content":"润色后全文","changes_summary":["修改点"],"issues_found":["问题"],"suggestions":["建议"]}
"""


# ====================================================================
# User Message 构建函数（极简版）
# ====================================================================

def build_framework_user_message(
    topic: str, doc_type: str, keywords: list = None, knowledge_context: str = "",
) -> str:
    dt = get_doc_type(doc_type) if doc_type and doc_type not in ("通用/自动", "通用") else None
    structure = f"结构：{' → '.join(dt.structure)}" if dt else ""
    kw = "、".join(keywords) if keywords else ""

    lines = [f"为「{topic}」生成{actual_doc(doc_type)}框架。"]
    if kw: lines.append(f"关键词：{kw}")
    if structure: lines.append(structure)
    if knowledge_context and knowledge_context.strip():
        # 知识库只取前600字
        ctx = knowledge_context.strip()[:600]
        lines.append(f"参考：\n{ctx}")
    return "\n".join(lines)


def build_content_user_message(
    topic: str, doc_type: str, keywords: list = None,
    framework: list = None, knowledge_context: str = "", custom_instructions: str = "",
) -> str:
    ad = actual_doc(doc_type)
    dt = get_doc_type(ad)
    kw = "、".join(keywords) if keywords else ""

    # 框架行
    fw_lines = []
    if framework:
        for i, item in enumerate(framework):
            prefix = "  " * (item.get("level", 1) - 1)
            fw_lines.append(f"{prefix}- {item.get('title', '')}")
            kps = item.get('key_points', [])
            if kps:
                fw_lines.append(f"{prefix}  （要点：{'；'.join(kps)}）")

    lines = [
        f"请撰写一篇完整的{ad}。主题：「{topic}」。",
        "",
        "**重要：请逐章展开完整段落。每个章节写2-4个自然段，每段3-5句话。**",
        "**内容要有实质信息：理论依据、具体做法、实际成效、数据支撑。**",
        "**『××』是占位符标记，你必须用合理的内容替换它们，不要照搬。**",
        "",
    ]
    if kw: lines.append(f"关键词：{kw}")

    if dt:
        lines.append(f"{ad}要求：{dt.description}。结构：{' → '.join(dt.structure)}。{dt.format_notes}")

    if fw_lines:
        lines.append("大纲框架：\n" + "\n".join(fw_lines))

    if knowledge_context and knowledge_context.strip():
        ctx = knowledge_context.strip()[:800]
        lines.append(f"参考资料：\n{ctx}")

    if custom_instructions and custom_instructions.strip():
        ci = custom_instructions.strip()[:500]
        lines.append(f"补充要求：{ci}")

    lines.append("\n请直接输出完整文稿正文（含标题），不要输出JSON格式。")
    return "\n".join(lines)


def build_refine_user_message(content: str, doc_type: str = "通知", instructions: str = "") -> str:
    ad = actual_doc(doc_type)
    msg = f"润色以下{ad}文稿。\n\n原文：\n{content[:4000]}"
    if instructions:
        msg += f"\n\n要求：{instructions[:300]}"
    return msg


def actual_doc(doc_type: str) -> str:
    if not doc_type or doc_type in ("通用/自动", "通用"):
        return "文章"
    return doc_type
