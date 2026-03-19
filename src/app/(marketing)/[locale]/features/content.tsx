'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/lib/i18n'
import { translations } from '@/lib/translations'

const SECTION_ICONS = [
  <svg key="0" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>,
  <svg key="1" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>,
  <svg key="2" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
  <svg key="3" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  <svg key="4" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>,
  <svg key="5" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>,
  <svg key="6" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>,
]

const FEATURE_IMAGES = [
  '/marketing/spatial-search.png',
  '/marketing/advanced-filtering.png',
  '/marketing/ai-overviews.png',
  '/marketing/export-integrate.png',
  '/marketing/saved-searches.png',
  '/marketing/plug-in-your-data.png',
  '/marketing/enriched-data.png',
]

export default function FeaturesContent() {
  const { locale } = useLocale()
  const t = translations[locale]

  return (
    <div className="bg-white dark:bg-gray-950">
      <section className="pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t.features.title}
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            {t.features.subtitle}
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-6 space-y-24">
          {t.features.sections.map((section, i) => (
            <div
              key={i}
              className={`flex flex-col lg:flex-row gap-12 lg:gap-16 items-start ${
                i % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              <div className="flex-1 lg:max-w-md">
                <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center text-violet-500 dark:text-violet-400 mb-5">
                  {SECTION_ICONS[i]}
                </div>
                <p className="text-[12px] font-medium text-violet-500 dark:text-violet-400 uppercase tracking-wider mb-2">
                  {section.subtitle}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {section.title}
                </h2>
                <p className="mt-4 text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {section.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {section.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-gray-600 dark:text-gray-300">
                      <svg className="w-4 h-4 text-violet-500 dark:text-violet-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex-1 w-full lg:max-w-lg">
                <div className="relative rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden aspect-[4/3]">
                  <Image
                    src={FEATURE_IMAGES[i]}
                    alt={section.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 512px"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 border-t border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t.features.ctaTitle}
          </h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {t.features.ctaSubtitle}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app"
              className="px-8 py-3 rounded-lg bg-violet-600 text-white font-medium text-[15px] hover:bg-violet-500 transition-colors"
            >
              {t.features.ctaPrimary}
            </Link>
            <Link
              href={`/${locale}/pricing`}
              className="px-8 py-3 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium text-[15px] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t.features.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
