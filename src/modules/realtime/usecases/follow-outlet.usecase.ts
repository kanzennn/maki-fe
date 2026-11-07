import { createTicket, socketUrl } from '../repositories/realtime.repository'
import type { RealtimeTopic } from '../types'

const FIRST_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000
/** The server's way to say a connection ended on purpose: connect again at once. */
const CLOSE_RENEW = 4000
const ALL_TOPICS: RealtimeTopic[] = ['catalog', 'tables', 'orders']

/**
 * Follows the outlet's live messages until the returned function is called,
 * connecting again whenever the connection ends, each time with a new ticket.
 * After being away, or on connecting again, onChange hears everything, as
 * messages may have gone unheard. No connection is no harm: what the page
 * shows just isn't live.
 */
export function followOutlet(outletId: string, onChange: (topics: RealtimeTopic[]) => void): () => void {
  let stopped = false
  let socket: WebSocket | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let retry = FIRST_RETRY_MS
  let connectedBefore = false

  const later = (ms: number) => {
    if (stopped) return
    timer = setTimeout(() => void connect(), ms)
  }

  const connect = async () => {
    let ticket: string
    try {
      ;({ ticket } = await createTicket(outletId))
    } catch {
      retry = Math.min(retry * 2, MAX_RETRY_MS)
      later(retry)
      return
    }
    if (stopped) return
    const opened = new WebSocket(socketUrl(outletId, ticket))
    socket = opened
    opened.onopen = () => {
      retry = FIRST_RETRY_MS
      if (connectedBefore) onChange(ALL_TOPICS)
      connectedBefore = true
    }
    opened.onmessage = (event) => {
      const { topics } = JSON.parse(String(event.data)) as { topics: RealtimeTopic[] }
      onChange(topics)
    }
    opened.onclose = (event) => {
      if (event.code === CLOSE_RENEW) {
        later(0)
        return
      }
      later(retry)
      retry = Math.min(retry * 2, MAX_RETRY_MS)
    }
  }

  void connect()
  return () => {
    stopped = true
    clearTimeout(timer)
    socket?.close()
  }
}
