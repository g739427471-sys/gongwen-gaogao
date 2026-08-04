import { useState, useEffect } from 'react'
import WriterPanel from '../WriterPanel/WriterPanel'
import HistoryPanel from '../WriterPanel/HistoryPanel'
import ReferencePanel from '../ReferencePanel/ReferencePanel'
import QuickCommands from '../WriterPanel/QuickCommands'
import OnboardingGuide from './OnboardingGuide'
import { PenLine, User, LogOut, Clock, FileText, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'

interface Props { username: string; onLogout: () => void }

export default function MainLayout({ username, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [quickTopic, setQuickTopic] = useState('')
  const [quickDocType, setQuickDocType] = useState('')
  const [autoSearch, setAutoSearch] = useState('')

  useEffect(() => {
    const seen = localStorage.getItem('gongwen_onboarded')
    if (!seen) setShowOnboarding(true)
  }, [])

  const handleOnboardComplete = () => {
    localStorage.setItem('gongwen_onboarded', '1')
    setShowOnboarding(false)
  }

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f0]">
      {showOnboarding && <OnboardingGuide onComplete={handleOnboardComplete} />}

      <header className="bg-[#c8102e] text-white px-3 py-2 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setLeftOpen(!leftOpen)} className="text-white/70 hover:text-white p-1 hidden md:block" title="侧栏">
            {leftOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <div className="bg-white/20 p-1 rounded"><PenLine size={18} /></div>
          <div><h1 className="text-base font-bold">公文高高</h1></div>
          <div className="flex gap-1 ml-3">
            <button onClick={() => setActiveTab('write')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${activeTab === 'write' ? 'bg-white/20' : 'text-white/60 hover:text-white'}`}>写作</button>
            <button onClick={() => setActiveTab('history')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${activeTab === 'history' ? 'bg-white/20' : 'text-white/60 hover:text-white'}`}>历史</button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/70">
          <button onClick={() => setRightOpen(!rightOpen)} className="hover:text-white p-1 xl:hidden" title="知识面板">
            {rightOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>
          <User size={13} /> {username}
          <button onClick={onLogout} className="hover:text-white ml-1"><LogOut size={13} /></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: My Documents (hidden on mobile) */}
        {leftOpen && (
          <div className="hidden md:block w-[20%] min-w-[180px] bg-white border-r border-gray-200 overflow-y-auto shrink-0">
            <DocumentMiniList onSelect={() => setActiveTab('history')} activeTab={activeTab} />
          </div>
        )}

        {/* Center: Writing */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {activeTab === 'write' && <QuickCommands onSelect={(dt, t) => { setQuickDocType(dt); setQuickTopic(t); setActiveTab('write') }} />}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'write' ? (
              <WriterPanel quickTopic={quickTopic} quickDocType={quickDocType}
                onConsumed={() => { setQuickTopic(''); setQuickDocType('') }}
                onAutoSearch={(q: string) => setAutoSearch(q)} />
            ) : (
              <HistoryPanel onBack={() => setActiveTab('write')} />
            )}
          </div>
        </div>

        {/* Right: Smart Assistant */}
        {rightOpen && (
          <div className="hidden xl:block w-[25%] min-w-[260px] border-l border-gray-200 bg-white shrink-0">
            <ReferencePanel autoSearchQuery={autoSearch} />
          </div>
        )}
        {/* Right panel overlay for smaller screens */}
        {rightOpen && (
          <div className="xl:hidden fixed inset-y-0 right-0 z-40 w-[85%] max-w-[400px] bg-white shadow-2xl border-l border-gray-200">
            <div className="flex justify-end p-2">
              <button onClick={() => setRightOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>
            <div className="h-[calc(100%-40px)]">
              <ReferencePanel autoSearchQuery={autoSearch} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Mini document list for left sidebar
import { listDocuments } from '../../services/api'
import type { DocumentItem } from '../../types'

function DocumentMiniList({ onSelect, activeTab }: { onSelect: () => void; activeTab: string }) {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  useEffect(() => {
    listDocuments({ limit: 8 }).then(r => setDocs(r.documents)).catch(() => {})
    const t = setInterval(() => { listDocuments({ limit: 8 }).then(r => setDocs(r.documents)).catch(() => {}) }, 30000)
    return () => clearInterval(t)
  }, [activeTab])

  return (
    <div className="p-2">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase px-2 py-2 flex items-center gap-1"><FileText size={10} />我的文档</h3>
      {docs.length === 0 && <p className="text-[10px] text-gray-400 text-center py-8">暂无文档</p>}
      {docs.map(doc => (
        <div key={doc.id} onClick={onSelect} className="p-2 rounded hover:bg-gray-50 cursor-pointer mb-0.5">
          <p className="text-[11px] font-medium text-gray-700 truncate">{doc.title || '未命名'}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] bg-gray-100 px-1 rounded">{doc.doc_type}</span>
            <span className="text-[9px] text-gray-400">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('zh-CN') : ''}</span>
          </div>
        </div>
      ))}
      <button onClick={onSelect} className="w-full mt-2 text-[10px] text-[#c8102e] hover:underline py-1">查看全部 →</button>
    </div>
  )
}
