import * as areaRepository from '../repositories/area.repository'

/** Deletes an area that holds no table. */
export function deleteArea(outletId: string, areaId: string): Promise<void> {
  return areaRepository.deleteArea(outletId, areaId)
}
