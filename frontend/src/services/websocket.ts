import { io, Socket } from 'socket.io-client'

type EventCallback = (...args: any[]) => void

interface WebSocketServiceOptions {
  url?: string
  auth?: {
    token?: string
  }
  reconnection?: boolean
  reconnectionDelay?: number
  reconnectionAttempts?: number
}

class WebSocketService {
  private socket: Socket | null = null
  private callbacks: Map<string, EventCallback[]> = new Map()
  private isConnecting = false
  private isConnected = false

  connect(options: WebSocketServiceOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected || this.isConnecting) {
        resolve()
        return
      }

      this.isConnecting = true

      const defaultOptions: WebSocketServiceOptions = {
        url: import.meta.env.VITE_WS_URL || 'http://localhost:3000',
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        ...options
      }

      try {
        this.socket = io(defaultOptions.url, {
          auth: defaultOptions.auth,
          reconnection: defaultOptions.reconnection,
          reconnectionDelay: defaultOptions.reconnectionDelay,
          reconnectionAttempts: defaultOptions.reconnectionAttempts
        })

        this.socket.on('connect', () => {
          console.log('WebSocket connected')
          this.isConnected = true
          this.isConnecting = false
          this.emit('connected')
          resolve()
        })

        this.socket.on('disconnect', () => {
          console.log('WebSocket disconnected')
          this.isConnected = false
          this.emit('disconnected')
        })

        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error)
          this.emit('error', error)
        })

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error)
          this.isConnecting = false
          reject(error)
        })
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  on(event: string, callback: EventCallback): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, [])

      // Register socket listener
      if (this.socket) {
        this.socket.on(event, (...args) => {
          const callbacks = this.callbacks.get(event) || []
          callbacks.forEach(cb => cb(...args))
        })
      }
    }

    const callbacks = this.callbacks.get(event)!
    callbacks.push(callback)
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.callbacks.get(event) || []
    const index = callbacks.indexOf(callback)
    if (index !== -1) {
      callbacks.splice(index, 1)
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, ...args)
    } else {
      // Call local callbacks even if not connected
      const callbacks = this.callbacks.get(event) || []
      callbacks.forEach(cb => cb(...args))
    }
  }

  isReady(): boolean {
    return this.isConnected && this.socket !== null
  }

  getId(): string | undefined {
    return this.socket?.id
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService()
