import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** One entry of a page's description list (<dl>): a grey term over its value. */
export function Detail({ term, children, className }: { term: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-1', className)}>
      <dt className="text-label-md text-on-surface-variant">{term}</dt>
      <dd className="text-body-md text-on-surface">{children}</dd>
    </div>
  )
}
