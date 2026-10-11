import { create } from 'zustand'

import type { components } from '@/shared/api/schema'

export type Me = components['schemas']['Me']
export type SessionResponse = components['schemas']['Session']

type SessionState = {
  /** Kept in memory only — never in localStorage (architecture standard §9). */
  accessToken: string | null
  /**
   * The signed-in user, from the same response as the token. It is the one
   * piece of server data kept here rather than in the Query cache: route
   * guards read it synchronously, and the cache may drop an unobserved query.
   */
  user: Me | null
  setSession: (session: SessionResponse) => void
  setUser: (user: Me) => void
  clear: () => void
}

export const useSession = create<SessionState>()((set) => ({
  accessToken: null,
  user: null,
  setSession: (session) => set({ accessToken: session.access_token, user: session.user }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}))

export function isAuthenticated() {
  return useSession.getState().accessToken !== null
}
