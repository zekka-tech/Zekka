import { useEffect, useState, useCallback } from 'react'
import { webSocketService } from '@/services/websocket'

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const handleConnected = () => setIsConnected(true)
    const handleDisconnected = () => setIsConnected(false)
    const handleError = (err: Error) => setError(err)

    webSocketService.on('connected', handleConnected)
    webSocketService.on('disconnected', handleDisconnected)
    webSocketService.on('error', handleError)

    // Try to connect if not already connected
    if (!webSocketService.isReady()) {
      webSocketService.connect()
    }

    return () => {
      webSocketService.off('connected', handleConnected)
      webSocketService.off('disconnected', handleDisconnected)
      webSocketService.off('error', handleError)
    }
  }, [])

  const emit = useCallback((event: string, ...args: any[]) => {
    webSocketService.emit(event, ...args)
  }, [])

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    webSocketService.on(event, callback)
    return () => {
      webSocketService.off(event, callback)
    }
  }, [])

  return {
    isConnected,
    error,
    emit,
    on
  }
}
