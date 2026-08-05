/**
 * 品牌展示横幅 — 两行紧凑布局（≤120px），折叠后仅保留标题行。
 */
import { useState, useEffect } from 'react'
import { Brain, Sparkles, Users, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const TAGS = [
  { id: 'learn', icon: Brain, label: '会学习',
    title: '会学习的专属文秘',
    desc: '系统分析您每次修改——替换了哪些词、调整了哪种句式，生成文稿越来越像您写的。学习满2次自动激活。',
  },
  { id: 'deai', icon: Sparkles, label: '去AI味',
    title: '去AI味引擎',
    desc: '内置AI味词库，自动改写程式化连接词和空话套话。三档可调（官方·标准·自然），分数可视。',
  },
  { id: 'step', icon: Users, label: '分步写',
    title: '渐进式分步写作',
    desc: '先生成大纲等您确认，再逐章填充正文。每一步可修改、重来或跳过。长文稿自动建议此模式。',
  },
  { id: 'audit', icon: Shield, label: '审校排版',
    title: '五层智能审校+排版',
    desc: '错别字→语法→格式(GB/T 9704)→敏感词→事实核验。一键导出A4标准Word，打开即用。',
  },
]

const STORAGE_KEY = 'gongwen_banner_collapsed'

interface Props { username: string }

export default function BrandBanner({ username }: Props) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
  })
  const [status, setStatus] = useState<any>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/secretary/status', { headers: authHeader() })
      .then(r => r.json()).then(setStatus).catch(() => {})
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed; setCollapsed(next)
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0') } catch {}
    if (next) setActiveTag(null)
  }

  return (
    <div className="bg-gradient-to-r from-[#c8102e] via-[#d42a3f] to-[#c8102e] text-white">
      {/* === 折叠态 === */}
      {collapsed ? (
        <button onClick={toggleCollapse}
          className="w-full px-4 py-1.5 flex items-center justify-between text-xs text-white/60 hover:text-white/80 transition">
          <span className="flex items-center gap-1.5">
            <Brain size={11} />
            <span>公文高高 · 会学习的文秘助手 — 点击展开 ▼</span>
          </span>
        </button>
      ) : (
        <div className="px-4 py-2.5">

          {/* === 第一行：品牌 + 收起按钮 === */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold tracking-tight">公文高高</span>
              <span className="text-[10px] text-white/50">会学习的文秘助手</span>
            </div>
            <button onClick={toggleCollapse}
              className="flex items-center gap-0.5 text-[10px] text-white/40 hover:text-white/70 transition">
              <span>收起</span><ChevronUp size={11} />
            </button>
          </div>

          {/* === 第二行：欢迎语 + 标签 === */}
          <div className="flex items-center justify-between gap-3">
            {/* 左：欢迎语 */}
            <div className="min-w-0">
              <p className="text-xs font-medium leading-tight">
                {username}，您好
              </p>
              {status && (
                <p className="text-[10px] text-white/50 leading-tight">
                  已服务{status.service_days}天 · 学习{status.learned_samples || 0}篇 · {status.level || '新手上路'}
                </p>
              )}
              {!status && (
                <p className="text-[10px] text-white/50 leading-tight">正在加载您的文秘状态...</p>
              )}
            </div>

            {/* 右：能力标签 */}
            <div className="flex gap-1 shrink-0">
              {TAGS.map(tag => (
                <button key={tag.id}
                  onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
                  className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] transition ${
                    activeTag === tag.id
                      ? 'bg-white text-[#c8102e] font-medium ring-1 ring-white/50'
                      : 'bg-white/12 hover:bg-white/20'
                  }`}>
                  <tag.icon size={11} />
                  {tag.id === 'learn' && status?.learned_samples > 0
                    ? `${status.learned_samples}篇`
                    : tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* === 标签展开说明（inline展开，非覆盖层） === */}
          {activeTag && (() => {
            const tag = TAGS.find(t => t.id === activeTag)
            if (!tag) return null
            return (
              <div className="mt-2 p-2.5 bg-white/10 rounded-lg text-[11px] leading-relaxed">
                <span className="font-medium">{tag.title}</span>
                <span className="text-white/70"> — {tag.desc}</span>
              </div>
            )
          })()}

        </div>
      )}
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
