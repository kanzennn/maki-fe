import * as categoryRepository from '../repositories/category.repository'
import type { Category, CategoryFormValues } from '../types'
import { validateCategoryForm } from '../validations/category.validation'

export function createCategory(outletId: string, values: CategoryFormValues): Promise<Category> {
  return categoryRepository.createCategory(outletId, validateCategoryForm(values))
}
