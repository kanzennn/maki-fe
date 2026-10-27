import { UtensilsIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A category's emoji — full colour, as DESIGN.md's category icons are — or
 * an outline plate for one without. Decorative: the category's name is
 * always beside it.
 */
export function CategoryIcon({ icon, className }: { icon: string | null; className?: string }) {
  if (icon) {
    return (
      <span aria-hidden="true" className={cn('inline-grid size-6 shrink-0 place-items-center text-headline-md', className)}>
        {icon}
      </span>
    )
  }
  return (
    <span aria-hidden="true" className={cn('inline-grid size-6 shrink-0 place-items-center', className)}>
      <UtensilsIcon className="size-5 text-icon-muted" />
    </span>
  )
}
