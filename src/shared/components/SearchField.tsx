import { SearchIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { Label } from '@/shared/ui/label'

type SearchFieldProps = {
  label: string
  placeholder?: string
  /** The search in effect, from the address bar. */
  value: string
  /** Called a moment after typing stops; '' clears the search. */
  onSearch: (value: string) => void
}

/**
 * A list's search field: a text-field with DESIGN.md's search-input
 * magnifier, bordered like the filters beside it, with a visible label. It
 * searches as the user types, once they pause, and follows the address bar
 * when that changes some other way (Back).
 */
export function SearchField({ label, placeholder, value, onSearch }: SearchFieldProps) {
  const id = useId()
  const [text, setText] = useState(value)
  // The last search this field asked for, and the value last seen from the
  // address bar: a new value that isn't the one asked for came from
  // elsewhere and replaces what was typed.
  const [asked, setAsked] = useState(value)
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    if (value !== asked) setText(value)
  }

  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function change(next: string) {
    setText(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const search = next.trim() === '' ? '' : next
      setAsked(search)
      onSearch(search)
    }, 300)
  }

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id} className="text-title-md">
        {label}
      </Label>
      <div className="relative">
        <input
          id={id}
          type="search"
          value={text}
          placeholder={placeholder}
          onChange={(e) => change(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-surface pr-10 pl-3 text-body-md text-on-surface outline-none placeholder:text-text-placeholder focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-icon-muted"
        />
      </div>
    </div>
  )
}
