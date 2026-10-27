import { useId, useLayoutEffect, useRef, type ComponentProps, type Ref } from 'react'
import { useTranslation } from 'react-i18next'

import { groupDigits } from '@/lib/number'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type NumberFieldProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type' | 'ref'> & {
  label: string
  /** Shown under the field, and announced with it. */
  error?: string
  hint?: string
  /** The digits, without separators; '' for none. */
  value: string
  onChange: (digits: string) => void
  /** Shown before the number, such as "Rp". */
  prefix?: string
  /** The most digits it takes. */
  maxDigits?: number
  ref?: Ref<HTMLInputElement>
}

/**
 * A whole number, shown with the language's thousands separators as it is
 * typed (25.000 / 25,000) while the form keeps the digits alone. Anything
 * but digits is dropped, and the caret stays after the digit it was after.
 * Otherwise a FormField: its label, and its error and hint tied to it.
 */
export function NumberField({
  label,
  error,
  hint,
  value,
  onChange,
  prefix,
  maxDigits = 9,
  id,
  className,
  ref,
  ...input
}: NumberFieldProps) {
  const { i18n } = useTranslation()
  const generated = useId()
  const inputId = id ?? generated
  const describedBy = [error && `${inputId}-error`, hint && `${inputId}-hint`].filter(Boolean).join(' ')
  const own = useRef<HTMLInputElement | null>(null)
  // The digits before the caret after the last change, to put it back there
  // once the separators have moved.
  const caret = useRef<number | null>(null)
  const shown = groupDigits(value, i18n.language)

  useLayoutEffect(() => {
    const field = own.current
    if (caret.current === null || field === null || document.activeElement !== field) return
    let position = 0
    for (let seen = 0; position < shown.length && seen < caret.current; position++) {
      if (/\d/.test(shown[position])) seen++
    }
    field.setSelectionRange(position, position)
    caret.current = null
  })

  function change(text: string, selection: number | null) {
    const digits = text
      .replace(/\D/g, '')
      .replace(/^0+(?=\d)/, '')
      .slice(0, maxDigits)
    caret.current = Math.min(text.slice(0, selection ?? text.length).replace(/\D/g, '').length, digits.length)
    onChange(digits)
  }

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={inputId} className="text-title-md">
        {label}
      </Label>
      <div className="relative">
        {prefix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body-md text-on-surface-variant"
          >
            {prefix}
          </span>
        )}
        <Input
          {...input}
          ref={(node) => {
            own.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={shown}
          onChange={(e) => change(e.target.value, e.target.selectionStart)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn('h-11 text-body-md', prefix && 'pl-10', className)}
        />
      </div>
      {hint && (
        <p id={`${inputId}-hint`} className="text-label-md text-on-surface-variant">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-label-md text-error">
          {error}
        </p>
      )}
    </div>
  )
}
