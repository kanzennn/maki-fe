import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitch } from '@/components/shared/language-switch'
import { PageHeading } from '@/components/shared/page-heading'

/** The frame of the screens before sign-in: the app name, a card, and the language switch. */
export function AuthShell({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="grid w-full max-w-sm gap-4">
        <p className="text-headline-lg text-primary-strong">{t('app.name')}</p>
        <section className="grid gap-4 rounded-card border border-outline bg-surface p-6">
          <div className="grid gap-2">
            <PageHeading>{title}</PageHeading>
            {intro && <div className="text-body-md text-on-surface-variant">{intro}</div>}
          </div>
          {children}
        </section>
        <div className="justify-self-end">
          <LanguageSwitch />
        </div>
      </div>
    </main>
  )
}
