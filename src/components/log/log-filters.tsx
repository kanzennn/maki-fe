import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/shared/button'
import { Checkbox } from '@/components/shared/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared/dialog'
import { FormField } from '@/components/shared/form-field'
import { logActions, type LogListState } from '@/modules/log/types'

/** The filters every Log Action list has: a period, and the kinds of action. children adds a list's own. */
export function LogFilters({
  state,
  onFilter,
  children,
}: {
  state: LogListState
  onFilter: (next: Partial<Omit<LogListState, 'page'>>) => void
  children?: ReactNode
}) {
  const { t } = useTranslation('log')
  return (
    <div className="grid items-end gap-3 sm:grid-cols-2 expanded:grid-cols-4">
      <FormField
        label={t('filters.from')}
        type="date"
        value={state.from ?? ''}
        onChange={(e) => onFilter({ from: e.target.value || undefined })}
      />
      <FormField
        label={t('filters.to')}
        type="date"
        value={state.to ?? ''}
        onChange={(e) => onFilter({ to: e.target.value || undefined })}
      />
      <ActionPicker chosen={state.actions ?? []} onChoose={(actions) => onFilter({ actions: actions.length ? actions : undefined })} />
      {children}
    </div>
  )
}

function ActionPicker({ chosen, onChoose }: { chosen: string[]; onChoose: (actions: string[]) => void }) {
  const { t } = useTranslation('log')
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(chosen)
  const toggle = (action: string, on: boolean) => setPicked((p) => (on ? [...p, action] : p.filter((a) => a !== action)))

  return (
    <div className="grid content-start gap-2">
      <span className="text-title-md">{t('filters.actions')}</span>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) setPicked(chosen)
          setOpen(next)
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" className="h-11 justify-start">
            {chosen.length ? t('filters.someActions', { count: chosen.length }) : t('filters.allActions')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('filters.actions')}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-96 gap-4 overflow-y-auto">
            {Object.entries(logActions).map(([group, actions]) => (
              <fieldset key={group} className="grid gap-2">
                <legend className="text-title-md">{t(`groups.${group}` as never)}</legend>
                {actions.map((name) => {
                  const action = `${group}.${name}`
                  return (
                    <label key={action} className="flex items-center gap-3 text-body-md">
                      <Checkbox checked={picked.includes(action)} onCheckedChange={(on) => toggle(action, on === true)} />
                      {t(`actions.${action}` as never)}
                    </label>
                  )
                })}
              </fieldset>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="h-11" onClick={() => setPicked([])}>
              {t('filters.clear')}
            </Button>
            <Button
              className="h-11"
              onClick={() => {
                onChoose(picked)
                setOpen(false)
              }}
            >
              {t('filters.apply')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
