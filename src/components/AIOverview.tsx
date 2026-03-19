'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal, CloseButton, Button, InfoTooltip } from '@/components/ui'
import { useAppLocale } from '@/lib/useAppLocale'

interface AgentStep {
  id: string
  label: string
  status: 'loading' | 'done' | 'error'
}

interface Props {
  company: any
  isDark: boolean
  onClose: () => void
  userToken: string
  savedOverview?: { text: string; sources: string[] } | null
}

/**
 * AI-powered company overview panel with agent-style step display.
 * Streams results from the Gemini API via SSE, showing each research step
 * (analyze → search → generate) with live progress indicators.
 */
export default function AIOverview({ company, isDark, onClose, userToken, savedOverview }: Props) {
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [markdown, setMarkdown] = useState(savedOverview?.text ?? '')
  const [error, setError] = useState('')
  const [sources, setSources] = useState<string[]>(savedOverview?.sources ?? [])
  const [done, setDone] = useState(!!savedOverview)
  const { t: txt } = useAppLocale()
  const contentRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const startStream = useCallback(async () => {
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/ai-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          fields: company.fields ?? {},
          lat: company.lat,
          lon: company.lon,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setError(err.error ?? `Error ${res.status}`)
        setDone(true)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) { setError('No response stream'); setDone(true); return }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7)
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            switch (currentEvent) {
              case 'step':
                setSteps((prev) => {
                  const existing = prev.findIndex((s) => s.id === data.id)
                  if (existing >= 0) {
                    const updated = [...prev]
                    updated[existing] = data
                    return updated
                  }
                  return [...prev, data]
                })
                break
              case 'chunk':
                setMarkdown((prev) => prev + data.text)
                break
              case 'done':
                setSources(data.sources ?? [])
                setDone(true)
                break
              case 'error':
                setError(data.message)
                setDone(true)
                break
            }
          }
        }
      }

      if (!done) setDone(true)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Connection failed')
      setDone(true)
    }
  }, [company, userToken])

  useEffect(() => {
    if (savedOverview) return
    startStream()
    return () => { abortRef.current?.abort() }
  }, [startStream, savedOverview])

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [markdown, steps])

  const companyName = company.fields?.["Dénomination de l'unité légale"]
    || company.fields?.["Dénomination usuelle de l'établissement"]
    || company.fields?.SIRET
    || 'Company'

  const t = isDark
    ? {
        bg: 'bg-gray-900 border-white/10',
        title: 'text-white',
        subtitle: 'text-gray-500',
        stepText: 'text-gray-400',
        stepDone: 'text-green-400',
        stepLoading: 'text-violet-400',
        stepIcon: 'text-gray-600',
        divider: 'border-white/5',
        prose: 'text-gray-300',
        proseH: 'text-white',
        proseBold: 'text-gray-200',
        proseLink: 'text-violet-400 hover:text-violet-300',
        sourceBg: 'bg-white/5 border-white/10',
        sourceText: 'text-gray-500',
        error: 'text-red-400 bg-red-500/10 border-red-500/20',
      }
    : {
        bg: 'bg-white border-gray-200',
        title: 'text-gray-900',
        subtitle: 'text-gray-400',
        stepText: 'text-gray-500',
        stepDone: 'text-green-600',
        stepLoading: 'text-violet-600',
        stepIcon: 'text-gray-300',
        divider: 'border-gray-100',
        prose: 'text-gray-700',
        proseH: 'text-gray-900',
        proseBold: 'text-gray-800',
        proseLink: 'text-violet-600 hover:text-violet-700',
        sourceBg: 'bg-gray-50 border-gray-200',
        sourceText: 'text-gray-400',
        error: 'text-red-600 bg-red-50 border-red-200',
      }

  return (
    <Modal isDark={isDark} onClose={onClose} zIndex="z-[8500]" className={`w-full md:w-[520px] max-h-[85vh] flex flex-col ${t.bg}`}>
      {(handleClose) => (<>
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h2 className={`text-base font-semibold leading-tight ${t.title}`}>{txt.aiOverviewTitle}</h2>
              {!savedOverview && (
                <InfoTooltip
                  text={txt.aiOverviewTooltip}
                  isDark={isDark}
                  position="bottom"
                />
              )}
            </div>
            <p className={`text-xs mt-1 truncate ${t.subtitle}`}>{companyName}</p>
          </div>
          <CloseButton onClick={handleClose} isDark={isDark} />
        </div>

        {steps.length > 0 && (
          <div className={`px-5 py-3 border-t ${t.divider}`}>
            <div className="space-y-2">
              {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-2.5">
                {step.status === 'loading' ? (
                  <div className={`w-4 h-4 flex-shrink-0 ${t.stepLoading}`}>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : step.status === 'done' ? (
                  <svg className={`w-4 h-4 flex-shrink-0 ${t.stepDone}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={`text-xs font-medium ${step.status === 'loading' ? t.stepLoading : t.stepText}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        )}

        {(markdown || error) && (
          <div ref={contentRef} className={`flex-1 overflow-y-auto px-5 pb-4 border-t ${t.divider}`}>
            {error ? (
              <div className={`mt-3 px-3 py-2.5 rounded-lg border text-xs ${t.error}`}>{error}</div>
            ) : (
              <div className={`mt-3 ai-prose text-[13px] leading-relaxed ${t.prose}`}>
                <MarkdownRenderer content={markdown} isDark={isDark} />
              </div>
            )}

            {done && sources.length > 0 && (
              <div className={`mt-4 px-3 py-2.5 rounded-lg border ${t.sourceBg}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${t.sourceText}`}>{txt.searchQueriesUsed}</p>
                <div className="space-y-0.5">
                  {sources.map((s, i) => (
                    <p key={i} className={`text-[11px] ${t.sourceText}`}>• {s}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {done && !error && (
          <div className={`px-5 py-3 border-t ${t.divider}`}>
            <Button onClick={handleClose} isDark={isDark} className="w-full py-2.5">
              {txt.done}
            </Button>
          </div>
        )}
      </>)}
    </Modal>
  )
}

/** Minimal Markdown → JSX renderer for AI output. Handles headers, bold, bullets, and links. */
function MarkdownRenderer({ content, isDark }: { content: string; isDark: boolean }) {
  const hClass = isDark ? 'text-white' : 'text-gray-900'
  const boldClass = isDark ? 'text-gray-200' : 'text-gray-800'
  const linkClass = isDark ? 'text-violet-400 hover:text-violet-300 underline' : 'text-violet-600 hover:text-violet-700 underline'

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  function renderInline(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = []
    const regex = /(\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\))/g
    let lastIdx = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index))
      }
      if (match[2]) {
        parts.push(<strong key={match.index} className={boldClass}>{match[2]}</strong>)
      } else if (match[3] && match[4]) {
        parts.push(
          <a key={match.index} href={match[4]} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {match[3]}
          </a>
        )
      }
      lastIdx = match.index + match[0].length
    }
    if (lastIdx < text.length) parts.push(text.slice(lastIdx))
    return parts
  }

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className={`font-semibold text-[13px] mt-4 mb-1.5 ${hClass}`}>{renderInline(line.slice(4))}</h4>)
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className={`font-semibold text-sm mt-4 mb-1.5 ${hClass}`}>{renderInline(line.slice(3))}</h3>)
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className={`font-bold text-sm mt-4 mb-2 ${hClass}`}>{renderInline(line.slice(2))}</h2>)
    } else if (line.match(/^[-*] /)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-1 mb-0.5">
          <span className="flex-shrink-0 mt-[2px]">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(<p key={i} className="mb-1.5">{renderInline(line)}</p>)
    }
    i++
  }

  return <>{elements}</>
}
