// ========== 文种 ==========
export interface DocTypeInfo {
  name: string
  category: string
  description: string
  structure: string[]
  format_notes: string
}

// ========== 框架 ==========
export interface OutlineItem {
  level: number
  title: string
  key_points: string[]
}

export interface FrameworkResponse {
  title_suggestion: string
  framework: OutlineItem[]
}

// ========== 文档 ==========
export interface DocumentItem {
  id: string
  title: string
  doc_type: string
  keywords: string[]
  framework: OutlineItem[]
  content: string
  status: string
  created_at: string
  updated_at: string
}

// ========== 知识库 ==========
export interface KnowledgeChunk {
  id: string
  category: string
  title: string
  content: string
  source: string
  score: number
}

// ========== SSE Events ==========
export type SSEEventType =
  | 'status'
  | 'content_delta'
  | 'complete'
  | 'error'

export interface SSEEvent {
  type: SSEEventType
  data: string | GenerationComplete
}

export interface GenerationComplete {
  title: string
  framework: OutlineItem[]
  content: string
  references: string[]
  document_id: string
}
