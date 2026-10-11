import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { api, unwrap } from '@/shared/api/client'
import { FormAlert, FormNotice } from '@/shared/components/FormMessage'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { useSession } from '@/shared/lib/session'
import { Button } from '@/shared/ui/button'

import { verifyEmail } from '../api'
import { AuthShell } from './AuthShell'
import { useLinkToken } from './useLinkToken'

const linkClass = 'justify-self-start text-body-md text-primary-strong underline-offset-4 hover:underline'

/**
 * Confirms an email address. It waits for a press rather than confirming on
 * load: mail scanners that open links, and run their scripts, would
 * otherwise use the token up.
 */
export function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const token = useLinkToken()
  const signedIn = useSession((s) => s.accessToken !== null)
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!token) return
    setState('sending')
    setError(null)
    try {
      await verifyEmail(token)
      if (useSession.getState().accessToken) {
        useSession.getState().setUser(await unwrap(api.GET('/api/v1/me')))
      }
      setState('done')
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
      setState('idle')
    }
  }

  const next = signedIn ? (
    <Link to="/admin" className={linkClass}>
      {t('verify.continue')}
    </Link>
  ) : (
    <Link to="/login" search={{}} className={linkClass}>
      {t('verify.continue')}
    </Link>
  )

  if (!token) {
    return (
      <AuthShell title={t('verify.title')}>
        <FormAlert>{t('verify.noToken')}</FormAlert>
      </AuthShell>
    )
  }
  if (state === 'done') {
    return (
      <AuthShell title={t('verify.title')}>
        <FormNotice>{t('verify.done')}</FormNotice>
        {next}
      </AuthShell>
    )
  }
  return (
    <AuthShell title={t('verify.title')} intro={t('verify.body')}>
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="button" className="h-11 text-title-md" disabled={state === 'sending'} onClick={() => void confirm()}>
        {t('verify.submit')}
      </Button>
    </AuthShell>
  )
}
