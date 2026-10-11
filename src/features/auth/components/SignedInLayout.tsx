import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useSession } from '@/shared/lib/session'
import { Button } from '@/shared/ui/button'

import { signOut } from '../api'

/**
 * The frame of every screen behind the session guard: the app name, which
 * leads to the user's start page, their outlet, their name and sign-out.
 * When the session ends while a screen is open — a failed refresh, say — it
 * goes back to sign-in, returning here afterwards.
 */
export function SignedInLayout() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const name = useSession((s) => s.user?.name)
  const outlet = useSession((s) => s.user?.outlet?.name)
  const signedIn = useSession((s) => s.accessToken !== null)
  const router = useRouter()
  const queryClient = useQueryClient()
  const signingOut = useRef(false)

  useEffect(() => {
    if (!signedIn && !signingOut.current) {
      void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
    }
  }, [signedIn, router])

  async function onSignOut() {
    signingOut.current = true
    await signOut(queryClient)
    await router.navigate({ to: '/login', search: {} })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-(--app-header) shrink-0 items-center justify-between gap-4 border-b border-outline bg-surface px-4 expanded:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link to="/" className="text-headline-md text-primary-strong">
            {tCommon('app.name')}
          </Link>
          {outlet && <span className="truncate text-body-md text-on-surface-variant">{outlet}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {name && <span className="hidden text-body-md text-on-surface sm:inline">{name}</span>}
          <Button variant="outline" className="h-11" onClick={() => void onSignOut()}>
            {t('signOut')}
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
