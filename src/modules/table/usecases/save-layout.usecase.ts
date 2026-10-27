import * as areaRepository from '../repositories/area.repository'
import type { Draft, Layout } from '../types'
import { validateLayout } from '../validations/layout.validation'

/** Saves an area's whole layout, on the version the editor opened; not while placed tables overlap. */
export function saveLayout(outletId: string, areaId: string, draft: Draft): Promise<Layout> {
  return areaRepository.saveLayout(outletId, areaId, validateLayout(draft))
}
