'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n'
import { translations } from '@/lib/translations'

const PLAN_DATA = [
  { monthlyPrice: 0, yearlyPrice: 0, yearlyPerMonth: 0, period: '', highlight: false },
  { monthlyPrice: 6, yearlyPrice: 60, yearlyPerMonth: 5, period: '/mo', highlight: true },
  { monthlyPrice: 15, yearlyPrice: 144, yearlyPerMonth: 12, period: '/seat/mo', highlight: false },
]

function CheckIcon({ included }: { included: boolean }) {
  if (!included) {
    return (
      <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4 text-violet-500 dark:text-violet-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}

function TableCheckOrCross({ value }: { value: boolean }) {
  if (value) {
    return (
      <svg className="w-5 h-5 text-violet-500 dark:text-violet-400 mx-auto" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  )
}

function TableCellValue({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') return <TableCheckOrCross value={value} />
  return <span className="text-[13px] text-gray-700 dark:text-gray-200 font-medium">{value}</span>
}

export default function PricingContent() {
  const { locale } = useLocale()
  const t = translations[locale]

  return (
    <div className="bg-white dark:bg-gray-950">
      <section className="pt-32 pb-20 md:pt-40 md:pb-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t.pricing.title}<span className="text-outline-purple">{t.pricing.titleHighlight}</span>{t.pricing.titleAfter}
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            {t.pricing.subtitle}
          </p>
        </div>
      </section>

      {/* Desktop comparison table */}
      <section className="pb-24 hidden md:block">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <th className="text-left py-6 px-6 w-[40%]">
                    <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{t.pricing.tableFeatures}</span>
                  </th>
                  {t.pricing.plans.map((plan, i) => (
                    <th key={plan.name} className="text-center pt-6 pb-5 px-4 w-[20%] align-bottom">
                      {PLAN_DATA[i].highlight && (
                        <span className="inline-block mb-2 px-3 py-0.5 rounded-full bg-violet-600 text-[10px] font-medium text-white">
                          {t.pricing.mostPopular}
                        </span>
                      )}
                      <p className="text-[15px] font-semibold text-gray-900 dark:text-white">{plan.name}</p>
                      <div className="mt-2 h-[52px] flex flex-col items-center justify-center">
                        {PLAN_DATA[i].yearlyPerMonth > 0 ? (
                          <>
                            <div>
                              <span className="text-2xl font-bold text-gray-900 dark:text-white">${PLAN_DATA[i].yearlyPerMonth}</span>
                              <span className="text-[12px] text-gray-500">{PLAN_DATA[i].period}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">${PLAN_DATA[i].monthlyPrice}{PLAN_DATA[i].period} {t.pricing.billedMonthly}</p>
                          </>
                        ) : (
                          <div>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">$0</span>
                            <span className="text-[12px] text-gray-500 ml-1">{t.pricing.forever}</span>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.pricing.tableRows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={`border-b border-gray-50 dark:border-white/[0.03] ${
                      rowIdx % 2 === 0 ? 'bg-gray-50/40 dark:bg-white/[0.01]' : ''
                    }`}
                  >
                    <td className="py-3.5 px-6 text-[13px] text-gray-600 dark:text-gray-300">{row.label}</td>
                    {row.values.map((val, colIdx) => (
                      <td key={colIdx} className="py-3.5 px-4 text-center">
                        <TableCellValue value={val} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="py-5 px-6" />
                  {t.pricing.plans.map((plan, i) => (
                    <td key={plan.name} className="py-5 px-4 text-center">
                      <Link
                        href="/app"
                        className={`inline-block text-[12px] font-medium px-5 py-2 rounded-lg transition-colors ${
                          PLAN_DATA[i].highlight
                            ? 'bg-violet-600 text-white hover:bg-violet-500'
                            : 'border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mobile cards */}
      <section className="pb-24 md:hidden">
        <div className="mx-auto max-w-sm px-6 space-y-6">
          {t.pricing.plans.map((plan, i) => {
            const data = PLAN_DATA[i]
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col p-6 rounded-xl border transition-all ${
                  data.highlight
                    ? 'border-violet-300 dark:border-violet-500/40 bg-violet-50/50 dark:bg-violet-500/[0.04]'
                    : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]'
                }`}
              >
                {data.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-600 text-[11px] font-medium text-white">
                    {t.pricing.mostPopular}
                  </div>
                )}

                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">{plan.description}</p>
                </div>

                <div className="mt-5 mb-6">
                  {data.yearlyPerMonth > 0 ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">${data.yearlyPerMonth}</span>
                        <span className="text-[13px] text-gray-500">{data.period}</span>
                      </div>
                      <p className="mt-1 text-[12px] text-gray-500">
                        ${data.monthlyPrice}{data.period} {t.pricing.billedMonthly}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                      <span className="text-[13px] text-gray-500">{t.pricing.forever}</span>
                    </div>
                  )}
                </div>

                <Link
                  href="/app"
                  className={`block text-center text-[13px] font-medium py-2.5 rounded-lg transition-colors ${
                    data.highlight
                      ? 'bg-violet-600 text-white hover:bg-violet-500'
                      : 'border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5">
                      <CheckIcon included={f.included} />
                      <span className={`text-[13px] ${f.included ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <section className="py-24 border-t border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight text-center mb-12">
            {t.pricing.faqTitle}
          </h2>
          <div className="space-y-8">
            {t.pricing.faq.map((item) => (
              <div key={item.q}>
                <h3 className="text-[15px] font-medium text-gray-900 dark:text-white">{item.q}</h3>
                <p className="mt-2 text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t.pricing.ctaTitle}
          </h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {t.pricing.ctaSubtitle}
          </p>
          <Link
            href="/app"
            className="inline-block mt-8 px-8 py-3 rounded-lg bg-violet-600 text-white font-medium text-[15px] hover:bg-violet-500 transition-colors"
          >
            {t.pricing.ctaButton}
          </Link>
        </div>
      </section>
    </div>
  )
}
