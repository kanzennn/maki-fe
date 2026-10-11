import { MinusIcon, PlusIcon } from 'lucide-react'
import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

const MIN = 1
const MAX = 3
const STEP = 0.5
/** How far a pointer moves before it pans instead of tapping, in px. */
const SLOP = 6

const clampScale = (scale: number) => Math.min(Math.max(scale, MIN), MAX)

/**
 * A drawing too detailed for a phone at its width, such as a table layout
 * (DESIGN.md: "read-only, with pan and pinch-to-zoom"): never narrower than
 * minWidth px, it pans with a finger or the mouse, zooms with two fingers or
 * the buttons, and scrolls as any box does. A tap still reaches what's
 * under it; a drag doesn't.
 */
export function ZoomPan({
  children,
  minWidth,
  label,
  className,
}: {
  children: ReactNode
  minWidth: number
  /** What is zoomed, for the buttons: "layout". */
  label: string
  className?: string
}) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(MIN)
  // The scale now, for a gesture between renders.
  const current = useRef(MIN)
  // The pointers down, and how the gesture started.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ distance: number; scale: number; x: number; y: number; moved: boolean } | null>(null)
  const panned = useRef(false)

  /** To scale, keeping the point at (x, y) of the box where it is. */
  function zoomTo(next: number, x?: number, y?: number) {
    const el = box.current
    const to = clampScale(next)
    if (!el || to === current.current) return
    const px = x ?? el.clientWidth / 2
    const py = y ?? el.clientHeight / 2
    const ratio = to / current.current
    current.current = to
    setScale(to)
    // After the content has its new size.
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollLeft + px) * ratio - px
      el.scrollTop = (el.scrollTop + py) * ratio - py
    })
  }

  function spread() {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function onPointerDown(event: PointerEvent) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    panned.current = false
    if (pointers.current.size === 2) {
      gesture.current = { distance: spread(), scale: current.current, x: 0, y: 0, moved: true }
    } else if (pointers.current.size === 1) {
      gesture.current = { distance: 0, scale: current.current, x: event.clientX, y: event.clientY, moved: false }
    }
  }

  function onPointerMove(event: PointerEvent) {
    const el = box.current
    const last = pointers.current.get(event.pointerId)
    const g = gesture.current
    if (!el || !last || !g) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size >= 2) {
      const rect = el.getBoundingClientRect()
      const [a, b] = [...pointers.current.values()]
      zoomTo((g.scale * spread()) / g.distance, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top)
      panned.current = true
      return
    }
    if (!g.moved && Math.hypot(event.clientX - g.x, event.clientY - g.y) < SLOP) return
    g.moved = true
    panned.current = true
    el.scrollLeft -= event.clientX - last.x
    el.scrollTop -= event.clientY - last.y
  }

  function onPointerUp(event: PointerEvent) {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size === 0) gesture.current = null
    else if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()]
      gesture.current = { distance: 0, scale: current.current, x: p.x, y: p.y, moved: true }
    }
  }

  /** A drag that panned isn't a tap on what it started on. */
  function onClickCapture(event: MouseEvent) {
    if (!panned.current) return
    panned.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-11"
          aria-label={t('zoom.out', { what: label })}
          disabled={scale <= MIN}
          onClick={() => zoomTo(scale - STEP)}
        >
          <MinusIcon aria-hidden="true" className="size-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-11"
          aria-label={t('zoom.in', { what: label })}
          disabled={scale >= MAX}
          onClick={() => zoomTo(scale + STEP)}
        >
          <PlusIcon aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <div
        ref={box}
        data-scale={scale}
        className="max-h-[70dvh] touch-none overflow-auto overscroll-contain rounded-card"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <div style={{ width: `calc(max(100%, ${minWidth}px) * ${scale})` }}>{children}</div>
      </div>
    </div>
  )
}
