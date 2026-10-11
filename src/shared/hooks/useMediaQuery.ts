import { useCallback, useSyncExternalStore } from 'react'

/**
 * Whether the screen matches a media query, such as the 840px a wide-only
 * page needs, following it as the window is resized. Without matchMedia
 * (tests, unless they stub it) it reads as a match.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () =>
    typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : true,
  )
}

/** DESIGN.md's switch to the wide layout: 840px, Tailwind's expanded: breakpoint. */
export const EXPANDED = '(min-width: 52.5rem)'
