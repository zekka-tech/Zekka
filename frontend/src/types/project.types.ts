export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
  owner?: {
    id: string
    name: string
    email: string
  }
  members?: ProjectMember[]
  settings?: ProjectSettings
}

export interface ProjectMember {
  id: string
  userId: string
  name: string
  email: string
  role: 'owner' | 'editor' | 'viewer'
  joinedAt: Date
}

export interface ProjectSettings {
  isPublic: boolean
  allowComments: boolean
  defaultModel?: string
  tokenBudget?: number
  notificationsEnabled: boolean
  autoArchiveAfterDays?: number
}

export interface ProjectStats {
  totalConversations: number
  totalMessages: number
  totalTokensUsed: number
  lastActivityAt?: Date
}

export type SourceType = 'file' | 'folder' | 'url' | 'github' | 'document'

export interface Source {
  id: string
  projectId: string
  name: string
  type: SourceType
  path?: string
  url?: string
  fileSize?: number
  uploadedAt: Date
  metadata?: {
    mimeType?: string
    language?: string
    lines?: number
    encoding?: string
  }
  tags?: string[]
}

export interface SourceFolder {
  id: string
  projectId: string
  name: string
  parentId?: string
  createdAt: Date
  sources?: Source[]
  subfolders?: SourceFolder[]
}
