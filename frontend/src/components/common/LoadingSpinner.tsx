interface Props {
  text?: string
}

export default function LoadingSpinner({ text = '加载中...' }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-[#c8102e]/20 border-t-[#c8102e] rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}
