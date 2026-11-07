import type { components } from '@/lib/api-schema'

export type RealtimeTicket = components['schemas']['RealtimeTicket']

/** What a live message can say changed. */
export type RealtimeTopic = 'catalog' | 'tables' | 'orders'
