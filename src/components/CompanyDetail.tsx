'use client'

import { useState } from 'react'

interface Props {
  company: any
  displayColumns: string[]
  isDark: boolean
  onClose: () => void
  onAskAI: (company: any) => void
}

export default function CompanyDetail({ company, displayColumns, isDark, onClose, onAskAI }: Props) {
  const [aiLoading, setAiLoading] = useState(false)

  const fields = company.fields ?? {}

  const t = isDark
    ? {
        overlay: 'bg-black/50',
        bg: 'bg-gray-900 border-white/10',
        title: 'text-white',
        closeBtn: 'text-gray-600 hover:text-gray-300',
        label: 'text-gray-600',
        value: 'text-gray-200',
        emptyValue: 'text-gray-700 italic',
        divider: 'border-white/5',
        coords: 'text-gray-600',
        aiBtn: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20',
        aiIcon: 'text-purple-200',
      }
    : {
        overlay: 'bg-black/30',
        bg: 'bg-white border-gray-200',
        title: 'text-gray-900',
        closeBtn: 'text-gray-400 hover:text-gray-700',
        label: 'text-gray-400',
        value: 'text-gray-800',
        emptyValue: 'text-gray-300 italic',
        divider: 'border-gray-100',
        coords: 'text-gray-400',
        aiBtn: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20',
        aiIcon: 'text-purple-200',
      }

  return (
    <div
      className={`fixed inset-0 z-[8000] flex items-center justify-center backdrop-blur-sm ${t.overlay}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`relative w-[440px] max-h-[80vh] flex flex-col rounded-2xl border shadow-2xl ${t.bg}`}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className={`text-base font-semibold leading-tight ${t.title}`}>
              {fields["D\u00e9nomination usuelle de l'\u00e9tablissement"] || fields["D\u00e9nomination de l'unit\u00e9 l\u00e9gale"] || fields.SIRET || 'Company Details'}
            </h2>
            {company.lat && company.lon && (
              <p className={`text-[10px] mt-1 font-mono ${t.coords}`}>
                {company.lat.toFixed(5)}, {company.lon.toFixed(5)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${t.closeBtn}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Fields grid */}
        <div className={`flex-1 overflow-y-auto px-5 pb-3 border-t ${t.divider}`}>
          <div className="grid grid-cols-1 gap-0.5 pt-3">
            {displayColumns.map((col) => {
              const val = fields[col] ?? ''
              return (
                <div key={col} className="flex items-baseline gap-3 py-1.5">
                  <span className={`text-[10px] font-medium uppercase tracking-wider flex-shrink-0 w-[140px] truncate ${t.label}`} title={col}>
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

        {/* AI button */}
        <div className={`px-5 py-4 border-t ${t.divider}`}>
          <button
            onClick={() => onAskAI(company)}
            disabled={aiLoading}
            className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold transition-all ${t.aiBtn}`}
          >
            <svg className={`w-4 h-4 ${t.aiIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Ask AI about this company
          </button>
        </div>
      </div>
    </div>
  )
}
