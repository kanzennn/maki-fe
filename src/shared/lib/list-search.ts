/**
 * The search text and page of a list, read from the address bar. The router
 * reads `?q=123` typed by hand as a number, so a number is taken as text;
 * a page that isn't a whole number from 2 is dropped (the first page is the
 * default).
 */
export function listSearch(search: Record<string, unknown>): { q?: string; page?: number } {
  const q = typeof search.q === 'number' ? String(search.q) : search.q
  const page = search.page
  return {
    q: typeof q === 'string' && q.trim() !== '' ? q : undefined,
    page: typeof page === 'number' && Number.isInteger(page) && page > 1 ? page : undefined,
  }
}
