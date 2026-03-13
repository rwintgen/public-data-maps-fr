'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n'
import { translations } from '@/lib/translations'

const BENEFIT_ICONS = [
  <svg key="0" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  <svg key="1" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
  <svg key="2" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
  <svg key="3" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
  <svg key="4" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>,
  <svg key="5" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>,
  <svg key="6" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
]

export default function EnterpriseContent() {
  const { locale } = useLocale()
  const t = translations[locale]

  return (
    <div className="bg-white dark:bg-gray-950">
      <section className="pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-1.5 text-[12px] text-gray-500 dark:text-gray-400 mb-8">
            {t.enterprise.badge}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white max-w-3xl mx-auto leading-[1.1]">
            {t.enterprise.heroTitle}
            <span className="text-violet-600 dark:text-violet-400 text-shimmer">{t.enterprise.heroHighlight}</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {t.enterprise.heroSubtitle}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app"
              className="px-8 py-3 rounded-lg bg-violet-600 text-white font-medium text-[15px] hover:bg-violet-500 transition-colors"
            >
              {t.enterprise.ctaPrimary}
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium text-[15px] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t.enterprise.ctaSecondary}
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-gray-400 dark:text-gray-500">
            {t.enterprise.pricing}
          </p>
        </div>
      </section>

      <section className="py-24 border-t border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight text-center mb-14">
            {t.enterprise.benefitsTitle}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.enterprise.benefits.map((b, i) => (
              <div key={i} className="p-6 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center text-violet-500 dark:text-violet-400">
                  {BENEFIT_ICONS[i]}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-gray-900 dark:text-white">{b.title}</h3>
                <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t.enterprise.useCasesTitle}
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              {t.enterprise.useCasesSubtitle}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {t.enterprise.useCases.map((uc, i) => (
              <Link key={i} href="/use-cases" className="block p-6 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] hover:border-gray-200 dark:hover:border-white/10 transition-all group">
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{uc.title}</h3>
                <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">{uc.description}</p>
                <p className="mt-3 text-[11px] text-violet-600 dark:text-violet-400 font-medium group-hover:text-violet-500 dark:group-hover:text-violet-300 transition-colors">{uc.caseStudy}</p>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/use-cases"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-[14px] font-medium hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t.enterprise.viewAllUseCases}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t.enterprise.ctaBottomTitle}
          </h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {t.enterprise.ctaBottomSubtitle}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app"
              className="px-8 py-3 rounded-lg bg-white text-gray-900 font-medium text-[15px] hover:bg-gray-100 transition-colors"
            >
              {t.enterprise.ctaBottomPrimary}
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium text-[15px] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t.enterprise.ctaBottomSecondary}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
