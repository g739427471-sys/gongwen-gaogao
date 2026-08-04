import { useState, useEffect } from 'react'
import { listDocuments, getDocument, deleteDocument } from '../../services/api'
import type { DocumentItem } from '../../types'
import { Clock, FileText, Trash2, Eye, X } from 'lucide-react'

interface Props {
  onBack: () => void
}

export default function HistoryPanel({ onBack }: Props) {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const loadDocs = (p: number) => {
    setLoading(true)
    listDocuments({ limit: 10, offset: p * 10 })
      .then((res) => { setDocs(res.documents); setTotal(res.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadDocs(0) }, [])

  const handleView = async (id: string) => {
    try {
      const doc = await getDocument(id)
      setSelectedDoc(doc)
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这篇文稿吗？')) return
    try {
      await deleteDocument(id)
      loadDocs(page)
    } catch { /* ignore */ }
  }

  const totalPages = Math.max(1, Math.ceil(total / 10))

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">历史文稿</h3>
          <p className="text-xs text-gray-500">共 {total} 篇</p>
        </div>
        <button onClick={onBack} className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200">
          返回写作
        </button>
      </div>

      {/* Content */}
      {selectedDoc ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">{selectedDoc.title}</h2>
            <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <div className="flex gap-3 mb-4 text-xs text-gray-500">
            <span className="bg-gray-100 px-2 py-0.5 rounded">{selectedDoc.doc_type}</span>
            <span>{new Date(selectedDoc.created_at || '').toLocaleDateString('zh-CN')}</span>
            <span>{selectedDoc.content?.length || 0} 字</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 markdown-content text-[15px] leading-relaxed">
            {selectedDoc.content ? (
              <div style={{ whiteSpace: 'pre-wrap' }}>{selectedDoc.content}</div>
            ) : (
              <p className="text-gray-400">暂无内容</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="text-center text-gray-400 py-12 text-sm">加载中...</div>}
          {!loading && docs.length === 0 && (
            <div className="text-center py-16">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">还没有生成的文稿</p>
              <p className="text-xs text-gray-300 mt-1">生成的公文会自动保存到这里</p>
            </div>
          )}
          <div className="divide-y divide-gray-100">
            {docs.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-gray-50 transition flex items-center gap-4">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleView(doc.id)}>
                  <h4 className="text-sm font-medium text-gray-800 truncate">{doc.title || '未命名文稿'}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{doc.doc_type}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(doc.created_at || '').toLocaleDateString('zh-CN')}</span>
                    <span>{doc.content?.length || 0} 字</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleView(doc.id)} className="p-1.5 text-gray-400 hover:text-[#c8102e] rounded hover:bg-red-50" title="查看">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50" title="删除">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <button onClick={() => { setPage(page - 1); loadDocs(page - 1) }} disabled={page <= 0}
                className="px-3 py-1 text-xs border rounded disabled:opacity-30">上一页</button>
              <span className="text-xs text-gray-500">{page + 1} / {totalPages}</span>
              <button onClick={() => { setPage(page + 1); loadDocs(page + 1) }} disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs border rounded disabled:opacity-30">下一页</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
