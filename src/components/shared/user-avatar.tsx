import { initialsOf } from '@/lib/initials'
import { cn } from '@/lib/utils'

import { Photo } from './photo'

/** An account's photo, or the initials of its name. Decorative: the name is always beside it. */
export function UserAvatar({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-container text-label-md text-on-surface',
        className,
      )}
    >
      <Photo url={url} fallback={initialsOf(name)} />
    </span>
  )
}
