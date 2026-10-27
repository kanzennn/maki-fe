import { useTranslation } from 'react-i18next'

import { languages, rememberLanguage, type Language } from '@/lib/language'
import { cn } from '@/lib/utils'

/**
 * Switches the interface language on this device, before anyone is signed
 * in. A signed-in user's own choice lives on the server and follows them to
 * every device.
 */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation('auth')

  function choose(language: Language) {
    rememberLanguage(language)
    void i18n.changeLanguage(language)
  }

  return (
    <div role="group" aria-label={t('language')} className="flex gap-1">
      {languages.map((language) => (
        <button
          key={language}
          type="button"
          aria-pressed={i18n.language === language}
          onClick={() => choose(language)}
          className={cn(
            'h-11 min-w-11 rounded-control px-3 text-label-md uppercase',
            i18n.language === language
              ? 'bg-primary-container text-on-primary-container'
              : 'text-on-surface-variant hover:bg-surface-container',
          )}
        >
          {language}
        </button>
      ))}
    </div>
  )
}
