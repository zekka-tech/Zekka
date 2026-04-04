import axios, { AxiosError } from 'axios'
import type { AxiosInstance } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
type AuthChangeListener = (isAuthenticated: boolean) => void

export interface ConversationStreamEvent {
  type: string
  data?: unknown
  message?: string
  error?: string
}

export interface ConversationStreamHandlers {
  onEvent?: (event: ConversationStreamEvent) => void
  onError?: (error: Error) => void
}

class ApiService {
  private axiosInstance: AxiosInstance
  private token: string | null = null
  private authListeners = new Set<AuthChangeListener>()

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Restore token from localStorage
    this.token = localStorage.getItem('auth_token')

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Clear auth state and let the app shell render the auth screen.
          this.clearAuth()
        }
        return Promise.reject(error)
      }
    )
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
    this.notifyAuthListeners()
  }

  clearAuth() {
    this.setToken(null)
  }

  isAuthenticated(): boolean {
    return this.token !== null
  }

  subscribeAuthChange(listener: AuthChangeListener) {
    this.authListeners.add(listener)
    return () => {
      this.authListeners.delete(listener)
    }
  }

  private notifyAuthListeners() {
    const isAuthenticated = this.isAuthenticated()
    for (const listener of this.authListeners) {
      listener(isAuthenticated)
    }
  }

  // ===== Authentication APIs =====

  async register(email: string, password: string, name: string) {
    const response = await this.axiosInstance.post('/api/auth/register', {
      email,
      password,
      name
    })
    if (response.data.token) {
      this.setToken(response.data.token)
    }
    return response.data
  }

  async login(email: string, password: string) {
    const response = await this.axiosInstance.post('/api/auth/login', {
      email,
      password
    })
    if (response.data.token) {
      this.setToken(response.data.token)
    }
    return response.data
  }

  async getMe() {
    const response = await this.axiosInstance.get('/api/auth/me')
    return response.data
  }

  async logout() {
    this.clearAuth()
  }

  // ===== Project APIs =====

  async getProjects() {
    const response = await this.axiosInstance.get('/api/projects')
    return response.data
  }

  async getProject(id: string) {
    const response = await this.axiosInstance.get(`/api/projects/${id}`)
    return response.data
  }

  async createProject(data: {
    name: string
    description?: string
    type?: string
  }) {
    const response = await this.axiosInstance.post('/api/projects', data)
    return response.data
  }

  async updateProject(id: string, data: Record<string, unknown>) {
    const response = await this.axiosInstance.put(`/api/projects/${id}`, data)
    return response.data
  }

  async deleteProject(id: string) {
    const response = await this.axiosInstance.delete(`/api/projects/${id}`)
    return response.data
  }

  // ===== Chat/Conversation APIs =====

  async getConversations(projectId?: string) {
    const response = await this.axiosInstance.get('/api/v1/conversations', {
      params: projectId ? { projectId } : undefined
    })
    return response.data.data
  }

  async getConversation(id: string) {
    const response = await this.axiosInstance.get(`/api/v1/conversations/${id}`)
    return response.data.data
  }

  async createConversation(data: {
    title: string
    projectId: string
  }) {
    const response = await this.axiosInstance.post('/api/v1/conversations', data)
    return response.data.data
  }

  async sendMessage(conversationId: string, content: string) {
    const response = await this.axiosInstance.post(
      `/api/v1/conversations/${conversationId}/messages`,
      { content }
    )
    return response.data.data
  }

  async sendMessageStream(
    conversationId: string,
    content: string,
    handlers: ConversationStreamHandlers = {}
  ) {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/conversations/${conversationId}/messages/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
        },
        body: JSON.stringify({ content })
      }
    )

    if (!response.ok || !response.body) {
      const error = new Error('Failed to open conversation stream')
      handlers.onError?.(error)
      throw error
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const emitEvent = (rawEvent: string) => {
      const dataLine = rawEvent
        .split('\n')
        .find((line) => line.startsWith('data:'))

      if (!dataLine) return

      try {
        const event = JSON.parse(dataLine.slice(5).trim()) as ConversationStreamEvent
        handlers.onEvent?.(event)
      } catch (error) {
        handlers.onError?.(
          error instanceof Error ? error : new Error('Failed to parse stream event')
        )
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        emitEvent(event)
      }
    }

    if (buffer.trim()) {
      emitEvent(buffer)
    }
  }

  async getMessages(conversationId: string, limit = 50, offset = 0) {
    const response = await this.axiosInstance.get(
      `/api/v1/conversations/${conversationId}/messages`,
      {
        params: { limit, offset }
      }
    )
    return response.data.data
  }

  // ===== Agent APIs =====

  async getAgents() {
    const response = await this.axiosInstance.get('/api/agents')
    return response.data
  }

  async getAgent(id: string) {
    const response = await this.axiosInstance.get(`/api/agents/${id}`)
    return response.data
  }

  async getAgentStatus(id: string) {
    const response = await this.axiosInstance.get(`/api/agents/${id}/status`)
    return response.data
  }

  async getAgentActivity(id: string) {
    const response = await this.axiosInstance.get(`/api/agents/${id}/activity`)
    return response.data
  }

  // ===== Metrics APIs =====

  async getMetrics() {
    const response = await this.axiosInstance.get('/api/metrics')
    return response.data
  }

  async getCosts() {
    const response = await this.axiosInstance.get('/api/costs')
    return response.data
  }

  async getCostsBreakdown() {
    const response = await this.axiosInstance.get('/api/costs/breakdown')
    return response.data
  }

  // ===== Source APIs =====

  async getSources(projectId: string) {
    const response = await this.axiosInstance.get('/api/v1/sources', {
      params: { projectId }
    })
    return response.data.data
  }

  async getSourceFolders(projectId: string) {
    const response = await this.axiosInstance.get('/api/v1/sources/folders', {
      params: { projectId }
    })
    return response.data.data
  }

  async createSource(projectId: string, formData: FormData) {
    formData.append('projectId', projectId)
    const response = await this.axiosInstance.post('/api/v1/sources', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.data
  }

  async deleteSource(sourceId: string) {
    const response = await this.axiosInstance.delete(`/api/v1/sources/${sourceId}`)
    return response.data
  }

  async createSourceFolder(projectId: string, data: { name: string; parentId?: string }) {
    const response = await this.axiosInstance.post('/api/v1/sources/folders', {
      projectId,
      ...data
    })
    return response.data.data
  }

  async searchSources(projectId: string, query: string, options: { type?: string; limit?: number } = {}) {
    const response = await this.axiosInstance.get('/api/v1/sources/search', {
      params: {
        projectId,
        q: query,
        ...options
      }
    })
    return response.data.data
  }

  async getProjectStats(projectId: string) {
    const response = await this.axiosInstance.get(`/api/v1/projects/${projectId}/stats`)
    return response.data.data
  }

  // ===== Health Check =====

  async healthCheck() {
    const response = await this.axiosInstance.get('/health')
    return response.data
  }
}

// Export singleton instance
export const apiService = new ApiService()
