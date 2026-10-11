import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge only knows Tailwind's default scales. Without these, it
// reads `text-body-md` as a text colour and drops it when a real colour such
// as `text-on-surface` sits in the same class list.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['headline-lg', 'headline-md', 'title-md', 'price-lg', 'body-md', 'label-md', 'label-sm'],
      radius: ['control', 'card', 'tile', 'field'],
      shadow: ['card-subtle'],
    },
  },
})

/** Joins class names and resolves conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
