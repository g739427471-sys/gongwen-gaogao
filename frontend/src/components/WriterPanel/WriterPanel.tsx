import { useState, useRef, useCallback, useEffect, DragEvent } from 'react'
import DocTypeSelector from './DocTypeSelector'
import FrameworkView from './FrameworkView'
import ContentView from './ContentView'
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
    setError(''); setContent(''); setIsGenerating(true); setGenerateStep('framework'); setProgressStep(0)
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
      <div className="p-4 border-b border-gray-200 bg-white">
        {/* Flavor bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders size={13} className="text-gray-400" />
            <span className="text-xs text-gray-500">AI风格：</span>
            <div className="flex gap-1">
              {FLAVOR_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => setFlavor(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs transition ${
                    flavor === opt.value ? 'bg-[#c8102e] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-400 ml-1 hidden sm:inline">
              {FLAVOR_OPTIONS.find(o => o.value === flavor)?.desc}
            </span>
          </div>
          <button onClick={() => setShowOptions(!showOptions)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
            高级选项 {showOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* Topic input */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="请输入写作主题，例如：关于2026年上半年党建工作情况的总结报告。您也可以指定文种（通知/报告/请示/讲话稿等）和字数要求。"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e] placeholder-gray-400"
              disabled={isGenerating} />
            <p className="text-[10px] text-gray-400 mt-1">支持上传参考文档（Word/PDF/TXT，最多5份），生成更贴合您需求的文稿。</p>
            {detectReason && (
              <p className="text-xs text-green-600 mt-0.5">📋 {docType} — {detectReason}</p>
            )}
          </div>
          <div>
            <DocTypeSelector value={docType} onChange={setDocType} disabled={isGenerating} />
          </div>
        </div>

        {/* Optional inputs + Upload + Generate */}
        {showOptions && (
          <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                  placeholder="关键词（逗号分隔，如：党建, 组织建设）"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30"
                  disabled={isGenerating} />
              </div>
              <div className="flex gap-2">
                {isGenerating ? (
                  <button onClick={() => { abortRef.current?.abort(); setIsGenerating(false); setProgressStep(-1) }}
                    className="px-6 py-1.5 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600">停止生成</button>
                ) : (
                  <button onClick={handleGenerateFramework}
                    className="px-6 py-2.5 bg-[#c8102e] text-white rounded-lg text-sm font-medium hover:bg-[#a00d25] transition flex items-center gap-2 shadow-sm">
                    <Sparkles size={16} /> 生成公文
                  </button>
                )}
              </div>
            </div>
            {/* Upload area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-3 text-center transition ${
                dragOver ? 'border-[#c8102e] bg-red-50' : 'border-gray-300'
              }`}
            >
              <label className="cursor-pointer">
                <Upload size={18} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">拖拽文件到此处，或<span className="text-[#c8102e]">点击上传</span></p>
                <p className="text-[10px] text-gray-400">支持 Word / PDF / TXT / 图片，最多5份</p>
                <input type="file" className="hidden" onChange={handleFileInput} multiple
                  disabled={isGenerating || uploading}
                  accept=".txt,.md,.png,.jpg,.jpeg,.gif,.bmp,.webp,.pdf,.doc,.docx" />
              </label>
              {uploading && <p className="text-xs text-gray-400 mt-1">上传中...</p>}
            </div>
            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded px-2 py-1">
                    <FileText size={12} className="text-blue-500" />
                    <span className="flex-1 text-blue-700 truncate">{f.name}</span>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      className="text-blue-400 hover:text-red-500"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Compact mode: Generate + Upload */}
        {!showOptions && (
          <div className="flex items-center justify-end gap-2 mt-3">
            <label className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-xs cursor-pointer hover:bg-gray-50 transition">
              <Upload size={12} /> {uploading ? '上传中' : '上传参考'}
              <input type="file" className="hidden" onChange={handleFileInput} multiple
                disabled={isGenerating || uploading}
                accept=".txt,.md,.png,.jpg,.jpeg,.pdf,.doc,.docx" />
            </label>
            {files.length > 0 && <span className="text-[10px] text-green-600">已上传 {files.length} 份</span>}
            {isGenerating ? (
              <button onClick={() => { abortRef.current?.abort(); setIsGenerating(false); setProgressStep(-1) }}
                className="px-5 py-1.5 bg-gray-500 text-white rounded-lg text-xs hover:bg-gray-600">停止</button>
            ) : (
              <button onClick={handleGenerateFramework}
                className="px-5 py-2.5 bg-[#c8102e] text-white rounded-lg text-sm font-medium hover:bg-[#a00d25] transition flex items-center gap-2 shadow-sm">
                <Sparkles size={16} /> 生成公文
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
        )}
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Usage guide */}
        {!isGenerating && !content && (
          <div className="mb-4 border border-amber-200 rounded-lg bg-amber-50 overflow-hidden">
            <button onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-amber-800">
              💡 使用指引 {showGuide ? '▲' : '▼'}
            </button>
            {showGuide && (
              <div className="px-4 pb-3 text-xs text-amber-700 space-y-1 leading-relaxed">
                <p><strong>1.</strong> 输入主题或点击上方「快捷指令」→ <strong>2.</strong> 调节AI风格 → <strong>3.</strong> 可选上传参考文件 → <strong>4.</strong> 点击「生成公文」→ <strong>5.</strong> 编辑修改后导出</p>
                <p className="text-amber-500">提示：右侧面板会自动检索与您主题相关的权威资料。</p>
              </div>
            )}
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

        {/* Empty state */}
        {!isGenerating && !content && framework.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <PenTool size={40} className="mb-4 opacity-20" />
            <p className="text-sm font-medium text-gray-500">开始您的公文写作</p>
            <p className="text-xs text-gray-400 mt-1">点击上方「快捷指令」快速开始，或在上方输入写作主题后点击「生成公文」</p>
            <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-gray-400 max-w-xs">
              <div className="flex items-start gap-1"><span className="text-green-500 mt-0.5">✓</span> 支持24种文种自动识别</div>
              <div className="flex items-start gap-1"><span className="text-green-500 mt-0.5">✓</span> 权威知识库检索</div>
              <div className="flex items-start gap-1"><span className="text-green-500 mt-0.5">✓</span> AI智能风格调节</div>
              <div className="flex items-start gap-1"><span className="text-green-500 mt-0.5">✓</span> 上传参考材料辅助写作</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
