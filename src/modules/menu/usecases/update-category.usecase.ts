import * as categoryRepository from '../repositories/category.repository'
import type { Category, CategoryFormValues } from '../types'
import { validateCategoryForm } from '../validations/category.validation'

export function updateCategory(outletId: string, categoryId: string, values: CategoryFormValues): Promise<Category> {
  return categoryRepository.updateCategory(outletId, categoryId, validateCategoryForm(values))
}
