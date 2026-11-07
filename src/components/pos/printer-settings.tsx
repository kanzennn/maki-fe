import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/shared/checkbox'
import { ChoiceTiles } from '@/components/shared/choice-tiles'
import { usePrintSettings, type PaperWidth } from '@/hooks/pos/use-print-settings'

/** How this till prints its receipts: its roll, and printing without asking. */
export function PrinterSettings() {
  const { t } = useTranslation('pos')
  const paper = usePrintSettings((s) => s.paper)
  const auto = usePrintSettings((s) => s.auto)
  const change = usePrintSettings((s) => s.change)
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="grid gap-3 rounded-card border border-outline bg-surface p-4">
      <h2 id={`${id}-title`} className="text-title-md text-on-surface">
        {t('printer.title')}
      </h2>
      <p className="text-body-md text-on-surface-variant">{t('printer.thisBrowser')}</p>
      <ChoiceTiles<PaperWidth>
        legend={t('printer.paper')}
        value={paper}
        onChange={(next) => change({ paper: next })}
        choices={[
          { value: '58', label: '58 mm' },
          { value: '80', label: '80 mm' },
        ]}
      />
      <div className="flex min-h-11 items-center gap-3">
        <Checkbox id={id} checked={auto} onCheckedChange={(on) => change({ auto: on === true })} />
        <label htmlFor={id} className="text-body-md text-on-surface">
          {t('printer.auto')}
        </label>
      </div>
      <p className="text-label-md font-normal text-on-surface-variant">{t('printer.kiosk')}</p>
    </section>
  )
}
