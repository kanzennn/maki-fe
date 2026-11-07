import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { queryKeys } from '@/hooks/query-keys'
import { followOutlet } from '@/modules/realtime/usecases/follow-outlet.usecase'

/**
 * Keeps what the outlet's pages show live: when the outlet's live messages say
 * something changed, what shows it loads again. The server still decides at
 * the sale: this only keeps two cashiers from seeing different stock for long.
 */
export function useOutletLive(outletId: string | null | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!outletId) return
    return followOutlet(outletId, (topics) => {
      const reload = (queryKey: readonly unknown[]) => void queryClient.invalidateQueries({ queryKey })
      if (topics.includes('catalog')) {
        reload(queryKeys.pos.catalog(outletId))
        reload(queryKeys.menus.all(outletId))
        reload(queryKeys.categories.all(outletId))
      }
      if (topics.includes('tables')) reload(queryKeys.tables.all(outletId))
      if (topics.includes('orders')) {
        reload(queryKeys.orders.all(outletId))
        reload(['dashboard', outletId])
      }
    })
  }, [outletId, queryClient])
}
