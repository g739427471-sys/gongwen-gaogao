import { useState } from 'react'
import { PenLine } from 'lucide-react'
import { login, register, getStoredUser } from '../../services/api'

interface Props {
  onLogin: (username: string, userId: string) => void
}

export default function AuthPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码')
      return
    }

    if (mode === 'register') {
      if (password !== password2) {
        setError('两次密码不一致')
        return
      }
      if (password.length < 6) {
        setError('密码至少6位')
        return
      }
    }

    setLoading(true)
    try {
      const res = mode === 'login'
        ? await login(username.trim(), password)
        : await register(username.trim(), email.trim() || `${username}@example.com`, password)
      onLogin(res.username, res.user_id)
    } catch (err: any) {
      setError(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c8102e] rounded-2xl mb-4">
            <PenLine size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">公文高高</h1>
          <p className="text-sm text-gray-500 mt-1">智能公文写作辅助工具</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                mode === 'login'
                  ? 'border-[#c8102e] text-[#c8102e]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                mode === 'register'
                  ? 'border-[#c8102e] text-[#c8102e]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
                placeholder="请输入用户名"
                autoFocus
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">邮箱（选填）</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
                  placeholder="可选填"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
                placeholder="请输入密码"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">确认密码</label>
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]"
                  placeholder="请再次输入密码"
                />
              </div>
            )}

            {error && (
              <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#c8102e] text-white rounded-md font-medium hover:bg-[#a00d25] transition disabled:opacity-50"
            >
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
