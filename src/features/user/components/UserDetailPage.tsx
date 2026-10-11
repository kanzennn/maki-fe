import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useRouteContext } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { allRolesQuery } from '@/shared/api/roles'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Detail } from '@/shared/components/Detail'
import { FormNotice } from '@/shared/components/FormMessage'
import { BackLink, PageHeader } from '@/shared/components/PageHeader'
import { SectionHeading } from '@/shared/components/PageHeading'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useSession } from '@/shared/lib/session'
import { formatDateTime } from '@/shared/lib/time'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

import { staffQuery, useDeleteStaff, useForgetStaff, useSetStaffStatus, useUpdateStaff, type Staff } from '../api'
import { grantableRoles, manageMode } from '../manage'
import { DemoteDialog } from './DemoteDialog'
import { ProfileForm } from './ProfileForm'
import { ResetPasswordDialog } from './ResetPasswordDialog'

/**
 * One account: what it is, and what the signed-in user may do with it — by
 * the same rules the server applies, which says no to anything else.
 */
export function UserDetailPage() {
  const { t, i18n } = useTranslation('user')
  const { oid, uid } = useParams({ from: '/_auth/admin/outlets/$oid/users/$uid' })
  const outlet = useRouteContext({ from: '/_auth/admin/outlets/$oid', select: (c) => c.outlet })
  const actor = useSession((s) => s.user)
  const { data: staff } = useSuspenseQuery(staffQuery(oid, uid))
  const { data: roles } = useSuspenseQuery(allRolesQuery(oid))
  const [notice, setNotice] = useState<string | null>(null)
  const mode = manageMode(actor, staff, roles)
  const update = useUpdateStaff(oid, uid)

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/users" params={{ oid }}>
            {t('detail.back')}
          </BackLink>
        }
        title={staff.name}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <span>@{staff.username}</span>
            {staff.is_manager ? <Badge>{t('manager')}</Badge> : <span>· {staff.role?.name ?? t('noRole')}</span>}
            <StatusBadge status={staff.status} />
          </div>
        }
      />
      {notice && <FormNotice>{notice}</FormNotice>}
      {mode !== 'manage' && mode !== 'view' && <ModeNote mode={mode} />}

      <section aria-labelledby="user-account" className="grid gap-3">
        <SectionHeading id="user-account">{t('detail.account')}</SectionHeading>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail term={t('fields.lastLogin')}>
            {staff.last_login_at
              ? formatDateTime(staff.last_login_at, i18n.language, outlet.timezone)
              : t('neverSignedIn')}
          </Detail>
          <Detail term={t('detail.password')}>
            {staff.must_change_password ? t('detail.temporaryPassword') : t('detail.ownPassword')}
          </Detail>
          <Detail term={t('fields.created')}>{formatDateTime(staff.created_at, i18n.language, outlet.timezone)}</Detail>
          {mode !== 'manage' && (
            <>
              <Detail term={t('fields.email')}>{staff.email ?? '—'}</Detail>
              <Detail term={t('fields.phone')}>{staff.phone ?? '—'}</Detail>
            </>
          )}
        </dl>
      </section>

      {mode === 'manage' && (
        <section aria-labelledby="user-profile" className="grid gap-3">
          <SectionHeading id="user-profile">{t('detail.profile')}</SectionHeading>
          <ProfileForm
            // A saved account starts the form again from what the server kept.
            key={staff.updated_at}
            staff={staff}
            roles={grantableRoles(actor, roles)}
            onSubmit={async (body) => {
              setNotice(null)
              await update.mutateAsync(body)
              setNotice(t('edit.done'))
            }}
          />
        </section>
      )}

      {(mode === 'manage' || mode === 'promote') && (
        <section aria-labelledby="user-actions" className="grid gap-3">
          <SectionHeading id="user-actions">{t('detail.actions')}</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {mode === 'promote' ? (
              <PromoteButton outletId={oid} staff={staff} onDone={setNotice} />
            ) : (
              <>
                <ResetPasswordDialog outletId={oid} staff={staff} onDone={setNotice} />
                {staff.is_manager && <DemoteDialog outletId={oid} staff={staff} roles={roles} onDone={setNotice} />}
                <StatusButton outletId={oid} staff={staff} onDone={setNotice} />
                <DeleteButton outletId={oid} staff={staff} />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

/** Why the page shows the account without its actions. */
function ModeNote({ mode }: { mode: 'own' | 'promote' | 'managerAccount' | 'stronger' }) {
  const { t } = useTranslation('user')
  return (
    <p className="rounded-control bg-surface-container p-3 text-body-md text-on-surface">
      {t(`modes.${mode}`)}{' '}
      {mode === 'own' && (
        <Link to="/change-password" className="text-primary-strong underline underline-offset-4">
          {t('modes.changePassword')}
        </Link>
      )}
    </p>
  )
}

type ActionProps = { outletId: string; staff: Staff; onDone: (notice: string) => void }

function PromoteButton({ outletId, staff, onDone }: ActionProps) {
  const { t } = useTranslation('user')
  const update = useUpdateStaff(outletId, staff.user_id)
  return (
    <ConfirmDialog
      trigger={<Button className="h-11">{t('promote.action')}</Button>}
      title={t('promote.title', { name: staff.name })}
      description={t('promote.body')}
      confirmLabel={t('promote.action')}
      onConfirm={async () => {
        await update.mutateAsync({
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          is_manager: true,
          role_id: null,
        })
        onDone(t('promote.done', { name: staff.name }))
      }}
    />
  )
}

function StatusButton({ outletId, staff, onDone }: ActionProps) {
  const { t } = useTranslation('user')
  const setStatus = useSetStaffStatus(outletId, staff.user_id)
  const deactivating = staff.status === 'active'
  const copy = deactivating ? 'deactivate' : 'activate'
  return (
    <ConfirmDialog
      trigger={
        <Button variant={deactivating ? 'destructive' : 'default'} className="h-11">
          {t(`${copy}.action`)}
        </Button>
      }
      title={t(`${copy}.title`, { name: staff.name })}
      description={t(`${copy}.body`, { name: staff.name })}
      confirmLabel={t(`${copy}.action`)}
      destructive={deactivating}
      onConfirm={async () => {
        await setStatus.mutateAsync(deactivating ? 'inactive' : 'active')
        onDone(t(`${copy}.done`, { name: staff.name }))
      }}
    />
  )
}

function DeleteButton({ outletId, staff }: Omit<ActionProps, 'onDone'>) {
  const { t } = useTranslation('user')
  const navigate = useNavigate()
  const remove = useDeleteStaff(outletId, staff.user_id)
  const forget = useForgetStaff(outletId)
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="h-11 text-error">
          {t('delete.action')}
        </Button>
      }
      title={t('delete.title', { name: staff.name })}
      description={t('delete.body')}
      confirmLabel={t('delete.action')}
      destructive
      onConfirm={async () => {
        await remove.mutateAsync()
        await navigate({ to: '/admin/outlets/$oid/users', params: { oid: outletId } })
        forget(staff.user_id)
      }}
    />
  )
}
