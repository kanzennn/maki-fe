import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { json, apiError } from '@/test/app'

import { followOutlet } from './follow-outlet.usecase'

class FakeSocket {
  static opened: FakeSocket[] = []
  onopen?: () => void
  onmessage?: (event: { data: string }) => void
  onclose?: (event: { code: number }) => void
  closed = false
  url: string
  constructor(url: string) {
    this.url = url
    FakeSocket.opened.push(this)
  }
  close() {
    this.closed = true
  }
}

describe('following an outlet', () => {
  let tickets: number

  beforeEach(() => {
    vi.useFakeTimers()
    FakeSocket.opened = []
    tickets = 0
    vi.stubGlobal('WebSocket', FakeSocket)
    vi.stubGlobal('fetch', async () => {
      tickets += 1
      return json(201, { ticket: `t${tickets}`, expires_in: 30 })
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const last = () => FakeSocket.opened.at(-1)!

  it('connects with a ticket, and passes on what changed', async () => {
    const heard = vi.fn()
    const stop = followOutlet('o1', heard)
    await vi.advanceTimersByTimeAsync(0)

    expect(last().url).toMatch(/^ws:.*\/api\/v1\/outlets\/o1\/realtime\?ticket=t1$/)
    last().onopen!()
    expect(heard).not.toHaveBeenCalled()
    last().onmessage!({ data: '{"topics":["catalog"]}' })
    expect(heard).toHaveBeenCalledExactlyOnceWith(['catalog'])

    stop()
    expect(last().closed).toBe(true)
  })

  it('connects again with a new ticket, backing off, then catches up', async () => {
    const heard = vi.fn()
    const stop = followOutlet('o1', heard)
    await vi.advanceTimersByTimeAsync(0)
    last().onopen!()
    last().onclose!({ code: 1006 })

    await vi.advanceTimersByTimeAsync(999)
    expect(FakeSocket.opened).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(last().url).toContain('ticket=t2')
    last().onclose!({ code: 1006 })
    await vi.advanceTimersByTimeAsync(1999)
    expect(FakeSocket.opened).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(FakeSocket.opened).toHaveLength(3)

    last().onopen!()
    expect(heard).toHaveBeenCalledExactlyOnceWith(['catalog', 'tables', 'orders'])
    stop()
  })

  it('connects again at once when the server asks it to renew', async () => {
    const stop = followOutlet('o1', vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    last().onclose!({ code: 4000 })
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeSocket.opened).toHaveLength(2)
    stop()
  })

  it('keeps trying when it can get no ticket, and stops when told', async () => {
    vi.stubGlobal('fetch', async () => {
      tickets += 1
      return apiError(500, 'internal_error')
    })
    const stop = followOutlet('o1', vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    expect(tickets).toBe(1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(tickets).toBe(2)
    stop()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(tickets).toBe(2)
    expect(FakeSocket.opened).toHaveLength(0)
  })
})
