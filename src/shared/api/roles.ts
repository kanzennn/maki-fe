import { queryOptions } from '@tanstack/react-query'

import { api, unwrap } from './client'
import { queryKeys } from './query-keys'
import type { components } from './schema'

export type Role = components['schemas']['Role']

/**
 * Every role of an outlet, for a role filter or picker: the API's largest
 * page, which an outlet's handful of roles never fills. Whoever may see the
 * outlet's roles or users may load it.
 */
export const allRolesQuery = (outletId: string) =>
  queryOptions({
    queryKey: [...queryKeys.roles.lists(outletId), 'all'] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/roles', { params: { path: { oid: outletId }, query: { page_size: 100 } } })),
    select: (list) => list.data,
  })
