import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/shared/button'
import { useSession } from '@/hooks/use-session'
import { AUTH_UNAUTHORIZED } from '@/lib/http'
import { signOut } from '@/modules/auth/usecases/sign-out.usecase'

/**
 * The frame of every screen behind the session guard: the app name, which
 * leads to the user's start page, their outlet, their name and sign-out.
 * When the session ends while a screen is open — auth:unauthorized, a
 * request whose token the refresh couldn't renew — it goes back to sign-in,
 * returning here afterwards, and forgets the data it had loaded.
 */
export function SignedInLayout() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const name = useSession((s) => s.user?.name)
  const outlet = useSession((s) => s.user?.outlet?.name)
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    async function onUnauthorized() {
      await router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
      queryClient.clear()
    }
    const listener = () => void onUnauthorized()
    window.addEventListener(AUTH_UNAUTHORIZED, listener)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED, listener)
  }, [router, queryClient])

  async function onSignOut() {
    await signOut()
    queryClient.clear()
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
