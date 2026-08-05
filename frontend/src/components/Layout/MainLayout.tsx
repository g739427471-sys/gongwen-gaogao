import { useState, useEffect } from 'react'
import WriterPanel from '../WriterPanel/WriterPanel'
import HistoryPanel from '../WriterPanel/HistoryPanel'
import ReferencePanel from '../ReferencePanel/ReferencePanel'
import QuickCommands from '../WriterPanel/QuickCommands'
import OnboardingGuide from './OnboardingGuide'
import BrandBanner from './BrandBanner'
import UpdateLog from './UpdateLog'
import UpdateEntry from '../Admin/UpdateEntry'
import DocSidebar from './DocSidebar'
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
  const [adminClicks, setAdminClicks] = useState(0)
  const [showAdmin, setShowAdmin] = useState(false)
  const [totalDocs, setTotalDocs] = useState(0)

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
              className={`px-2.5 py-1 rounded text-xs font-medium ${activeTab === 'history' ? 'bg-white/20' : 'text-white/60 hover:text-white'}`}>历史 ({totalDocs})</button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/70">
          <button onClick={() => setRightOpen(!rightOpen)} className="hover:text-white p-1 xl:hidden" title="知识面板">
            {rightOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-medium cursor-default" title="个人中心">
            {username[0]?.toUpperCase()}
          </div>
          <button onClick={onLogout} className="hover:text-white ml-1"><LogOut size={13} /></button>
        </div>
      </header>

      <BrandBanner username={username} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: My Documents (hidden on mobile) */}
        {leftOpen && (
          <div className="hidden md:flex md:flex-col w-[20%] min-w-[180px] max-w-[240px] bg-white border-r border-gray-200 shrink-0">
            <DocSidebar
              activeTab={activeTab}
              onSelectDoc={() => setActiveTab('history')}
              onNewDoc={() => { setActiveTab('write') }}
              onHistory={() => setActiveTab('history')}
              totalDocs={totalDocs}
              setTotalDocs={setTotalDocs}
            />
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
          <div className="hidden xl:flex xl:flex-col w-[25%] min-w-[260px] border-l border-gray-200 bg-white shrink-0">
            <div className="flex-1 overflow-hidden"><ReferencePanel autoSearchQuery={autoSearch} /></div>
            <UpdateLog />
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

      {/* 隐藏入口 — 连续点击激活管理后台 */}
      <div className="text-center py-1 bg-[#f5f5f0]">
        <span
          className="text-[9px] text-gray-300 cursor-default select-none"
          onClick={() => { const n = adminClicks + 1; setAdminClicks(n); if (n >= 5) { setShowAdmin(true); setAdminClicks(0) } }}
          title=""
        >
          v2.5.0
        </span>
      </div>

      <UpdateEntry visible={showAdmin} onClose={() => setShowAdmin(false)} />

    </div>
  )
}

