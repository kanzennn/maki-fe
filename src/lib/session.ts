import { createStore } from 'zustand/vanilla'

import type { Me, Session } from '@/modules/auth/types'

export type SessionState = {
  /** Kept in memory only — never in localStorage (docs/security.md). */
  accessToken: string | null
  /**
   * The signed-in user, from the same response as the token. It is the one
   * piece of server data kept here rather than in the Query cache: route
   * guards read it synchronously, and the cache may drop an unobserved query.
   */
  user: Me | null
  setSession: (session: Session) => void
  setUser: (user: Me) => void
  clear: () => void
}

/**
 * This tab's session. The refresh token never reaches it: the backend keeps
 * that in an HttpOnly cookie, which lib/http.ts trades for a new access token.
 * Components read it through hooks/use-session.
 */
export const sessionStore = createStore<SessionState>()((set) => ({
  accessToken: null,
  user: null,
  setSession: (session) => set({ accessToken: session.access_token, user: session.user }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}))
