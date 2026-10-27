import { useSuspenseQuery } from '@tanstack/react-query'
import { ArmchairIcon, HashIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChoiceTiles } from '@/components/shared/choice-tiles'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { SectionHeading } from '@/components/shared/page-heading'
import { useCan } from '@/hooks/use-can'
import { Button } from '@/components/shared/button'

import { dineInModeQuery, useSetDineInMode } from '@/hooks/table/table.queries'
import type { DineInMode } from '@/modules/table/types'

/**
 * How the outlet seats its dine-in customers: at the tables below, or by
 * number stands. Whoever manages tables picks one and saves it, once told
 * what changes at the cashier; everyone else, the Owner too, reads it.
 */
export function DineInModeCard({ outletId, onDone }: { outletId: string; onDone: (notice: string) => void }) {
  const { t } = useTranslation('table')
  const can = useCan()
  const headingId = useId()
  const { data: saved } = useSuspenseQuery(dineInModeQuery(outletId))
  const [chosen, setChosen] = useState<DineInMode>(saved)
  const setMode = useSetDineInMode(outletId)
  const manage = can('table.manage')

  return (
    <section aria-labelledby={headingId} className="grid gap-3 rounded-card border border-outline p-4">
      <div className="grid gap-1">
        <SectionHeading id={headingId}>{t('mode.title')}</SectionHeading>
        <ChoiceTiles
          legend={t('mode.legend')}
          legendStyle="description"
          value={manage ? chosen : saved}
          onChange={setChosen}
          disabled={!manage}
          choices={[
            { value: 'table', label: t('mode.table'), hint: t('mode.tableHint'), icon: ArmchairIcon },
            { value: 'number', label: t('mode.number'), hint: t('mode.numberHint'), icon: HashIcon },
          ]}
        />
      </div>
      {manage && (
        <div>
          <ConfirmDialog
            trigger={
              <Button className="h-11" disabled={chosen === saved}>
                {t('mode.save')}
              </Button>
            }
            title={t(chosen === 'number' ? 'mode.confirm.titleNumber' : 'mode.confirm.titleTable')}
            description={t(chosen === 'number' ? 'mode.confirm.bodyNumber' : 'mode.confirm.bodyTable')}
            confirmLabel={t('mode.confirm.action')}
            onConfirm={async () => {
              const mode = await setMode.mutateAsync(chosen)
              onDone(t(mode === 'number' ? 'mode.done.number' : 'mode.done.table'))
            }}
          />
        </div>
      )}
    </section>
  )
}
