import { ref, reactive, onScopeDispose, getCurrentScope } from 'vue'

export interface RemoteCursor {
  id: string
  x: number
  y: number
  lastSeen: number
}

function safeTryOnScopeDispose(fn: () => void) {
  if (getCurrentScope()) {
    onScopeDispose(fn)
  }
}

export function useSharedCursor() {
  const remoteCursors = reactive<Map<string, RemoteCursor>>(new Map())
  const connected = ref(false)
  const clientId = ref<string | null>(null)

  let ws: WebSocket | null = null
  let lastSend = 0
  const sendInterval = 1000 / 30
  let rafId: number | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let manualClose = false

  const pendingCursor = reactive({ x: 0, y: 0, dirty: false })

  function getWsUrl() {
    if (typeof window === 'undefined') return ''
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/_ws`
  }

  function sendRaw(obj: unknown) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj))
    }
  }

  function flushSend() {
    if (!pendingCursor.dirty) return
    const now = performance.now()
    if (now - lastSend < sendInterval) return
    sendRaw({ type: 'cursor', x: pendingCursor.x, y: pendingCursor.y })
    lastSend = now
    pendingCursor.dirty = false
  }

  function tick() {
    flushSend()
    rafId = requestAnimationFrame(tick)
  }

  function onMouseMove(e: MouseEvent) {
    pendingCursor.x = e.clientX
    pendingCursor.y = e.clientY
    pendingCursor.dirty = true
  }

  function onTouchMove(e: TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    pendingCursor.x = t.clientX
    pendingCursor.y = t.clientY
    pendingCursor.dirty = true
  }

  function handleMessage(data: any) {
    switch (data.type) {
      case 'init': {
        clientId.value = data.id
        connected.value = true
        break
      }
      case 'join': {
        if (!remoteCursors.has(data.id)) {
          remoteCursors.set(data.id, { id: data.id, x: 0, y: 0, lastSeen: Date.now() })
        }
        break
      }
      case 'leave': {
        remoteCursors.delete(data.id)
        break
      }
      case 'cursor': {
        const existing = remoteCursors.get(data.id)
        if (existing) {
          existing.x = data.x
          existing.y = data.y
          existing.lastSeen = Date.now()
        } else {
          remoteCursors.set(data.id, { id: data.id, x: data.x, y: data.y, lastSeen: Date.now() })
        }
        break
      }
      case 'pong': {
        break
      }
    }
  }

  function connect() {
    if (typeof window === 'undefined') return
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return

    manualClose = false
    const url = getWsUrl()
    if (!url) return

    ws = new WebSocket(url)

    ws.onopen = () => {
      connected.value = true
      pingTimer = setInterval(() => {
        sendRaw({ type: 'ping', ts: Date.now() })
      }, 15000)
    }

    ws.onmessage = (ev) => {
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : null
        if (data) handleMessage(data)
      } catch {
        /* ignore */
      }
    }

    ws.onerror = () => {
      /* error handled via close */
    }

    ws.onclose = () => {
      connected.value = false
      if (pingTimer) {
        clearInterval(pingTimer)
        pingTimer = null
      }
      if (!manualClose) {
        reconnectTimer = setTimeout(connect, 1500)
      }
      ws = null
    }
  }

  function disconnect() {
    manualClose = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (pingTimer) {
      clearInterval(pingTimer)
      pingTimer = null
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
    if (ws) {
      ws.close()
      ws = null
    }
    connected.value = false
  }

  function startTracking() {
    if (typeof window === 'undefined') return
    connect()
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    if (rafId === null) {
      rafId = requestAnimationFrame(tick)
    }
  }

  if (typeof window !== 'undefined') {
    safeTryOnScopeDispose(disconnect)
  }

  return {
    connected,
    clientId,
    remoteCursors,
    startTracking,
    disconnect
  }
}
