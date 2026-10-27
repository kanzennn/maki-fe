import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormAlert, FormNotice } from '@/components/shared/form-message'
import { BackLink, PageHeader } from '@/components/shared/page-header'
import { useCan } from '@/hooks/use-can'
import { apiErrorMessage } from '@/lib/api-error-message'
import { Button } from '@/components/shared/button'

import { allAreasQuery, useReorderAreas } from '@/hooks/table/table.queries'
import { AreaDialog } from './area-dialog'
import { DeleteAreaDialog } from './delete-area-dialog'

const route = getRouteApi('/_auth/admin/outlets/$oid/tables/areas')

type Move = { areaId: string; direction: 'up' | 'down' }

/**
 * An outlet's areas in the order the cashier sees them, which whoever
 * manages tables changes a step at a time. A move takes effect at once and
 * is announced, and focus stays on the moved area's button.
 */
export function AreasPage() {
  const { t } = useTranslation('table')
  const { t: tCommon } = useTranslation()
  const { oid } = route.useParams()
  const can = useCan()
  const { data: areas } = useSuspenseQuery(allAreasQuery(oid))
  const reorder = useReorderAreas(oid)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The button to focus once the list has redrawn in its new order.
  const moved = useRef<Move | null>(null)

  useLayoutEffect(() => {
    const move = moved.current
    if (!move) return
    moved.current = null
    const other = move.direction === 'up' ? 'down' : 'up'
    const button = document.getElementById(moveId(move.areaId, move.direction)) as HTMLButtonElement | null
    const fallback = document.getElementById(moveId(move.areaId, other))
    ;(button && !button.disabled ? button : fallback)?.focus()
  }, [areas])

  async function move(index: number, direction: 'up' | 'down') {
    // One move at a time. The buttons stay enabled meanwhile, so the one in
    // use keeps its focus.
    if (reorder.isPending) return
    setError(null)
    setNotice(null)
    const target = direction === 'up' ? index - 1 : index + 1
    const order = areas.map((area) => area.area_id)
    ;[order[index], order[target]] = [order[target], order[index]]
    moved.current = { areaId: areas[index].area_id, direction }
    try {
      await reorder.mutateAsync(order)
      setNotice(t('areas.moved', { name: areas[index].name, position: target + 1 }))
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/tables" params={{ oid }}>
            {t('back')}
          </BackLink>
        }
        title={t('areas.title')}
        description={t('areas.intro')}
        actions={
          can('table.manage') && (
            <AreaDialog
              outletId={oid}
              onDone={setNotice}
              trigger={
                <Button className="h-11">
                  <PlusIcon aria-hidden="true" />
                  {t('areas.create')}
                </Button>
              }
            />
          )
        }
      />
      {notice && <FormNotice>{notice}</FormNotice>}
      {error && <FormAlert>{error}</FormAlert>}

      {areas.length === 0 ? (
        <p className="rounded-card border border-outline p-6 text-on-surface-variant">{t('areas.empty')}</p>
      ) : (
        <ol className="grid rounded-card border border-outline">
          {areas.map((area, index) => (
            <li key={area.area_id} className="flex flex-wrap items-center gap-3 border-b border-outline p-3 last:border-b-0">
              {can('table.manage') && (
                <div className="flex gap-1">
                  <Button
                    id={moveId(area.area_id, 'up')}
                    variant="outline"
                    className="size-11"
                    aria-label={t('areas.moveUp', { name: area.name })}
                    disabled={index === 0}
                    onClick={() => void move(index, 'up')}
                  >
                    <ArrowUpIcon className="size-5" />
                  </Button>
                  <Button
                    id={moveId(area.area_id, 'down')}
                    variant="outline"
                    className="size-11"
                    aria-label={t('areas.moveDown', { name: area.name })}
                    disabled={index === areas.length - 1}
                    onClick={() => void move(index, 'down')}
                  >
                    <ArrowDownIcon className="size-5" />
                  </Button>
                </div>
              )}
              <div className="grid min-w-0 flex-1 gap-0.5">
                <p className="text-title-md break-words text-on-surface">{area.name}</p>
                <p className="text-label-md text-on-surface-variant">{t('areas.tableCount', { count: area.table_count })}</p>
              </div>
              {can('table.manage') && (
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <AreaDialog
                    outletId={oid}
                    area={area}
                    onDone={setNotice}
                    trigger={
                      <Button variant="outline" className="h-11">
                        {t('areas.rename')}
                      </Button>
                    }
                  />
                  <DeleteAreaDialog outletId={oid} area={area} onDone={setNotice} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function moveId(areaId: string, direction: 'up' | 'down') {
  return `area-${areaId}-${direction}`
}
