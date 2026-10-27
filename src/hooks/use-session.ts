import { useStore } from 'zustand'

import { sessionStore, type SessionState } from '@/lib/session'

/** The part of the session a component selects; it re-renders when that part changes. */
export function useSession<T>(selector: (state: SessionState) => T): T {
  return useStore(sessionStore, selector)
}
