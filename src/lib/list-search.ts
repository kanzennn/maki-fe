// Reading a list's state from the address bar, where anyone can type
// anything: each module's filters.ts builds its list state from these.

/** A page: a whole number from 2. Anything else is the first page, the default, left out. */
export function listPage(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 1 ? value : undefined
}

/**
 * A search text. The router reads `?q=123` typed by hand as a number, so a
 * number is taken as text; an empty or blank one is none.
 */
export function listText(value: unknown): string | undefined {
  const text = typeof value === 'number' ? String(value) : value
  return typeof text === 'string' && text.trim() !== '' ? text : undefined
}

/** One of values, or none for anything else. */
export function listChoice<T extends string>(value: unknown, values: readonly T[]): T | undefined {
  return values.find((v) => v === value)
}

/** The search text and page of a list, read from the address bar. */
export function listSearch(search: Record<string, unknown>): { q?: string; page?: number } {
  return { q: listText(search.q), page: listPage(search.page) }
}
