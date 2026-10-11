import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/shared/api/client'
import { FormField } from '@/shared/components/FormField'
import { FormAlert } from '@/shared/components/FormMessage'
import { useFieldError } from '@/shared/hooks/useFieldError'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { placeFieldErrors } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'

import { useCreateCategory, useUpdateCategory, type Category } from '../api'
import { categoryFields, categorySchema, categoryValues, toCategoryInput, type CategoryValues } from '../schemas'
import { EmojiPicker } from './EmojiPicker'

/** A new category, or a change to one: its name and its emoji. */
export function CategoryDialog({
  outletId,
  category,
  trigger,
  onDone,
}: {
  outletId: string
  /** The category to change; none for a new one. */
  category?: Category
  trigger: ReactNode
  onDone: (notice: string) => void
}) {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const create = useCreateCategory(outletId)
  const update = useUpdateCategory(outletId, category?.category_id ?? '')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<CategoryValues>({ resolver: zodResolver(categorySchema), defaultValues: categoryValues(category) })
  const { errors, isSubmitting } = form.formState

  async function submit(values: CategoryValues) {
    setError(null)
    const input = toCategoryInput(values)
    try {
      await (category ? update.mutateAsync(input) : create.mutateAsync(input))
      setOpen(false)
      onDone(category ? t('categories.form.saved', { name: input.name }) : t('categories.form.created', { name: input.name }))
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'category_name_taken') {
        form.setError('name', { type: 'api', message: apiErrorMessage(tCommon, caught) }, { shouldFocus: true })
      } else if (!placeFieldErrors(caught, categoryFields, form.setError)) {
        setError(apiErrorMessage(tCommon, caught))
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
        form.reset(categoryValues(category))
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {/* The fields' hints say what they need; there's nothing more to describe. */}
      <DialogContent aria-describedby={undefined}>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {category ? t('categories.form.editTitle', { name: category.name }) : t('categories.form.createTitle')}
            </DialogTitle>
          </DialogHeader>
          {error && <FormAlert>{error}</FormAlert>}
          <FormField
            label={t('categories.fields.name')}
            hint={t('categories.nameHint')}
            autoComplete="off"
            error={fieldError(errors.name)}
            {...form.register('name')}
          />
          <Controller
            name="icon"
            control={form.control}
            render={({ field }) => (
              <EmojiPicker
                value={field.value}
                onChange={field.onChange}
                error={fieldError(errors.icon)}
              />
            )}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11">
                {tCommon('actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" className="h-11" disabled={isSubmitting}>
              {isSubmitting ? tCommon('actions.saving') : t('categories.form.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
