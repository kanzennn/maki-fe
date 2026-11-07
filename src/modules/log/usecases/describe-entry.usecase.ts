import type { ActionLog } from '../types'

type Values = Record<string, unknown> | null

/** What an entry's values call the thing it happened to, in the order the backend's records use. */
const nameFields = ['name', 'title', 'order_no', 'code', 'username']

/** The name of what an entry happened to, as it stored it; null if it stored none. */
export function targetName(entry: Pick<ActionLog, 'before' | 'after'>): string | null {
  for (const values of [entry.after, entry.before] as Values[]) {
    for (const field of nameFields) {
      const value = values?.[field]
      if (typeof value === 'string' && value !== '') return value
    }
  }
  return null
}

/** A stored value as text: as it was stored, never translated. */
function shown(value: unknown): string {
  if (value === undefined || value === null) return '-'
  return typeof value === 'string' ? value : JSON.stringify(value)
}

/** An entry's values side by side, each field once, in the order first stored. */
export function changes(entry: Pick<ActionLog, 'before' | 'after'>): { field: string; before: string; after: string }[] {
  const before = (entry.before ?? {}) as Record<string, unknown>
  const after = (entry.after ?? {}) as Record<string, unknown>
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].map((field) => ({
    field,
    before: shown(before[field]),
    after: shown(after[field]),
  }))
}
