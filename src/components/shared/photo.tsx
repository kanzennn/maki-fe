import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * A stored photo, or the fallback without one, or when it won't load, as a
 * profile photo's address does once it has expired. Decorative: what it shows
 * is always named beside it.
 */
export function Photo({ url, fallback, className }: { url: string | null | undefined; fallback: ReactNode; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!url || failed === url) return fallback
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(url)}
      className={cn('size-full object-cover', className)}
    />
  )
}
