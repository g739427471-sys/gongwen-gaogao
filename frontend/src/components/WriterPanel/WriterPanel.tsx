import { useState, useRef, useCallback, useEffect, DragEvent } from 'react'
import DocTypeSelector from './DocTypeSelector'
import FrameworkView from './FrameworkView'
import ContentView from './ContentView'
import Dashboard from './Dashboard'
import StatusBar from './StatusBar'
import {
  generateFramework, generateContentStream, detectDocType, uploadReference,
  auditContent, exportWord,
} from '../../services/api'
import type { OutlineItem, GenerationComplete } from '../../types'
import {
  Sparkles, Copy, Check, Upload, X, FileText, Sliders, Search, BookOpen, PenTool,
  ChevronDown, ChevronUp, RotateCcw, Download, Edit3, Eye, Save
} from 'lucide-react'

interface Props {
  quickTopic?: string
  quickDocType?: string
  onConsumed?: () => void
  onAutoSearch?: (query: string) => void
}

// Progress steps
const PROGRESS_STEPS = [
  { key: 'understanding', label: '正在理解写作主题...', icon: Search },
  { key: 'researching', label: '正在查阅相关政策文献...', icon: BookOpen },
  { key: 'framework', label: '正在构思文章框架...', icon: PenTool },
  { key: 'writing', label: '正在撰写正文...', icon: Edit3 },
  { key: 'done', label: '生成完成', icon: Check },
]

// AI Flavor
const FLAVOR_OPTIONS = [
  { value: 'official', label: '官方', desc: '最规范的公文表述，适合正式公文' },
  { value: 'standard', label: '标准', desc: '平衡规范与流畅度，日常使用推荐' },
  { value: 'natural', label: '自然', desc: '更贴近日常写作风格，AI味更轻' },
]

