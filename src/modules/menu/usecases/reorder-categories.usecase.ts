import * as categoryRepository from '../repositories/category.repository'

/**
 * Puts every category of the outlet in the order given. A 409
 * categories_changed means one was added or deleted meanwhile.
 */
export function reorderCategories(outletId: string, categoryIds: string[]): Promise<void> {
  return categoryRepository.reorderCategories(outletId, categoryIds)
}
