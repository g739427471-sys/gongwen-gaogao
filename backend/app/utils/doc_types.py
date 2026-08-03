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
    # ========== 常用事务性文书 ==========
    "工作总结": DocType(
        name="工作总结",
        category="常用文书",
        description="对过去一段时间工作情况进行回顾、分析和评价的书面材料。",
        structure=["标题", "引言（背景概述）", "主要成绩与做法", "存在问题与不足", "经验体会", "下一步打算", "落款"],
        format_notes="实事求是，数据准确；突出重点，详略得当；语言朴实，文字凝练。",
    ),
    "实施方案": DocType(
        name="实施方案",
        category="常用文书",
        description="为落实某项工作或任务而制定的具体操作性文件。",
        structure=["标题", "指导思想/总体要求", "目标任务", "实施步骤", "保障措施", "组织分工", "时间安排"],
        format_notes="任务明确、措施具体、责任清晰、时限明确；具有较强的可操作性。",
    ),
    "工作计划": DocType(
        name="工作计划",
        category="常用文书",
        description="对未来一段时间工作做出安排和部署的文书。",
        structure=["标题", "前言/依据", "目标任务", "重点工作", "进度安排", "保障措施", "责任分工"],
        format_notes="目标明确、重点突出、措施可行、时限合理；注重前瞻性和可操作性。",
    ),
    "汇报材料": DocType(
        name="汇报材料",
        category="常用文书",
        description="向上级或有关方面报告工作情况的书面材料。",
        structure=["标题", "引言", "工作进展情况", "主要做法和成效", "存在问题和困难", "下一步打算/建议"],
        format_notes="条理清晰、数据准确、实事求是；既报喜也报忧；重点突出、语言简洁。",
    ),
    "讲话稿": DocType(
        name="讲话稿",
        category="常用文书",
        description="在会议或活动上发表的讲话文稿。",
        structure=["标题", "称呼语", "开场白（背景/意义）", "主体内容（分层次阐述）", "结束语（号召/祝福）"],
        format_notes="口语化但不失庄重；层次清晰、逻辑严密；结合场合和听众特点；适当运用修辞。",
    ),
    "调研报告": DocType(
        name="调研报告",
        category="常用文书",
        description="对某一情况进行深入调查和研究后形成的书面报告。",
        structure=["标题", "调研背景/目的", "调研对象与方法", "基本情况", "问题分析", "对策建议", "结论"],
        format_notes="数据真实、分析深入、结论客观；问题找准、建议可行；逻辑严密、论证充分。",
    ),
    "述职报告": DocType(
        name="述职报告",
        category="常用文书",
        description="个人向组织或领导汇报履职情况的文书。",
        structure=["标题", "述职人信息", "履职情况（德能勤绩廉）", "存在问题与不足", "改进措施", "今后努力方向"],
        format_notes="实事求是、客观全面；成绩不夸大、问题不回避；结合岗位职责具体阐述。",
    ),
    "对照检查材料": DocType(
        name="对照检查材料",
        category="常用文书",
        description="对照标准要求进行自我检查和剖析的文书。",
        structure=["标题", "对照检查情况", "存在问题（分条列项）", "原因剖析", "整改措施", "努力方向"],
        format_notes="直面问题、不遮不掩；原因剖析深刻、触及思想；整改措施具体、有时限。",
    ),
    "心得体会": DocType(
        name="心得体会",
        category="常用文书",
        description="学习某内容后的个人感悟和收获。",
        structure=["标题", "引言（学习背景）", "主要收获（分条列项）", "思想认识提升", "今后努力方向"],
        format_notes="结合自身实际、真情实感；既有认识高度又有个人体会；避免空话套话。",
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
