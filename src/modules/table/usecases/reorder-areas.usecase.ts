import * as areaRepository from '../repositories/area.repository'

/**
 * Puts the areas in the order of areaIds, which lists every one of them
 * once. A 409 areas_changed means one was added or deleted meanwhile.
 */
export function reorderAreas(outletId: string, areaIds: string[]): Promise<void> {
  return areaRepository.reorderAreas(outletId, areaIds)
}
