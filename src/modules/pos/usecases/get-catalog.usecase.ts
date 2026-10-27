import * as catalogRepository from '../repositories/catalog.repository'
import type { PosCatalog } from '../types'

/**
 * What the cashier sells from. The stock in it is as it was when loaded;
 * the server checks each sale against the stock as it is.
 */
export function getCatalog(outletId: string): Promise<PosCatalog> {
  return catalogRepository.getCatalog(outletId)
}
