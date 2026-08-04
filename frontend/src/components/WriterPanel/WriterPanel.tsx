import { useState, useRef, useCallback, useEffect } from 'react'
import DocTypeSelector from './DocTypeSelector'
import FrameworkView from './FrameworkView'
import ContentView from './ContentView'
import LoadingSpinner from '../common/LoadingSpinner'
import {
  generateFramework, generateContentStream, detectDocType, uploadReference,
} from '../../services/api'
import type { OutlineItem, GenerationComplete } from '../../types'
import {
  Sparkles, Copy, Check, Upload, X, FileText, Sliders, BookOpen,
  Search, PenTool, ChevronDown, ChevronUp,
} from 'lucide-react'

interface Props {
  quickTopic?: string
  quickDocType?: string
  onConsumed?: () => void
}

// Generation progress steps
const PROGRESS_STEPS = [
  { key: 'searching', label: '正在检索权威资料...', icon: Search },
  { key: 'framework', label: '正在构思文章框架...', icon: BookOpen },
  { key: 'content', label: '正在组织撰写语言...', icon: PenTool },
  { key: 'done', label: '生成完成', icon: Check },
]

// AI Flavor presets
const FLAVOR_OPTIONS = [
  { value: 'official', label: '官方', desc: '庄重严肃，用语标准' },
  { value: 'standard', label: '标准', desc: '规范得体，表述准确' },
  { value: 'natural', label: '自然', desc: '避免套路，像人写的' },
]

