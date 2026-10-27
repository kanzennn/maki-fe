import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** An error from the server, announced when it appears. */
export function FormAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn('rounded-control bg-error-container p-3 text-body-md text-on-error-container', className)}>
      {children}
    </div>
  )
}

/** A success message, announced when it appears. */
export function FormNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="status"
      className={cn('rounded-control bg-primary-container p-3 text-body-md text-on-primary-container', className)}
    >
      {children}
    </p>
  )
}
