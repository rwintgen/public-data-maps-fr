'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal, CloseButton, Button } from '@/components/ui'

interface Props {
  company: any
  displayColumns: string[]
  isDark: boolean
  onClose: () => void
  onAskAI: (company: any) => void
  onViewAI: (company: any) => void
  hasCachedOverview: boolean
}

/**
 * Full-screen modal showing all JSONB fields for a single establishment.
 * Animates in/out with scale + opacity. Includes an AI inquiry button gated by paywall.
 */
export default function CompanyDetail({ company, displayColumns, isDark, onClose, onAskAI, onViewAI, hasCachedOverview }: Props) {
  const [aiLoading, setAiLoading] = useState(false)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const fields = company.fields ?? {}

  const t = isDark
    ? {
        bg: 'bg-gray-900 border-white/10',
        title: 'text-white',
        closeBtn: 'text-gray-600 hover:text-gray-300',
        label: 'text-gray-600',
        value: 'text-gray-200',
        emptyValue: 'text-gray-700 italic',
        divider: 'border-white/5',
        coords: 'text-gray-600',
      }
    : {
        bg: 'bg-white border-gray-200',
        title: 'text-gray-900',
        closeBtn: 'text-gray-400 hover:text-gray-700',
        label: 'text-gray-400',
        value: 'text-gray-800',
        emptyValue: 'text-gray-300 italic',
        divider: 'border-gray-100',
        coords: 'text-gray-400',
      }

  return (
    <Modal isDark={isDark} onClose={onClose} zIndex="z-[8000]" className={`relative w-full md:w-[440px] max-h-[80vh] flex flex-col ${t.bg}`}>
      {(handleClose) => (<>
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className={`text-base font-semibold leading-tight ${t.title}`}>
              {fields["D\u00e9nomination de l'unit\u00e9 l\u00e9gale"] || fields["D\u00e9nomination usuelle de l'\u00e9tablissement"] || fields.SIRET || 'Company Details'}
            </h2>
            {company.lat && company.lon && (
              <p className={`text-xs md:text-[10px] mt-1 font-mono ${t.coords}`}>
                {company.lat.toFixed(5)}, {company.lon.toFixed(5)}
              </p>
            )}
          </div>
          <CloseButton onClick={handleClose} isDark={isDark} />
        </div>

        {/* Fields grid */}
        <div className={`flex-1 overflow-y-auto px-5 pb-3 border-t ${t.divider}`}>
          <div className="grid grid-cols-1 gap-0.5 pt-3">
            {displayColumns.map((col) => {
              const val = fields[col] ?? ''
              return (
                <div key={col} className="flex items-baseline gap-3 py-1.5">
                  <span
                    className={`text-xs md:text-[10px] font-medium uppercase tracking-wider flex-shrink-0 w-auto md:w-[200px] whitespace-normal break-words md:truncate cursor-default ${t.label}`}
                    onMouseMove={(e) => setTooltip({ text: col, x: e.clientX + 12, y: e.clientY + 12 })}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {col}
                  </span>
                  <span className={`text-sm flex-1 min-w-0 break-words ${val ? t.value : t.emptyValue}`}>
                    {val || '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI button(s) */}
        <div className={`px-5 py-4 border-t ${t.divider}`}>
          {hasCachedOverview ? (
            <div className="flex gap-2">
              <Button
                onClick={() => onViewAI(company)}
                isDark={isDark}
                className="flex-1 flex items-center justify-center gap-2 py-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                View AI Overview
              </Button>
              <Button
                onClick={() => onAskAI(company)}
                disabled={aiLoading}
                isDark={isDark}
                variant="secondary"
                className="flex items-center justify-center gap-2 py-3 px-4"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try again
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => onAskAI(company)}
              disabled={aiLoading}
              isDark={isDark}
              className="w-full flex items-center justify-center gap-2.5 py-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Ask AI about this company
            </Button>
          )}
        </div>

        {tooltip && createPortal(
          <div
            className="fixed z-[10000] px-2 py-1 rounded-md bg-gray-800 text-gray-100 text-xs md:text-[11px] font-medium whitespace-nowrap pointer-events-none shadow-lg hidden md:block"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.text}
          </div>,
          document.body
        )}
      </>)}
    </Modal>
  )
}
