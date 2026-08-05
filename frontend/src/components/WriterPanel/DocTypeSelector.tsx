import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

// 常用写作类型，不再强制15种法定文种
const DOC_TYPES = [
  { name: '通用/自动', category: '智能识别' },
  { name: '通知', category: '常用' },
  { name: '报告', category: '常用' },
  { name: '请示', category: '常用' },
  { name: '函', category: '常用' },
  { name: '纪要', category: '常用' },
  { name: '意见', category: '常用' },
  { name: '通报', category: '常用' },
  { name: '工作总结', category: '事务文书' },
  { name: '讲话稿', category: '事务文书' },
  { name: '实施方案', category: '事务文书' },
  { name: '调研报告', category: '事务文书' },
  { name: '汇报材料', category: '事务文书' },
  { name: '心得体会', category: '事务文书' },
  { name: '工作计划', category: '事务文书' },
  { name: '述职报告', category: '事务文书' },
]

interface Props {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}

export default function DocTypeSelector({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = DOC_TYPES.find((d) => d.name === value) || DOC_TYPES[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        className={`flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[100px] bg-white hover:border-gray-400 transition ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        disabled={disabled}
        title="选择文种（可选，留空则自动识别）"
      >
        <span>{selected.name}</span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-72 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] text-gray-400 border-b border-gray-100 sticky top-0 bg-white">
            选填 · 留空自动识别文种
          </div>
          {DOC_TYPES.map((dt) => (
            <button
              key={dt.name}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#c8102e]/5 transition flex justify-between items-center ${
                dt.name === value ? 'bg-[#c8102e]/10 text-[#c8102e] font-medium' : 'text-gray-700'
              }`}
              onClick={() => {
                onChange(dt.name)
                setOpen(false)
              }}
            >
              <span>{dt.name}</span>
              <span className="text-[10px] text-gray-400">{dt.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
