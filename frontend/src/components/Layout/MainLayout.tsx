import { useState } from 'react'
import WriterPanel from '../WriterPanel/WriterPanel'
import HistoryPanel from '../WriterPanel/HistoryPanel'
import ReferencePanel from '../ReferencePanel/ReferencePanel'
import { PenLine, ChevronLeft, ChevronRight, User, LogOut, Clock } from 'lucide-react'

interface Props {
  username: string
  onLogout: () => void
}

export default function MainLayout({ username, onLogout }: Props) {
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write')

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f0]">
      {/* Header */}
      <header className="bg-[#c8102e] text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1.5 rounded">
            <PenLine size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">公文高高</h1>
            <p className="text-xs text-white/70">智能公文写作辅助工具</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${
              activeTab === 'write' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'
            }`}
          >
            <PenLine size={14} /> 写作
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${
              activeTab === 'history' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'
            }`}
          >
            <Clock size={14} /> 历史
          </button>
          <span className="mx-2 text-white/30">|</span>
          <div className="flex items-center gap-1.5 text-white/80 text-sm">
            <User size={14} />
            <span>{username}</span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded transition"
          >
            <LogOut size={14} /> 退出
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className={`transition-all duration-300 ${rightPanelOpen ? 'w-[60%]' : 'flex-1'}`}>
          {activeTab === 'write' ? (
            <WriterPanel />
          ) : (
            <HistoryPanel onBack={() => setActiveTab('write')} />
          )}
        </div>

        {/* Divider */}
        <div className="relative flex items-center">
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="absolute -left-3 z-10 w-6 h-12 bg-white border border-gray-200 rounded-r shadow-sm flex items-center justify-center hover:bg-gray-50"
            title={rightPanelOpen ? '收起参考面板' : '展开参考面板'}
          >
            {rightPanelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Right Panel */}
        {rightPanelOpen && (
          <div className="w-[40%] border-l border-gray-200 bg-white">
            <ReferencePanel />
          </div>
        )}
      </div>
    </div>
  )
}
