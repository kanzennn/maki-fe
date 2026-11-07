import '@testing-library/jest-dom/vitest'

import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

import i18n from '@/providers/i18n'
import { sessionStore } from '@/lib/session'

// The suite runs its files at once, each in a jsdom of its own: on a busy
// machine a page can take longer than findBy's default second to appear. A
// real failure still fails, a few seconds later.
configure({ asyncUtilTimeout: 10_000 })

// jsdom has no layout, but the router scrolls on every navigation, and
// Radix measures its checkbox with a ResizeObserver.
window.scrollTo = () => {}
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom shows no files either: the photo field's preview only needs an address.
URL.createObjectURL ??= () => 'blob:preview'
URL.revokeObjectURL ??= () => {}

// Tests read the default language, whatever the machine's locale is.
beforeEach(async () => {
  await i18n.changeLanguage('id')
})

afterEach(() => {
  cleanup()
  // A test's fetch stub and session never reach the next test.
  vi.unstubAllGlobals()
  sessionStore.getState().clear()
})
