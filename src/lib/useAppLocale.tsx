'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { en, fr } from './app-translations'
export { tPreset, tGroup, tTier } from './app-translations'

export type AppLocale = 'en' | 'fr'

type TranslationDict = typeof en

const translations: Record<AppLocale, TranslationDict> = { en, fr }

interface AppLocaleContextValue {
  locale: AppLocale
  setLocale: (l: AppLocale) => void
  t: TranslationDict
}

const AppLocaleContext = createContext<AppLocaleContextValue>({
  locale: 'fr',
  setLocale: () => {},
  t: fr,
})

function getInitialLocale(): AppLocale {
  if (typeof window === 'undefined') return 'fr'
  try {
    const stored = localStorage.getItem('pdm_app_locale')
    if (stored === 'en' || stored === 'fr') return stored
  } catch {}
  return 'fr'
}

export function AppLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(getInitialLocale)

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l)
    try { localStorage.setItem('pdm_app_locale', l) } catch {}
  }, [])

  const t = translations[locale]

  return (
    <AppLocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </AppLocaleContext.Provider>
  )
}

export function useAppLocale() {
  return useContext(AppLocaleContext)
}
