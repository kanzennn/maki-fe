import { useId, type ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

type TextareaFieldProps = ComponentProps<typeof Textarea> & {
  label: string
  /** Shown under the field, and announced with it. */
  error?: string
  hint?: string
}

/** A labelled text area, like FormField, for text that runs over a line. */
export function TextareaField({ label, error, hint, id, className, ...textarea }: TextareaFieldProps) {
  const generated = useId()
  const fieldId = id ?? generated
  const describedBy = [error && `${fieldId}-error`, hint && `${fieldId}-hint`].filter(Boolean).join(' ')

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={fieldId} className="text-title-md">
        {label}
      </Label>
      <Textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn('min-h-20 text-body-md', className)}
        {...textarea}
      />
      {hint && (
        <p id={`${fieldId}-hint`} className="text-label-md text-on-surface-variant">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="text-label-md text-error">
          {error}
        </p>
      )}
    </div>
  )
}
