import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormNotice } from '@/shared/components/FormMessage'
import { BackLink, PageHeader } from '@/shared/components/PageHeader'
import { SectionHeading } from '@/shared/components/PageHeading'
import { useCan } from '@/shared/hooks/useCan'

import { permissionCatalogQuery, roleQuery, useUpdateRole, type PermissionGroup, type RoleDetail } from '../api'
import { moduleName, permissionName } from '../permission-names'
import { DeleteRoleDialog } from './DeleteRoleDialog'
import { RoleForm } from './RoleForm'

/**
 * One role: its form for whoever manages roles, its permissions for whoever
 * only sees them, and the users who hold it.
 */
export function RoleDetailPage() {
  const { t } = useTranslation('role')
  const { oid, rid } = useParams({ from: '/_auth/admin/outlets/$oid/roles/$rid' })
  const can = useCan()
  const { data: role } = useSuspenseQuery(roleQuery(oid, rid))
  const { data: catalog } = useSuspenseQuery(permissionCatalogQuery())
  const update = useUpdateRole(oid, rid)
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/roles" params={{ oid }}>
            {t('detail.back')}
          </BackLink>
        }
        title={role.name}
        description={role.description}
      />
      {notice && <FormNotice>{notice}</FormNotice>}

      {can('role.manage') ? (
        <RoleForm
          // A saved role starts the form again from what the server kept.
          key={role.updated_at}
          role={role}
          groups={catalog.groups}
          submitLabel={t('edit.submit')}
          onSubmit={async (input) => {
            setNotice(null)
            await update.mutateAsync(input)
            setNotice(t('edit.done'))
          }}
        />
      ) : (
        <RolePermissions role={role} groups={catalog.groups} />
      )}

      <section aria-labelledby="role-holders" className="grid gap-3">
        <SectionHeading id="role-holders">
          {t('detail.holders', { count: role.users.length })}
        </SectionHeading>
        {role.users.length === 0 ? (
          <p className="text-on-surface-variant">{t('detail.noHolders')}</p>
        ) : (
          <ul className="grid gap-1">
            {role.users.map((holder) => (
              <li key={holder.user_id} className="flex min-h-11 flex-wrap items-baseline gap-x-2">
                {can('user.view') ? (
                  <Link
                    to="/admin/outlets/$oid/users/$uid"
                    params={{ oid, uid: holder.user_id }}
                    className="text-title-md text-on-surface underline-offset-4 hover:underline"
                  >
                    {holder.name}
                  </Link>
                ) : (
                  <span className="text-title-md text-on-surface">{holder.name}</span>
                )}
                <span className="text-label-md text-on-surface-variant">@{holder.username}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {can('role.manage') && (
        <div>
          <DeleteRoleDialog role={role} />
        </div>
      )}
    </div>
  )
}

/** A role's permissions, read only, by module. */
function RolePermissions({ role, groups }: { role: RoleDetail; groups: PermissionGroup[] }) {
  const { t } = useTranslation('role')
  const held = groups
    .map((group) => ({ ...group, permissions: group.permissions.filter((code) => role.permissions.includes(code)) }))
    .filter((group) => group.permissions.length > 0)

  return (
    <section aria-labelledby="role-permissions" className="grid gap-3">
      <SectionHeading id="role-permissions">
        {t('fields.permissions')}
      </SectionHeading>
      {held.length === 0 ? (
        <p className="text-on-surface-variant">{t('detail.noPermissions')}</p>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2">
          {held.map((group) => (
            <div key={group.module} className="grid content-start gap-1 rounded-card border border-outline p-4">
              <dt className="text-title-md text-on-surface">{moduleName(t, group.module)}</dt>
              {group.permissions.map((code) => (
                <dd key={code} className="text-body-md text-on-surface-variant">
                  {permissionName(t, code)}
                </dd>
              ))}
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
