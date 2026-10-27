import * as areaRepository from '../repositories/area.repository'
import type { Area, AreaFormValues } from '../types'
import { validateAreaForm } from '../validations/table.validation'

export function updateArea(outletId: string, areaId: string, values: AreaFormValues): Promise<Area> {
  return areaRepository.updateArea(outletId, areaId, validateAreaForm(values))
}
