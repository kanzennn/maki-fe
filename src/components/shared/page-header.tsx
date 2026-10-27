import { createLink } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { PageHeading } from './page-heading'

/** The top of a page: an optional way back, the heading, and the page's actions. */
export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  /** A BackLink to the page this one belongs to. */
  back?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="grid gap-2">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <PageHeading>{title}</PageHeading>
          {description && <div className="text-body-md text-on-surface-variant">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

function BackAnchor({ className, children, ...props }: ComponentProps<'a'>) {
  return (
    <a
      {...props}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 justify-self-start text-body-md text-primary-strong underline-offset-4 hover:underline',
        className,
      )}
    >
      <ArrowLeftIcon aria-hidden="true" className="size-4" />
      {children}
    </a>
  )
}

/** A typed router link, drawn as "← Back to …". */
export const BackLink = createLink(BackAnchor)
