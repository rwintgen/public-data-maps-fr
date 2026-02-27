'use client'

import { useState } from 'react'

interface Props {
  columns: string[]
  listColumns: string[]
  popupColumns: string[]
  onListColumnsChange: (cols: string[]) => void
  onPopupColumnsChange: (cols: string[]) => void
  isDark: boolean
  onClose: () => void
}

export default function ColumnConfig({
  columns,
  listColumns,
  popupColumns,
  onListColumnsChange,
  onPopupColumnsChange,
  isDark,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'list' | 'popup'>('list')

  const activeCols = tab === 'list' ? listColumns : popupColumns
  const setActiveCols = tab === 'list' ? onListColumnsChange : onPopupColumnsChange

  const toggle = (col: string) => {
    if (activeCols.includes(col)) {
      setActiveCols(activeCols.filter((c) => c !== col))
    } else {
      setActiveCols([...activeCols, col])
    }
  }

  const allOn = () => setActiveCols([...columns])
  const allOff = () => setActiveCols([])

  const t = isDark
    ? {
        bg: 'bg-gray-900 border-white/10',
        title: 'text-white',
        closeBtn: 'text-gray-600 hover:text-gray-300',
        tabActive: 'text-white border-white/60',
        tab: 'text-gray-500 hover:text-gray-300',
        tabBorder: 'border-white/8',
        allBtn: 'text-gray-500 hover:text-gray-300',
        item: 'hover:bg-white/5',
        itemText: 'text-gray-300',
        check: 'border-white/20 bg-white/5',
        checkActive: 'border-gray-400 bg-gray-400',
      }
    : {
        bg: 'bg-white border-gray-200',
        title: 'text-gray-900',
        closeBtn: 'text-gray-400 hover:text-gray-700',
        tabActive: 'text-gray-900 border-blue-600',
        tab: 'text-gray-400 hover:text-gray-700',
        tabBorder: 'border-gray-100',
        allBtn: 'text-gray-400 hover:text-gray-700',
        item: 'hover:bg-gray-50',
        itemText: 'text-gray-700',
        check: 'border-gray-300 bg-white',
        checkActive: 'border-blue-600 bg-blue-600',
      }

  return (
    <div className={`rounded-2xl border shadow-2xl overflow-hidden ${t.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className={`text-sm font-semibold ${t.title}`}>Visible Columns</h3>
        <button onClick={onClose} className={`transition-colors ${t.closeBtn}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex gap-3 px-4 border-b ${t.tabBorder}`}>
        {(['list', 'popup'] as const).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`pb-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t_
                ? t.tabActive
                : `${t.tab} border-transparent`
            }`}
          >
            {t_ === 'list' ? 'Result List' : 'Map Popup'}
          </button>
        ))}
      </div>

      {/* Select All/None */}
      <div className="flex gap-3 px-4 pt-2">
        <button onClick={allOn} className={`text-[10px] font-medium ${t.allBtn}`}>Select all</button>
        <button onClick={allOff} className={`text-[10px] font-medium ${t.allBtn}`}>Select none</button>
      </div>

      {/* Column list */}
      <div className="max-h-[280px] overflow-y-auto px-2 py-1">
        {columns.map((col) => {
          const isActive = activeCols.includes(col)
          return (
            <button
              key={col}
              onClick={() => toggle(col)}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors ${t.item}`}
            >
              <div
                className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
                  isActive ? t.checkActive : t.check
                }`}
              >
                {isActive && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-xs truncate ${t.itemText}`}>{col}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
