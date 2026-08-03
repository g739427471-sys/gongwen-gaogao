import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const DOC_TYPES = [
  { name: '决议', category: '下行文' },
  { name: '决定', category: '下行文' },
  { name: '命令', category: '下行文' },
  { name: '公报', category: '下行文' },
  { name: '公告', category: '下行文' },
  { name: '通告', category: '下行文' },
  { name: '意见', category: '下行/上行' },
  { name: '通知', category: '下行文' },
  { name: '通报', category: '下行文' },
  { name: '报告', category: '上行文' },
  { name: '请示', category: '上行文' },
  { name: '批复', category: '下行文' },
  { name: '议案', category: '平行文' },
  { name: '函', category: '平行文' },
  { name: '纪要', category: '下行/平行' },
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

  const selected = DOC_TYPES.find((d) => d.name === value) || DOC_TYPES[7]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        className={`flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[90px] bg-white hover:border-gray-400 transition ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        disabled={disabled}
      >
        <span>{selected.name}</span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
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
              <span className="text-xs text-gray-400">{dt.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
