import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { defaultLanguage, detectLanguage, languages, storedLanguage } from '@/lib/language'

// Every src/locales/<language>/<namespace>.json file, bundled at build time.
const files = import.meta.glob<Record<string, unknown>>('../locales/*/*.json', {
  eager: true,
  import: 'default',
})

const resources: Record<string, Record<string, Record<string, unknown>>> = {}
for (const [path, messages] of Object.entries(files)) {
  const [, language, namespace] = /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path) ?? []
  if (language && namespace) {
    resources[language] ??= {}
    resources[language][namespace] = messages
  }
}

void i18n.use(initReactI18next).init({
  resources,
  // Before sign-in: the language picked on this device, else the browser's.
  // After sign-in the user's own setting takes over (see providers.tsx).
  lng: storedLanguage() ?? detectLanguage(),
  fallbackLng: defaultLanguage,
  supportedLngs: languages,
  ns: Object.keys(resources[defaultLanguage] ?? {}),
  defaultNS: 'common',
  initAsync: false,
  // React escapes rendered text already.
  interpolation: { escapeValue: false },
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: (lngs, namespace, key) => {
    console.warn(`Missing translation ${namespace}:${key} for ${lngs.join(', ')}`)
  },
})

document.documentElement.lang = i18n.language
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

export default i18n
