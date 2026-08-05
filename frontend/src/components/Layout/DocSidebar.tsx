/** 左侧文档管理栏 — 文档列表+筛选+操作 */
import { useState, useEffect, useRef } from 'react'
import { FileText, Plus, MoreHorizontal, Trash2, Edit3, Archive, X, User } from 'lucide-react'
import { listDocuments, deleteDocument } from '../../services/api'
import type { DocumentItem } from '../../types'

const FILTERS = ['全部', '通知', '报告', '讲话稿']
const PAGE_SIZE = 15

interface Props {
  activeTab: string
  onSelectDoc: (doc: DocumentItem) => void
  onNewDoc: () => void
  onHistory: () => void
  totalDocs: number
  setTotalDocs: (n: number) => void
}

export default function DocSidebar({ activeTab, onSelectDoc, onNewDoc, onHistory, totalDocs, setTotalDocs }: Props) {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [filter, setFilter] = useState('全部')
  const [page, setPage] = useState(1)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; doc: DocumentItem } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadDocs()
    const t = setInterval(loadDocs, 30000)
    return () => clearInterval(t)
  }, [activeTab])

  useEffect(() => {
    // close context menu on outside click
    const h = () => setContextMenu(null)
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [])

  const loadDocs = async () => {
    try {
      const r = await listDocuments({ limit: 100 })
      setDocs(r.documents)
      setTotalDocs(r.total)
    } catch {}
  }

  const filtered = docs.filter(d => filter === '全部' || d.doc_type === filter)
  const paged = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = filtered.length > paged.length

  const handleDelete = async (id: string) => {
    try { await deleteDocument(id); loadDocs() } catch {}
    setContextMenu(null)
  }

  const handleRenameStart = (doc: DocumentItem) => {
    setRenaming(doc.id); setRenameText(doc.title || '')
    setContextMenu(null)
  }

  const handleRenameSave = () => {
    // Rename via API would go here
    setRenaming(null)
    loadDocs()
  }

  return (
    <div ref={sidebarRef} className="flex flex-col h-full">
      {/* Header: 我的文档 + 新建按钮 + 文档数 */}
      <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText size={13} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">我的文档</span>
          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-400">{totalDocs}</span>
        </div>
        <button onClick={onNewDoc}
          className="flex items-center gap-0.5 px-2 py-1 text-[10px] text-[#c8102e] hover:bg-red-50 rounded transition"
          title="新建文档">
          <Plus size={12} /> 新建
        </button>
      </div>

      {/* Filters */}
      <div className="px-3 py-1.5 flex gap-1 border-b border-gray-50">
        {FILTERS.map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1) }}
            className={`px-2 py-0.5 rounded text-[10px] transition ${
              filter === f ? 'bg-[#c8102e]/10 text-[#c8102e] font-medium' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {paged.length === 0 && (
          <p className="text-[10px] text-gray-400 text-center py-8">
            {filter === '全部' ? '暂无文档，点击"新建"开始' : `暂无「${filter}」类文档`}
          </p>
        )}

        {paged.map(doc => (
          <div key={doc.id}
            onMouseEnter={() => setHoverId(doc.id)}
            onMouseLeave={() => setHoverId(null)}
            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, doc }) }}
            className="group px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 relative"
          >
            {/* Main click → load doc */}
            <div onClick={() => onSelectDoc(doc)}>
              {/* Title row */}
              {renaming === doc.id ? (
                <input value={renameText} onChange={e => setRenameText(e.target.value)}
                  onBlur={handleRenameSave} onKeyDown={e => e.key === 'Enter' && handleRenameSave()}
                  className="w-full text-[11px] font-medium border border-[#c8102e] rounded px-1 py-0.5"
                  autoFocus onClick={e => e.stopPropagation()} />
              ) : (
                <p className="text-[11px] font-medium text-gray-700 truncate pr-12">
                  {doc.title || '未命名'}
                </p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] bg-gray-100 px-1 rounded">{doc.doc_type}</span>
                <span className="text-[9px] text-gray-400">
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString('zh-CN') : ''}
                </span>
              </div>
            </div>

            {/* Hover actions (right-aligned) */}
            {hoverId === doc.id && (
              <div className="absolute right-2 top-2 flex gap-0.5">
                <button onClick={e => { e.stopPropagation(); handleRenameStart(doc) }}
                  className="p-1 hover:bg-gray-200 rounded" title="重命名">
                  <Edit3 size={10} className="text-gray-400" />
                </button>
                <button onClick={e => { e.stopPropagation(); handleDelete(doc.id) }}
                  className="p-1 hover:bg-red-100 rounded" title="删除">
                  <Trash2 size={10} className="text-red-400" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Load more */}
        {hasMore && (
          <button onClick={() => setPage(p => p + 1)}
            className="w-full py-2 text-[10px] text-gray-400 hover:text-[#c8102e] text-center transition">
            加载更多 ({filtered.length - paged.length} 篇)
          </button>
        )}
      </div>

      {/* Footer: 查看全部历史 */}
      <div className="px-3 py-2 border-t border-gray-100">
        <button onClick={onHistory}
          className="w-full text-[10px] text-[#c8102e] hover:underline py-1 flex items-center gap-1">
          <FileText size={10} /> 查看全部历史 ({totalDocs})
        </button>
      </div>

      {/* Context menu (right-click) */}
      {contextMenu && (
        <div className="fixed z-[200] bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button onClick={() => onSelectDoc(contextMenu.doc)}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2">
            <FileText size={11} /> 打开
          </button>
          <button onClick={() => handleRenameStart(contextMenu.doc)}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2">
            <Edit3 size={11} /> 重命名
          </button>
          <button onClick={() => handleDelete(contextMenu.doc.id)}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2">
            <Trash2 size={11} /> 删除
          </button>
        </div>
      )}
    </div>
  )
}
