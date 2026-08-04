import { useState, useEffect } from 'react'
import { searchKnowledge, getNewsFeed, refreshNews } from '../../services/api'
import type { KnowledgeChunk } from '../../types'
import { Search, BookOpen, Newspaper, ExternalLink, Clock, RefreshCw } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  policy: '政策法规',
  speech: '重要讲话',
  article: '权威文章',
  standard: '规范表述',
}

interface NewsItem {
  id: string; title: string; source: string; url: string; date: string; snippet: string;
}

export default function ReferencePanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KnowledgeChunk[]>([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'news'>('search')
  const [news, setNews] = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsPage, setNewsPage] = useState(1)
  const [newsTotalPages, setNewsTotalPages] = useState(1)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadNews = (page: number) => {
    setNewsLoading(true)
    setNewsPage(page)
    getNewsFeed(page, 10)
      .then((res) => {
        setNews(res.news)
        setNewsTotalPages(res.total_pages)
        setLastUpdate(res.last_update || null)
      })
      .catch(() => {})
      .finally(() => setNewsLoading(false))
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const result = await refreshNews()
      if (result.status === 'ok') {
        loadNews(1)
      } else if (result.status === 'already_updating') {
        setTimeout(() => loadNews(1), 3000)
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false)
    }
  }

  const formatUpdateTime = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  useEffect(() => {
    if (activeTab === 'news' && news.length === 0) {
      loadNews(1)
    }
  }, [activeTab])

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
            activeTab === 'search' ? 'text-[#c8102e] border-b-2 border-[#c8102e]' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen size={15} /> 知识检索
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 ${
            activeTab === 'news' ? 'text-[#c8102e] border-b-2 border-[#c8102e]' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Newspaper size={15} /> 近期简讯
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Knowledge Search */}
        {activeTab === 'search' && (
          <>
            <div className="flex gap-2 mb-4">
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="AI智能搜索权威资料..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30" />
              <button onClick={handleSearch} disabled={searching}
                className="px-3 py-1.5 bg-[#c8102e] text-white rounded text-sm hover:bg-[#a00d25] transition disabled:opacity-50">
                <Search size={14} />
              </button>
            </div>

            {searching && <div className="text-center text-gray-400 text-sm py-8">搜索中...</div>}
            {!searching && results.length === 0 && query && (
              <div className="text-center text-gray-400 text-sm py-8">未找到相关结果</div>
            )}

            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-medium text-[#c8102e] bg-[#c8102e]/10 px-1.5 py-0.5 rounded">
                      {CATEGORY_LABELS[r.category] || r.category}
                    </span>
                    {r.score > 0 && <span className="text-xs text-gray-400">{Math.round(r.score * 100)}%</span>}
                  </div>
                  <h4 className="text-sm font-medium text-gray-800 mb-1">{r.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                  {r.source && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <ExternalLink size={10} /> <span>{r.source}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!query && results.length === 0 && (
              <div className="text-center py-12">
                <BookOpen size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">输入关键词搜索知识库</p>
                <p className="text-xs text-gray-300 mt-1">包含政策法规、重要讲话、权威文章、规范表述</p>
              </div>
            )}
          </>
        )}

        {/* News Feed */}
        {activeTab === 'news' && (
          <>
            {/* Refresh bar */}
            <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
              <span>
                {lastUpdate ? `更新于 ${formatUpdateTime(lastUpdate)}` : ''}
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? '更新中...' : '刷新'}
              </button>
            </div>

            {newsLoading && <div className="text-center text-gray-400 text-sm py-8">加载中...</div>}
            <div className="space-y-3">
              {news.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gray-50 border border-gray-100 rounded-lg p-4 hover:border-[#c8102e]/30 hover:bg-red-50/30 transition group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-[#c8102e] bg-[#c8102e]/10 px-1.5 py-0.5 rounded">
                      {item.source}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> {item.date}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-800 group-hover:text-[#c8102e] transition mb-1 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.snippet}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <ExternalLink size={10} /> <span>点击查看原文</span>
                  </div>
                </a>
              ))}
            </div>
            {!newsLoading && news.length === 0 && (
              <div className="text-center py-12">
                <Newspaper size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">暂无简讯</p>
              </div>
            )}

            {/* Pagination */}
            {newsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pb-2">
                <button
                  onClick={() => loadNews(newsPage - 1)}
                  disabled={newsPage <= 1}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                {Array.from({ length: newsTotalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => loadNews(p)}
                    className={`w-8 h-8 text-xs rounded-full ${
                      p === newsPage
                        ? 'bg-[#c8102e] text-white font-bold'
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => loadNews(newsPage + 1)}
                  disabled={newsPage >= newsTotalPages}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
