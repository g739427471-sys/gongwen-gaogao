/** 登录页 — 品牌价值展示 + 登录表单 */
import { useState } from 'react'
import { PenLine, Star } from 'lucide-react'
import { login, register } from '../../services/api'
import { getLoginAdvantages, getAdvantageIcon } from '../../services/advantageEngine'

interface Props { onLogin: (username: string, userId: string) => void }

export default function AuthPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!username.trim() || !password.trim()) { setError('请填写用户名和密码'); return }
    if (mode === 'register') {
      if (password !== password2) { setError('两次密码不一致'); return }
      if (password.length < 6) { setError('密码至少6位'); return }
    }
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await login(username.trim(), password)
        : await register(username.trim(), email.trim() || `${username}@example.com`, password)
      onLogin(res.username, res.user_id)
    } catch (err: any) { setError(err.message || '操作失败') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* ===== 品牌展示区 ===== */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#c8102e] rounded-2xl mb-5 shadow-lg shadow-[#c8102e]/20">
            <PenLine size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">公文高高</h1>
          <p className="text-base text-gray-500 mt-2 leading-relaxed">
            像一个有20年经验的文秘——<br />
            <span className="text-[#c8102e] font-medium">会学习、去AI味、懂公文规范</span>
          </p>

          {/* 核心卖点列表 — 动态从优势引擎读取 */}
          <div className="mt-6 grid grid-cols-1 gap-2 text-left max-w-sm mx-auto">
            {getLoginAdvantages().map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2 bg-white/60 rounded-lg border border-gray-100 hover:bg-white hover:shadow-sm transition group cursor-default"
                title={p.advantageDesc}>
                <span className="text-lg shrink-0">{getAdvantageIcon(p.advantageTitle)}</span>
                <span className="text-sm text-gray-700">
                  <span className="font-medium">{p.advantageTitle}</span>
                  <span className="text-gray-400 mx-1.5">—</span>
                  {p.advantageSubtitle}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 登录表单 ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex mb-5">
            <button onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                mode === 'login' ? 'border-[#c8102e] text-[#c8102e]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              登录
            </button>
            <button onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                mode === 'register' ? 'border-[#c8102e] text-[#c8102e]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">用户名</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
                placeholder="请输入用户名" autoFocus />
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">邮箱（选填）</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
                  placeholder="可选填" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
                placeholder="请输入密码" />
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">确认密码</label>
                <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
                  placeholder="请再次输入密码" />
              </div>
            )}
            {error && <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#c8102e] text-white rounded-md font-medium hover:bg-[#a00d25] transition disabled:opacity-50 text-sm">
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <p className="text-center text-[10px] text-gray-400 mt-4">登录即表示您同意公文高高的服务条款 · 您的数据仅用于优化您的写作体验</p>
        </div>
      </div>
    </div>
  )
}
