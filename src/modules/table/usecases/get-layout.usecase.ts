import * as areaRepository from '../repositories/area.repository'
import type { Layout } from '../types'

/** An area's canvas: its decorations, and its tables with their statuses. */
export function getLayout(outletId: string, areaId: string): Promise<Layout> {
  return areaRepository.getLayout(outletId, areaId)
}
