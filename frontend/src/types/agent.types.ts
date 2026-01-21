export type AgentStatus = 'idle' | 'active' | 'processing' | 'waiting' | 'error'
export type AgentType = 'strategic' | 'implementation' | 'specialized' | 'support'

export interface Agent {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  currentTask?: Task
  progress?: number
  tokenUsage?: {
    input: number
    output: number
    cost: number
  }
  lastActivity?: Date
}

export interface Task {
  id: string
  description: string
  stage: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  startedAt: Date
  estimatedCompletion?: Date
}

export interface Activity {
  id: string
  agentId: string
  agentName: string
  action: string
  timestamp: Date
  status: 'success' | 'error' | 'pending'
}
