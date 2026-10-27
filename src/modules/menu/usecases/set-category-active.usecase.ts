import * as categoryRepository from '../repositories/category.repository'
import type { Category } from '../types'

export function setCategoryActive(outletId: string, categoryId: string, active: boolean): Promise<Category> {
  return categoryRepository.setCategoryActive(outletId, categoryId, active)
}
