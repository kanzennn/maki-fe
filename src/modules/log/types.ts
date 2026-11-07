import type { components } from '@/lib/api-schema'

/** One Log Action entry. */
export type ActionLog = components['schemas']['ActionLog']

/** The actions there are, by what they are about, as the backend records them. */
export const logActions = {
  auth: ['login', 'logout', 'login_failed', 'owner_created', 'session_revoked', 'password_changed', 'password_reset_requested', 'password_reset', 'email_change_requested', 'email_verified'],
  outlet: ['created', 'updated', 'activated', 'deactivated', 'deleted'],
  voucher: ['created', 'updated', 'activated', 'deactivated', 'deleted'],
  role: ['created', 'updated', 'deleted'],
  user: ['created', 'updated', 'role_changed', 'promoted', 'demoted', 'activated', 'deactivated', 'password_reset', 'photo_changed', 'photo_removed', 'deleted'],
  category: ['created', 'updated', 'activated', 'deactivated', 'reordered', 'deleted'],
  menu: ['created', 'updated', 'activated', 'deactivated', 'deleted'],
  stock: ['adjusted'],
  area: ['created', 'updated', 'reordered', 'layout_updated', 'deleted'],
  table: ['created', 'updated', 'activated', 'deactivated', 'released', 'deleted'],
  table_schedule: ['created', 'updated', 'cancelled'],
  dine_in_mode: ['updated'],
  order: ['created', 'voided'],
  payment: ['updated'],
  device: ['activated', 'revoked'],
} as const

/** A Log Action list as the page shows it: dates in the page's time zone, and which page. */
export type LogListState = {
  from?: string
  to?: string
  actions?: string[]
  outlet?: string
  self?: boolean
  user?: string
  page?: number
}
