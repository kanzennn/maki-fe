import { createContext, useContext, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const Nested = createContext(false)

/**
 * A page's single <h1>. It is the element focus moves to after a client-side
 * navigation (see useFocusHeadingOnNavigate), so keyboard and screen reader
 * users start reading the new page instead of staying on the link they used.
 * Under NestedPageHeadings it is an <h2>: the layout above holds the <h1>.
 */
export function PageHeading({ children, className }: { children: ReactNode; className?: string }) {
  const nested = useContext(Nested)
  if (nested) {
    return <h2 className={cn('text-headline-md text-on-surface', className)}>{children}</h2>
  }
  return (
    <h1 data-page-heading tabIndex={-1} className={cn('text-headline-lg text-on-surface outline-none', className)}>
      {children}
    </h1>
  )
}

/** A section of a page, one level below its PageHeading wherever that is. */
export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  const nested = useContext(Nested)
  const Heading = nested ? 'h3' : 'h2'
  return (
    <Heading id={id} className="text-title-md text-on-surface">
      {children}
    </Heading>
  )
}

/**
 * For a layout that renders the page's <h1> itself, such as an outlet's name
 * above its tabs: the pages inside it head their part with an <h2>.
 */
export function NestedPageHeadings({ children }: { children: ReactNode }) {
  return <Nested.Provider value={true}>{children}</Nested.Provider>
}
