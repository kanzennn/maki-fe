import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

/**
 * Moves focus to the page heading after every client-side navigation. The
 * first render is left alone so that a fresh page load starts at the top as
 * browsers expect.
 */
export function useFocusHeadingOnNavigate() {
  const pathname = useRouterState({ select: (state) => state.resolvedLocation?.pathname })
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    document.querySelector<HTMLElement>('[data-page-heading]')?.focus()
  }, [pathname])
}
