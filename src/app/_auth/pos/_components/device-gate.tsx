import { Link } from '@tanstack/react-router'
import { MonitorSmartphoneIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { ValidationError } from '@/lib/validation'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { PageHeading } from '@/components/shared/page-heading'
import { useCan } from '@/hooks/use-can'
import { useFieldError } from '@/hooks/use-field-error'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useSession } from '@/hooks/use-session'
import { Button } from '@/components/shared/button'

import { useActivateDevice } from '@/hooks/device/device.queries'
import { MAX_DEVICE_NAME } from '@/modules/device/types'

/**
 * A device that can't sell: not one of the outlet's (`device_not_registered`)
 * or revoked (`device_revoked`). The outlet's Manager, signed in on it,
 * activates it here; anyone else learns who can. Any other error is shown as
 * it is, with a retry.
 */
export function DeviceGate({ outletId, error, onRetry }: { outletId: string; error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('pos')
  const { t: tCommon } = useTranslation()
  const outlet = useSession((s) => s.user?.outlet?.name ?? '')
  const isManager = useSession((s) => s.user?.is_manager ?? false)
  const can = useCan()
  const code = error instanceof ApiError ? error.code : ''
  const state = code === 'device_revoked' ? 'revoked' : code === 'device_not_registered' ? 'notRegistered' : null

  if (!state) {
    return (
      <section className="m-4 grid max-w-md gap-3 rounded-card border border-outline bg-surface p-6 expanded:m-6">
        <PageHeading>{tCommon('error.title')}</PageHeading>
        <p className="text-on-surface-variant">{apiErrorMessage(tCommon, error)}</p>
        <Button variant="outline" className="h-11 justify-self-start" onClick={onRetry}>
          {tCommon('actions.retry')}
        </Button>
      </section>
    )
  }

  return (
    <section className="m-4 grid max-w-lg gap-4 rounded-card border border-outline bg-surface p-6 expanded:m-6">
      <MonitorSmartphoneIcon aria-hidden="true" className="size-8 text-icon-muted" />
      <PageHeading>{t(`device.${state}.title`)}</PageHeading>
      <p className="text-on-surface-variant">
        {isManager ? t(`device.${state}.manager`, { outlet }) : t(`device.${state}.body`, { outlet })}
      </p>
      {isManager && <ActivateForm outletId={outletId} />}
      {can('order.void') && !isManager && (
        <Link to="/pos/history" className="text-title-md text-primary-strong underline-offset-4 hover:underline">
          {t('device.toHistory')}
        </Link>
      )}
    </section>
  )
}

/** The Manager names the device and activates it; the page then becomes the cashier. */
function ActivateForm({ outletId }: { outletId: string }) {
  const { t } = useTranslation('pos')
  const { t: tCommon } = useTranslation()
  const ruleMessage = useFieldError()
  const activate = useActivateDevice(outletId)
  const [name, setName] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldError(undefined)
    try {
      await activate.mutateAsync(name)
    } catch (caught) {
      if (caught instanceof ValidationError) setFieldError(ruleMessage({ type: 'validate', message: caught.fields.name }))
      else setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4">
      {error && <FormAlert>{error}</FormAlert>}
      <FormField
        label={t('device.name')}
        hint={t('device.nameHint')}
        error={fieldError}
        value={name}
        maxLength={MAX_DEVICE_NAME}
        autoComplete="off"
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit" className="h-11 justify-self-start" disabled={activate.isPending}>
        {activate.isPending ? t('device.activating') : t('device.activate')}
      </Button>
    </form>
  )
}
