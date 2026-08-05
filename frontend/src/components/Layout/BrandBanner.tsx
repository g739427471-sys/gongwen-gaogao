/**
 * 品牌展示横幅 — 顶部提示语，可折叠但不完全消失。
 * 折叠后保留标题行，点击可展开。状态存入 localStorage。
 */
import { useState, useEffect } from 'react'
import { Brain, Sparkles, Users, Shield, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

const CAPABILITIES = [
  { id: 'learn', icon: Brain, label: '会学习',
    title: '会学习的专属文秘',
    description: '系统分析您每次对文稿的修改——替换了哪些词、调整了哪种句式、删了什么内容。累计学习足够样本后，生成的文稿会越来越像您自己写的。',
    detail: '已学习 X 次后可自动激活，后续生成都会参考您的写作偏好。随时可在个人设置中重置。',
  },
  { id: 'deai', icon: Sparkles, label: '去AI味',
    title: '去AI味引擎',
    description: '内置AI味词库和句式黑名单，自动识别并改写程式化连接词（首先·其次·最后）、空话套话（高度重视·切实加强）、排比堆砌和长句缠绕。分三档调节：官方·标准·自然。',
    detail: '"自然"模式下全面改写——拆分长句、减少排比、增加具体化表述。每一处改写都有评分对比，效果可量化。',
  },
  { id: 'step', icon: Users, label: '分步写',
    title: '渐进式分步写作',
    description: '不像其他工具一次性倒出全文——公文高高像真人秘书一样：先生成大纲→您确认结构→再逐章填充正文。每一步您都可以修改、重来或跳过。',
    detail: '支持「极速模式」（一键生成）和「步骤模式」（分步确认）。长文稿（3000字以上）自动建议使用步骤模式。',
  },
  { id: 'audit', icon: Shield, label: '审校排版',
    title: '五层智能审校',
    description: '从错别字到事实核验，五层递进检测：错别字与标点→语法病句→格式规范（GB/T 9704-2012）→敏感表述预警→事实数据核验。每个问题都有修改建议和定位。',
    detail: '完成后一键导出Word文档，自动配置：A4页面、二号标题、三号仿宋正文、固定行距28磅、页码。打开即可用。',
  },
  { id: 'knowledge', icon: BookOpen, label: '权威库',
    title: '权威知识库支撑',
    description: '写作时右侧面板自动检索与主题最相关的政策文件、领导人讲话、权威评论。数据来源：人民日报、求是网、共产党员网、学习强国。引用内容可溯源到原文。',
    detail: '支持用户上传文档扩充知识库（自动向量化处理）。即将支持定时从权威网站自动爬取更新。',
  },
]

const STORAGE_KEY = 'gongwen_banner_collapsed'

interface Props { username: string }

export default function BrandBanner({ username }: Props) {
  // 从 localStorage 读取上次状态，首次默认展开
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' }
    catch { return false }
  })
  const [status, setStatus] = useState<any>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // 加载文秘状态
  useEffect(() => {
    fetch('/api/secretary/status', { headers: authHeader() })
      .then(r => r.json()).then(setStatus).catch(() => {})
  }, [])

  // 持久化折叠状态
  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0') }
    catch {}
  }

  const welcomeMsg = status
    ? `${username}，您好！我是您的专属智能文秘，已为您服务第 ${status.service_days} 天`
    : `${username}，您好！我是您的专属智能文秘`

  return (
    <div className="bg-gradient-to-r from-[#c8102e] via-[#d42a3f] to-[#c8102e] text-white">
      <div className="px-4 py-2 relative">

        {/* === 折叠状态：仅显示标题行 === */}
        {collapsed ? (
          <button onClick={toggleCollapse}
            className="w-full flex items-center justify-between text-xs text-white/70 hover:text-white transition py-0.5">
            <span className="flex items-center gap-1.5">
              <Brain size={12} />
              <span>公文高高 · 会学习的文秘助手</span>
              <span className="text-white/40">— 点击展开 ▼</span>
            </span>
            <ChevronDown size={12} />
          </button>
        ) : (
          /* === 展开状态：完整内容 === */
          <>
            {/* 标签行 + 收起按钮 */}
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-white/60">公文高高 · 会学习的文秘助手</p>
              <button onClick={toggleCollapse}
                className="flex items-center gap-0.5 text-[10px] text-white/50 hover:text-white/80 transition">
                <span>收起</span>
                <ChevronUp size={12} />
              </button>
            </div>

            {/* 欢迎语 */}
            <p className="text-sm font-medium leading-relaxed pr-16">
              {welcomeMsg}
              {status && status.level && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-white/20 rounded">{status.level}</span>
              )}
            </p>

            {/* 核心能力标签 */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CAPABILITIES.map(cap => (
                <button key={cap.id}
                  onClick={() => setExpanded(expanded === cap.id ? null : cap.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] transition ${
                    expanded === cap.id ? 'bg-white text-[#c8102e] font-medium' : 'bg-white/15 hover:bg-white/25'
                  }`}>
                  <cap.icon size={12} />
                  {cap.id === 'learn' && status?.learned_samples > 0
                    ? `已学习${status.learned_samples}篇`
                    : cap.label}
                  {expanded === cap.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              ))}
            </div>

            {/* 展开后的详细说明 */}
            {expanded && (() => {
              const cap = CAPABILITIES.find(c => c.id === expanded)
              if (!cap) return null
              return (
                <div className="mt-2 p-3 bg-white/10 rounded-lg text-xs leading-relaxed">
                  <p className="font-medium mb-1">{cap.title}</p>
                  <p className="text-white/80 mb-1.5">{cap.description}</p>
                  <p className="text-white/60 text-[10px]">{cap.detail}</p>
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* 平滑动画容器 */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        collapsed ? 'max-h-0' : 'max-h-[400px]'
      }`} />
    </div>
  )
}

function authHeader(): Record<string, string> {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    const token = localStorage.getItem('gongwen_token') || u.token || ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch { return {} }
}
