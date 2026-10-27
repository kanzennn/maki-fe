import * as categoryRepository from '../repositories/category.repository'

export function deleteCategory(outletId: string, categoryId: string): Promise<void> {
  return categoryRepository.deleteCategory(outletId, categoryId)
}
