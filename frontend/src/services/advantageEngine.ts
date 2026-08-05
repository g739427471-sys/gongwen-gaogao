/** 优势鉴别引擎 — 自动判断更新是否构成卖点+生成文案 */
import updateData from '../data/updates.json'

export interface UpdateRecord {
  id: string; version: string; date: string; type: string; description: string
  isMajor: boolean; isAdvantage: boolean | null
  advantageTitle: string; advantageSubtitle: string; advantageDesc: string
  displayOnLogin: boolean; displayOnHome: boolean; displayOrder: number
}

/** 5条鉴别规则 */
export function scoreAdvantage(update: UpdateRecord): { score: number; checks: boolean[] } {
  const desc = update.description + update.advantageTitle + update.advantageDesc
  const checks = [
    /*规则1: 创新性*/    /学习|风格|AI味|分步|大纲|审校|五层|知识库|引擎/.test(desc),
    /*规则2: 用户可感知*/ /生成|写|读|检测|导出|自动|确认|调用/.test(desc),
    /*规则3: 解决痛点*/   /空话|套话|错别字|格式|敏感|规范|靠谱|一次性/.test(desc),
    /*规则4: 差异化*/     /专属|独有|率先|引擎|系统学习|分步协作/.test(desc),
    /*规则5: 可传播*/     desc.length > 0 && update.advantageTitle.length <= 10,
  ]
  return { score: checks.filter(Boolean).length, checks }
}

/** 生成卖点文案 */
export function generateAdvantageText(update: UpdateRecord): { title: string; subtitle: string; desc: string } {
  const d = update.description
  // 提取标题关键词
  const titleMap: Record<string,string> = {
    '学习': '会学习的专属文秘', '风格': '会学习的专属文秘',
    'AI味': '去AI味引擎', '套话': '去AI味引擎', '排比': '去AI味引擎',
    '大纲': '分步协作写作', '逐段': '分步协作写作', '分步': '分步协作写作',
    '审校': '智能审校排版', '格式': '智能审校排版', '导出': '智能审校排版',
    '知识库': '权威知识库支撑', '政策': '权威知识库支撑', '来源': '权威知识库支撑',
  }
  let title = '新增实用功能'
  for (const [k, v] of Object.entries(titleMap)) {
    if (d.includes(k)) { title = v; break }
  }

  const subtitleMap: Record<string,string> = {
    '学习': '越用越像你写的', '风格': '越用越像你写的',
    'AI味': '内容自然务实', '套话': '内容自然务实',
    '大纲': '先确认大纲再动笔', '确认': '先确认大纲再动笔',
    '审校': '一键检测符合国标', '导出': '一键检测符合国标',
    '知识库': '写材料有据可依', '政策': '写材料有据可依',
  }
  let subtitle = '更高效更好用'
  for (const [k, v] of Object.entries(subtitleMap)) {
    if (d.includes(k)) { subtitle = v; break }
  }

  return { title, subtitle, desc: d.length <= 30 ? d : d.slice(0, 27) + '...' }
}

/** 图标匹配 */
export function getAdvantageIcon(title: string): string {
  if (/学习|风格|习惯/.test(title)) return '🎯'
  if (/AI|味|自然|人味/.test(title)) return '✨'
  if (/分步|大纲|确认/.test(title)) return '📝'
  if (/审校|排版|格式/.test(title)) return '🔍'
  if (/知识|政策|讲话/.test(title)) return '📚'
  return '⭐'
}

/** 读取所有卖点 */
export function getAdvantages(): UpdateRecord[] {
  return (updateData.updates as UpdateRecord[])
    .filter(u => u.isAdvantage)
    .sort((a, b) => a.displayOrder - b.displayOrder)
}

/** 读取登录页卖点 */
export function getLoginAdvantages(): UpdateRecord[] {
  return getAdvantages().filter(u => u.displayOnLogin).slice(0, 6)
}

/** 读取首页卖点 */
export function getHomeAdvantages(): UpdateRecord[] {
  return getAdvantages().filter(u => u.displayOnHome).slice(0, 6)
}
