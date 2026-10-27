import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'

/** A list's state as the address bar holds it: its filters and sort, if it has them, and the page. */
type ListState = { page?: number }

/** A list page's state in the address bar, and the ways to change it. */
export type UrlListState<S extends ListState> = {
  state: S
  /** Changes filters or the sort, and starts again from the first page. */
  filter: (next: Partial<Omit<S, 'page'>>) => void
  /** Another page of the same list. The route's validateSearch leaves the first out of the address. */
  setPage: (page: number | undefined) => void
}

/**
 * A list page's state — filters, sort and page — kept in the address bar,
 * so Back and a shared link bring the same list back. The route reads it
 * (validateSearch, with the module's filters.ts) and its loader asks the API
 * for exactly that page: filtering and paging are the server's. Each state
 * is a query of its own, so an answer to a request made for an older state
 * never shows in place of the current one.
 *
 * route is the page's route (getRouteApi). resetScroll: false keeps the
 * scroll for a list inside a page, such as a menu's stock history.
 */
export function useUrlListState<S extends ListState>(
  route: { useSearch: () => S },
  { resetScroll }: { resetScroll?: boolean } = {},
): UrlListState<S> {
  const state = route.useSearch()
  const navigate = useNavigate()
  // The router types search by route; this hook serves every list's route,
  // and S is the one the caller's route validates.
  const go = useCallback(
    (update: (prev: S) => S) => void navigate({ to: '.', search: update as never, resetScroll }),
    [navigate, resetScroll],
  )
  const filter = useCallback(
    (next: Partial<Omit<S, 'page'>>) => go((prev) => ({ ...prev, ...next, page: undefined })),
    [go],
  )
  const setPage = useCallback((page: number | undefined) => go((prev) => ({ ...prev, page })), [go])
  return { state, filter, setPage }
}
