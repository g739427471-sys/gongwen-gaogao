"""
15 种法定公文文种的定义与规范。
"""
from dataclasses import dataclass, field
from typing import List


@dataclass
class DocType:
    """文种定义"""
    name: str           # 名称
    category: str       # 类别：上行文/下行文/平行文
    description: str    # 用途说明
    structure: List[str]  # 典型结构
    format_notes: str   # 格式注意事项


DOC_TYPES: dict = {
    "决议": DocType(
        name="决议",
        category="下行文",
        description="适用于会议讨论通过的重大决策事项。用于发布经会议讨论通过并要求贯彻执行的重要决策事项。",
        structure=["标题", "会议信息", "决议事项", "执行要求", "落款日期"],
        format_notes="标题需注明发文机关/会议名称、事由和文种；正文应明确决议事项和执行要求。",
    ),
    "决定": DocType(
        name="决定",
        category="下行文",
        description="适用于对重要事项作出决策和部署、奖惩有关单位和人员、变更或者撤销下级机关不适当的决定事项。",
        structure=["标题", "主送机关", "决定依据/背景", "决定事项", "执行要求", "发文机关+日期"],
        format_notes="决定事项应表述明确、措辞果断；奖惩决定需注明依据和具体措施。",
    ),
    "命令": DocType(
        name="命令",
        category="下行文",
        description="适用于公布行政法规和规章、宣布施行重大强制性措施、批准授予和晋升衔级、嘉奖有关单位和人员。",
        structure=["标题", "令号", "正文（命令事项）", "签署人+日期"],
        format_notes="命令具有最高权威性和强制性，用语必须简洁、肯定、不容置疑。",
    ),
    "公报": DocType(
        name="公报",
        category="下行文",
        description="适用于公布重要决定或者重大事项。用于公开发布重大事件或重要情况的正式报道。",
        structure=["标题", "正文（按时间或逻辑顺序陈述）", "落款"],
        format_notes="公报内容应客观、准确、全面，以事实陈述为主，一般不加评论。",
    ),
    "公告": DocType(
        name="公告",
        category="下行文",
        description="适用于向国内外宣布重要事项或者法定事项。",
        structure=["标题", "正文（公告事项+原因/依据+结束语）", "发文机关+日期"],
        format_notes="公告面向国内外，用语应庄重规范；正文简洁明了，一事一告。",
    ),
    "通告": DocType(
        name="通告",
        category="下行文",
        description="适用于在一定范围内公布应当遵守或者周知的事项。",
        structure=["标题", "正文（通告缘由+通告事项+结尾）", "发文机关+日期"],
        format_notes="通告具有约束力，需明确告知对象、事项范围和执行要求。",
    ),
    "意见": DocType(
        name="意见",
        category="下行文/上行文",
        description="适用于对重要问题提出见解和处理办法。可上行、下行或平行使用。",
        structure=["标题", "主送机关", "前言（背景+目的）", "具体意见（分条列项）", "结尾", "发文机关+日期"],
        format_notes="意见应有明确的指导性和可操作性；每条意见应有理有据。",
    ),
    "通知": DocType(
        name="通知",
        category="下行文",
        description="适用于发布、传达要求下级机关执行和有关单位周知或者执行的事项，批转、转发公文。",
        structure=["标题", "主送机关", "通知缘由", "通知事项（分条列项）", "执行要求", "发文机关+日期"],
        format_notes="通知事项应具体明确；如有附件需注明；执行要求应清晰到位。",
    ),
    "通报": DocType(
        name="通报",
        category="下行文",
        description="适用于表彰先进、批评错误、传达重要精神和告知重要情况。",
        structure=["标题", "主送机关", "正文（事实陈述+分析评价+决定/要求）", "发文机关+日期"],
        format_notes="事实应准确无误；分析评价应客观公正；决定应恰如其分。",
    ),
    "报告": DocType(
        name="报告",
        category="上行文",
        description="适用于向上级机关汇报工作、反映情况，回复上级机关的询问。",
        structure=["标题", "主送机关", "引言/背景", "主体（工作情况+成绩+问题）", "结尾（下一步打算）", "发文机关+日期"],
        format_notes="报告为上行文，用语应谦谨；以陈述为主，不夹带请示事项。",
    ),
    "请示": DocType(
        name="请示",
        category="上行文",
        description="适用于向上级机关请求指示、批准。",
        structure=["标题", "主送机关", "请示缘由", "请示事项", "结尾（妥否，请批示）", "发文机关+日期"],
        format_notes="请示必须一事一请；缘由充分、事项明确；结尾用语规范。",
    ),
    "批复": DocType(
        name="批复",
        category="下行文",
        description="适用于答复下级机关请示事项。",
        structure=["标题", "主送机关", "批复引语", "批复内容", "结尾", "发文机关+日期"],
        format_notes="批复应有明确的针对性和权威性；答复意见应具体、明确。",
    ),
    "议案": DocType(
        name="议案",
        category="平行文",
        description="适用于各级人民政府按照法律程序向同级人民代表大会或者人民代表大会常务委员会提请审议事项。",
        structure=["标题", "主送机关", "案由/背景", "审议事项", "结尾（请予审议）", "签署人+日期"],
        format_notes="议案须按法律程序提出；审议事项应明确具体、附有说明材料。",
    ),
    "函": DocType(
        name="函",
        category="平行文",
        description="适用于不相隶属机关之间商洽工作、询问和答复问题、请求批准和答复审批事项。",
        structure=["标题", "主送机关", "正文（缘由+事项+结尾语）", "发文机关+日期"],
        format_notes="函用语应平等、协商、礼貌；问题应表述清楚、便于对方答复。",
    ),
    "纪要": DocType(
        name="纪要",
        category="下行文/平行文",
        description="适用于记载会议主要情况和议定事项。",
        structure=["标题", "会议基本情况", "议定事项/主要精神", "结尾", "发文机关+日期"],
        format_notes="纪要应忠实反映会议内容；议定事项应明确责任主体和时限要求。",
    ),
}


def get_doc_type(name: str) -> DocType | None:
    """根据文种名称获取定义"""
    return DOC_TYPES.get(name)


def get_all_doc_types() -> List[DocType]:
    """获取所有文种定义"""
    return list(DOC_TYPES.values())


def get_doc_types_by_category() -> dict:
    """按类别获取文种分组"""
    categories = {"下行文": [], "上行文": [], "平行文": []}
    for dt in DOC_TYPES.values():
        cat = dt.category.split("/")[0]
        if cat in categories:
            categories[cat].append(dt)
        else:
            categories[cat] = [dt]
    return categories
