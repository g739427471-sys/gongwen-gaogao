import { useState, useEffect, useCallback } from 'react'
import AuthPage from './components/Auth/AuthPage'
import MainLayout from './components/Layout/MainLayout'
import { getToken, getStoredUser, logout as apiLogout } from './services/api'

export default function App() {
  const [user, setUser] = useState<{ username: string; user_id: string } | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // 检查本地token是否存在
    const token = getToken()
    const stored = getStoredUser()
    if (token && stored) {
      setUser(stored)
    }
    setChecking(false)
  }, [])

  const handleLogin = useCallback((username: string, userId: string) => {
    setUser({ username, user_id: userId })
  }, [])

  const handleLogout = useCallback(() => {
    apiLogout()
    setUser(null)
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />
  }

  return <MainLayout username={user.username} onLogout={handleLogout} />
}
