import * as areaRepository from '../repositories/area.repository'
import type { Area, AreaFormValues } from '../types'
import { validateAreaForm } from '../validations/table.validation'

/** Adds an area: it goes last in the order, with an empty canvas. */
export function createArea(outletId: string, values: AreaFormValues): Promise<Area> {
  return areaRepository.createArea(outletId, validateAreaForm(values))
}
