import * as categoryRepository from '../repositories/category.repository'
import type { Category } from '../types'

/**
 * Every category of an outlet, in the cashier's order: the API's largest
 * page, which an outlet's categories don't fill. Reordering needs them all.
 */
export async function listAllCategories(outletId: string): Promise<Category[]> {
  return (await categoryRepository.listCategories(outletId, { page_size: 100 })).items
}
