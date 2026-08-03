import type { OutlineItem } from '../../types'
import { FileText } from 'lucide-react'

interface Props {
  framework: OutlineItem[]
  titleSuggestion: string
  isLoading?: boolean
}

export default function FrameworkView({ framework, titleSuggestion, isLoading }: Props) {
  if (!framework.length && !isLoading) return null

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={18} className="text-[#c8102e]" />
        <h3 className="font-bold text-gray-800">写作框架</h3>
        {isLoading && (
          <span className="text-xs text-gray-400 ml-2">
            <span className="typing-dot" />
            <span className="typing-dot ml-0.5" />
            <span className="typing-dot ml-0.5" />
          </span>
        )}
      </div>

      {titleSuggestion && (
        <h2 className="text-lg font-bold text-center text-gray-900 mb-4 py-2 border-b-2 border-[#c8102e]">
          {titleSuggestion}
        </h2>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-1">
        {framework.map((item, idx) => (
          <div
            key={idx}
            className="py-1"
            style={{ paddingLeft: `${(item.level - 1) * 1.5}rem` }}
          >
            <div className="flex items-start gap-2">
              <span className="text-[#c8102e] font-bold mt-0.5">
                {item.level === 1 ? '●' : '○'}
              </span>
              <div>
                <span className="font-medium text-gray-800">{item.title}</span>
                {item.key_points?.length > 0 && (
                  <span className="text-gray-500 text-sm ml-2">
                    — {item.key_points.join('；')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
