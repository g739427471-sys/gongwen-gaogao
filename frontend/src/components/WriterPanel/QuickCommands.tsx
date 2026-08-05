import { useState, useEffect } from 'react'
import { Calendar, FileText, Wand2, BarChart3, Users, Mail, MessageSquare, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

interface Command { icon: typeof Calendar; label: string; docType: string; topic: string }

const COMMANDS: Command[] = [
  { icon: FileText, label: '写一份会议通知', docType: '通知', topic: '关于召开……会议的通知。请写明会议时间、地点、参会人员、议程等。' },
  { icon: Calendar, label: '起草季度工作总结', docType: '工作总结', topic: '2026年第X季度工作总结，请涵盖主要成绩、存在问题、下一步计划。' },
  { icon: BarChart3, label: '撰写调研报告', docType: '调研报告', topic: '关于XX情况的调研报告，请包括调研基本情况、主要发现、问题分析和对策建议。' },
  { icon: Users, label: '起草请示', docType: '请示', topic: '关于……的请示。请写明请示缘由、具体事项和建议方案。' },
  { icon: BookOpen, label: '写讲话稿', docType: '讲话稿', topic: '在……会议上的讲话。请考虑开场问候、总结成绩、部署任务、号召动员。' },
  { icon: Mail, label: '撰写汇报材料', docType: '汇报材料', topic: '关于XX工作的汇报材料，面对上级领导检查，请涵盖工作进展、成效、问题和打算。' },
  { icon: MessageSquare, label: '工作实施方案', docType: '实施方案', topic: 'XX工作方案。请包括指导思想、工作目标、主要任务、实施步骤、保障措施。' },
]

const STORAGE_KEY = 'gongwen_commands_collapsed'

interface Props { onSelect: (docType: string, topic: string) => void }

export default function QuickCommands({ onSelect }: Props) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' }
    catch { return false }
  })

  const toggle = () => {
    const next = !collapsed; setCollapsed(next)
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0') } catch {}
  }

  return (
    <div className="border-b border-red-100/50 bg-gradient-to-r from-red-50 to-amber-50">
      {/* Header — always visible */}
      <button onClick={toggle}
        className="w-full px-4 py-2 flex items-center justify-between text-xs hover:bg-red-100/30 transition">
        <span className="flex items-center gap-1.5 text-gray-500 font-medium">
          <span>📋</span> 快捷指令
        </span>
        <span className="text-gray-400">
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </span>
      </button>

      {/* Commands — collapsible */}
      <div className={`overflow-hidden transition-all duration-300 ${
        collapsed ? 'max-h-0' : 'max-h-40'
      }`}>
        <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
          {COMMANDS.map((cmd) => (
            <button key={cmd.label}
              onClick={() => onSelect(cmd.docType, cmd.topic)}
              className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-[11px] text-gray-600 hover:border-[#c8102e] hover:text-[#c8102e] hover:shadow-sm transition-all">
              <cmd.icon size={11} />
              {cmd.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
