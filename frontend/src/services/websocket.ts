import { io, Socket } from 'socket.io-client'

export class WebSocketService {
  private socket: Socket | null = null
  private static instance: WebSocketService

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  connect(token?: string) {
    if (this.socket?.connected) return

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000'
    
    this.socket = io(wsUrl, {
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  isReady(): boolean {
    return !!this.socket?.connected
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback)
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.socket?.off(event, callback)
  }

  emit(event: string, ...args: any[]) {
    this.socket?.emit(event, ...args)
  }

  sendMessage(conversationId: string, content: string) {
    this.emit('chat:message', { conversationId, content })
  }
}

export const webSocketService = WebSocketService.getInstance()
