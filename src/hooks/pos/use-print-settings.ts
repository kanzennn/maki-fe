import { create } from 'zustand'

/** The till's roll, in millimetres. */
export type PaperWidth = '58' | '80'

export type PrintSettings = {
  paper: PaperWidth
  /** Prints the receipt as soon as the sale is saved. */
  auto: boolean
}

const storageKey = 'maki.print'
const defaults: PrintSettings = { paper: '58', auto: false }

function stored(): PrintSettings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (typeof raw !== 'object' || raw === null) return defaults
    const { paper, auto } = raw as Record<string, unknown>
    return { paper: paper === '80' ? '80' : '58', auto: auto === true }
  } catch {
    // Storage off or unreadable: the defaults, for now.
    return defaults
  }
}

type PrintSettingsState = PrintSettings & { change: (next: Partial<PrintSettings>) => void }

/**
 * How this browser prints receipts. It is the till's, not the user's or the
 * outlet's: each till has its own printer, whoever is signed in.
 */
export const usePrintSettings = create<PrintSettingsState>((set, get) => ({
  ...stored(),
  change: (next) => {
    set(next)
    const { paper, auto } = get()
    try {
      localStorage.setItem(storageKey, JSON.stringify({ paper, auto }))
    } catch {
      // Not remembered; it still applies until the page reloads.
    }
  },
}))