export default function WriterPanel({ quickTopic, quickDocType, onConsumed, onAutoSearch }: Props) {
  const [topic, setTopic] = useState('')
  const [docType, setDocType] = useState('通用/自动')
  const [keywords, setKeywords] = useState('')
  const [framework, setFramework] = useState<OutlineItem[]>([])
  const [titleSuggestion, setTitleSuggestion] = useState('')
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateStep, setGenerateStep] = useState<'idle' | 'detecting' | 'framework' | 'content' | 'done'>('idle')
  const [progressStep, setProgressStep] = useState(-1)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [detectReason, setDetectReason] = useState('')
  const [files, setFiles] = useState<{ name: string; text: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [flavor, setFlavor] = useState('standard')
  const [showOptions, setShowOptions] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [learnMsg, setLearnMsg] = useState('')
  const [customWords, setCustomWords] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)

  // 恢复自动保存内容
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gongwen_autosave') || 'null')
      if (saved && saved.content && !topic && !content) {
        setTopic(saved.content.slice(0, 100).replace(/\n/g, ' '))
      }
    } catch {}
  }, [])
  const [auditing, setAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<any>(null)
  const [exporting, setExporting] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const detectTimer = useRef<any>(null)

  // Consume quick commands → fill input
  useEffect(() => {
    if (quickTopic) {
      setTopic(quickTopic)
      if (quickDocType) setDocType(quickDocType)
      onConsumed?.()
    }
  }, [quickTopic])

  // Auto-detect doc type
  useEffect(() => {
    if (detectTimer.current) clearTimeout(detectTimer.current)
    if (topic.trim().length < 5) { setDetectReason(''); return }
    detectTimer.current = setTimeout(async () => {
      try {
        const result = await detectDocType(topic.trim())
        if (!quickDocType) setDocType(result.doc_type)
        setDetectReason(result.reason)
      } catch { /* silent */ }
    }, 1500)
    return () => { if (detectTimer.current) clearTimeout(detectTimer.current) }
  }, [topic])

  // File upload
  const processFile = async (file: File) => {
    if (files.length >= 5) { setError('最多上传5份参考材料'); return }
    setUploading(true); setError('')
    try {
      const result = await uploadReference(file)
      setFiles(prev => [...prev, { name: result.filename, text: result.text }])
    } catch (err: any) {
      setError(err.message || '上传失败')
    } finally { setUploading(false) }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = e.target.files; if (!fs) return
    for (let i = 0; i < fs.length; i++) await processFile(fs[i])
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const fs = e.dataTransfer.files; if (!fs) return
    for (let i = 0; i < fs.length; i++) await processFile(fs[i])
  }

  // Trigger auto-search on right panel
  const triggerAutoSearch = (q: string) => { onAutoSearch?.(q) }

  // Style learning — trigger when user finishes editing
  const handleSaveEdit = async () => {
    const original = content
    const edited = editedContent
    if (!original || !edited || original === edited) { setEditMode(false); return }
    try {
      const { getToken } = await import('../../services/api')
      const token = getToken()
      const res = await fetch(`${import.meta.env.VITE_API_BASE || '/api'}/style/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ original_content: original, edited_content: edited }),
      })
      const data = await res.json()
      if (data.status === 'learned') {
        setLearnMsg(`📝 已学习您本次的编辑偏好`)
        setTimeout(() => setLearnMsg(''), 4000)
      }
    } catch { /* 学习失败不影响主流程 */ }
    setEditMode(false)
    setContent(edited)
  }

  // Audit
  const handleAudit = async () => {
    const text = editMode ? editedContent : content
    if (!text) return
    setAuditing(true); setAuditResult(null)
    try { setAuditResult(await auditContent(text)) }
    catch { setAuditResult({ total_issues: 0, issues: [], summary: '审校失败', categories: {} }) }
    finally { setAuditing(false) }
  }

  // Export Word
  const handleExport = async () => {
    const text = editMode ? editedContent : content
    if (!text) return
    setExporting(true)
    try { await exportWord(text, titleSuggestion || topic || '公文') }
    catch { alert('导出失败') }
    finally { setExporting(false) }
  }

  // ====== Step 1: Framework Only ======
  const handleGenerateFramework = useCallback(async () => {
    if (!topic.trim()) { setError('请输入写作主题。'); return }
    setError(''); setContent(''); setIsGenerating(true); setGenerateStep('framework'); setProgressStep(0); setStartedAt(Date.now())
    triggerAutoSearch(topic.trim())
    const kwList = keywords.split(/[,，、\s]+/).filter(Boolean)
    try { const fw = await generateFramework(topic.trim(), docType, kwList); setFramework(fw.framework); setTitleSuggestion(fw.title_suggestion); setProgressStep(2); setIsGenerating(false); setGenerateStep('awaiting_confirm') }
    catch (err: any) { setProgressStep(-1); setIsGenerating(false); setError(err.message || '大纲生成失败') }
  }, [topic, docType, keywords])

  // ====== Step 2: Content (after confirm) ======
  const handleGenerateContent = useCallback(async () => {
    setError(''); setIsGenerating(true); setGenerateStep('content'); setProgressStep(3)
    const kwList = keywords.split(/[,，、\s]+/).filter(Boolean)
    const refText = files.map(f => f.text).join('\n---\n')
    const inst = `[AI风格: ${flavor}]` + (refText ? `\n参考材料:${refText}` : '')
    abortRef.current = generateContentStream(topic.trim(), docType, kwList, framework, inst,
      (text) => setContent(prev => prev + text),
      (r) => { setProgressStep(4); setIsGenerating(false); setGenerateStep('done'); setContent(r.content); setFramework(r.framework || framework); setTitleSuggestion(r.title || titleSuggestion); setTimeout(() => setProgressStep(-1), 3000) },
      (e) => { setProgressStep(-1); setIsGenerating(false); setGenerateStep('awaiting_confirm'); setError(e || '生成失败') },
    )
  }, [topic, docType, keywords, framework, files, flavor])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Input Area */}
      <div className="p-4 border-b border-gray-200 bg-white space-y-3">
        {/* 1. Core input row: 文种 + 主题 + 字数 */}
        <div className="flex items-stretch gap-2 flex-wrap md:flex-nowrap">
          <DocTypeSelector value={docType} onChange={setDocType} disabled={isGenerating} />
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="输入写作主题，如：2026年上半年党建工作总结"
            className="flex-1 h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e] placeholder-gray-400 min-w-0"
            disabled={isGenerating} />
          <div className="flex items-center gap-1 shrink-0">
            {[300, 800, 2000].map(n => (
              <button key={n} onClick={() => { setCustomWords(customWords === n ? 0 : n) }}
                className={`px-2 py-1 rounded text-[10px] border transition whitespace-nowrap ${
                  customWords === n ? 'border-[#c8102e] bg-[#c8102e]/5 text-[#c8102e] font-medium' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>{n}字</button>
            ))}
            <button onClick={() => { const v = prompt('请输入目标字数（如1500）：'); if(v){ const n=parseInt(v); if(n>0) setCustomWords(n) } }}
              className="px-2 py-1 rounded text-[10px] border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition whitespace-nowrap"
              title="自定义字数">
              {customWords > 0 && ![300,800,2000].includes(customWords) ? `${customWords}字` : '自定义'}
            </button>
          </div>
        </div>
        {detectReason && <p className="text-xs text-green-600">📋 {docType} — {detectReason}</p>}

        {/* 2. 隐藏的高级选项 */}
        {showOptions && (
          <div className="animate-fade-in">
            <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)}
              placeholder="关键词（逗号分隔，如：党建, 组织建设）"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30"
              disabled={isGenerating} />
          </div>
        )}

        {/* 3. AI风格 — 独立一行 */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Sliders size={12} className="text-gray-400" />
            <span className="text-[10px] text-gray-400">AI风格：</span>
            {FLAVOR_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setFlavor(opt.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] transition border ${
                  flavor === opt.value ? 'border-[#c8102e] bg-[#c8102e]/5 text-[#c8102e] font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>{opt.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400">平衡规范与流畅度，日常使用推荐「标准」</span>
            <button onClick={() => setShowOptions(!showOptions)}
              className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
              高级选项 {showOptions ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>
        </div>

        {/* 4. 上传 + 生成按钮 */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <label className="flex items-center gap-1.5 px-3 h-10 border border-[#d0d0d0] rounded-md text-xs text-gray-500 cursor-pointer hover:bg-gray-50 transition shrink-0">
            <Upload size={13} /> 上传参考
            <input type="file" onChange={handleFileInput} multiple className="hidden"
              accept=".doc,.docx,.pdf,.txt,.md" disabled={isGenerating} />
          </label>

          {files.map((f, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-[10px] text-gray-600 shrink-0">
              {f.name.length > 12 ? f.name.slice(0,12)+'…' : f.name}
              <button onClick={() => setFiles(fs => fs.filter((_,j) => j !== i))}><X size={10}/></button>
            </span>
          ))}

          <div className="flex-1 hidden sm:block" />

          {isGenerating ? (
            <button onClick={() => { abortRef.current?.abort(); setIsGenerating(false); setProgressStep(-1) }}
              className="h-10 px-8 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-600 transition w-full sm:w-auto">
              停止生成
            </button>
          ) : (
            <button onClick={handleGenerateFramework}
              className="h-10 w-[120px] bg-[#c8102e] text-white rounded-md text-sm font-bold hover:bg-[#a00d22] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-[#c8102e]/20 shrink-0 ml-auto sm:ml-0">
              <Sparkles size={16} /> 生成公文
            </button>
          )}
        </div>

        {/* Drag-drop — 展开高级选项时显示 */}
        {showOptions && (
          <div onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-3 text-center transition ${dragOver ? 'border-[#c8102e] bg-red-50' : 'border-gray-300'}`}>
            <label className="cursor-pointer">
              <Upload size={16} className="mx-auto text-gray-400 mb-1" />
              <p className="text-[10px] text-gray-500">拖拽文件到此处，或<span className="text-[#c8102e]">点击上传</span></p>
              <p className="text-[9px] text-gray-400">Word / PDF / TXT，最多5份</p>
              <input type="file" className="hidden" onChange={handleFileInput} multiple
                disabled={isGenerating || uploading} accept=".txt,.md,.pdf,.doc,.docx" />
            </label>
            {uploading && <p className="text-xs text-gray-400 mt-1">上传中...</p>}
          </div>
        )}

        {error && (
          <div className="mt-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between gap-2">
            <span>{error}</span>
            {(generateStep === 'awaiting_confirm' || generateStep === 'framework') && (
              <button onClick={() => { setError(''); handleGenerateFramework() }}
                className="shrink-0 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-xs font-medium transition">
                重试
              </button>
            )}
            {generateStep === 'content' && (
              <button onClick={() => { setError(''); handleGenerateContent() }}
                className="shrink-0 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-xs font-medium transition">
                重试
              </button>
            )}
          </div>
        )}
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Usage guide */}
        {!isGenerating && !content && (
          <div className="mb-4 border border-amber-200 rounded-lg bg-amber-50 overflow-hidden">
            <button onClick={() => setShowGuide(!showGuide)}
              className="w-full px-3 py-1.5 flex items-center justify-between text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
              <span>📖 使用指引</span>
              <span className="text-[10px] text-amber-500">{showGuide ? '[收起 ▲]' : '[展开 ▼]'}</span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${
              showGuide ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="px-3 pb-2 text-[10px] text-amber-700 space-y-0.5 leading-relaxed">
                <p>① 选择文种或点击快捷指令 ② 输入写作主题 ③ 调节AI风格 ④ 点击生成公文 ⑤ 审校后导出Word</p>
                <p className="text-amber-500">提示：右侧知识库会随主题自动检索权威参考资料。</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {isGenerating && progressStep >= 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-1 mb-2">
              {PROGRESS_STEPS.map((step, i) => {
                const Icon = step.icon
                const status = i < progressStep ? 'done' : i === progressStep ? 'active' : 'pending'
                return (
                  <div key={step.key} className="flex items-center gap-1">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all ${
                      status === 'active' ? 'bg-[#c8102e]/10 text-[#c8102e] font-medium animate-pulse' :
                      status === 'done' ? 'bg-green-50 text-green-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon size={11} /> {step.label}
                      {status === 'done' && <Check size={10} className="text-green-500" />}
                    </div>
                    {i < PROGRESS_STEPS.length - 1 && (
                      <div className={`w-4 h-0.5 ${i < progressStep - 1 ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Framework */}
        {framework.length > 0 && (
          <>
            <FrameworkView framework={framework} titleSuggestion={titleSuggestion} />
            {/* Confirm outline button (step writing mode) */}
            {generateStep === 'awaiting_confirm' && (
              <div className="flex items-center justify-center gap-3 my-6 animate-fade-in">
                <button onClick={handleGenerateContent}
                  className="px-8 py-3 bg-[#c8102e] text-white rounded-xl text-sm font-medium hover:bg-[#a00d25] transition flex items-center gap-2 shadow-lg">
                  <Sparkles size={18} /> 确认大纲，开始撰写全文
                </button>
                <button onClick={() => handleGenerateFramework()}
                  className="px-6 py-3 text-sm text-gray-500 hover:text-gray-700 underline">
                  重新生成大纲
                </button>
              </div>
            )}
          </>
        )}

        {/* Content result panel */}
        {(content || (isGenerating && generateStep === 'content')) && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <FileText size={14} className="text-[#c8102e]" />
                {isGenerating ? '正在生成...' : '文稿预览/编辑'}
              </h3>
              {!isGenerating && (
                <div className="flex items-center gap-1">
                  <button onClick={() => { if (editMode) { handleSaveEdit() } else { setEditedContent(content); setEditMode(true) } }}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition ${
                      editMode ? 'bg-[#c8102e] text-white' : 'text-gray-500 hover:bg-gray-200'
                    }`}>
                    {editMode ? <Save size={12} /> : <Edit3 size={12} />}
                    {editMode ? '保存修改' : '编辑'}
                  </button>
                  <button onClick={async () => { await navigator.clipboard.writeText(editMode ? editedContent : content); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded transition">
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? '已复制' : '复制全文'}
                  </button>
                  <button onClick={() => window.print()}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded transition">
                    <Download size={12} /> 导出
                  </button>
                  <button onClick={handleGenerateFramework}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#c8102e] hover:bg-red-50 rounded transition">
                    <RotateCcw size={12} /> 重新生成
                  </button>
                  <button onClick={handleExport} disabled={exporting}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50">
                    <Download size={12} /> {exporting ? '导出中' : '导出Word'}
                  </button>
                  <button onClick={handleAudit} disabled={auditing}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition disabled:opacity-50">
                    <Search size={12} /> {auditing ? '审校中' : '审校'}
                  </button>
                </div>
              )}
            </div>
            <div className="p-5">
              {editMode ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full min-h-[400px] p-3 border border-gray-200 rounded text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 resize-y font-serif"
                />
              ) : (
                <ContentView content={content} isStreaming={isGenerating && generateStep === 'content'} />
              )}
            </div>
          </div>
        )}

        {/* Dashboard — 文稿分析 */}
        {content && !isGenerating && (
          <div className="mb-4">
            <Dashboard content={content} docType={docType} />
          </div>
        )}

        {/* Step progress — 步骤模式进度 */}
        {isGenerating && generateStep === 'content' && framework.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-3">
            <span className="text-sm text-blue-700 font-medium">
              {progressStep >= 3 ? '📝 正在撰写正文...' : '🔍 正在组织素材...'}
            </span>
            <span className="text-xs text-blue-500">
              {framework.length > 0 && `大纲共 ${framework.length} 章，正在逐章生成`}
            </span>
          </div>
        )}

        {/* Empty state */}
        {!isGenerating && !content && framework.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <PenTool size={40} className="mb-4 opacity-20" />
            <p className="text-sm font-medium text-gray-500">开始您的公文写作</p>
            <p className="text-xs text-gray-400 mt-1">点击上方「快捷指令」快速开始，或在上方输入写作主题后点击「生成公文」</p>
            <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-gray-400 max-w-xs">
              <div className="flex items-start gap-1"><span className="text-green-500 mt-0.5">✓</span> 支持15种法定文种+9种常用文种</div>
              <div className="flex items-start gap-1"><span className="text-green-500 mt-0.5">✓</span> 权威知识库检索</div>
              <div className="flex items-start gap-1"><span className="text-green-500 mt-0.5">✓</span> AI智能风格调节</div>
              <div className="flex items-start gap-1"><span className="text-green-500 mt-0.5">✓</span> 上传参考材料辅助写作</div>
            </div>
          </div>
        )}
      </div>

      <StatusBar content={content || editedContent} isGenerating={isGenerating} startedAt={startedAt} />

    </div>
  )
}
