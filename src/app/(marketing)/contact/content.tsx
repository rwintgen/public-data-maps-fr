'use client'

import { useState, type FormEvent } from 'react'
import { useLocale } from '@/lib/i18n'
import { translations } from '@/lib/translations'

export default function ContactContent() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { locale } = useLocale()
  const t = translations[locale]

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)
    setError('')

    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      topic: (form.elements.namedItem('topic') as HTMLSelectElement).value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to send message')
      }
      setSent(true)
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-950">
      <section className="pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            <div className="lg:pt-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t.contact.title}
              </h1>
              <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
                {t.contact.subtitle}
              </p>

              <div className="mt-12 space-y-6">
                <div>
                  <h3 className="text-[13px] font-medium text-gray-600 dark:text-gray-300">{t.contact.emailLabel}</h3>
                  <a href="mailto:wintgensromain@gmail.com" className="text-[15px] text-violet-400 hover:text-violet-300 transition-colors">
                    wintgensromain@gmail.com
                  </a>
                </div>
                <div>
                  <h3 className="text-[13px] font-medium text-gray-600 dark:text-gray-300">{t.contact.responseTimeLabel}</h3>
                  <p className="text-[15px] text-gray-500 dark:text-gray-400">
                    {t.contact.responseTimeText}
                  </p>
                </div>
              </div>

              <div className="mt-12 p-6 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{t.contact.enterpriseTitle}</h3>
                <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.contact.enterpriseText}
                </p>
              </div>
            </div>

            <div>
              {sent ? (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-emerald-500 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t.contact.successTitle}</h3>
                  <p className="mt-2 text-[14px] text-gray-500 dark:text-gray-400">
                    {t.contact.successText}
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-6 text-[13px] text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    {t.contact.sendAnother}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-[13px] font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                      {t.contact.formName}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-violet-400 dark:focus:border-violet-500/40 focus:outline-none transition-colors"
                      placeholder={t.contact.formNamePlaceholder}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-[13px] font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                      {t.contact.formEmail}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-violet-400 dark:focus:border-violet-500/40 focus:outline-none transition-colors"
                      placeholder={t.contact.formEmailPlaceholder}
                    />
                  </div>

                  <div>
                    <label htmlFor="topic" className="block text-[13px] font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                      {t.contact.formTopic}
                    </label>
                    <select
                      id="topic"
                      name="topic"
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white focus:border-violet-400 dark:focus:border-violet-500/40 focus:outline-none transition-colors"
                    >
                      <option value="" className="bg-white dark:bg-gray-900">{t.contact.formTopicPlaceholder}</option>
                      {t.contact.topics.map((topic) => (
                        <option key={topic} value={topic} className="bg-white dark:bg-gray-900">{topic}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-[13px] font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                      {t.contact.formMessage}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-violet-400 dark:focus:border-violet-500/40 focus:outline-none transition-colors resize-none"
                      placeholder={t.contact.formMessagePlaceholder}
                    />
                  </div>

                  {error && (
                    <p className="text-[13px] text-red-400">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-2.5 rounded-lg bg-violet-600 text-white font-medium text-[14px] hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? t.contact.formSending : t.contact.formSubmit}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
