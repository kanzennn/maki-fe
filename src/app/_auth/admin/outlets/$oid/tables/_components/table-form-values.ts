import type { Table, TableFormValues } from '@/modules/table/types'

/** The table form's starting values: a table's, or a new one's in the area. */
export function tableFormValues(table?: Table, areaId = ''): TableFormValues {
  return {
    name: table?.name ?? '',
    area_id: table?.area.area_id ?? areaId,
    capacity: table?.capacity != null ? String(table.capacity) : '',
    shape: table?.shape ?? 'square',
    is_active: table?.is_active ?? true,
  }
}
