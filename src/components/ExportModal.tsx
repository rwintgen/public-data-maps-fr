'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  companies: any[]
  displayColumns: string[]
  isDark: boolean
  onClose: () => void
}

/**
 * Modal for exporting the current search results as CSV or JSON.
 * Lets the user select which columns to include; coordinates are always exported.
 */
export default function ExportModal({ companies, displayColumns, isDark, onClose }: Props) {
  const [selectedCols, setSelectedCols] = useState<string[]>([...displayColumns])
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const toggleCol = (col: string) => {
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  /** Builds a CSV or JSON blob from the selected columns and triggers a download. */
  const handleExport = () => {
    if (selectedCols.length === 0) return

    const rows = companies.map((c) => {
      const obj: Record<string, string> = {}
      for (const col of selectedCols) {
        obj[col] = (c.fields?.[col] ?? '').toString()
      }
      if (c.lat != null) obj['Latitude'] = String(c.lat)
      if (c.lon != null) obj['Longitude'] = String(c.lon)
      return obj
    })

    let blob: Blob
    let filename: string

    if (format === 'json') {
      blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
      filename = `export-${Date.now()}.json`
    } else {
      const allKeys = selectedCols.concat(rows[0]?.Latitude != null ? ['Latitude', 'Longitude'] : [])
      const csvLines = [
        allKeys.map((k) => `"${k.replace(/"/g, '""')}"`).join(','),
        ...rows.map((r) =>
          allKeys.map((k) => `"${(r[k] ?? '').replace(/"/g, '""')}"`).join(',')
        ),
      ]
      blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      filename = `export-${Date.now()}.csv`
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    onClose()
  }

  const t = isDark
    ? {
        overlay: 'bg-black/50',
        modal: 'bg-gray-900 border-white/10',
        title: 'text-white',
        subtitle: 'text-gray-500',
        closeBtn: 'text-gray-600 hover:text-gray-300',
        sectionLabel: 'text-gray-500',
        check: 'border-white/20 bg-white/5',
        checkActive: 'border-gray-400 bg-gray-400',
        colItem: 'text-gray-400 hover:bg-white/5',
        allBtn: 'text-gray-600 hover:text-gray-400',
        formatBtn: 'text-gray-400 border-white/10 hover:border-white/20',
        formatActive: 'text-gray-900 bg-gray-200 border-gray-200',
        exportBtn: 'bg-white hover:bg-gray-200 text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed',
        divider: 'border-white/5',
      }
    : {
        overlay: 'bg-black/30',
        modal: 'bg-white border-gray-200',
        title: 'text-gray-900',
        subtitle: 'text-gray-400',
        closeBtn: 'text-gray-400 hover:text-gray-700',
        sectionLabel: 'text-gray-400',
        check: 'border-gray-300 bg-white',
        checkActive: 'border-blue-600 bg-blue-600',
        colItem: 'text-gray-600 hover:bg-gray-50',
        allBtn: 'text-gray-400 hover:text-gray-600',
        formatBtn: 'text-gray-500 border-gray-200 hover:border-gray-300',
        formatActive: 'text-white bg-blue-600 border-blue-600',
        exportBtn: 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed',
        divider: 'border-gray-100',
      }

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[9000] flex items-center justify-center backdrop-blur-sm ${t.overlay}`}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={`relative w-[400px] max-h-[80vh] flex flex-col rounded-2xl border shadow-2xl ${t.modal}`}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className={`text-base font-semibold ${t.title}`}>Export Results</h2>
            <p className={`text-xs mt-0.5 ${t.subtitle}`}>{companies.length} companies</p>
          </div>
          <button
            onClick={onClose}
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${t.closeBtn}`}
            data-tooltip="Close" data-tooltip-pos="left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Format selection */}
        <div className={`px-5 pb-3 border-b ${t.divider}`}>
          <div className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${t.sectionLabel}`}>Format</div>
          <div className="flex gap-2">
            {(['csv', 'json'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 text-sm font-medium py-2 rounded-lg border transition-all ${format === f ? t.formatActive : t.formatBtn}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Column selection */}
        <div className="px-5 pt-3 pb-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${t.sectionLabel}`}>Fields</span>
            <button onClick={() => setSelectedCols([...displayColumns])} className={`text-[10px] font-medium ${t.allBtn}`}>All</button>
            <button onClick={() => setSelectedCols([])} className={`text-[10px] font-medium ${t.allBtn}`}>None</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 max-h-[300px]">
          {displayColumns.map((col) => {
            const isOn = selectedCols.includes(col)
            return (
              <button
                key={col}
                onClick={() => toggleCol(col)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${t.colItem}`}
              >
                <div className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border transition-all ${isOn ? t.checkActive : t.check}`}>
                  {isOn && (
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] truncate">{col}</span>
              </button>
            )
          })}
        </div>

        <div className={`text-[10px] px-5 py-1 ${t.subtitle}`}>
          Coordinates (lat/lon) are always included.
        </div>

        {/* Export button */}
        <div className={`px-5 py-4 border-t ${t.divider}`}>
          <button
            onClick={handleExport}
            disabled={selectedCols.length === 0}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${t.exportBtn}`}
          >
            Export {format.toUpperCase()} ({selectedCols.length} field{selectedCols.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  )
}
