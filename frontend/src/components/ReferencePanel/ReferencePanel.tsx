import { useState, useEffect, useCallback } from 'react'
import { searchKnowledge, getNewsFeed, refreshNews } from '../../services/api'
import type { KnowledgeChunk } from '../../types'
import { Search, BookOpen, Newspaper, ExternalLink, Clock, RefreshCw, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  policy: '政策法规', speech: '重要讲话', article: '权威文章', standard: '规范表述',
}

interface NewsItem { id: string; title: string; source: string; url: string; date: string; snippet: string }

interface Props {
  autoSearchQuery?: string
}

export default function ReferencePanel({ autoSearchQuery }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KnowledgeChunk[]>([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'craft' | 'news'>('search')
  const [news, setNews] = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsPage, setNewsPage] = useState(1)
  const [newsTotalPages, setNewsTotalPages] = useState(1)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [fullscreen, setFullscreen] = useState(false)
  const [allResults, setAllResults] = useState<KnowledgeChunk[]>([])
  const [fullscreenPage, setFullscreenPage] = useState(1)

  // Auto-search when autoSearchQuery changes (smart linkage)
  useEffect(() => {
    if (autoSearchQuery && autoSearchQuery.trim().length > 2) {
      setQuery(autoSearchQuery)
      setActiveTab('search')
      handleSearch(autoSearchQuery)
    }
  }, [autoSearchQuery])

  const loadNews = (page: number) => {
    setNewsLoading(true); setNewsPage(page)
    getNewsFeed(page, 10).then(res => {
      setNews(res.news); setNewsTotalPages(res.total_pages); setLastUpdate(res.last_update || null)
    }).catch(() => {}).finally(() => setNewsLoading(false))
  }

  useEffect(() => { if (activeTab === 'news' && news.length === 0) loadNews(1) }, [activeTab])

  const handleRefresh = async () => {
    setRefreshing(true)
    try { const r = await refreshNews(); if (r.status === 'ok') loadNews(1) }
    catch {} finally { setRefreshing(false) }
  }

  const handleSearch = useCallback(async (q?: string) => {
    const term = (q || query).trim(); if (!term) return
    setSearching(true)
    try {
      const category = sourceFilter || undefined
      const res = await searchKnowledge(term, category, 20)
      setResults(res.results.slice(0, 5))
      setAllResults(res.results)
    } catch { setResults([]); setAllResults([]) }
    finally { setSearching(false) }
  }, [query, sourceFilter])

  const formatUpdateTime = (iso: string | null) => {
    if (!iso) return ''; const d = new Date(iso)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const panelContent = (
    <>
      {/* Search tab */}
      {activeTab === 'search' && (
        <>
          <div className="flex gap-2 mb-3">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="检索讲话、政策、权威文章..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30" />
            <button onClick={() => handleSearch()} disabled={searching}
              className="px-3 py-1.5 bg-[#c8102e] text-white rounded text-sm hover:bg-[#a00d25] transition disabled:opacity-50">
              <Search size={14} />
            </button>
          </div>
          {/* Source filter */}
          <div className="flex gap-1 mb-3 flex-wrap">
            {['', 'speech', 'policy', 'article', 'standard'].map(s => (
              <button key={s} onClick={() => { setSourceFilter(s); setTimeout(() => handleSearch(), 100) }}
                className={`px-2 py-0.5 rounded text-[10px] transition ${
                  sourceFilter === s ? 'bg-[#c8102e] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {s === '' ? '全部' : CATEGORY_LABELS[s] || s}
              </button>
            ))}
          </div>
          {searching && <div className="text-center text-gray-400 text-sm py-8">AI智能检索中...</div>}
          {!searching && results.length === 0 && query && (
            <div className="text-center text-gray-400 text-sm py-8">未找到相关结果，换个关键词试试</div>
          )}
          <div className="space-y-3">
            {results.map(r => (
              <div key={r.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-medium text-[#c8102e] bg-[#c8102e]/10 px-1.5 py-0.5 rounded">
                    {CATEGORY_LABELS[r.category] || r.category}
                  </span>
                  {r.score > 0 && <span className="text-[10px] text-gray-400">{Math.round(r.score * 100)}%</span>}
                </div>
                <h4 className="text-sm font-medium text-gray-800 mb-1">{r.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{r.content.slice(0, 300)}</p>
                {r.source && <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400"><ExternalLink size={9} /> {r.source}</div>}
              </div>
            ))}
          </div>
          {allResults.length > 5 && (
            <button onClick={() => { setFullscreen(true); setFullscreenPage(1) }}
              className="w-full mt-3 text-xs text-[#c8102e] hover:underline py-2 text-center border-t border-gray-100">
              查看全部 {allResults.length} 条结果 →
            </button>
          )}
          {!query && results.length === 0 && (
            <div className="text-center py-12">
              <BookOpen size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">AI智能检索权威资料</p>
              <p className="text-xs text-gray-300 mt-1">输入关键词，从人民日报、求是网等来源检索</p>
            </div>
          )}
        </>
      )}

      {/* Craft tab */}
      {activeTab === 'craft' && (
        <div className="space-y-3">
          <div onClick={() => { setQuery('写作心法：常见文种思考框架'); setSourceFilter('standard'); setActiveTab('search'); setTimeout(() => handleSearch(), 200) }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-4 cursor-pointer hover:border-amber-300 transition">
            <h4 className="font-medium text-amber-900 mb-2">常见文种写作模板</h4>
            <p className="text-xs text-amber-700">通知、请示、报告、总结、讲话稿、调研报告——每种文种的思考框架和模板。</p>
          </div>
          <div onClick={() => { setQuery('写作心法：高频场景金句库'); setSourceFilter('standard'); setActiveTab('search'); setTimeout(() => handleSearch(), 200) }}
            className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:border-green-300 transition">
            <h4 className="font-medium text-green-900 mb-2">高频场景金句库</h4>
            <p className="text-xs text-green-700">按开头、转折、强调、结尾分类的规范表述，附语境标注。</p>
          </div>
          <div onClick={() => { setQuery('写作心法：常见错误案例库'); setSourceFilter('standard'); setActiveTab('search'); setTimeout(() => handleSearch(), 200) }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:border-red-300 transition">
            <h4 className="font-medium text-red-900 mb-2">常见错误案例库</h4>
            <p className="text-xs text-red-700">标点误用、用词不当、逻辑谬误——常见写作错误及修改建议。</p>
          </div>
        </div>
      )}

      {/* News tab */}
      {activeTab === 'news' && (
        <>
          <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
            <span>{lastUpdate ? `更新于 ${formatUpdateTime(lastUpdate)}` : ''}</span>
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? '更新中' : '刷新'}
            </button>
          </div>
          {newsLoading && <div className="text-center text-gray-400 text-sm py-8">加载中...</div>}
          <div className="space-y-3">
            {news.map(item => (
              <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                className="block bg-gray-50 border border-gray-100 rounded-lg p-3 hover:border-[#c8102e]/30 hover:bg-red-50/30 transition group">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium text-[#c8102e] bg-[#c8102e]/10 px-1.5 py-0.5 rounded">{item.source}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={9} />{item.date}</span>
                </div>
                <h4 className="text-sm font-medium text-gray-800 group-hover:text-[#c8102e] transition mb-1 leading-snug">{item.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{item.snippet}</p>
              </a>
            ))}
          </div>
          {!newsLoading && news.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">暂无简讯</div>}
          {newsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => loadNews(newsPage - 1)} disabled={newsPage <= 1}
                className="px-2 py-1 text-[10px] border rounded disabled:opacity-30">上一页</button>
              {Array.from({ length: Math.min(newsTotalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => loadNews(p)}
                  className={`w-6 h-6 text-[10px] rounded-full ${p === newsPage ? 'bg-[#c8102e] text-white' : 'border hover:bg-gray-100'}`}>{p}</button>
              ))}
              <button onClick={() => loadNews(newsPage + 1)} disabled={newsPage >= newsTotalPages}
                className="px-2 py-1 text-[10px] border rounded disabled:opacity-30">下一页</button>
            </div>
          )}
        </>
      )}
    </>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tabs with tooltips */}
      <div className="flex border-b border-gray-200 shrink-0">
        {[
          { key: 'search', label: '知识检索', icon: Search, tip: '检索讲话、政策、权威文章' },
          { key: 'craft', label: '写作心法', icon: BookOpen, tip: '各文种的写作模板、思考框架和高频金句' },
          { key: 'news', label: '时政简讯', icon: Newspaper, tip: '最新政策动态和重要新闻速览' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition group relative ${
              activeTab === tab.key ? 'text-[#c8102e] border-b-2 border-[#c8102e]' : 'text-gray-500 hover:text-gray-700'
            }`}
            title={tab.tip}
          >
            <tab.icon size={14} /> <span className="hidden xl:inline">{tab.label}</span>
            <span className="xl:hidden text-[10px]">{tab.key === 'search' ? '检索' : tab.key === 'craft' ? '心法' : '简讯'}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {panelContent}
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold">知识检索结果 ({allResults.length}条)</h3>
              <div className="flex items-center gap-3">
                <input type="text" placeholder="筛选结果..." onChange={(e) => setQuery(e.target.value)}
                  className="px-3 py-1 border rounded text-sm w-40" />
                <button onClick={() => setFullscreen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {allResults.slice((fullscreenPage - 1) * 10, fullscreenPage * 10).map(r => (
                <div key={r.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-[#c8102e] bg-[#c8102e]/10 px-1.5 py-0.5 rounded">{CATEGORY_LABELS[r.category] || r.category}</span>
                    {r.source && <span className="text-xs text-gray-400">{r.source}</span>}
                  </div>
                  <h4 className="font-medium mb-1">{r.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{r.content}</p>
                </div>
              ))}
            </div>
            {Math.ceil(allResults.length / 10) > 1 && (
              <div className="p-3 border-t flex justify-center gap-2">
                <button onClick={() => setFullscreenPage(p => Math.max(1, p - 1))} disabled={fullscreenPage <= 1}
                  className="px-3 py-1 text-xs border rounded disabled:opacity-30">上一页</button>
                <span className="text-xs text-gray-500 py-1">{fullscreenPage}/{Math.ceil(allResults.length / 10)}</span>
                <button onClick={() => setFullscreenPage(p => Math.min(Math.ceil(allResults.length / 10), p + 1))}
                  disabled={fullscreenPage >= Math.ceil(allResults.length / 10)}
                  className="px-3 py-1 text-xs border rounded disabled:opacity-30">下一页</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
