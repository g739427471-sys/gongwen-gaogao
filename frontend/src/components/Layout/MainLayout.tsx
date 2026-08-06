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
import TemplateLibrary from '../WriterPanel/TemplateLibrary'
import { PenLine, LogOut, Clock, FileText, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Moon, Sun, BookOpen } from 'lucide-react'

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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gongwen_dark') === '1')
  const [showTemplates, setShowTemplates] = useState(false)

  // ===== 知识库面板折叠状态 =====
  const [rightCollapsed, setRightCollapsed] = useState(() => {
    return localStorage.getItem('gongwen_right_collapsed') === 'true'
  })
  const [userOverrode, setUserOverrode] = useState(false) // 用户在窄屏手动展开过
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 1200)

  // 持久化折叠偏好
  useEffect(() => {
    localStorage.setItem('gongwen_right_collapsed', rightCollapsed ? 'true' : 'false')
  }, [rightCollapsed])

  // 响应式监听，跨越断点时重置手动覆盖
  useEffect(() => {
    let prevNarrow = isNarrow
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      const narrow = window.innerWidth < 1200
      setIsMobile(mobile)
      setIsNarrow(narrow)
      // 跨越1200px断点时重置覆盖标志
      if (narrow !== prevNarrow) {
        setUserOverrode(false)
        setRightCollapsed(narrow) // 进入窄屏自动折叠，退出窄屏自动展开
      }
      prevNarrow = narrow
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isNarrow])

  // 窗口变宽时关闭移动面板
  useEffect(() => {
    if (!isMobile) setMobilePanelOpen(false)
  }, [isMobile])

  // 自动折叠：窄屏(768-1199px)且用户未手动覆盖
  const autoCollapsed = isNarrow && !isMobile && !userOverrode
  // 面板是否折叠（手动或自动）
  const panelCollapsed = rightCollapsed || autoCollapsed

  // 折叠/展开操作
  const handleCollapse = () => { setRightCollapsed(true); setUserOverrode(true) }
  const handleExpand = () => { setRightCollapsed(false); setUserOverrode(true) }

  // 应用夜间模式
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('gongwen_dark', darkMode ? '1' : '0')
  }, [darkMode])

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
          <button onClick={() => setShowTemplates(true)} className="hover:text-white" title="模板库">
            <BookOpen size={13} />
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="hover:text-white p-1" title="夜间模式">
            {darkMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          {/* 移动端知识面板切换按钮（768-1279px 范围用） */}
          <button onClick={() => { if (isMobile) { setMobilePanelOpen(true) } else { setRightOpen(!rightOpen) } }}
            className="hover:text-white p-1 xl:hidden" title="知识面板">
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
        {/* Left: My Documents */}
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
        <div className={`flex-1 flex flex-col overflow-hidden min-w-0 kb-writing-area`}>
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

        {/* Right: Smart Assistant — Desktop */}
        {rightOpen && !isMobile && (
          <div className={`hidden md:flex flex-col border-l border-gray-200 bg-white shrink-0 kb-right-panel ${
            panelCollapsed
              ? '!w-[48px] !min-w-[48px] !max-w-[48px]'
              : 'w-[25%] min-w-[260px]'
          }`}>
            {panelCollapsed ? (
              /* 折叠态：仅显示竖排展开按钮 */
              <div className="flex flex-col items-center justify-start pt-3 h-full gap-3">
                <button
                  onClick={handleExpand}
                  className="writing-vertical-rl kb-tooltip-trigger px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded text-xs text-gray-500 transition"
                  data-tooltip="点击展开知识库"
                  title="点击展开知识库"
                >
                  展开面板
                </button>
              </div>
            ) : (
              /* 展开态：正常面板内容 + 折叠按钮 */
              <>
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 shrink-0">
                  <span className="text-xs text-gray-400 font-medium">智能助手</span>
                  <button
                    onClick={handleCollapse}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded text-xs text-gray-500 transition"
                    title="收起知识库面板"
                  >
                    ◀ 收起
                  </button>
                </div>
                <div className="flex-1 overflow-hidden"><ReferencePanel autoSearchQuery={autoSearch} /></div>
                <UpdateLog />
              </>
            )}
          </div>
        )}

        {/* Right: Smart Assistant — Mobile/Tablet overlay (768-1279px range, toggled by header button) */}
        {rightOpen && !isMobile && (
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

      {/* ===== 移动端浮动按钮 (<768px) ===== */}
      {isMobile && (
        <button
          className="kb-float-btn"
          onClick={() => setMobilePanelOpen(true)}
          title="打开知识库面板"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </button>
      )}

      {/* ===== 移动端遮罩 + 滑出面板 (<768px) ===== */}
      {isMobile && (
        <>
          <div
            className={`kb-overlay ${mobilePanelOpen ? 'show' : ''}`}
            style={{ display: mobilePanelOpen ? 'block' : 'none' }}
            onClick={() => setMobilePanelOpen(false)}
          />
          <div className={`kb-mobile-panel ${mobilePanelOpen ? 'show' : ''}`}
            style={{ display: mobilePanelOpen ? 'flex' : 'none' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <span className="font-bold text-sm text-gray-800">知识库</span>
              <button
                onClick={() => setMobilePanelOpen(false)}
                className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ReferencePanel autoSearchQuery={autoSearch} />
            </div>
            <UpdateLog />
          </div>
        </>
      )}

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

      <TemplateLibrary visible={showTemplates} onClose={() => setShowTemplates(false)}
        onApply={(docType, topic) => { setQuickDocType(docType); setQuickTopic(topic); setActiveTab('write') }} />

    </div>
  )
}
