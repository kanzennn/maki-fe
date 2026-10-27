import { useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { useFieldError } from '@/hooks/use-field-error'
import { apiErrorMessage } from '@/lib/api-error-message'
import { placeFieldErrors } from '@/components/shared/form-errors'
import { Button } from '@/components/shared/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared/dialog'

import { useCreateCategory, useUpdateCategory } from '@/hooks/menu/menu.queries'
import { validationResolver } from '@/hooks/validation-resolver'
import { categoryFields, type Category, type CategoryFormValues } from '@/modules/menu/types'
import { validateCategoryForm } from '@/modules/menu/validations/category.validation'

/** The category form's starting values: a category's, or a new one's. */
const categoryValues = (category?: Category): CategoryFormValues => ({
  name: category?.name ?? '',
  icon: category?.icon ?? '',
})
import { EmojiPicker } from './emoji-picker'

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
  const form = useForm<CategoryFormValues>({
    resolver: validationResolver(validateCategoryForm),
    defaultValues: categoryValues(category),
  })
  const { errors, isSubmitting } = form.formState

  async function submit(values: CategoryFormValues) {
    setError(null)
    const name = values.name.trim()
    try {
      await (category ? update.mutateAsync(values) : create.mutateAsync(values))
      setOpen(false)
      onDone(category ? t('categories.form.saved', { name }) : t('categories.form.created', { name }))
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
