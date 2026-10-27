import { useEffect, useRef, type DragEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { DecorationMark, FloorGrid, TableMark } from '@/components/table/table-floor'

import { itemId, PALETTE_TYPE, useDescribe, type PaletteItem } from './layout-editor'
import { FLOOR, GRID, NEW_BOX_SIZE, type Box, type Draft, type Selection } from '@/modules/table/types'
import { addDecoration } from '@/modules/table/usecases/add-decoration.usecase'
import { boxOf } from '@/modules/table/usecases/find-layout-item.usecase'
import { moveBy } from '@/modules/table/usecases/move-layout-item.usecase'
import { place } from '@/modules/table/usecases/place-table.usecase'
import { removeDecoration } from '@/modules/table/usecases/remove-decoration.usecase'
import { resizeBy, resizeTo } from '@/modules/table/usecases/resize-layout-item.usecase'
import { rotate } from '@/modules/table/usecases/rotate-layout-item.usecase'
import { setBox } from '@/modules/table/usecases/set-layout-box.usecase'
import { unplace } from '@/modules/table/usecases/unplace-table.usecase'

type Drag = { kind: 'move' | 'resize'; selection: Selection; pointerId: number; x: number; y: number; box: Box }

/**
 * The layout editor's canvas: the area's grid with its decorations and
 * placed tables, every one a button. A box moves by dragging it, and its
 * size by dragging its corner, a cell at a time; the keyboard does the same
 * on the one focused (arrows move it, Shift+arrows resize it, R turns it,
 * Delete takes it off). The palette's items drop onto it.
 */
export function LayoutCanvas({
  label,
  draft,
  capacity,
  selection,
  overlaps,
  focus,
  onDraft,
  onSelect,
  onSay,
  onFocused,
}: {
  label: string
  draft: Draft
  /** The tables' seats, to draw. */
  capacity: (tableId: string) => number | null
  selection: Selection | null
  /** The tables on top of another, by ID. */
  overlaps: Set<string>
  /** An item to focus once it's drawn, such as one just placed. */
  focus: Selection | null
  onDraft: (update: Draft | ((draft: Draft) => Draft)) => void
  onSelect: (selection: Selection | null) => void
  /** Says a change in words, for whoever can't see it. */
  onSay: (text: string) => void
  onFocused: () => void
}) {
  const { t } = useTranslation('table')
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag | null>(null)
  const describe = useDescribe()

  useEffect(() => {
    if (!focus) return
    const element = document.getElementById(itemId(focus))
    if (element instanceof SVGElement) {
      element.focus()
      onFocused()
    }
  }, [focus, draft, onFocused])

  /** How many px of the screen a cell takes now: the canvas scales to its width. */
  function cellPx() {
    const rect = svg.current?.getBoundingClientRect()
    return rect && rect.width > 0 ? rect.width / GRID.width : FLOOR.cell
  }

  /** The cell under a point of the screen. */
  function cellAt(clientX: number, clientY: number) {
    const rect = svg.current?.getBoundingClientRect()
    const px = cellPx()
    return { x: Math.floor((clientX - (rect?.left ?? 0)) / px), y: Math.floor((clientY - (rect?.top ?? 0)) / px) }
  }

  function startDrag(event: PointerEvent, selection: Selection, kind: Drag['kind']) {
    if (event.button !== 0) return
    const box = boxOf(draft, selection)
    if (!box) return
    event.preventDefault()
    event.stopPropagation()
    onSelect(selection)
    document.getElementById(itemId(selection))?.focus()
    drag.current = { kind, selection, pointerId: event.pointerId, x: event.clientX, y: event.clientY, box }
    svg.current?.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    const px = cellPx()
    const dx = Math.round((event.clientX - d.x) / px)
    const dy = Math.round((event.clientY - d.y) / px)
    onDraft((current) =>
      d.kind === 'move'
        ? setBox(current, d.selection, { ...d.box, x: d.box.x + dx, y: d.box.y + dy })
        : resizeTo(current, d.selection, d.box.w + dx, d.box.h + dy),
    )
  }

  function endDrag(event: PointerEvent) {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    drag.current = null
    svg.current?.releasePointerCapture?.(event.pointerId)
  }

  function onKeyDown(event: KeyboardEvent, selection: Selection) {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const step = steps[event.key]
    let next: Draft
    if (step) {
      next = event.shiftKey ? resizeBy(draft, selection, ...step) : moveBy(draft, selection, ...step)
    } else if (event.key === 'r' || event.key === 'R') {
      next = rotate(draft, selection)
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onDraft(selection.type === 'table' ? unplace(draft, selection.id) : removeDecoration(draft, selection.id))
      onSelect(null)
      onSay(t(selection.type === 'table' ? 'editor.unplaced' : 'editor.removed', { name: describe.name(draft, selection) }))
      svg.current?.focus()
      return
    } else if (event.key === 'Escape') {
      onSelect(null)
      return
    } else {
      return
    }
    event.preventDefault()
    onSelect(selection)
    onDraft(next)
    onSay(describe.item(next, selection))
  }

  function onDragOver(event: DragEvent) {
    if (!event.dataTransfer.types.includes(PALETTE_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function onDrop(event: DragEvent) {
    const raw = event.dataTransfer.getData(PALETTE_TYPE)
    if (!raw) return
    event.preventDefault()
    const item = JSON.parse(raw) as PaletteItem
    const cell = cellAt(event.clientX, event.clientY)
    const size =
      item.type === 'table'
        ? NEW_BOX_SIZE[draft.tables.find((table) => table.tableId === item.id)?.shape ?? 'square']
        : NEW_BOX_SIZE[item.kind]
    // Centred on the point it's dropped at.
    const at = { x: cell.x - Math.floor(size.w / 2), y: cell.y - Math.floor(size.h / 2) }
    let next: Draft
    let selection: Selection
    if (item.type === 'table') {
      next = place(draft, item.id, at)
      selection = { type: 'table', id: item.id }
    } else {
      const added = addDecoration(draft, item.kind, at)
      next = added.draft
      selection = { type: 'decoration', id: added.id }
    }
    onDraft(next)
    onSelect(selection)
    onSay(describe.item(next, selection))
  }

  const selected = (s: Selection) => selection?.type === s.type && selection.id === s.id
  const handle = selection ? boxOf(draft, selection) : null

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${GRID.width * FLOOR.cell} ${GRID.height * FLOOR.cell}`}
      role="group"
      aria-label={label}
      tabIndex={-1}
      className="h-auto w-full touch-none rounded-card border border-outline outline-none select-none"
      onPointerDown={(event) => {
        if (event.button === 0) onSelect(null)
      }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <FloorGrid>
        {draft.decorations.map((decoration) => {
          const s: Selection = { type: 'decoration', id: decoration.id }
          return (
            <g
              key={decoration.id}
              id={itemId(s)}
              role="button"
              tabIndex={0}
              aria-label={describe.item(draft, s)}
              aria-pressed={selected(s)}
              aria-describedby="layout-keys"
              className="cursor-move outline-none"
              onPointerDown={(event) => startDrag(event, s, 'move')}
              onKeyDown={(event) => onKeyDown(event, s)}
              onFocus={() => onSelect(s)}
            >
              <DecorationMark
                decoration={{ kind: decoration.kind, ...decoration.box, rotation: decoration.rotation }}
                selected={selected(s)}
              />
            </g>
          )
        })}
        {draft.tables.map((table) => {
          if (!table.box) return null
          const s: Selection = { type: 'table', id: table.tableId }
          return (
            <g
              key={table.tableId}
              id={itemId(s)}
              role="button"
              tabIndex={0}
              aria-label={describe.item(draft, s)}
              aria-pressed={selected(s)}
              aria-describedby="layout-keys"
              className="cursor-move outline-none"
              onPointerDown={(event) => startDrag(event, s, 'move')}
              onKeyDown={(event) => onKeyDown(event, s)}
              onFocus={() => onSelect(s)}
            >
              <TableMark
                table={{ name: table.name, shape: table.shape, capacity: capacity(table.tableId), box: table.box }}
                status="available"
                selected={selected(s)}
                warn={overlaps.has(table.tableId)}
              />
            </g>
          )
        })}
        {selection && handle && (
          // The corner that resizes the selection; the keyboard has Shift+arrows.
          <rect
            aria-hidden="true"
            x={(handle.x + handle.w) * FLOOR.cell - 8}
            y={(handle.y + handle.h) * FLOOR.cell - 8}
            width={12}
            height={12}
            rx={2}
            className="cursor-nwse-resize fill-primary-strong stroke-surface"
            strokeWidth={2}
            onPointerDown={(event) => startDrag(event, selection, 'resize')}
          />
        )}
      </FloorGrid>
    </svg>
  )
}
