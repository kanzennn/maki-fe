export const languages = ['id', 'en'] as const
export type Language = (typeof languages)[number]
export const defaultLanguage: Language = 'id'

export function isLanguage(value: unknown): value is Language {
  return languages.some((language) => language === value)
}

const storageKey = 'maki.language'

/** The language last picked on this device before signing in, if any. */
export function storedLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(storageKey)
    return isLanguage(stored) ? stored : null
  } catch {
    // Storage can be off (private mode, blocked site data): no preference.
    return null
  }
}

/** Remembers a language picked on the sign-in screens, for this device only. */
export function rememberLanguage(language: Language) {
  try {
    localStorage.setItem(storageKey, language)
  } catch {
    // Not remembered; it still applies now.
  }
}

/** The first supported language the browser prefers, or the default. */
export function detectLanguage(preferred: readonly string[] = navigator.languages): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLanguage(base)) return base
  }
  return defaultLanguage
}
