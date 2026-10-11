import { useId, type ComponentProps } from 'react'

import { Label } from '@/shared/ui/label'
import { NativeSelect } from '@/shared/ui/native-select'

type SelectFieldProps = ComponentProps<'select'> & {
  label: string
  /** Shown under the field, and announced with it. */
  error?: string
  hint?: string
}

/**
 * A labelled select, like FormField: the native control, which phones show
 * as their own picker, with its error and hint tied to it.
 */
export function SelectField({ label, error, hint, id, children, ...select }: SelectFieldProps) {
  const generated = useId()
  const selectId = id ?? generated
  const describedBy = [error && `${selectId}-error`, hint && `${selectId}-hint`].filter(Boolean).join(' ')

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={selectId} className="text-title-md">
        {label}
      </Label>
      <NativeSelect
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="w-full"
        {...select}
      >
        {children}
      </NativeSelect>
      {hint && (
        <p id={`${selectId}-hint`} className="text-label-md text-on-surface-variant">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${selectId}-error`} className="text-label-md text-error">
          {error}
        </p>
      )}
    </div>
  )
}
