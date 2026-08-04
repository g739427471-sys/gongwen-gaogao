import { useState } from 'react'
import { PenLine, FileText, Sparkles, ArrowRight, ArrowLeft, Check } from 'lucide-react'

interface Props {
  onComplete: () => void
}

const STEPS = [
  {
    icon: PenLine,
    title: '您好，我是公文高高',
    desc: '您的智能公文写作助手。请先告诉我您想写什么文种，我们开始吧。',
    tip: '支持通知、报告、请示、讲话稿、工作总结等24种文种，输入主题后我会自动识别。',
  },
  {
    icon: FileText,
    title: '输入主题，生成大纲',
    desc: '在写作区输入您的写作主题和关键词，我会先生成一个逻辑严密的大纲供您确认。',
    tip: '您也可以上传参考材料，我会学习其中的内容和风格。',
  },
  {
    icon: Sparkles,
    title: '一键生成全文',
    desc: '确认大纲后，我会基于人民日报、求是网等权威来源，为您撰写完整、规范的公文。',
    tip: '右侧「智慧助手」会同步展示相关的领导人讲话、格式要点和写作建议。',
  },
  {
    icon: Check,
    title: '越用越懂您',
    desc: '每次生成的文稿都会自动存档。我还会学习您的写作风格，让未来的文稿越来越像您自己写的。',
    tip: '点击顶部「历史」可以查看和复用之前生成的所有材料。',
  },
]

export default function OnboardingGuide({ onComplete }: Props) {
  const [step, setStep] = useState(0)

  const StepIcon = STEPS[step].icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-[520px] overflow-hidden animate-fade-in">
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-6">
          {STEPS.map((_, i) => (
            <div key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[#c8102e]' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#c8102e] rounded-xl flex items-center justify-center">
              <StepIcon size={20} className="text-white" />
            </div>
            <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-2">{STEPS[step].title}</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">{STEPS[step].desc}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700">💡 {STEPS[step].tip}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            className={`flex items-center gap-1 px-4 py-2 text-sm rounded-lg transition ${
              step > 0 ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300 cursor-not-allowed'
            }`}
            disabled={step === 0}
          >
            <ArrowLeft size={14} /> 上一步
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 px-5 py-2 bg-[#c8102e] text-white text-sm rounded-lg hover:bg-[#a00d25] transition"
            >
              下一步 <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 px-5 py-2 bg-[#c8102e] text-white text-sm rounded-lg hover:bg-[#a00d25] transition"
            >
              开始写作 <Check size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
