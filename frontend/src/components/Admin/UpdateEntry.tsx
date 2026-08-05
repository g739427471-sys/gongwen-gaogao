/** 隐藏更新录入+卖点管理 — 连续点击版本号5次激活 */
import { useState } from 'react'
import { X, ChevronUp, ChevronDown, Plus, Eye, EyeOff } from 'lucide-react'
import type { UpdateRecord } from '../../services/advantageEngine'
import { getAdvantages, scoreAdvantage, generateAdvantageText, getAdvantageIcon } from '../../services/advantageEngine'

interface Props { visible: boolean; onClose: () => void }

export default function UpdateEntry({ visible, onClose }: Props) {
  const [tab, setTab] = useState<'add' | 'manage'>('add')
  const [advantages, setAdvantages] = useState<UpdateRecord[]>(getAdvantages())

  // 新增表单
  const [form, setForm] = useState({ version: '', date: new Date().toISOString().slice(0,10), type: '新增功能', description: '' })
  const [preview, setPreview] = useState<any>(null)

  const handlePreview = () => {
    const dummy: UpdateRecord = {
      id: 'preview', version: form.version, date: form.date, type: form.type,
      description: form.description, isMajor: false, isAdvantage: null,
      advantageTitle: '', advantageSubtitle: '', advantageDesc: '',
      displayOnLogin: false, displayOnHome: false, displayOrder: 99,
    }
    const score = scoreAdvantage(dummy)
    const texts = generateAdvantageText(dummy)
    setPreview({ ...score, ...texts, isAdvantage: score.score >= 3 })
  }

  const toggleDisplay = (id: string, field: 'displayOnLogin' | 'displayOnHome') => {
    setAdvantages(prev => prev.map(a => a.id === id ? { ...a, [field]: !a[field] } : a))
  }

  const moveOrder = (id: string, dir: number) => {
    setAdvantages(prev => {
      const list = [...prev]
      const idx = list.findIndex(a => a.id === id)
      if (idx < 0) return list
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= list.length) return list
      const tmp = list[idx].displayOrder
      list[idx] = { ...list[idx], displayOrder: list[newIdx].displayOrder }
      list[newIdx] = { ...list[newIdx], displayOrder: tmp }
      return list.sort((a, b) => a.displayOrder - b.displayOrder)
    })
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <div className="flex gap-4">
            <button onClick={() => setTab('add')} className={`text-sm font-medium ${tab === 'add' ? 'text-[#c8102e] border-b-2 border-[#c8102e] pb-1 -mb-[13px]' : 'text-gray-500'}`}>+ 新增更新</button>
            <button onClick={() => setTab('manage')} className={`text-sm font-medium ${tab === 'manage' ? 'text-[#c8102e] border-b-2 border-[#c8102e] pb-1 -mb-[13px]' : 'text-gray-500'}`}>管理卖点 ({advantages.length})</button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* === 新增更新 === */}
          {tab === 'add' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <input value={form.version} onChange={e => setForm({...form, version:e.target.value})} placeholder="v2.4.0" className="border rounded px-3 py-2 text-sm" />
                <input value={form.date} onChange={e => setForm({...form, date:e.target.value})} placeholder="2026-08-05" className="border rounded px-3 py-2 text-sm" />
                <select value={form.type} onChange={e => setForm({...form, type:e.target.value})} className="border rounded px-3 py-2 text-sm">
                  <option>新增功能</option><option>优化体验</option><option>修复问题</option>
                </select>
              </div>
              <textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})}
                placeholder="用1-2句话描述本次更新..." rows={3} className="w-full border rounded px-3 py-2 text-sm" />
              <button onClick={handlePreview} className="px-4 py-2 bg-[#c8102e] text-white rounded-lg text-sm">
                预览鉴别结果
              </button>

              {preview && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <p><strong>鉴别得分：</strong>{preview.score}/5 条规则满足</p>
                  <p><strong>规则检查：</strong>{preview.checks.map((c:boolean,i:number) => c ? `✅规则${i+1}` : `⬜规则${i+1}`).join(' ')}</p>
                  <p><strong>是否卖点：</strong>{preview.isAdvantage ? '✅ 是（满足≥3条）' : '❌ 否'}</p>
                  {preview.isAdvantage && (
                    <>
                      <p><strong>建议标题：</strong>{preview.title}</p>
                      <p><strong>建议副标题：</strong>{preview.subtitle}</p>
                      <p><strong>建议说明：</strong>{preview.desc}</p>
                    </>
                  )}
                  {!preview.isAdvantage && (
                    <p className="text-gray-500">不满足卖点标准，但仍会记录在更新日志中</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2">⚠ 当前为前端预览模式。正式上线需将数据写入 config/updates.json 并重新部署。</p>
                </div>
              )}
            </div>
          )}

          {/* === 管理卖点 === */}
          {tab === 'manage' && (
            <div className="space-y-2">
              {advantages.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="text-lg">{getAdvantageIcon(a.advantageTitle)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{a.advantageTitle}</span>
                      <span className="text-[10px] text-gray-400">{a.version}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{a.advantageSubtitle}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleDisplay(a.id, 'displayOnLogin')}
                      className={`p-1 rounded text-[10px] ${a.displayOnLogin ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                      title="登录页展示">
                      {a.displayOnLogin ? <Eye size={12} /> : <EyeOff size={12} />} 登录
                    </button>
                    <button onClick={() => toggleDisplay(a.id, 'displayOnHome')}
                      className={`p-1 rounded text-[10px] ${a.displayOnHome ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                      title="首页展示">
                      {a.displayOnHome ? <Eye size={12} /> : <EyeOff size={12} />} 首页
                    </button>
                    <button onClick={() => moveOrder(a.id, -1)} className="p-1 hover:bg-gray-200 rounded"><ChevronUp size={12} /></button>
                    <button onClick={() => moveOrder(a.id, 1)} className="p-1 hover:bg-gray-200 rounded"><ChevronDown size={12} /></button>
                  </div>
                </div>
              ))}
              {advantages.length === 0 && <p className="text-gray-400 text-sm text-center py-8">暂无卖点</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
