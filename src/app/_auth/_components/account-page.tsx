import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/shared/button'
import { FormAlert, FormNotice } from '@/components/shared/form-message'
import { PageHeading } from '@/components/shared/page-heading'
import { PhotoField } from '@/components/shared/photo-field'
import { PrinterSettings } from '@/components/pos/printer-settings'
import { initialsOf } from '@/lib/initials'
import { useSession } from '@/hooks/use-session'
import { apiErrorMessage } from '@/lib/api-error-message'
import { canSell } from '@/modules/pos/permissions'
import { noPhotoChange } from '@/modules/upload/types'
import { changeMyPhoto, removeMyPhoto } from '@/modules/upload/usecases/my-photo.usecase'

/**
 * The signed-in user's own account: their photo, the way to their password,
 * and, for whoever sells, how this till prints.
 */
export function AccountPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const user = useSession((s) => s.user)
  const [photo, setPhoto] = useState(noPhotoChange)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!user) return null

  async function save() {
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      if (photo.file) {
        await changeMyPhoto(photo.file)
        setNotice(t('account.processing'))
      } else {
        await removeMyPhoto()
        setNotice(t('account.removed'))
      }
      setPhoto(noPhotoChange)
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="grid max-w-xl content-start gap-4 bg-background p-6">
      <PageHeading>{t('account.title')}</PageHeading>
      <p className="text-body-md text-on-surface-variant">
        {user.name} · @{user.username}
      </p>
      {notice && <FormNotice>{notice}</FormNotice>}
      {error && <FormAlert>{error}</FormAlert>}
      <PhotoField
        label={t('account.photo')}
        round
        currentUrl={user.photo_url}
        fallback={<span className="text-headline-md text-on-surface">{initialsOf(user.name)}</span>}
        value={photo}
        onChange={setPhoto}
      />
      <Button
        type="button"
        className="h-11 justify-self-start text-title-md"
        disabled={saving || (!photo.file && !photo.removed)}
        onClick={() => void save()}
      >
        {saving ? tCommon('actions.saving') : tCommon('actions.save')}
      </Button>
      <Link to="/change-password" className="justify-self-start text-body-md text-primary-strong underline underline-offset-4">
        {t('account.changePassword')}
      </Link>
      {canSell(user) && <PrinterSettings />}
    </main>
  )
}
