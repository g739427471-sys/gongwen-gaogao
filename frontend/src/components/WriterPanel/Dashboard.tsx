/** 文稿分析仪表盘 — 字数统计/句长/AI味/敏感词/引用 */
import { useState, useEffect } from 'react'
import { BarChart3, AlertTriangle, FileText, Type, Hash, Activity } from 'lucide-react'

interface Props { content: string; docType?: string }

export default function Dashboard({ content, docType }: Props) {
  const [aiScore, setAiScore] = useState<number | null>(null)
  const [aiLevel, setAiLevel] = useState('')
  const [loading, setLoading] = useState(false)

  // 本地统计
  const stats = computeStats(content)

  // 获取AI味指数
  useEffect(() => {
    if (!content || content.length < 50) return
    setLoading(true)
    fetch('/api/deai/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).then(r => r.json()).then(d => {
      setAiScore(d.score)
      setAiLevel(d.level)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [content])

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <BarChart3 size={14} className="text-[#c8102e]" />
        <span className="text-xs font-bold text-gray-700">文稿分析</span>
        {docType && <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded ml-auto">{docType}</span>}
      </div>

      {/* Stats grid */}
      <div className="p-3 grid grid-cols-2 gap-2">
        <StatCard icon={Hash} label="全文" value={`${stats.totalChars} 字`} />
        <StatCard icon={FileText} label="段落" value={`${stats.paragraphs} 段`} />
        <StatCard icon={Type} label="平均句长" value={`${stats.avgSentenceLen} 字`} />
        <StatCard icon={Hash} label="句子数" value={`${stats.sentences} 句`} />
      </div>

      {/* AI味指数 */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <Activity size={10} /> AI味指数
          </span>
          {loading && <span className="text-[10px] text-gray-400">分析中...</span>}
          {aiScore !== null && (
            <span className={`text-[10px] font-bold ${
              aiScore <= 20 ? 'text-green-600' : aiScore <= 50 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {aiScore}分 · {aiLevel}
            </span>
          )}
        </div>
        {aiScore !== null && (
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${
              aiScore <= 20 ? 'bg-green-500' : aiScore <= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`} style={{ width: `${Math.min(aiScore, 100)}%` }} />
          </div>
        )}
        {aiScore === null && !loading && content.length >= 50 && (
          <p className="text-[10px] text-gray-400">正在分析中...</p>
        )}
      </div>

      {/* 写作提示 */}
      {stats.avgSentenceLen > 80 && (
        <div className="px-3 pb-2">
          <div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1.5">
            <AlertTriangle size={10} className="mt-0.5 shrink-0" />
            <span>平均句长 {stats.avgSentenceLen} 字，建议控制在 60 字以内以增强可读性</span>
          </div>
        </div>
      )}
      {stats.totalChars > 3000 && (
        <div className="px-3 pb-3">
          <div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1.5">
            <AlertTriangle size={10} className="mt-0.5 shrink-0" />
            <span>长文稿建议使用章节导航功能，方便阅读和编辑</span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1 mb-0.5">
        <Icon size={10} /> {label}
      </span>
      <span className="text-sm font-bold text-gray-700">{value}</span>
    </div>
  )
}

function computeStats(content: string) {
  const text = content.trim()
  const totalChars = text.length
  const paragraphs = text.split('\n').filter(l => l.trim()).length
  const sentenceMatches = text.match(/[。！？；]/g)
  const sentences = sentenceMatches ? sentenceMatches.length : 1
  const avgSentenceLen = sentences > 0 ? Math.round(totalChars / sentences) : totalChars
  return { totalChars, paragraphs, sentences, avgSentenceLen }
}
