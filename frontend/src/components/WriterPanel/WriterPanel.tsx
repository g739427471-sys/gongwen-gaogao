import { useState, useRef, useCallback, useEffect } from 'react'
import DocTypeSelector from './DocTypeSelector'
import FrameworkView from './FrameworkView'
import ContentView from './ContentView'
import LoadingSpinner from '../common/LoadingSpinner'
import {
  generateFramework, generateContentStream, detectDocType, uploadReference,
} from '../../services/api'
import type { OutlineItem, GenerationComplete } from '../../types'
import { Sparkles, Copy, Check, Upload, X, FileText } from 'lucide-react'

export default function WriterPanel() {
  const [topic, setTopic] = useState('')
  const [docType, setDocType] = useState('通知')
  const [keywords, setKeywords] = useState('')
  const [framework, setFramework] = useState<OutlineItem[]>([])
  const [titleSuggestion, setTitleSuggestion] = useState('')
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateStep, setGenerateStep] = useState<'idle' | 'detecting' | 'framework' | 'content' | 'done'>('idle')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [detectReason, setDetectReason] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{ name: string; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const contentRef = useRef('')
  const detectTimer = useRef<any>(null)

  // Auto-detect doc type when topic changes
  useEffect(() => {
    if (detectTimer.current) clearTimeout(detectTimer.current)
    if (topic.trim().length < 5) {
      setDetectReason('')
      return
    }
    detectTimer.current = setTimeout(async () => {
      try {
        setGenerateStep('detecting')
        const result = await detectDocType(topic.trim())
        setDocType(result.doc_type)
        setDetectReason(result.reason)
        setGenerateStep('idle')
      } catch {
        setGenerateStep('idle')
      }
    }, 1500)
    return () => { if (detectTimer.current) clearTimeout(detectTimer.current) }
  }, [topic])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadReference(file)
      setUploadedFile({ name: result.filename, text: result.text })
    } catch (err: any) {
      setError(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('请输入写作主题'); return }

    setError('')
    setContent('')
    contentRef.current = ''
    setIsGenerating(true)
    setGenerateStep('framework')

    const kwList = keywords.split(/[,，、\s]+/).filter(Boolean)

    try {
      // Step 1: Generate framework
      const fwResult = await generateFramework(topic.trim(), docType, kwList)
      setFramework(fwResult.framework)
      setTitleSuggestion(fwResult.title_suggestion)

      // Step 2: Auto-generate content after framework
      setGenerateStep('content')
      abortRef.current = generateContentStream(
        topic.trim(), docType, kwList, fwResult.framework,
        uploadedFile?.text,
        (text) => { contentRef.current += text; setContent(contentRef.current) },
        (result: GenerationComplete) => {
          setContent(result.content)
          setFramework(result.framework || fwResult.framework)
          setTitleSuggestion(result.title || fwResult.title_suggestion)
          setIsGenerating(false)
          setGenerateStep('done')
        },
        (errMsg) => { setError(errMsg); setIsGenerating(false); setGenerateStep('idle') },
      )
    } catch (err: any) {
      setError(err.message || '生成失败')
      setIsGenerating(false)
      setGenerateStep('idle')
    }
  }, [topic, docType, keywords, uploadedFile])

  const handleStop = () => {
    abortRef.current?.abort()
    setIsGenerating(false)
    setGenerateStep(content ? 'done' : 'idle')
  }

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Input Area */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              写作主题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：2025年度党建工作总结"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
              disabled={isGenerating}
            />
            {detectReason && (
              <p className="text-xs text-green-600 mt-1">
                已识别文种：{docType} — {detectReason}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">文种</label>
            <DocTypeSelector value={docType} onChange={setDocType} disabled={isGenerating} />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              关键词（逗号分隔）
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="例如：党建, 政治建设, 组织生活"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
              disabled={isGenerating}
            />
          </div>

          {/* Upload reference material */}
          <label className={`flex items-center gap-1 px-4 py-2 border rounded-md text-sm cursor-pointer transition ${
            isGenerating ? 'opacity-50 cursor-not-allowed' : 'border-gray-300 hover:bg-gray-50'
          }`}>
            <Upload size={14} />
            {uploading ? '上传中...' : '上传参考'}
            <input type="file" className="hidden" onChange={handleUpload} disabled={isGenerating || uploading}
              accept=".txt,.md,.png,.jpg,.jpeg,.gif,.bmp,.webp,.pdf,.doc,.docx" />
          </label>

          <div className="flex gap-2">
            {isGenerating ? (
              <button onClick={handleStop}
                className="px-6 py-2 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-600 transition">
                停止
              </button>
            ) : (
              <button onClick={handleGenerate}
                className="px-6 py-2 bg-[#c8102e] text-white rounded-md text-sm font-medium hover:bg-[#a00d25] transition flex items-center gap-2">
                <Sparkles size={16} />
                生成公文
              </button>
            )}
          </div>
        </div>

        {/* Uploaded file indicator */}
        {uploadedFile && (
          <div className="mt-2 flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 text-blue-700 p-2 rounded">
            <FileText size={14} />
            <span>已上传参考：{uploadedFile.name}（{uploadedFile.text.length}字）</span>
            <button onClick={() => setUploadedFile(null)} className="ml-auto text-blue-500 hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>
        )}
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {(isGenerating && generateStep === 'framework') && (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner text="正在生成写作框架..." />
          </div>
        )}

        {framework.length > 0 && (
          <FrameworkView framework={framework} titleSuggestion={titleSuggestion} />
        )}

        {(content || (isGenerating && generateStep === 'content')) && (
          <ContentView content={content} isStreaming={isGenerating && generateStep === 'content'} />
        )}

        {!isGenerating && !content && framework.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Sparkles size={48} className="mb-4 opacity-30" />
            <p className="text-lg">输入写作主题，选择文种，开始智能写作</p>
            <p className="text-sm mt-2">支持24种文种，可自动识别。也可上传参考材料辅助写作</p>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      {content && !isGenerating && (
        <div className="px-4 py-2 border-t border-gray-200 bg-white flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {titleSuggestion && `《${titleSuggestion}》`} — 共约 {content.length} 字
          </span>
          <button onClick={handleCopy}
            className="flex items-center gap-1 px-4 py-1.5 text-sm bg-[#c8102e] text-white rounded hover:bg-[#a00d25] transition">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制全文'}
          </button>
        </div>
      )}
    </div>
  )
}
