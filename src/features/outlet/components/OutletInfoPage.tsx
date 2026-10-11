import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Detail } from '@/shared/components/Detail'
import { FormNotice } from '@/shared/components/FormMessage'
import { Button } from '@/shared/ui/button'

import { outletQuery } from '../api'
import { DeleteOutletDialog } from './DeleteOutletDialog'
import { OutletStatusDialog } from './OutletStatusDialog'

/** The Owner's view of one outlet: its details, what can be done with it, and its Managers. */
export function OutletInfoPage() {
  const { t, i18n } = useTranslation('outlet')
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid/' })
  const { data: outlet } = useSuspenseQuery(outletQuery(oid))
  const [notice, setNotice] = useState<string | null>(null)
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 2 })

  return (
    <div className="grid gap-6">
      {notice && <FormNotice>{notice}</FormNotice>}

      <section aria-labelledby="outlet-details" className="grid gap-4 rounded-card border border-outline p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="outlet-details" className="text-headline-md text-on-surface">
            {t('detail.title')}
          </h2>
          <Button asChild variant="outline" className="h-11">
            <Link to="/admin/outlets/$oid/edit" params={{ oid }}>
              <PencilIcon aria-hidden="true" />
              {t('detail.edit')}
            </Link>
          </Button>
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail term={t('fields.address')}>{outlet.address ?? t('detail.none')}</Detail>
          <Detail term={t('fields.phone')}>{outlet.phone ?? t('detail.none')}</Detail>
          <Detail term={t('detail.hours')}>
            {outlet.open_time && outlet.close_time
              ? t('detail.hoursRange', { open: outlet.open_time, close: outlet.close_time })
              : t('detail.noHours')}
          </Detail>
          <Detail term={t('detail.charges')}>
            {t('detail.chargesValue', {
              tax: percent.format(outlet.tax_pct / 100),
              service: percent.format(outlet.service_pct / 100),
            })}
          </Detail>
          <Detail term={t('fields.timezone')}>{outlet.timezone}</Detail>
          <Detail term={t('fields.locale')}>{t(`locales.${outlet.locale}`)}</Detail>
        </dl>
      </section>

      <section aria-labelledby="outlet-managers" className="grid gap-4 rounded-card border border-outline p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="outlet-managers" className="text-headline-md text-on-surface">
            {t('detail.managers')}
          </h2>
          <Button asChild variant="outline" className="h-11">
            <Link to="/admin/outlets/$oid/users/new" params={{ oid }}>
              <PlusIcon aria-hidden="true" />
              {t('detail.addManager')}
            </Link>
          </Button>
        </div>
        {outlet.managers.length === 0 ? (
          <p className="text-on-surface-variant">{t('detail.noManagers')}</p>
        ) : (
          <ul className="grid gap-2">
            {outlet.managers.map((manager) => (
              <li key={manager.user_id}>
                <Link
                  to="/admin/outlets/$oid/users/$uid"
                  params={{ oid, uid: manager.user_id }}
                  className="inline-flex min-h-11 items-center text-title-md text-on-surface underline-offset-4 hover:underline"
                >
                  {manager.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-body-md text-on-surface-variant">{t('detail.managersHint')}</p>
      </section>

      <section aria-labelledby="outlet-status" className="grid gap-4 rounded-card border border-outline p-4 sm:p-6">
        <h2 id="outlet-status" className="text-headline-md text-on-surface">
          {t('detail.status')}
        </h2>
        <p className="text-on-surface-variant">
          {outlet.status === 'active' ? t('detail.activeBody') : t('detail.inactiveBody')}
        </p>
        <div className="flex flex-wrap gap-2">
          <OutletStatusDialog outlet={outlet} onDone={setNotice} />
          {outlet.status === 'inactive' && <DeleteOutletDialog outlet={outlet} />}
        </div>
      </section>
    </div>
  )
}
