/**
 * API 服务层 — 所有请求自动携带 JWT Token。
 */
import type { FrameworkResponse, KnowledgeChunk, DocumentItem, GenerationComplete } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// ========== Token 管理 ==========

export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

export function getStoredUser(): { username: string; user_id: string } | null {
  try {
    const data = localStorage.getItem('user')
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function setStoredUser(username: string, user_id: string) {
  localStorage.setItem('user', JSON.stringify({ username, user_id }))
}

export function clearStoredUser() {
  localStorage.removeItem('user')
}

// ========== 通用 fetch ==========

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${url}`, { headers, ...options })

  if (!res.ok) {
    if (res.status === 401) {
      clearToken()
      clearStoredUser()
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `请求失败: ${res.status}`)
  }

  return res.json()
}

// ========== 认证 API ==========

export async function register(username: string, email: string, password: string) {
  const res = await request<{ access_token: string; username: string; user_id: string }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ username, email, password }) },
  )
  setToken(res.access_token)
  setStoredUser(res.username, res.user_id)
  return res
}

export async function login(username: string, password: string) {
  const res = await request<{ access_token: string; username: string; user_id: string }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ username, password }) },
  )
  setToken(res.access_token)
  setStoredUser(res.username, res.user_id)
  return res
}

export function logout() {
  clearToken()
  clearStoredUser()
}

// ========== 写作 API ==========

export async function generateFramework(
  topic: string,
  docType: string,
  keywords: string[],
): Promise<FrameworkResponse> {
  return request<FrameworkResponse>('/writing/generate-framework', {
    method: 'POST',
    body: JSON.stringify({ topic, doc_type: docType, keywords }),
  })
}

export function generateContentStream(
  topic: string,
  docType: string,
  keywords: string[],
  framework: { level: number; title: string; key_points: string[] }[],
  onDelta: (text: string) => void,
  onComplete: (result: GenerationComplete) => void,
  onError: (error: string) => void,
): AbortController {
  const controller = new AbortController()
  const token = getToken()

  fetch(`${API_BASE}/writing/generate-content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ topic, doc_type: docType, keywords, framework }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (response.status === 401) {
        clearToken()
        clearStoredUser()
        onError('登录已过期，请重新登录')
        return
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: '请求失败' }))
        onError(err.detail || `HTTP ${response.status}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) { onError('无法读取响应流'); return }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (eventType === 'content_delta') onDelta(parsed.text || '')
              else if (eventType === 'complete') onComplete(parsed as GenerationComplete)
              else if (eventType === 'error') onError(parsed.error || '生成错误')
            } catch { /* ignore */ }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err.message || '网络错误')
    })

  return controller
}

// ========== 知识库 API ==========

export async function searchKnowledge(
  query: string,
  category?: string,
  topK: number = 5,
): Promise<{ results: KnowledgeChunk[]; total: number }> {
  const params = new URLSearchParams({ q: query, top_k: String(topK) })
  if (category) params.set('category', category)
  return request(`/knowledge/search?${params.toString()}`)
}

export async function getKnowledgeCategories() {
  return request<{ categories: Record<string, number>; total_chunks: number }>('/knowledge/categories')
}

// ========== 文稿管理 API ==========

export async function listDocuments(params?: {
  doc_type?: string; status?: string; limit?: number; offset?: number;
}): Promise<{ documents: DocumentItem[]; total: number }> {
  const sp = new URLSearchParams()
  if (params?.doc_type) sp.set('doc_type', params.doc_type)
  if (params?.status) sp.set('status', params.status)
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.offset) sp.set('offset', String(params.offset))
  const qs = sp.toString()
  return request(`/documents${qs ? `?${qs}` : ''}`)
}

export async function getDocument(id: string): Promise<DocumentItem> {
  return request(`/documents/${id}`)
}

export async function deleteDocument(id: string): Promise<void> {
  return request(`/documents/${id}`, { method: 'DELETE' })
}
