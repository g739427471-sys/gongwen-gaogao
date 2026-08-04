import { useState, useEffect } from 'react'
import WriterPanel from '../WriterPanel/WriterPanel'
import HistoryPanel from '../WriterPanel/HistoryPanel'
import ReferencePanel from '../ReferencePanel/ReferencePanel'
import QuickCommands from '../WriterPanel/QuickCommands'
import OnboardingGuide from './OnboardingGuide'
import { PenLine, User, LogOut, Clock, FileText, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

interface Props {
  username: string
  onLogout: () => void
}

export default function MainLayout({ username, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [leftOpen, setLeftOpen] = useState(true)
  const [quickTopic, setQuickTopic] = useState('')
  const [quickDocType, setQuickDocType] = useState('')

  // Check first visit
  useEffect(() => {
    const seen = localStorage.getItem('gongwen_onboarded')
    if (!seen) {
      setShowOnboarding(true)
    }
  }, [])

  const handleOnboardComplete = () => {
    localStorage.setItem('gongwen_onboarded', '1')
    setShowOnboarding(false)
  }

  const handleQuickSelect = (docType: string, topic: string) => {
    setQuickDocType(docType)
    setQuickTopic(topic)
    setActiveTab('write')
  }

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f0]">
      {showOnboarding && <OnboardingGuide onComplete={handleOnboardComplete} />}

      {/* Header */}
      <header className="bg-[#c8102e] text-white px-4 py-2.5 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setLeftOpen(!leftOpen)}
            className="text-white/70 hover:text-white p-1" title={leftOpen ? '收起侧栏' : '展开侧栏'}>
            {leftOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <div className="bg-white/20 p-1 rounded">
            <PenLine size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">公文高高</h1>
            <p className="text-[10px] text-white/60">智能公文写作助手</p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setActiveTab('write')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition ${
                activeTab === 'write' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <PenLine size={13} /> 写作
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition ${
                activeTab === 'history' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <Clock size={13} /> 历史
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/70">
          <div className="flex items-center gap-1"><User size={13} />{username}</div>
          <button onClick={onLogout} className="hover:text-white"><LogOut size={13} /></button>
        </div>
      </header>

      {/* Three-column body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: 20% - My Documents */}
        {leftOpen && (
          <div className="w-[20%] min-w-[200px] bg-white border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                <FileText size={12} /> 我的文档
              </h3>
            </div>
            <DocumentSidebar activeTab={activeTab} onSelect={() => setActiveTab('history')} />
          </div>
        )}

        {/* Center: 55% - Writing Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'write' && <QuickCommands onSelect={handleQuickSelect} />}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'write' ? (
              <WriterPanel quickTopic={quickTopic} quickDocType={quickDocType}
                onConsumed={() => { setQuickTopic(''); setQuickDocType('') }} />
            ) : (
              <HistoryPanel onBack={() => setActiveTab('write')} />
            )}
          </div>
        </div>

        {/* Right Sidebar: 25% - Smart Assistant */}
        <div className="w-[25%] min-w-[280px] border-l border-gray-200 bg-white">
          <ReferencePanel />
        </div>
      </div>
    </div>
  )
}

// Mini document sidebar
import { listDocuments } from '../../services/api'
import type { DocumentItem } from '../../types'

function DocumentSidebar({ activeTab, onSelect }: { activeTab: string; onSelect: () => void }) {
  const [docs, setDocs] = useState<DocumentItem[]>([])

  useEffect(() => {
    listDocuments({ limit: 10 }).then(r => setDocs(r.documents)).catch(() => {})
    const timer = setInterval(() => {
      listDocuments({ limit: 10 }).then(r => setDocs(r.documents)).catch(() => {})
    }, 30000)
    return () => clearInterval(timer)
  }, [activeTab])

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {docs.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-8">暂无文档</p>
      )}
      {docs.map(doc => (
        <div key={doc.id} onClick={onSelect}
          className="p-2 rounded hover:bg-gray-50 cursor-pointer transition group">
          <p className="text-xs font-medium text-gray-700 truncate">{doc.title || '未命名'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] bg-gray-100 px-1 rounded">{doc.doc_type}</span>
            <span className="text-[10px] text-gray-400">
              {doc.created_at ? new Date(doc.created_at).toLocaleDateString('zh-CN') : ''}
            </span>
          </div>
        </div>
      ))}
      <button onClick={onSelect}
        className="w-full mt-2 text-xs text-[#c8102e] hover:underline py-2 text-center">
        查看全部 →
      </button>
    </div>
  )
}
