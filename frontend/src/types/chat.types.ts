export interface Citation {
  id: string
  filePath: string
  lineNumber?: number
  snippet?: string
}

export interface CodeBlock {
  id: string
  language: string
  code: string
  filename?: string
  diff?: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    model?: string
    tokenUsage?: {
      input: number
      output: number
    }
    citations?: Citation[]
    codeBlocks?: CodeBlock[]
  }
  status: 'sending' | 'streaming' | 'complete' | 'error'
}

export interface StreamChunk {
  messageId: string
  content: string
  index: number
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}
