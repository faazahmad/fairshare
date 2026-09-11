const WS_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1')
  .replace('/api/v1', '')
  .replace(/^http/, 'ws')

export type WebSocketEventHandler = (event: {
  eventType: string
  groupId: string
  payload: any
  timestamp: string
}) => void

export class RealtimeClient {
  private socket: WebSocket | null = null
  private subscriptions: Map<string, Set<WebSocketEventHandler>> = new Map()
  private reconnectTimeout: number | null = null

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return

    try {
      this.socket = new WebSocket(`${WS_BASE_URL}/ws`)

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.groupId && this.subscriptions.has(data.groupId)) {
            const handlers = this.subscriptions.get(data.groupId)
            handlers?.forEach((handler) => handler(data))
          }
        } catch {
          // ignore non-json messages
        }
      }

      this.socket.onclose = () => {
        this.socket = null
        this.scheduleReconnect()
      }

      this.socket.onerror = () => {
        this.socket?.close()
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  subscribe(groupId: string, handler: WebSocketEventHandler) {
    if (!this.subscriptions.has(groupId)) {
      this.subscriptions.set(groupId, new Set())
    }
    this.subscriptions.get(groupId)?.add(handler)
    this.connect()

    return () => {
      this.subscriptions.get(groupId)?.delete(handler)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null
      this.connect()
    }, 5000)
  }
}

export const wsClient = new RealtimeClient()
