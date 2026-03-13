'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n'
import { translations } from '@/lib/translations'

const COLORS: Record<string, { card: string; tag: string; icon: string }> = {
  emerald: {
    card: 'border-emerald-200 dark:border-emerald-500/20',
    tag: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    icon: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  blue: {
    card: 'border-blue-200 dark:border-blue-500/20',
    tag: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
    icon: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  amber: {
    card: 'border-amber-200 dark:border-amber-500/20',
    tag: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    icon: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  violet: {
    card: 'border-violet-200 dark:border-violet-500/20',
    tag: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400',
    icon: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  sky: {
    card: 'border-sky-200 dark:border-sky-500/20',
    tag: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
    icon: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  rose: {
    card: 'border-rose-200 dark:border-rose-500/20',
    tag: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
    icon: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  teal: {
    card: 'border-teal-200 dark:border-teal-500/20',
    tag: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400',
    icon: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
  },
  indigo: {
    card: 'border-indigo-200 dark:border-indigo-500/20',
    tag: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    icon: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
}

export default function UseCasesContent() {
  const { locale } = useLocale()
  const t = translations[locale]

  return (
    <div className="bg-white dark:bg-gray-950">
      <section className="pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t.useCases.title}
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            {t.useCases.subtitle}
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-5xl px-6 space-y-16">
          {t.useCases.cases.map((c) => {
            const clr = COLORS[c.color]
            return (
              <article key={c.company} className={`rounded-2xl border ${clr.card} bg-gray-50/50 dark:bg-white/[0.02] overflow-hidden`}>
                <div className="p-8 md:p-10">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className={`text-2xl w-10 h-10 rounded-lg ${clr.icon} flex items-center justify-center`}>
                      {c.logo}
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{c.company}</h2>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">{c.description}</p>
                    </div>
                    <span className={`ml-auto text-[11px] font-medium px-3 py-1 rounded-full ${clr.tag}`}>
                      {c.industry}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">{t.useCases.theChallenge}</h3>
                      <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">{c.challenge}</p>
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">{t.useCases.theSolution}</h3>
                      <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">{c.solution}</p>
                    </div>
                  </div>

                  <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {c.results.map((r) => (
                      <div key={r} className="flex items-start gap-2 text-[13px] text-gray-600 dark:text-gray-300">
                        <svg className="w-4 h-4 text-violet-500 dark:text-violet-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        {r}
                      </div>
                    ))}
                  </div>

                  <blockquote className="mt-8 pt-6 border-t border-gray-200 dark:border-white/5">
                    <p className="text-[14px] text-gray-600 dark:text-gray-300 italic leading-relaxed">{c.quote}</p>
                    <footer className="mt-2 text-[12px] text-gray-500 dark:text-gray-400">{c.quotee}</footer>
                  </blockquote>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="py-20 border-t border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t.useCases.ctaTitle}
          </h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {t.useCases.ctaSubtitle}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app"
              className="px-8 py-3 rounded-lg bg-violet-600 text-white font-medium text-[15px] hover:bg-violet-500 transition-colors"
            >
              {t.useCases.ctaButton}
            </Link>
            <Link
              href="/enterprise"
              className="px-8 py-3 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium text-[15px] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t.nav.enterprise}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
