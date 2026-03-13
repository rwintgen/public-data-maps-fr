'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import { useLocale, type Locale } from '@/lib/i18n'
import { translations } from '@/lib/translations'

const NAV_LINKS = [
  { href: '/features', key: 'features' as const },
  { href: '/use-cases', key: 'useCases' as const },
  { href: '/resources', key: 'resources' as const },
  { href: '/enterprise', key: 'enterprise' as const },
  { href: '/pricing', key: 'pricing' as const },
  { href: '/contact', key: 'contact' as const },
]

type Theme = 'system' | 'light' | 'dark'

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const cycle = () => {
    const next: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(next)
    localStorage.setItem('site-theme', next)
    applyTheme(next)
  }

  return (
    <button onClick={cycle} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" aria-label={`Theme: ${theme}`}>
      {theme === 'light' ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx={12} cy={12} r={5} />
          <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : theme === 'dark' ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
        </svg>
      )}
    </button>
  )
}

function LocaleToggle({ locale, setLocale }: { locale: Locale; setLocale: (l: Locale) => void }) {
  const toggle = () => {
    const next: Locale = locale === 'en' ? 'fr' : 'en'
    setLocale(next)
  }

  return (
    <button
      onClick={toggle}
      className="px-1.5 py-1 text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded"
      aria-label={`Language: ${locale.toUpperCase()}`}
    >
      {locale === 'en' ? 'FR' : 'EN'}
    </button>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('system')
  const pathname = usePathname()
  const { locale, setLocale } = useLocale()
  const t = translations[locale]
  const [user] = useAuthState(auth)
  const isSignedIn = !!user

  useEffect(() => {
    const stored = localStorage.getItem('site-theme') as Theme | null
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setTheme(stored)
      applyTheme(stored)
    } else {
      applyTheme('system')
    }

    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      const t = (localStorage.getItem('site-theme') || 'system') as Theme
      if (t === 'system') applyTheme('system')
    }
    mq.addEventListener('change', onSystemChange)

    return () => {
      window.removeEventListener('scroll', onScroll)
      mq.removeEventListener('change', onSystemChange)
    }
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200 dark:border-white/5'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-gray-900 dark:text-white">
          <Image src="/logo-mini.png" alt="" width={20} height={20} className="h-5 w-auto dark:invert" />
          Public Data Maps
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[13px] transition-colors ${
                  isActive
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t.nav[link.key]}
              </Link>
            )
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LocaleToggle locale={locale} setLocale={setLocale} />
          <ThemeToggle theme={theme} setTheme={setTheme} />
          {isSignedIn ? (
            <Link
              href="/app"
              className="text-[13px] font-medium px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
            >
              {t.nav.goToApp}
            </Link>
          ) : (
            <>
              <Link href="/app" className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                {t.nav.signIn}
              </Link>
              <Link
                href="/app"
                className="text-[13px] font-medium px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
              >
                {t.nav.tryFree}
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-t border-gray-200 dark:border-white/5 px-6 pb-6 pt-2">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 text-[14px] transition-colors border-b border-gray-100 dark:border-white/5 ${
                  isActive
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t.nav[link.key]}
              </Link>
            )
          })}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1">
              <LocaleToggle locale={locale} setLocale={setLocale} />
              <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
            <div className="flex items-center gap-3">
              {isSignedIn ? (
                <Link
                  href="/app"
                  className="text-[14px] font-medium px-4 py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
                >
                  {t.nav.goToApp}
                </Link>
              ) : (
                <>
                  <Link href="/app" className="text-[14px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2">
                    {t.nav.signIn}
                  </Link>
                  <Link
                    href="/app"
                    className="text-[14px] font-medium px-4 py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
                  >
                    {t.nav.tryFree}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
