'use client'

import { useState } from 'react'
import { Modal, CloseButton, Checkbox } from '@/components/ui'
import { getDefaultHiddenFields, getDefaultListColumns, getDefaultPopupColumns } from '@/lib/defaultFields'

interface Props {
  columns: string[]
  listColumns: string[]
  popupColumns: string[]
  hiddenFields: string[]
  onListColumnsChange: (cols: string[]) => void
  onPopupColumnsChange: (cols: string[]) => void
  onHiddenFieldsChange: (cols: string[]) => void
  isDark: boolean
  initialTab?: 'global' | 'list' | 'popup'
  onClose: () => void
}

export default function ColumnConfig({
  columns,
  listColumns,
  popupColumns,
  hiddenFields,
  onListColumnsChange,
  onPopupColumnsChange,
  onHiddenFieldsChange,
  isDark,
  initialTab,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'global' | 'list' | 'popup'>(initialTab ?? 'global')
  const [query, setQuery] = useState('')

  const visibleColumns = columns.filter((col) => !hiddenFields.includes(col))

  const activeCols = tab === 'global'
    ? visibleColumns
    : tab === 'list'
      ? listColumns
      : popupColumns

  const setActiveCols = (cols: string[]) => {
    if (tab === 'global') {
      onHiddenFieldsChange(columns.filter((col) => !cols.includes(col)))
      return
    }
    if (tab === 'list') {
      onListColumnsChange(cols)
      return
    }
    onPopupColumnsChange(cols)
  }

  const toggle = (col: string) => {
    if (activeCols.includes(col)) {
      setActiveCols(activeCols.filter((c) => c !== col))
    } else {
      setActiveCols([...activeCols, col])
    }
  }

  const selectableColumns = tab === 'global' ? columns : visibleColumns
  const filteredColumns = selectableColumns.filter((col) => col.toLowerCase().includes(query.trim().toLowerCase()))

  const allOn = () => setActiveCols([...selectableColumns])
  const allOff = () => setActiveCols([])
  const restoreDefaults = () => {
    if (tab === 'global') {
      onHiddenFieldsChange(getDefaultHiddenFields(columns))
      return
    }
    if (tab === 'list') {
      onListColumnsChange(getDefaultListColumns(columns))
      return
    }
    onPopupColumnsChange(getDefaultPopupColumns(columns))
  }

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
        tabActive: 'text-gray-900 border-violet-600',
        tab: 'text-gray-400 hover:text-gray-700',
        tabBorder: 'border-gray-100',
        allBtn: 'text-gray-400 hover:text-gray-700',
        item: 'hover:bg-gray-50',
        itemText: 'text-gray-700',
        check: 'border-gray-300 bg-white',
        checkActive: 'border-violet-600 bg-violet-600',
      }

  return (
    <Modal isDark={isDark} onClose={onClose} zIndex="z-[9000]" className={`w-full md:w-[400px] max-h-[85vh] flex flex-col overflow-hidden ${t.bg}`}>
      {(handleClose) => (<>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className={`text-sm font-semibold ${t.title}`}>Default Fields</h3>
        <CloseButton onClick={handleClose} isDark={isDark} />
      </div>

      {/* Tabs */}
      <div className={`flex gap-3 px-4 border-b ${t.tabBorder}`}>
        {(['global', 'list', 'popup'] as const).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`pb-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t_
                ? t.tabActive
                : `${t.tab} border-transparent`
            }`}
          >
            {t_ === 'global' ? 'Global' : t_ === 'list' ? 'Result List' : 'Map Popup'}
          </button>
        ))}
      </div>

      {/* Select All/None */}
      <div className="flex gap-3 px-4 pt-2">
        <button onClick={allOn} className={`text-[10px] font-medium ${t.allBtn}`}>Select all</button>
        <button onClick={allOff} className={`text-[10px] font-medium ${t.allBtn}`}>Select none</button>
        <button onClick={restoreDefaults} className={`text-[10px] font-medium ${t.allBtn}`}>Restore default</button>
      </div>

      <div className="px-4 pt-2 pb-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fields..."
          className={`w-full rounded-md border px-2 py-1 text-xs outline-none transition-colors ${
            isDark
              ? 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-white/30'
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400'
          }`}
        />
      </div>

      {/* Column list */}
      <div className="max-h-[280px] overflow-y-auto px-2 py-1">
        {filteredColumns.map((col) => {
          const isActive = activeCols.includes(col)
          return (
            <button
              key={col}
              onClick={() => toggle(col)}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors ${t.item}`}
            >
              <Checkbox checked={isActive} isDark={isDark} />
              <span className={`text-[11px] truncate ${t.itemText}`}>{col}</span>
            </button>
          )
        })}
        {filteredColumns.length === 0 && (
          <p className={`px-2 py-2 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            No fields match your search.
          </p>
        )}
      </div>
      </>)}
    </Modal>
  )
}
