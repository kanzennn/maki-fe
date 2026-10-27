import * as tableRepository from '../repositories/table.repository'
import type { Table } from '../types'

/**
 * Every table of an outlet, by area and then by name, a page of the most
 * there is at a time: a schedule picks from all of them.
 */
export async function listAllTables(outletId: string): Promise<Table[]> {
  const tables: Table[] = []
  for (let page = 1; ; page++) {
    const list = await tableRepository.listTables(outletId, { page, page_size: 100 })
    tables.push(...list.items)
    if (tables.length >= list.total || list.items.length === 0) return tables
  }
}
