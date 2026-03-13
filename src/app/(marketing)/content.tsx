'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n'
import { translations } from '@/lib/translations'

const FEATURE_ICONS = [
  <svg key="0" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>,
  <svg key="1" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>,
  <svg key="2" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  <svg key="3" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
  <svg key="4" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
  <svg key="5" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>,
]

export default function HomeContent() {
  const { locale } = useLocale()
  const t = translations[locale]

  return (
    <div className="bg-white dark:bg-gray-950">
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-100 dark:from-violet-900/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-1.5 text-[12px] text-gray-500 dark:text-gray-400 mb-8">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            {t.home.badge}
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white max-w-3xl mx-auto leading-[1.1]">
            {t.home.heroTitle}
            <span className="text-violet-600 dark:text-violet-400 text-shimmer">{t.home.heroHighlight}</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {t.home.heroDescription}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app"
              className="px-8 py-3 rounded-lg bg-violet-600 text-white font-medium text-[15px] hover:bg-violet-500 transition-colors"
            >
              {t.home.ctaPrimary}
            </Link>
            <Link
              href="/features"
              className="px-8 py-3 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium text-[15px] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t.home.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 -mt-4 mb-20">
        <div className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 overflow-hidden shadow-2xl shadow-gray-300/30 dark:shadow-violet-500/5">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-100/80 dark:bg-gray-900/80">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-white/10" />
            </div>
            <span className="ml-2 text-[11px] text-gray-400 dark:text-gray-500 font-mono">{t.home.screenshotUrl}</span>
          </div>
          <div className="aspect-[16/9] bg-gradient-to-br from-gray-100 dark:from-gray-900 via-gray-50 dark:via-gray-900 to-white dark:to-gray-800 flex items-center justify-center">
            <div className="text-center px-8">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
              <p className="text-gray-400 dark:text-gray-600 text-sm">{t.home.screenshotAlt}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {t.home.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="mt-1 text-[13px] text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t.home.featuresTitle}
            </h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              {t.home.featuresSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.home.features.map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:border-gray-200 dark:hover:border-white/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/15 transition-colors">
                  {FEATURE_ICONS[i]}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 border-t border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t.home.pricingBefore}<span className="text-outline-purple">{t.home.pricingHighlight}</span>{t.home.pricingAfter}
            </h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              {t.home.pricingSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {t.home.tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative p-6 rounded-xl border transition-all ${
                  tier.highlight
                    ? 'border-violet-300 dark:border-violet-500/40 bg-violet-50/50 dark:bg-violet-500/[0.04]'
                    : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]'
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-600 text-[11px] font-medium text-white">
                    {t.home.mostPopular}
                  </div>
                )}
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{tier.price}</span>
                  <span className="text-[13px] text-gray-500">{tier.period}</span>
                </div>
                <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400">{tier.description}</p>
                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-gray-600 dark:text-gray-300">
                      <svg className="w-4 h-4 text-violet-500 dark:text-violet-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/app"
                  className={`mt-6 block text-center text-[13px] font-medium py-2.5 rounded-lg transition-colors ${
                    tier.highlight
                      ? 'bg-violet-600 text-white hover:bg-violet-500'
                      : 'border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[13px] text-gray-500">
            {t.home.pricingNote}{' '}
            <Link href="/pricing" className="text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors">
              {t.home.pricingLink}
            </Link>
          </p>
        </div>
      </section>

      <section className="py-24 md:py-32 border-t border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t.home.enterpriseTitle}
          </h2>
          <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
            {t.home.enterpriseSubtitle}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/enterprise"
              className="px-8 py-3 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-[15px] hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              {t.home.enterpriseCta}
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium text-[15px] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t.home.enterpriseSecondaryCta}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