export default function WriterPanel({ quickTopic, quickDocType, onConsumed }: Props) {
  const [topic, setTopic] = useState('')
  const [docType, setDocType] = useState('通知')
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
  const [uploadedFile, setUploadedFile] = useState<{ name: string; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [flavor, setFlavor] = useState('standard')
  const [showOptions, setShowOptions] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const contentRef = useRef('')
  const detectTimer = useRef<any>(null)

  // Consume quick commands
  useEffect(() => {
    if (quickTopic) { setTopic(quickTopic); onConsumed?.() }
    if (quickDocType) setDocType(quickDocType)
  }, [quickTopic, quickDocType])

  // Auto-detect doc type
  useEffect(() => {
    if (detectTimer.current) clearTimeout(detectTimer.current)
    if (topic.trim().length < 5) { setDetectReason(''); return }
    detectTimer.current = setTimeout(async () => {
      try {
        setGenerateStep('detecting')
        const result = await detectDocType(topic.trim())
        setDocType(result.doc_type); setDetectReason(result.reason)
        setGenerateStep('idle')
      } catch { setGenerateStep('idle') }
    }, 1500)
    return () => { if (detectTimer.current) clearTimeout(detectTimer.current) }
  }, [topic])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { const result = await uploadReference(file); setUploadedFile({ name: result.filename, text: result.text }) }
    catch (err: any) { setError(err.message || '上传失败') }
    finally { setUploading(false) }
  }

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('请输入写作主题，或点击上方快捷指令快速开始'); return }
    setError(''); setContent(''); contentRef.current = ''
    setIsGenerating(true); setGenerateStep('framework')

    // Start progress animation
    setProgressStep(0)
    const progressTimer = setInterval(() => {
      setProgressStep(p => Math.min(p + 1, 2))
    }, 2000)

    const kwList = keywords.split(/[,，、\s]+/).filter(Boolean)
    try {
      const fwResult = await generateFramework(topic.trim(), docType, kwList)
      setFramework(fwResult.framework); setTitleSuggestion(fwResult.title_suggestion)
      setGenerateStep('content'); setProgressStep(2)

      const instructions = `[AI风格: ${flavor}]` + (uploadedFile?.text ? `\n参考材料: ${uploadedFile.text}` : '')
      abortRef.current = generateContentStream(
        topic.trim(), docType, kwList, fwResult.framework,
        instructions,
        (text) => { contentRef.current += text; setContent(contentRef.current) },
        (result: GenerationComplete) => {
          clearInterval(progressTimer); setProgressStep(3)
          setContent(result.content); setFramework(result.framework || fwResult.framework)
          setTitleSuggestion(result.title || fwResult.title_suggestion)
          setIsGenerating(false); setGenerateStep('done')
          setTimeout(() => setProgressStep(-1), 2000)
        },
        (errMsg) => { clearInterval(progressTimer); setProgressStep(-1)
          setError(errMsg); setIsGenerating(false); setGenerateStep('idle') },
      )
    } catch (err: any) {
      clearInterval(progressTimer); setProgressStep(-1)
      setError(err.message || '生成失败，请稍后重试'); setIsGenerating(false); setGenerateStep('idle')
    }
  }, [topic, docType, keywords, uploadedFile, flavor])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Quick Commands already in MainLayout */}

      {/* Input Area */}
      <div className="p-4 border-b border-gray-200 bg-white">
        {/* Flavor bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs">
            <Sliders size={12} className="text-gray-400" />
            <span className="text-gray-500">AI风格：</span>
            <div className="flex gap-1">
              {FLAVOR_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => setFlavor(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs transition ${
                    flavor === opt.value
                      ? 'bg-[#c8102e] text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowOptions(!showOptions)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
            高级选项 {showOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="输入写作主题，例如：2026年上半年党建工作总结"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
              disabled={isGenerating} />
            {detectReason && (
              <p className="text-xs text-green-600 mt-1">📋 已识别：{docType} — {detectReason}</p>
            )}
          </div>
          <div>
            <DocTypeSelector value={docType} onChange={setDocType} disabled={isGenerating} />
          </div>
        </div>

        {showOptions && (
          <div className="flex items-end gap-3 mt-3 pt-3 border-t border-gray-100 animate-fade-in">
            <div className="flex-1">
              <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                placeholder="关键词（逗号分隔，如：党建, 组织建设）"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30"
                disabled={isGenerating} />
            </div>
            <label className={`flex items-center gap-1 px-3 py-1.5 border rounded text-sm cursor-pointer transition ${
              isGenerating ? 'opacity-50 cursor-not-allowed' : 'border-gray-300 hover:bg-gray-50'
            }`}>
              <Upload size={14} /> {uploading ? '上传中' : '上传参考'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={isGenerating}
                accept=".txt,.md,.png,.jpg,.jpeg,.gif,.bmp,.webp,.pdf,.doc,.docx" />
            </label>
            <div className="flex gap-2">
              {isGenerating ? (
                <button onClick={() => { abortRef.current?.abort(); setIsGenerating(false); setProgressStep(-1) }}
                  className="px-6 py-1.5 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition">停止生成</button>
              ) : (
                <button onClick={handleGenerate}
                  className="px-6 py-2.5 bg-[#c8102e] text-white rounded-lg text-sm font-medium hover:bg-[#a00d25] transition flex items-center gap-2 shadow-sm">
                  <Sparkles size={16} /> 生成公文
                </button>
              )}
            </div>
          </div>
        )}

        {!showOptions && (
          <div className="flex items-center justify-end gap-2 mt-3">
            <label className={`flex items-center gap-1 px-3 py-1.5 border rounded text-xs cursor-pointer transition ${
              isGenerating ? 'opacity-50 cursor-not-allowed' : 'border-gray-300 hover:bg-gray-50'
            }`}>
              <Upload size={12} /> {uploading ? '上传中' : '上传参考'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={isGenerating}
                accept=".txt,.md,.png,.jpg,.jpeg,.pdf,.doc,.docx" />
            </label>
            {isGenerating ? (
              <button onClick={() => { abortRef.current?.abort(); setIsGenerating(false); setProgressStep(-1) }}
                className="px-5 py-1.5 bg-gray-500 text-white rounded-lg text-xs hover:bg-gray-600 transition">停止</button>
            ) : (
              <button onClick={handleGenerate}
                className="px-5 py-2.5 bg-[#c8102e] text-white rounded-lg text-sm font-medium hover:bg-[#a00d25] transition flex items-center gap-2 shadow-sm">
                <Sparkles size={16} /> 生成公文
              </button>
            )}
          </div>
        )}

        {/* Upload indicator */}
        {uploadedFile && (
          <div className="mt-2 flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 text-blue-700 p-2 rounded">
            <FileText size={14} /> 已上传参考：{uploadedFile.name}
            <button onClick={() => setUploadedFile(null)} className="ml-auto text-blue-500 hover:text-red-500"><X size={14} /></button>
          </div>
        )}
        {error && (
          <div className="mt-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
        )}
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Generation Progress */}
        {isGenerating && progressStep >= 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              {PROGRESS_STEPS.map((step, i) => {
                const Icon = step.icon
                const status = i < progressStep ? 'done' : i === progressStep ? 'active' : 'pending'
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                      status === 'active' ? 'bg-[#c8102e]/10 text-[#c8102e] font-medium animate-pulse' :
                      status === 'done' ? 'bg-green-50 text-green-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon size={12} /> {step.label}
                      {status === 'done' && <Check size={10} />}
                    </div>
                    {i < PROGRESS_STEPS.length - 1 && (
                      <div className={`w-6 h-0.5 ${i < progressStep - 1 ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Framework */}
        {framework.length > 0 && (
          <FrameworkView framework={framework} titleSuggestion={titleSuggestion} />
        )}

        {/* Content */}
        {(content || (isGenerating && generateStep === 'content')) && (
          <ContentView content={content} isStreaming={isGenerating && generateStep === 'content'} />
        )}

        {/* Empty state */}
        {!isGenerating && !content && framework.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <PenTool size={40} className="mb-4 opacity-20" />
            <p className="text-sm">点击上方「快捷指令」快速开始，或输入主题后点击「生成公文」</p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {content && !isGenerating && (
        <div className="px-4 py-2 border-t border-gray-200 bg-white flex items-center justify-between">
          <span className="text-xs text-gray-500">{titleSuggestion && `《${titleSuggestion}》`} · {content.length} 字</span>
          <button onClick={async () => { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="flex items-center gap-1 px-4 py-1.5 text-xs bg-[#c8102e] text-white rounded-lg hover:bg-[#a00d25] transition">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? '已复制' : '复制全文'}
          </button>
        </div>
      )}
    </div>
  )
}
