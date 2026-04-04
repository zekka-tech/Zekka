import { beforeEach, describe, expect, it, vi } from 'vitest'

const createMockSocket = () => {
  const handlers = new Map<string, (...args: any[]) => void>()

  return {
    handlers,
    socket: {
      on: vi.fn((event: string, callback: (...args: any[]) => void) => {
        handlers.set(event, callback)
      }),
      off: vi.fn((event: string) => {
        handlers.delete(event)
      }),
      emit: vi.fn(),
      disconnect: vi.fn(),
      id: 'socket-1'
    }
  }
}

describe('webSocketService', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('binds listeners that were registered before connect', async () => {
    const mock = createMockSocket()

    vi.doMock('socket.io-client', () => ({
      io: vi.fn(() => mock.socket)
    }))

    const { webSocketService } = await import('../websocket')
    const callback = vi.fn()

    webSocketService.on('project:update', callback)

    const connectPromise = webSocketService.connect({})
    mock.handlers.get('connect')?.()
    await connectPromise

    expect(mock.socket.on).toHaveBeenCalledWith('project:update', expect.any(Function))

    mock.handlers.get('project:update')?.({ id: 'project-1' })
    expect(callback).toHaveBeenCalledWith({ id: 'project-1' })
  })

  it('keeps lifecycle events local instead of emitting them back to the server', async () => {
    const mock = createMockSocket()

    vi.doMock('socket.io-client', () => ({
      io: vi.fn(() => mock.socket)
    }))

    const { webSocketService } = await import('../websocket')
    const connected = vi.fn()
    const failed = vi.fn()

    webSocketService.on('connected', connected)
    webSocketService.on('error', failed)

    const connectPromise = webSocketService.connect({})
    mock.handlers.get('connect')?.()
    await connectPromise

    const error = new Error('socket failed')
    mock.handlers.get('error')?.(error)

    expect(connected).toHaveBeenCalledTimes(1)
    expect(failed).toHaveBeenCalledWith(error)
    expect(mock.socket.emit).not.toHaveBeenCalledWith('connected')
    expect(mock.socket.emit).not.toHaveBeenCalledWith('error', error)
  })

  it('dispatches emits locally when the socket is not connected yet', async () => {
    const mock = createMockSocket()

    vi.doMock('socket.io-client', () => ({
      io: vi.fn(() => mock.socket)
    }))

    const { webSocketService } = await import('../websocket')
    const callback = vi.fn()

    webSocketService.on('project:update', callback)
    webSocketService.emit('project:update', { id: 'project-1' })

    expect(callback).toHaveBeenCalledWith({ id: 'project-1' })
    expect(mock.socket.emit).not.toHaveBeenCalled()
  })
})
