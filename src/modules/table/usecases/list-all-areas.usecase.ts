import * as areaRepository from '../repositories/area.repository'
import type { Area } from '../types'

/**
 * Every area of an outlet, in order: the API's largest page, which an
 * outlet's areas don't fill. Reordering needs them all.
 */
export async function listAllAreas(outletId: string): Promise<Area[]> {
  return (await areaRepository.listAreas(outletId, { page_size: 100 })).items
}
