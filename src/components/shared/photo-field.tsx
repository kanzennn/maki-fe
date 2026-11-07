import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { noPhotoChange, uploadContentTypes, type PhotoChoice } from '@/modules/upload/types'
import { photoProblem } from '@/modules/upload/validations/photo.validation'

import { Button } from './button'
import { Photo } from './photo'

/**
 * Picks a photo for a form to save, or takes the one there away. Nothing
 * uploads until the form is saved, and the worker then takes a few seconds, so
 * the hint says the old photo stays until it is done.
 */
export function PhotoField({
  label,
  currentUrl,
  fallback,
  round = false,
  value,
  onChange,
}: {
  label: string
  currentUrl?: string | null
  /** Shown without a photo: the category's icon, a name's initials. */
  fallback: ReactNode
  round?: boolean
  value: PhotoChoice
  onChange: (next: PhotoChoice) => void
}) {
  const { t } = useTranslation()
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<'type' | 'size' | null>(null)
  // An address for showing the file picked, which isn't uploaded yet.
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  const previewUrl = useRef<string | null>(null)
  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    },
    [],
  )
  const fileUrl = value.file && preview?.file === value.file ? preview.url : null
  const shown = fileUrl ?? (value.removed ? null : currentUrl)
  const changed = value.file !== null || value.removed

  function pick(file: File | undefined) {
    if (!file) return
    const found = photoProblem(file)
    setProblem(found)
    if (!found) {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
      previewUrl.current = URL.createObjectURL(file)
      setPreview({ file, url: previewUrl.current })
      onChange({ file, removed: false })
    }
    // The same file may be picked again after going back.
    if (input.current) input.current.value = ''
  }

  return (
    <div className="grid content-start gap-2">
      <label htmlFor={inputId} className="text-title-md text-on-surface">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'grid size-24 shrink-0 place-items-center overflow-hidden border border-outline bg-surface-container',
            round ? 'rounded-full' : 'rounded-card',
          )}
        >
          <Photo url={shown} fallback={fallback} />
        </span>
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => input.current?.click()}>
              {shown ? t('photo.change') : t('photo.choose')}
            </Button>
            {changed ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => {
                  setProblem(null)
                  onChange(noPhotoChange)
                }}
              >
                {t('photo.undo')}
              </Button>
            ) : (
              currentUrl && (
                <Button type="button" variant="outline" className="h-11" onClick={() => onChange({ file: null, removed: true })}>
                  {t('photo.remove')}
                </Button>
              )
            )}
          </div>
          <input
            ref={input}
            id={inputId}
            type="file"
            accept={uploadContentTypes.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-describedby={`${inputId}-hint`}
            onChange={(event) => pick(event.target.files?.[0])}
          />
          <p id={`${inputId}-hint`} className="text-label-md text-on-surface-variant">
            {t('photo.hint')}
          </p>
          {problem && (
            <p role="alert" className="text-label-md text-error">
              {t(`photo.problem.${problem}`)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
