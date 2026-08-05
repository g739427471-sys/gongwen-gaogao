/**
 * 更新日志折叠区 — 右上角知识库面板下方
 * 默认折叠，展开后最多显示5条，可加载更多
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, Wrench, Bug, Star } from 'lucide-react'
import changelogData from '../../data/changelog.json'

interface ChangelogEntry {
  version: string; date: string; type: 'new' | 'improve' | 'fix'
  important: boolean; title: string; description: string
}

const TYPE_CONFIG = {
  new:    { icon: Sparkles, label: '新增', cls: 'bg-green-100 text-green-700' },
  improve:{ icon: Wrench,   label: '优化', cls: 'bg-blue-100 text-blue-700' },
  fix:    { icon: Bug,      label: '修复', cls: 'bg-amber-100 text-amber-700' },
}

const INITIAL_SHOW = 5
const MAX_SHOWN = 20

export default function UpdateLog() {
  const [open, setOpen] = useState(false)
  const [showCount, setShowCount] = useState(INITIAL_SHOW)

  const entries = changelogData as ChangelogEntry[]
  const visible = entries.slice(0, showCount)
  const hasMore = showCount < entries.length

  return (
    <div className="border-t border-gray-200 shrink-0">
      {/* 标题行 — 始终可见 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-xs hover:bg-gray-50 transition"
      >
        <span className="flex items-center gap-1.5 text-gray-500">
          <span className="text-sm">📋</span>
          <span className="font-medium">更新日志</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-400">持续进化中</span>
        </span>
        <span className="text-gray-400">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* 展开区域 — 平滑动画 */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 pb-3 space-y-1.5">
          {visible.map((entry, i) => {
            const cfg = TYPE_CONFIG[entry.type]
            return (
              <div
                key={i}
                className="px-2.5 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition cursor-default border border-transparent hover:border-gray-200"
              >
                {/* 第一行：版本号 + 日期 + 标签 + 星标 */}
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[11px] font-mono font-bold text-gray-600">
                    {entry.version}
                  </span>
                  <span className="text-[10px] text-gray-400">{entry.date}</span>
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${cfg.cls}`}>
                    <cfg.icon size={9} />
                    {cfg.label}
                  </span>
                  {entry.important && (
                    <Star size={10} className="text-amber-400 fill-amber-400" title="重要更新" />
                  )}
                </div>
                {/* 标题 */}
                <p className="text-xs font-medium text-gray-700 mb-0.5">
                  {entry.important && <span className="text-amber-500 mr-0.5">⭐</span>}
                  {entry.title}
                </p>
                {/* 描述 */}
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  {entry.description}
                </p>
              </div>
            )
          })}

          {/* 加载更多 */}
          {hasMore && (
            <button
              onClick={() => setShowCount(prev => Math.min(prev + 10, MAX_SHOWN))}
              className="w-full py-1.5 text-[10px] text-gray-400 hover:text-[#c8102e] text-center transition"
            >
              加载更多（已显示 {showCount}/{Math.min(entries.length, MAX_SHOWN)} 条）
            </button>
          )}

          {/* 底部署名 */}
          <p className="text-center text-[9px] text-gray-300 pt-1">
            公文高高 · 持续打磨，不负所托
          </p>
        </div>
      </div>
    </div>
  )
}
