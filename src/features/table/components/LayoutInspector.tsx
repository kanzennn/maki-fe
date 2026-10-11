import { LogOutIcon, RotateCwIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from '@/shared/components/PageHeading'
import { SelectField } from '@/shared/components/SelectField'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

import { tableShapes, type TableShape } from '../api'
import { useDescribe } from '../editor'
import {
  boxOf,
  GRID,
  removeDecoration,
  rotate,
  rotateTo,
  setBox,
  setShape,
  TABLE_SIDE,
  unplace,
  type Draft,
  type Rotation,
  type Selection,
} from '../layout'

const rotations = [0, 90, 180, 270] as const satisfies readonly Rotation[]

/**
 * The selected table's or decoration's properties, typed: its cell, size,
 * turn and, for a table, shape. Each change keeps it on the grid and within
 * its sides, as dragging does.
 */
export function LayoutInspector({
  draft,
  selection,
  onDraft,
  onSelect,
  onSay,
}: {
  draft: Draft
  selection: Selection | null
  onDraft: (draft: Draft) => void
  onSelect: (selection: Selection | null) => void
  onSay: (text: string) => void
}) {
  const { t } = useTranslation('table')
  const describe = useDescribe()
  const box = selection ? boxOf(draft, selection) : null
  const table = selection?.type === 'table' ? draft.tables.find((t) => t.tableId === selection.id) : undefined
  const decoration =
    selection?.type === 'decoration' ? draft.decorations.find((d) => d.id === selection.id) : undefined

  if (!selection || !box || !(table || decoration)) {
    return (
      <section aria-labelledby="inspector" className="grid content-start gap-3">
        <SectionHeading id="inspector">{t('editor.properties')}</SectionHeading>
        <p className="text-body-md text-on-surface-variant">{t('editor.nothingSelected')}</p>
      </section>
    )
  }

  const rotation = (table ?? decoration)!.rotation
  const limits = table ? { min: TABLE_SIDE.min, w: TABLE_SIDE.max, h: TABLE_SIDE.max } : { min: 1, w: GRID.width, h: GRID.height }
  const change = (next: Draft) => {
    onDraft(next)
    onSay(describe.item(next, selection))
  }

  return (
    <section aria-labelledby="inspector" className="grid content-start gap-4">
      <SectionHeading id="inspector">{describe.name(draft, selection)}</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <CellField label={t('editor.x')} value={box.x} min={0} max={GRID.width - box.w} onCommit={(x) => change(setBox(draft, selection, { ...box, x }))} />
        <CellField label={t('editor.y')} value={box.y} min={0} max={GRID.height - box.h} onCommit={(y) => change(setBox(draft, selection, { ...box, y }))} />
        <CellField label={t('editor.w')} value={box.w} min={limits.min} max={limits.w} onCommit={(w) => change(setBox(draft, selection, { ...box, w }))} />
        <CellField label={t('editor.h')} value={box.h} min={limits.min} max={limits.h} onCommit={(h) => change(setBox(draft, selection, { ...box, h }))} />
      </div>
      <p className="text-label-md text-on-surface-variant">{table ? t('editor.tableSides') : t('editor.decorationSides')}</p>
      <SelectField
        label={t('editor.rotation')}
        value={rotation}
        onChange={(event) => change(rotateTo(draft, selection, Number(event.target.value) as Rotation))}
      >
        {rotations.map((r) => (
          <option key={r} value={r}>
            {t('editor.degrees', { value: r })}
          </option>
        ))}
      </SelectField>
      {table && (
        <SelectField
          label={t('fields.shape')}
          value={table.shape}
          onChange={(event) => change(setShape(draft, table.tableId, event.target.value as TableShape))}
        >
          {tableShapes.map((shape) => (
            <option key={shape} value={shape}>
              {t(`shape.${shape}`)}
            </option>
          ))}
        </SelectField>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11" onClick={() => change(rotate(draft, selection))}>
          <RotateCwIcon aria-hidden="true" />
          {t('editor.rotate')}
        </Button>
        <Button
          variant="outline"
          className="h-11 text-error"
          onClick={() => {
            const name = describe.name(draft, selection)
            onDraft(table ? unplace(draft, table.tableId) : removeDecoration(draft, selection.id))
            onSelect(null)
            onSay(t(table ? 'editor.unplaced' : 'editor.removed', { name }))
          }}
        >
          {table ? <LogOutIcon aria-hidden="true" /> : <Trash2Icon aria-hidden="true" />}
          {table ? t('editor.unplace') : t('editor.remove')}
        </Button>
      </div>
    </section>
  )
}

/**
 * A whole number of cells, typed. It takes effect as it's typed, kept on
 * the grid and within the box's sides as dragging is; anything else waits.
 * Once left, the field shows the box's own value again.
 */
function CellField({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  onCommit: (value: number) => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(String(value))

  // The box changed elsewhere (a drag, a key): show it, unless it's being typed.
  useEffect(() => {
    if (document.activeElement !== input.current) setText(String(value))
  }, [value])

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id} className="text-title-md">
        {label}
      </Label>
      <Input
        ref={input}
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={text}
        className="h-11 text-body-md"
        onChange={(event) => {
          setText(event.target.value)
          const n = Number(event.target.value)
          if (event.target.value !== '' && Number.isInteger(n) && n !== value) onCommit(n)
        }}
        onBlur={() => setText(String(value))}
      />
    </div>
  )
}
