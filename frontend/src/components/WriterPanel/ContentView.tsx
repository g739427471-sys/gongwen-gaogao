import ReactMarkdown from 'react-markdown'

interface Props {
  content: string
  isStreaming?: boolean
}

export default function ContentView({ content, isStreaming }: Props) {
  if (!content && !isStreaming) return null

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 bg-[#c8102e] rounded" />
        <h3 className="font-bold text-gray-800">正文</h3>
        {isStreaming && (
          <span className="text-xs text-[#c8102e] ml-2 font-medium">生成中...</span>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 markdown-content text-[15px] leading-relaxed">
        {content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
        {isStreaming && content && (
          <span className="inline-block w-2 h-4 bg-[#c8102e] ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  )
}
