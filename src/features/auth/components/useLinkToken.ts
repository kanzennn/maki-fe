import { useLocation, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

/**
 * The token from an emailed link's fragment (#token=…), which browsers never
 * send to a server. Read once, then dropped from the address bar, so it
 * isn't left in the history or passed on with a copied URL.
 */
export function useLinkToken(): string | null {
  const location = useLocation()
  const router = useRouter()
  // Reading is pure, so StrictMode's second render gets the same token;
  // the address is changed after, in an effect.
  const [token] = useState(() => new URLSearchParams(location.hash.replace(/^#/, '')).get('token'))

  useEffect(() => {
    if (location.hash) {
      void router.navigate({ href: location.pathname + location.searchStr, replace: true })
    }
  }, [location.hash, location.pathname, location.searchStr, router])

  return token
}
