import { ref, onMounted, onBeforeUnmount } from 'vue'

export type ConnectionState = 'connecting' | 'open' | 'closing' | 'closed'

export interface WebSocketOptions {
  url?: string
  protocols?: string | string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
  autoConnect?: boolean
  heartbeatInterval?: number
  heartbeatMessage?: string
}

type MessageHandler = (data: any) => void
type StateHandler = (state: ConnectionState) => void

export function useWebSocket(options: WebSocketOptions = {}) {
  const {
    url = 'ws://localhost:3001',
    protocols,
    reconnectInterval = 3000,
    maxReconnectAttempts = Infinity,
    autoConnect = true,
    heartbeatInterval = 30000,
    heartbeatMessage = 'ping',
  } = options

  const socket = ref<WebSocket | null>(null)
  const connectionState = ref<ConnectionState>('closed')
  const reconnectAttempts = ref(0)
  const lastMessage = ref<any>(null)
  const lastError = ref<Event | null>(null)

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let shouldReconnect = true
  const messageHandlers = new Set<MessageHandler>()
  const stateHandlers = new Set<StateHandler>()

  const setState = (state: ConnectionState) => {
    connectionState.value = state
    stateHandlers.forEach((handler) => handler(state))
  }

  const clearReconnectTimer = () => {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const clearHeartbeatTimer = () => {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  const startHeartbeat = () => {
    clearHeartbeatTimer()
    if (heartbeatInterval > 0) {
      heartbeatTimer = setInterval(() => {
        if (socket.value?.readyState === WebSocket.OPEN) {
          try {
            socket.value.send(heartbeatMessage)
          } catch {
            // ignore
          }
        }
      }, heartbeatInterval)
    }
  }

  const attemptReconnect = () => {
    if (!shouldReconnect) return
    if (reconnectAttempts.value >= maxReconnectAttempts) return

    reconnectAttempts.value += 1
    clearReconnectTimer()
    reconnectTimer = setTimeout(() => {
      connect()
    }, reconnectInterval)
  }

  const connect = () => {
    if (typeof window === 'undefined') return
    if (socket.value && socket.value.readyState === WebSocket.OPEN) return

    setState('connecting')
    shouldReconnect = true

    try {
      socket.value = protocols
        ? new WebSocket(url, protocols)
        : new WebSocket(url)
    } catch (e) {
      lastError.value = e as Event
      setState('closed')
      attemptReconnect()
      return
    }

    socket.value.onopen = () => {
      reconnectAttempts.value = 0
      setState('open')
      startHeartbeat()
    }

    socket.value.onmessage = (event: MessageEvent) => {
      let data: any = event.data
      try {
        if (typeof data === 'string') {
          data = JSON.parse(data)
        }
      } catch {
        // keep raw if not JSON
      }
      lastMessage.value = data
      messageHandlers.forEach((handler) => handler(data))
    }

    socket.value.onerror = (event: Event) => {
      lastError.value = event
    }

    socket.value.onclose = () => {
      setState('closed')
      clearHeartbeatTimer()
      attemptReconnect()
    }
  }

  const disconnect = (code: number = 1000, reason?: string) => {
    shouldReconnect = false
    clearReconnectTimer()
    clearHeartbeatTimer()
    if (socket.value) {
      socket.value.close(code, reason)
      socket.value = null
    }
    setState('closed')
  }

  const send = (data: any): boolean => {
    if (socket.value?.readyState !== WebSocket.OPEN) {
      return false
    }
    try {
      const payload = typeof data === 'string' || data instanceof ArrayBuffer || data instanceof Blob
        ? data
        : JSON.stringify(data)
      socket.value.send(payload)
      return true
    } catch {
      return false
    }
  }

  const onMessage = (handler: MessageHandler) => {
    messageHandlers.add(handler)
    return () => messageHandlers.delete(handler)
  }

  const onStateChange = (handler: StateHandler) => {
    stateHandlers.add(handler)
    return () => stateHandlers.delete(handler)
  }

  const resetReconnectAttempts = () => {
    reconnectAttempts.value = 0
  }

  onMounted(() => {
    if (autoConnect) {
      connect()
    }
  })

  onBeforeUnmount(() => {
    disconnect()
  })

  return {
    socket,
    connectionState,
    reconnectAttempts,
    lastMessage,
    lastError,
    connect,
    disconnect,
    send,
    onMessage,
    onStateChange,
    resetReconnectAttempts,
  }
}
