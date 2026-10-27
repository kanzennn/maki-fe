import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormAlert, FormNotice } from '@/components/shared/form-message'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useSession } from '@/hooks/use-session'
import { Button } from '@/components/shared/button'

import { verifyEmail } from '@/modules/auth/usecases/verify-email.usecase'
import { AuthShell } from '@/components/auth/auth-shell'
import { useLinkToken } from '@/hooks/auth/use-link-token'

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
