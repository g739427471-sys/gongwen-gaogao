import { Calendar, FileText, Wand2, BarChart3, Users, Mail, MessageSquare, BookOpen } from 'lucide-react'

interface Command {
  icon: typeof Calendar
  label: string
  docType: string
  topic: string
}

const COMMANDS: Command[] = [
  {
    icon: Calendar,
    label: '写一份会议通知',
    docType: '通知',
    topic: '关于召开[会议名称]的通知',
  },
  {
    icon: BarChart3,
    label: '起草季度工作总结',
    docType: '工作总结',
    topic: '[部门名称]2026年第[X]季度工作总结',
  },
  {
    icon: FileText,
    label: '撰写调研报告',
    docType: '调研报告',
    topic: '关于[调研主题]的调研报告',
  },
  {
    icon: Mail,
    label: '起草请示',
    docType: '请示',
    topic: '关于[请示事项]的请示',
  },
  {
    icon: MessageSquare,
    label: '写讲话稿',
    docType: '讲话稿',
    topic: '在[会议/活动名称]上的讲话',
  },
  {
    icon: Users,
    label: '撰写汇报材料',
    docType: '汇报材料',
    topic: '关于[工作内容]的汇报',
  },
  {
    icon: BookOpen,
    label: '工作实施方案',
    docType: '实施方案',
    topic: '[项目名称]实施方案',
  },
  {
    icon: Wand2,
    label: '润色这段文字',
    docType: '',
    topic: '',
  },
]

interface Props {
  onSelect: (docType: string, topic: string) => void
}

export default function QuickCommands({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 bg-gradient-to-r from-red-50 to-amber-50 border-b border-red-100/50">
      <span className="text-xs text-gray-500 flex items-center mr-2 whitespace-nowrap">快捷指令：</span>
      {COMMANDS.map((cmd) => (
        <button
          key={cmd.label}
          onClick={() => onSelect(cmd.docType, cmd.topic)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:border-[#c8102e] hover:text-[#c8102e] hover:shadow-sm transition-all whitespace-nowrap"
        >
          <cmd.icon size={12} />
          {cmd.label}
        </button>
      ))}
    </div>
  )
}
