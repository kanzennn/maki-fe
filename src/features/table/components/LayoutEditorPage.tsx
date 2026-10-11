import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, useBlocker } from '@tanstack/react-router'
import { SaveIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/shared/api/client'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { FormAlert, FormNotice } from '@/shared/components/FormMessage'
import { BackLink, PageHeader } from '@/shared/components/PageHeader'
import { EXPANDED, useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'

import { layoutQuery, useSaveLayout, type DecorationKind } from '../api'
import { useDescribe } from '../editor'
import {
  addDecoration,
  draftFromLayout,
  overlapping,
  place,
  sameLayout,
  toLayoutInput,
  type Draft,
  type Selection,
} from '../layout'
import { LayoutCanvas } from './LayoutCanvas'
import { LayoutInspector } from './LayoutInspector'
import { LayoutPalette } from './LayoutPalette'

const route = getRouteApi('/_auth/admin/outlets/$oid/tables/layout/$aid')

/**
 * An area's layout editor: its tables and decorations as boxes on the grid,
 * moved, resized, turned and reshaped by pointer, by keyboard, or typed in
 * the properties, then saved all at once on the version it opened. Tables
 * on top of one another hold the save back; leaving with changes unsaved
 * asks first. It needs a wide screen: below 840px it says so.
 */
export function LayoutEditorPage() {
  const { t } = useTranslation('table')
  const { t: tCommon } = useTranslation()
  const { oid, aid } = route.useParams()
  const queryClient = useQueryClient()
  const { data: layout } = useSuspenseQuery(layoutQuery(oid, aid))
  const wide = useMediaQuery(EXPANDED)
  const save = useSaveLayout(oid, aid)
  const describe = useDescribe()
  // The layout as saved, and as it's being edited.
  const [base, setBase] = useState<Draft>(() => draftFromLayout(layout))
  const [draft, setDraft] = useState<Draft>(base)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [focus, setFocus] = useState<Selection | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [said, say] = useState('')
  const dirty = !sameLayout(draft, base)
  const overlaps = useMemo(() => overlapping(draft), [draft])
  const seats = useMemo(() => new Map(layout.tables.map((table) => [table.table_id, table.capacity])), [layout])

  // Read when leaving, which may come after this render.
  const dirtyRef = useRef(dirty)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    enableBeforeUnload: () => dirtyRef.current,
    withResolver: true,
  })

  const edit = useCallback((update: Draft | ((d: Draft) => Draft)) => {
    setNotice(null)
    setDraft(update)
  }, [])
  const focused = useCallback(() => setFocus(null), [])

  function select(next: Selection) {
    setSelection(next)
    setFocus(next)
  }

  function placeTable(tableId: string) {
    const next = place(draft, tableId)
    const s: Selection = { type: 'table', id: tableId }
    edit(next)
    select(s)
    say(describe.item(next, s))
  }

  function addOne(kind: DecorationKind) {
    const { draft: next, id } = addDecoration(draft, kind)
    const s: Selection = { type: 'decoration', id }
    edit(next)
    select(s)
    say(describe.item(next, s))
  }

  /** Starts again from layout, as the server has it now. */
  function reset(next: Draft) {
    setBase(next)
    setDraft(next)
    setSelection(null)
  }

  async function submit() {
    setError(null)
    setNotice(null)
    setStale(false)
    try {
      const saved = await save.mutateAsync(toLayoutInput(draft))
      const next = draftFromLayout(saved)
      setBase(next)
      setDraft(next)
      // Decorations take new IDs from the saved order.
      setSelection((s) => (s?.type === 'table' ? s : null))
      setNotice(t('editor.saved'))
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'layout_changed') setStale(true)
      else setError(apiErrorMessage(tCommon, caught))
    }
  }

  async function reload() {
    const fresh = await queryClient.fetchQuery({ ...layoutQuery(oid, aid), staleTime: 0 })
    reset(draftFromLayout(fresh))
    setStale(false)
    setNotice(t('editor.reloaded'))
  }

  const overlapNames = draft.tables
    .filter((table) => overlaps.has(table.tableId))
    .map((table) => table.name)
    .join(', ')

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/tables" params={{ oid }} search={{ area: aid }}>
            {t('back')}
          </BackLink>
        }
        title={t('editor.title', { area: layout.area.name })}
        description={wide ? t('editor.intro') : undefined}
        actions={
          wide && (
            <>
              {dirty ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" className="h-11">
                      {t('editor.discard')}
                    </Button>
                  }
                  title={t('editor.discardTitle')}
                  description={t('editor.discardBody')}
                  confirmLabel={t('editor.discard')}
                  destructive
                  onConfirm={async () => {
                    reset(base)
                    setNotice(null)
                  }}
                />
              ) : (
                <Button variant="outline" className="h-11" disabled>
                  {t('editor.discard')}
                </Button>
              )}
              <Button
                className="h-11"
                disabled={!dirty || overlaps.size > 0 || save.isPending}
                onClick={() => void submit()}
              >
                <SaveIcon aria-hidden="true" />
                {save.isPending ? tCommon('actions.saving') : t('editor.save')}
              </Button>
            </>
          )
        }
      />

      {!wide ? (
        <p className="rounded-card border border-outline p-6 text-on-surface-variant">{t('editor.narrow')}</p>
      ) : (
        <>
          {notice && <FormNotice>{notice}</FormNotice>}
          {error && <FormAlert>{error}</FormAlert>}
          {stale && (
            <FormAlert className="grid justify-items-start gap-3">
              <p>{tCommon('apiError.layout_changed')}</p>
              <Button variant="outline" className="h-11" onClick={() => void reload()}>
                {t('editor.reload')}
              </Button>
            </FormAlert>
          )}
          {overlaps.size > 0 && <FormAlert>{t('editor.overlap', { names: overlapNames })}</FormAlert>}
          {dirty && !stale && <p className="text-label-md text-on-surface-variant">{t('editor.unsaved')}</p>}

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="grid gap-2">
              <LayoutCanvas
                label={t('editor.canvas', { area: layout.area.name })}
                draft={draft}
                capacity={(id) => seats.get(id) ?? null}
                selection={selection}
                overlaps={overlaps}
                focus={focus}
                onDraft={edit}
                onSelect={setSelection}
                onSay={say}
                onFocused={focused}
              />
              <p id="layout-keys" className="text-label-md text-on-surface-variant">
                {t('editor.keys')}
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
              <LayoutInspector draft={draft} selection={selection} onDraft={edit} onSelect={setSelection} onSay={say} />
              <LayoutPalette draft={draft} onPlace={placeTable} onAdd={addOne} />
            </div>
          </div>
          <p role="status" className="sr-only">
            {said}
          </p>
        </>
      )}

      <AlertDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('editor.leaveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('editor.leaveBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" onClick={() => blocker.reset?.()}>
              {t('editor.stay')}
            </AlertDialogCancel>
            <Button variant="destructive" className="h-11" onClick={() => blocker.proceed?.()}>
              {t('editor.leave')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
