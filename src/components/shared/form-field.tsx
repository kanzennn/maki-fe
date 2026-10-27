import { useId, type ComponentProps } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormFieldProps = ComponentProps<typeof Input> & {
  label: string
  /** Shown under the field, and announced with it. */
  error?: string
  hint?: string
}

/**
 * A labelled text field. Its error and hint are tied to the input with
 * aria-describedby, so a screen reader reads them with the field. 44px high:
 * the sign-in screens are used on tablets too.
 */
export function FormField({ label, error, hint, id, className, ...input }: FormFieldProps) {
  const generated = useId()
  const inputId = id ?? generated
  const describedBy = [error && `${inputId}-error`, hint && `${inputId}-hint`].filter(Boolean).join(' ')

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={inputId} className="text-title-md">
        {label}
      </Label>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={['h-11 text-body-md', className].filter(Boolean).join(' ')}
        {...input}
      />
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
