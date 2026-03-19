'use client'

import { useState } from 'react'
import { Modal, CloseButton, Checkbox } from '@/components/ui'
import { canExportPremium, type UserTier } from '@/lib/usage'
import { useAppLocale } from '@/lib/useAppLocale'

type ExportFormat = 'csv' | 'json' | 'excel' | 'xml' | 'geojson'

const FORMAT_META: { id: ExportFormat; label: string; premium: boolean }[] = [
  { id: 'csv', label: 'CSV', premium: false },
  { id: 'json', label: 'JSON', premium: false },
  { id: 'excel', label: 'Excel', premium: true },
  { id: 'xml', label: 'XML', premium: true },
  { id: 'geojson', label: 'GeoJSON', premium: true },
]

interface Props {
  companies: any[]
  displayColumns: string[]
  isDark: boolean
  userTier: UserTier
  onClose: () => void
  onPaywall: (feature: string) => void
}

/**
 * Modal for exporting search results in multiple formats.
 * Free users get CSV/JSON; premium formats (Excel, XML, GeoJSON) require PAYG+.
 */
export default function ExportModal({ companies, displayColumns, isDark, userTier, onClose, onPaywall }: Props) {
  const [selectedCols, setSelectedCols] = useState<string[]>([...displayColumns])
  const [format, setFormat] = useState<ExportFormat>('csv')
  const isPremium = canExportPremium(userTier)
  const { t: txt } = useAppLocale()

  const toggleCol = (col: string) => {
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  const buildRows = () =>
    companies.map((c) => {
      const obj: Record<string, string> = {}
      for (const col of selectedCols) {
        obj[col] = (c.fields?.[col] ?? '').toString()
      }
      if (c.lat != null) obj['Latitude'] = String(c.lat)
      if (c.lon != null) obj['Longitude'] = String(c.lon)
      return obj
    })

  /** Builds a blob in the chosen format and triggers a download. */
  const handleExport = async () => {
    if (selectedCols.length === 0) return

    const rows = buildRows()
    let blob: Blob
    let filename: string

    if (format === 'json') {
      blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
      filename = `export-${Date.now()}.json`
    } else if (format === 'excel') {
      const XLSX = (await import('xlsx'))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Export')
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      filename = `export-${Date.now()}.xlsx`
    } else if (format === 'xml') {
      const allKeys = Object.keys(rows[0] ?? {})
      const escXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      const xmlRows = rows.map((r) =>
        '  <row>\n' + allKeys.map((k) => `    <${k.replace(/[^a-zA-Z0-9_]/g, '_')}>${escXml(r[k] ?? '')}</${k.replace(/[^a-zA-Z0-9_]/g, '_')}>`).join('\n') + '\n  </row>'
      )
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<data>\n${xmlRows.join('\n')}\n</data>`
      blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' })
      filename = `export-${Date.now()}.xml`
    } else if (format === 'geojson') {
      const features = companies.map((c) => {
        const props: Record<string, string> = {}
        for (const col of selectedCols) {
          props[col] = (c.fields?.[col] ?? '').toString()
        }
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [c.lon ?? 0, c.lat ?? 0] },
          properties: props,
        }
      })
      const geojson = { type: 'FeatureCollection' as const, features }
      blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })
      filename = `export-${Date.now()}.geojson`
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
        exportBtn: 'bg-white hover:bg-gray-200 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
        divider: 'border-white/5',
      }
    : {
        modal: 'bg-white border-gray-200',
        title: 'text-gray-900',
        subtitle: 'text-gray-400',
        closeBtn: 'text-gray-400 hover:text-gray-700',
        sectionLabel: 'text-gray-400',
        check: 'border-gray-300 bg-white',
        checkActive: 'border-violet-600 bg-violet-600',
        colItem: 'text-gray-600 hover:bg-gray-50',
        allBtn: 'text-gray-400 hover:text-gray-600',
        formatBtn: 'text-gray-500 border-gray-200 hover:border-gray-300',
        formatActive: 'text-white bg-violet-600 border-violet-600',
        exportBtn: 'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed',
        divider: 'border-gray-100',
      }

  return (
    <Modal isDark={isDark} onClose={onClose} zIndex="z-[9000]" className={`relative w-full md:w-[400px] max-h-[80vh] flex flex-col ${t.modal}`}>
      {(handleClose) => (<>
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className={`text-base font-semibold ${t.title}`}>{txt.exportResults}</h2>
            <p className={`text-xs mt-0.5 ${t.subtitle}`}>{txt.companies(companies.length)}</p>
          </div>
            <CloseButton onClick={handleClose} isDark={isDark} />
        </div>

        {/* Format selection */}
        <div className={`px-5 pb-3 border-b ${t.divider}`}>
          <div className={`text-xs md:text-[10px] font-semibold uppercase tracking-widest mb-2 ${t.sectionLabel}`}>{txt.format}</div>
          <div className="flex flex-wrap gap-2">
            {FORMAT_META.map((f) => {
              const locked = f.premium && !isPremium
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    if (locked) { onPaywall(txt.premiumFormats); return }
                    setFormat(f.id)
                  }}
                  className={`flex items-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg border transition-all ${
                    locked
                      ? isDark ? 'text-gray-600 border-white/5 opacity-60' : 'text-gray-400 border-gray-200 opacity-60'
                      : format === f.id ? t.formatActive : t.formatBtn
                  }`}
                >
                  {f.label}
                  {locked && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Column selection */}
        <div className="px-5 pt-3 pb-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-xs md:text-[10px] font-semibold uppercase tracking-widest ${t.sectionLabel}`}>{txt.fields}</span>
            <button onClick={() => setSelectedCols([...displayColumns])} className={`text-xs md:text-[10px] font-medium ${t.allBtn}`}>{txt.all}</button>
            <button onClick={() => setSelectedCols([])} className={`text-xs md:text-[10px] font-medium ${t.allBtn}`}>{txt.none}</button>
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
                <Checkbox checked={isOn} isDark={isDark} />
                <span className="text-xs md:text-[11px] truncate">{col}</span>
              </button>
            )
          })}
        </div>

        <div className={`text-xs md:text-[10px] px-5 py-1 ${t.subtitle}`}>
          {txt.coordsIncluded}
        </div>

        {/* Export button */}
        <div className={`px-5 py-4 border-t ${t.divider}`}>
          <button
            onClick={handleExport}
            disabled={selectedCols.length === 0}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${t.exportBtn}`}
          >
            {txt.exportBtn(format.toUpperCase(), selectedCols.length)}
          </button>
        </div>
      </>)}
    </Modal>
  )
}
