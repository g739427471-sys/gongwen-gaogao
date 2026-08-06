"""
公文高高 — 提示词模板（极简版，速度优先）
设计原则：提示词越短 → 输入token越少 → 生成越快
"""
from ..utils.doc_types import get_doc_type


# ====================================================================
# 极简核心系统提示词（从 ~1500 token 压缩到 ~400 token）
# ====================================================================

SYSTEM_PROMPT = """你是资深党政机关公文撰稿人。严格遵循以下规则：

## 铁律
1. **防杜撰**：不确定的事实、数字、文号、人名、日期必须用`〖待补：内容〗`标记，绝不可编造。拿不准的引用用`〖待核对原文〗`标记。
2. **政治准确**：习近平总书记论述、党中央重大判断须原原本本引用，标注出处。
3. **口语转公文**：避免口语化表达，「尽快」→「于X月X日前」，「大家努力」→「全体同志积极工作」。
4. **删空话套话**：删掉意思不变的句子，替换放哪都适用的套话。

## 关键文种规则
- **请示**：一文一事，单主送，结尾「妥否，请批示」
- **报告**：陈述为主，不夹带请示，重数据+成效+问题+打算
- **函**：平等协商语气，绝不混用请示口吻
- **纪要**：第三人称（会议认为/决定/要求），只写议定事项
- **通知**：分条列项，有落实要求

输出JSON（不含```json标记）：
{"title":"标题","framework":[{"level":1,"title":"一、标题","key_points":["要点"]}],"content":"正文(Markdown)","references":["出处"]}
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
        for item in framework:
            prefix = "  " * (item.get("level", 1) - 1)
            fw_lines.append(f"{prefix}- {item.get('title', '')}")

    lines = [f"撰写关于「{topic}」的{ad}。"]
    if kw: lines.append(f"关键词：{kw}")

    # 文种规则（只加入当前文种相关的）
    if dt:
        lines.append(f"文种要求：{dt.description}。结构：{' → '.join(dt.structure)}。{dt.format_notes}")
        if ad == "请示": lines.append("硬性要求：一文一事、单主送、标签发人，结尾须有请求语。")
        elif ad == "报告": lines.append("硬性要求：陈述为主、不得夹带请示事项。")
        elif ad == "函": lines.append("硬性要求：平等协商语气，绝不混用请示口吻。")
        elif ad == "纪要": lines.append("硬性要求：第三人称，只写议定事项。")

    if fw_lines:
        lines.append("框架：\n" + "\n".join(fw_lines))

    if knowledge_context and knowledge_context.strip():
        # 知识库只取前800字
        ctx = knowledge_context.strip()[:800]
        lines.append(f"参考资料（引用相关事实）：\n{ctx}")

    if custom_instructions and custom_instructions.strip():
        # 自定义指令也截断
        ci = custom_instructions.strip()[:500]
        lines.append(f"补充要求：\n{ci}")

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
