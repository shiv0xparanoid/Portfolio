import { H3Event } from "h3"

type Client = {
  id: string
  send: (data: string) => void
  close: () => void
}

export default defineNitroPlugin((nitroApp) => {
  const clients = new Set<Client>()

  nitroApp.hooks.hook('request', (event) => {
    const url = getRequestURL(event)
    if (url.pathname !== '/_ws') return

    const upgradeHeader = event.node.req.headers.upgrade
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') return

    const ws = upgradeWebSocket(event, {
      onOpen(_event, peer) {
        const id = Math.random().toString(36).slice(2, 10)
        const peerAny = peer as typeof peer & { __client?: Client }

        const client: Client = {
          id,
          send: (data: string) => {
            if (peerAny.readyState === 1) {
              try {
                peer.send(data)
              } catch (_e) { /* ignore */ }
            }
          },
          close: () => {
            try {
              peer.close()
            } catch (_e) { /* ignore */ }
          }
        }

        clients.add(client)
        peerAny.__client = client

        const ids = Array.from(clients).map((c) => c.id)
        client.send(JSON.stringify({ type: 'init', id, peers: ids.filter((p) => p !== id) }))

        for (const other of clients) {
          if (other.id !== id) {
            other.send(JSON.stringify({ type: 'join', id }))
          }
        }
      },
      onMessage(_event, peer, message) {
        const client = (peer as typeof peer & { __client?: Client }).__client
        if (!client) return

        let data: any
        try {
          const raw = typeof message === 'string'
            ? message
            : typeof message === 'object' && message && 'toString' in message
              ? message.toString()
              : ''

          data = raw ? JSON.parse(raw) : null
        } catch {
          return
        }

        if (!data || typeof data.type !== 'string') return

        switch (data.type) {
          case 'ping': {
            client.send(JSON.stringify({ type: 'pong', ts: data.ts ?? Date.now() }))
            break
          }
          case 'pong': {
            break
          }
          case 'cursor': {
            const { x, y } = data
            if (typeof x !== 'number' || typeof y !== 'number') return

            const payload = JSON.stringify({
              type: 'cursor',
              id: client.id,
              x,
              y
            })

            for (const other of clients) {
              if (other.id !== client.id) {
                other.send(payload)
              }
            }
            break
          }
          default:
            break
        }
      },
      onClose(_event, peer) {
        const client = (peer as typeof peer & { __client?: Client }).__client
        if (!client) return

        clients.delete(client)

        const payload = JSON.stringify({ type: 'leave', id: client.id })
        for (const other of clients) {
          other.send(payload)
        }
      }
    })

    return ws
  })
})
function upgradeWebSocket(event: H3Event<globalThis.EventHandlerRequest>, arg1: { onOpen(_event: any, peer: any): void; onMessage(_event: any, peer: any, message: any): void; onClose(_event: any, peer: any): void }) {
  throw new Error("Function not implemented.")
}

