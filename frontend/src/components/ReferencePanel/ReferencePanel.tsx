import { useState } from 'react'
import { searchKnowledge } from '../../services/api'
import type { KnowledgeChunk } from '../../types'
import { Search, BookOpen, Quote, FileText, ExternalLink } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  policy: '政策法规',
  speech: '重要讲话',
  article: '权威文章',
  standard: '规范表述',
}

export default function ReferencePanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KnowledgeChunk[]>([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'guide'>('search')

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await searchKnowledge(query.trim())
      setResults(res.results)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 ${
            activeTab === 'search'
              ? 'text-[#c8102e] border-b-2 border-[#c8102e]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen size={15} />
          知识检索
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 ${
            activeTab === 'guide'
              ? 'text-[#c8102e] border-b-2 border-[#c8102e]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={15} />
          写作指南
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'search' && (
          <>
            {/* Search Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索政策、讲话、规范表述..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-3 py-1.5 bg-[#c8102e] text-white rounded text-sm hover:bg-[#a00d25] transition disabled:opacity-50"
              >
                <Search size={14} />
              </button>
            </div>

            {/* Results */}
            {searching && (
              <div className="text-center text-gray-400 text-sm py-8">搜索中...</div>
            )}

            {!searching && results.length === 0 && query && (
              <div className="text-center text-gray-400 text-sm py-8">未找到相关结果</div>
            )}

            <div className="space-y-3">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="bg-gray-50 border border-gray-100 rounded-lg p-3 hover:border-gray-200 transition"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-medium text-[#c8102e] bg-[#c8102e]/10 px-1.5 py-0.5 rounded">
                      {CATEGORY_LABELS[r.category] || r.category}
                    </span>
                    {r.score > 0 && (
                      <span className="text-xs text-gray-400">{Math.round(r.score * 100)}%</span>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-gray-800 mb-1">{r.title}</h4>
                  <p className="text-xs text-gray-600 line-clamp-4 leading-relaxed">{r.content}</p>
                  {r.source && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <ExternalLink size={10} />
                      <span>{r.source}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!query && results.length === 0 && (
              <div className="text-center py-12">
                <BookOpen size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">输入关键词搜索知识库</p>
                <p className="text-xs text-gray-300 mt-1">
                  包含政策法规、重要讲话、权威文章、规范表述
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'guide' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-1.5">
                <Quote size={14} />
                公文写作五大标准
              </h4>
              <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                <li><strong>文风庄重严肃</strong> — 杜绝俚语口语，格调郑重</li>
                <li><strong>逻辑严密周全</strong> — 论证严谨，层次清楚</li>
                <li><strong>用语标准规范</strong> — 禁用模糊词语</li>
                <li><strong>文字精炼严实</strong> — 删减一切废话</li>
                <li><strong>政治明确</strong> — 符合方针政策</li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-1.5">
                <FileText size={14} />
                15种法定文种
              </h4>
              <p className="text-sm text-blue-800 leading-relaxed">
                决议、决定、命令（令）、公报、公告、通告、意见、通知、通报、报告、请示、批复、议案、函、纪要。
              </p>
              <p className="text-xs text-blue-600 mt-2">
                上行文（报告、请示）用于向上级汇报或请求；
                下行文（通知、通报、批复等）用于向下级传达或部署；
                平行文（函、议案）用于同级或不相隶属机关。
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">格式规范要点</h4>
              <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                <li>标题：发文机关+关于+事由+的+文种</li>
                <li>正文用3号仿宋体，A4纸排版</li>
                <li>层次序数：一、（一）1.（1）</li>
                <li>成文日期用阿拉伯数字</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
