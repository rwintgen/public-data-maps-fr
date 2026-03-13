'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/lib/i18n'
import { translations } from '@/lib/translations'

export default function Footer() {
  const { locale } = useLocale()
  const t = translations[locale]

  const productLinks = [
    { href: '/features', label: t.nav.features },
    { href: '/use-cases', label: t.nav.useCases },
    { href: '/resources', label: t.nav.resources },
    { href: '/pricing', label: t.nav.pricing },
    { href: '/enterprise', label: t.nav.enterprise },
    { href: '/app', label: t.footer.launchApp },
  ]

  const legalLinks = [
    { href: '/privacy', label: t.footer.privacy },
    { href: '/terms', label: t.footer.terms },
  ]

  const supportLinks = [
    { href: '/contact', label: t.nav.contact },
    { href: 'mailto:wintgensromain@gmail.com', label: t.footer.emailSupport },
  ]

  return (
    <footer className="border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-gray-900 dark:text-white">
              <Image src="/logo-mini.png" alt="" width={20} height={20} className="h-5 w-auto dark:invert" />
              Public Data Maps
            </Link>
            <p className="mt-3 text-[13px] text-gray-500 leading-relaxed max-w-[240px]">
              {t.footer.description}
            </p>
          </div>

          <div>
            <h3 className="text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">{t.footer.product}</h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">{t.footer.legal}</h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">{t.footer.support}</h3>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-gray-400 dark:text-gray-600">
            &copy; {new Date().getFullYear()} {t.footer.copyright}
          </p>
          <p className="text-[12px] text-gray-400 dark:text-gray-600">
            {t.footer.dataSource}
          </p>
        </div>
      </div>
    </footer>
  )
}
