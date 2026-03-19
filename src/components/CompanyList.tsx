'use client'

import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { PRESET_FILTERS, PRESET_GROUPS, applyPresets, type CustomPreset } from '@/lib/presets'
import { canExportPremium, type UserTier } from '@/lib/usage'
import { PresetPill, CardSection, SectionTitle } from '@/components/ui'

interface Filter {
  column: string
  operator: 'contains' | 'equals' | 'empty'
  negate: boolean
  value: string
  joinOr?: boolean
}

interface SortCriterion {
  column: string
  dir: 'asc' | 'desc'
}

/**
 * Transparent native `<select>` overlaid on a truncated text label.
 * Preserves all native keyboard/accessibility behaviour while
 * allowing fully custom display styling via the parent container.
 */
function ColSelect({ value, onChange, columns, className }: {
  value: string
  onChange: (val: string) => void
  columns: string[]
  className?: string
}) {
  return (
    <div className={`relative min-w-0 flex items-center ${className ?? ''}`}>
      <span className="absolute inset-0 flex items-center px-1 text-xs truncate pointer-events-none select-none" aria-hidden>
        {value}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="relative w-full h-full opacity-0 cursor-pointer text-xs"
        style={{ minWidth: 0 }}
      >
        {columns.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}

/**
 * Paginated, sortable, filterable list of establishments.
 * Supports multi-criteria sorting (up to 5 levels), filter conditions,
 * and quick filters. Renders a 20-items-per-page paginated view.
 */
function CompanyList({
  companies,
  selectedCompany,
  onCompanySelect,
  onExpand,
  isDark,
  listColumns,
  columns,
  sortCriteria,
  onSortChange,
  filters,
  onFiltersChange,
  activePresets,
  onPresetsChange,
  customPresets,
  onCustomPresetsChange,
  disabledPresetIds = [],
  userTier,
  orgQuickFilters = [],
  orgRole,
  canSave,
  hasSearchArea,
  onSaveSearch,
  onSignInPrompt,
  onPaywall,
}: {
  companies: any[]
  selectedCompany: any
  onCompanySelect: (company: any) => void
  onExpand: (company: any) => void
  isDark: boolean
  listColumns: string[]
  columns: string[]
  sortCriteria: SortCriterion[]
  onSortChange: (criteria: SortCriterion[]) => void
  filters: Filter[]
  onFiltersChange: (f: Filter[]) => void
  activePresets: string[]
  onPresetsChange: (ids: string[]) => void
  customPresets: CustomPreset[]
  onCustomPresetsChange: (presets: CustomPreset[]) => void
  disabledPresetIds?: string[]
  userTier: UserTier
  orgQuickFilters?: CustomPreset[]
  orgRole?: 'owner' | 'admin' | 'member' | null
  canSave: boolean
  hasSearchArea: boolean
  onSaveSearch: (name: string) => Promise<void>
  onSignInPrompt: () => void
  onPaywall: (feature: string) => void
}) {
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null)
  const [presetTooltipPos, setPresetTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [chipsExpanded, setChipsExpanded] = useState(false)
  const [saveNotice, setSaveNotice] = useState(false)
  const [customLabelForm, setCustomLabelForm] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColumn, setNewLabelColumn] = useState('')
  const [newLabelOperator, setNewLabelOperator] = useState<'contains' | 'equals' | 'empty'>('contains')
  const [newLabelNegate, setNewLabelNegate] = useState(false)
  const [newLabelValue, setNewLabelValue] = useState('')
  const saveInputRef = useRef<HTMLInputElement>(null)
  const itemsPerPage = 20

  useEffect(() => {
    setPage(1)
  }, [companies, sortCriteria, filters, activePresets])

  const processed = useMemo(() => {
    let result = [...companies]

    result = applyPresets(result, activePresets, [...customPresets, ...orgQuickFilters])

    if (sortCriteria.length > 0) {
      result.sort((a, b) => {
        for (const sc of sortCriteria) {
          const va = (a.fields?.[sc.column] ?? '').toString()
          const vb = (b.fields?.[sc.column] ?? '').toString()
          const numA = parseFloat(va)
          const numB = parseFloat(vb)
          let cmp: number
          if (!isNaN(numA) && !isNaN(numB)) {
            cmp = numA - numB
          } else {
            cmp = va.localeCompare(vb, 'fr', { sensitivity: 'base' })
          }
          if (cmp !== 0) return sc.dir === 'asc' ? cmp : -cmp
        }
        return 0
      })
    }

    return result
  }, [companies, activePresets, customPresets, sortCriteria])

  const totalPages = Math.ceil(processed.length / itemsPerPage)
  const paginatedCompanies = processed.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) setPage(newPage)
  }

  const addFilter = () => {
    onFiltersChange([...filters, { column: columns[0] || '', operator: 'contains', negate: false, value: '', joinOr: false }])
  }
  const removeFilter = (i: number) => {
    onFiltersChange(filters.filter((_, idx) => idx !== i))
  }
  const updateFilter = (i: number, patch: Partial<Filter>) => {
    onFiltersChange(filters.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  }

  const addSortCriterion = () => {
    if (sortCriteria.length >= 5) return
    onSortChange([...sortCriteria, { column: columns[0] || '', dir: 'asc' }])
  }
  const removeSortCriterion = (i: number) => {
    onSortChange(sortCriteria.filter((_, idx) => idx !== i))
  }
  const updateSortCriterion = (i: number, patch: Partial<SortCriterion>) => {
    onSortChange(sortCriteria.map((sc, idx) => idx === i ? { ...sc, ...patch } : sc))
  }

  const handleSave = async () => {
    if (!isSaving) {
      setIsSaving(true)
      setSaveName('')
      setTimeout(() => saveInputRef.current?.focus(), 50)
      return
    }
    if (saveName.trim()) {
      await onSaveSearch(saveName.trim())
      setIsSaving(false)
      setSaveName('')
    }
  }

  const hasActiveItems = activePresets.length > 0 || filters.length > 0 || sortCriteria.length > 0

  const clearAll = () => {
    onPresetsChange([])
    onFiltersChange([])
    onSortChange([])
  }

  const t = isDark
    ? {
        emptyText: 'text-gray-400',
        label: 'text-gray-400',
        badge: 'text-gray-500 bg-gray-800/50',
        itemHover: 'hover:bg-white/5',
        itemSelectedBg: 'bg-white/8 border-white/20 shadow-sm shadow-white/5',
        itemText: 'text-gray-200',
        itemSub: 'text-gray-500',
        paginationBorder: 'border-white/5',
        paginationBtn: 'text-gray-400 hover:text-white disabled:hover:text-gray-400',
        paginationNum: 'text-gray-500',
        toolbarBtn: 'text-gray-500 hover:text-gray-300 bg-white/5 hover:bg-white/10 border-white/10',
        toolbarActive: 'text-white bg-white/10 border-white/20',
        presetTag: 'bg-white/5 text-gray-500 border-white/8 hover:bg-white/10 hover:text-gray-300',
        presetTagActive: 'bg-white/15 text-white border-white/25',
        presetGroup: 'text-gray-600',
        select: 'bg-white/5 border-white/10 text-gray-300 text-xs',
        input: 'bg-white/5 border-white/10 text-gray-300 text-xs placeholder-gray-600',
        filterBg: 'bg-white/3 border-white/5',
        filterRemove: 'text-gray-600 hover:text-red-400',
        sortIcon: 'text-gray-500 hover:text-gray-300',
        activeSortIcon: 'text-white',
        fieldLabel: 'text-gray-600',
        chipClear: 'text-gray-600 hover:text-gray-300',
        saveBtn: 'text-gray-500 hover:text-gray-300 bg-white/5 hover:bg-white/10 border-white/10',
        saveInput: 'border-white/15 bg-white/5',
        customTag: 'bg-white/5 text-gray-500 border-white/8 hover:bg-white/10 hover:text-gray-300',
        customTagActive: 'bg-white/15 text-white border-white/25',
      }
    : {
        emptyText: 'text-gray-500',
        label: 'text-gray-500',
        badge: 'text-gray-500 bg-gray-100',
        itemHover: 'hover:bg-gray-100',
        itemSelectedBg: 'bg-violet-50 border-violet-300 shadow-sm shadow-violet-100',
        itemText: 'text-gray-800',
        itemSub: 'text-gray-400',
        paginationBorder: 'border-gray-200',
        paginationBtn: 'text-gray-500 hover:text-gray-900 disabled:hover:text-gray-500',
        paginationNum: 'text-gray-400',
        toolbarBtn: 'text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200',
        toolbarActive: 'text-violet-600 bg-violet-50 border-violet-300',
        presetTag: 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700',
        presetTagActive: 'bg-violet-50 text-violet-700 border-violet-300',
        presetGroup: 'text-gray-400',
        select: 'bg-white border-gray-200 text-gray-700 text-xs',
        input: 'bg-white border-gray-200 text-gray-700 text-xs placeholder-gray-400',
        filterBg: 'bg-gray-50 border-gray-200',
        filterRemove: 'text-gray-400 hover:text-red-500',
        sortIcon: 'text-gray-400 hover:text-gray-700',
        activeSortIcon: 'text-violet-600',
        fieldLabel: 'text-gray-400',
        chipClear: 'text-gray-400 hover:text-gray-600',
        saveBtn: 'text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200',
        saveInput: 'border-violet-300 bg-gray-50',
        customTag: 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700',
        customTagActive: 'bg-violet-50 text-violet-700 border-violet-300',
      }

  if (companies.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${t.emptyText}`}>
        <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm">Draw a polygon on the map to find companies</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${t.label}`}>Results</h2>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.badge}`}>
            {processed.length}{processed.length !== companies.length ? `/${companies.length}` : ''}
          </span>
          {hasSearchArea && (
            <button
              onClick={() => {
                if (!canSave) {
                  setSaveNotice(true)
                  setTimeout(() => setSaveNotice(false), 5000)
                  return
                }
                if (isSaving) {
                  setIsSaving(false)
                  setSaveName('')
                } else {
                  setIsSaving(true)
                  setSaveName('')
                  setTimeout(() => saveInputRef.current?.focus(), 50)
                }
              }}
              className={`w-9 h-9 md:w-7 md:h-7 rounded-md flex items-center justify-center border transition-all ${isSaving ? t.toolbarActive : t.toolbarBtn}`}
              data-tooltip="Save search" data-tooltip-pos="left"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className={`w-9 h-9 md:w-7 md:h-7 rounded-md flex items-center justify-center border transition-all text-xs ${showSort ? t.toolbarActive : t.toolbarBtn}`}
              data-tooltip="Sort results" data-tooltip-pos="left"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4 4V4" />
              </svg>
            </button>
            {!showSort && sortCriteria.length > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 z-10 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[11px] md:text-[9px] font-bold px-1 ${isDark ? 'bg-white text-gray-900' : 'bg-violet-600 text-white'}`}>{sortCriteria.length}</span>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className={`w-9 h-9 md:w-7 md:h-7 rounded-md flex items-center justify-center border transition-all text-xs ${showPresets ? t.toolbarActive : t.toolbarBtn}`}
              data-tooltip="Quick filters" data-tooltip-pos="left"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
            {!showPresets && activePresets.length > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 z-10 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[11px] md:text-[9px] font-bold px-1 ${isDark ? 'bg-white text-gray-900' : 'bg-violet-600 text-white'}`}>{activePresets.length}</span>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-9 h-9 md:w-7 md:h-7 rounded-md flex items-center justify-center border transition-all text-xs ${showFilters ? t.toolbarActive : t.toolbarBtn}`}
              data-tooltip="Filter results" data-tooltip-pos="left"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            {!showFilters && filters.length > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 z-10 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[11px] md:text-[9px] font-bold px-1 ${isDark ? 'bg-white text-gray-900' : 'bg-violet-600 text-white'}`}>{filters.length}</span>
            )}
          </div>
        </div>
      </div>

      {saveNotice && (
        <div className={`flex items-center gap-1.5 px-2.5 rounded-lg text-xs md:text-[11px] font-medium animate-save-notice ${isDark ? 'bg-white/5 text-gray-300' : 'bg-violet-50 text-violet-700'}`}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Sign in to save searches</span>
          <button onClick={onSignInPrompt} className={`ml-auto text-xs md:text-[11px] font-semibold underline transition-colors ${isDark ? 'text-gray-200 hover:text-white' : 'text-violet-600 hover:text-violet-800'}`}>Sign in</button>
        </div>
      )}

      {isSaving && (
        <div className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 mb-2 ${t.saveInput}`}>
          <input
            ref={saveInputRef}
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setIsSaving(false); setSaveName('') } }}
            placeholder="Search name…"
            className={`flex-1 min-w-0 text-xs bg-transparent outline-none ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            className={`text-xs md:text-[11px] font-semibold transition-colors px-2 py-1 md:px-1.5 md:py-0.5 rounded ${saveName.trim() ? (isDark ? 'text-gray-300 hover:text-white' : 'text-violet-500 hover:text-violet-400') : isDark ? 'text-gray-600' : 'text-gray-400'}`}
          >
            Save
          </button>
          <button
            onClick={() => { setIsSaving(false); setSaveName('') }}
            className={`text-xs md:text-[11px] font-medium transition-colors px-2 py-1 md:px-1 md:py-0.5 rounded ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Cancel
          </button>
        </div>
      )}

      {hasActiveItems && (
        <div className="flex items-start gap-1 mb-2 min-w-0">
          <div className={`flex-1 min-w-0 ${chipsExpanded ? 'flex flex-wrap' : 'overflow-x-auto flex'} items-center gap-1 scrollbar-none`}>
            {sortCriteria.map((sc, i) => (
              <span key={`sort-${i}`} className={`inline-flex items-center gap-1 text-xs md:text-[10px] font-medium pl-2 pr-1 py-0.5 rounded-full border flex-shrink-0 ${t.presetTagActive}`}>
                <svg className={`w-2.5 h-2.5 ${sc.dir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                {i > 0 && <span className="opacity-50 mr-0.5">#{i + 1}</span>}
                {sc.column.length > 18 ? sc.column.substring(0, 18) + '…' : sc.column}
                <button onClick={() => removeSortCriterion(i)} className="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-black/10">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
            {activePresets.map((id) => {
              const p = PRESET_FILTERS.find((x) => x.id === id)
              const cp = customPresets.find((x) => x.id === id)
              if (p) return (
                <span key={id} className={`inline-flex items-center gap-1 text-xs md:text-[10px] font-medium pl-2 pr-1 py-0.5 rounded-full border flex-shrink-0 ${t.presetTagActive}`}>
                  {p.label}
                  <button onClick={() => onPresetsChange(activePresets.filter((x) => x !== id))} className="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-black/10">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              )
              if (cp) return (
                <span key={id} className={`inline-flex items-center gap-1 text-xs md:text-[10px] font-medium pl-2 pr-1 py-0.5 rounded-full border flex-shrink-0 ${t.customTagActive}`}>
                  {cp.label}
                  <button onClick={() => onPresetsChange(activePresets.filter((x) => x !== id))} className="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-black/10">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              )
              return null
            })}
            {filters.map((f, i) => (
              <span key={`filter-${i}`} className="contents">
                {i > 0 && (
                  <span className={`text-[11px] md:text-[9px] italic flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{f.joinOr ? 'or' : '&'}</span>
                )}
                <span className={`inline-flex items-center gap-1 text-xs md:text-[10px] font-medium pl-2 pr-1 py-0.5 rounded-full border flex-shrink-0 ${t.presetTagActive}`}>
                  {f.column.length > 12 ? f.column.substring(0, 12) + '…' : f.column} {f.negate ? 'NOT ' : ''}{f.operator}{f.operator !== 'empty' && f.value ? ` "${f.value.length > 8 ? f.value.substring(0, 8) + '…' : f.value}"` : ''}
                  <button onClick={() => removeFilter(i)} className="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-black/10">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              </span>
            ))}
          </div>
          <div className="flex-shrink-0 flex items-center gap-0.5 pt-0.5">
            <button
              onClick={() => setChipsExpanded(!chipsExpanded)}
              className={`transition-colors ${t.chipClear}`}
              data-tooltip={chipsExpanded ? 'Collapse' : 'Expand'}
            >
              <svg className={`w-3 h-3 transition-transform ${chipsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={clearAll}
              className={`transition-colors ${t.chipClear}`}
              data-tooltip="Clear all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showSort && (
        <CardSection isDark={isDark} className="mb-2 space-y-1.5">
          {sortCriteria.map((sc, i) => (
            <div key={i} className="flex items-center gap-1.5 min-w-0">
              <span className={`flex-shrink-0 text-xs md:text-[10px] uppercase tracking-widest font-semibold w-3 text-center ${t.fieldLabel}`}>{i + 1}</span>
              <ColSelect
                value={sc.column}
                onChange={(v) => updateSortCriterion(i, { column: v })}
                columns={columns}
                className={`flex-1 min-w-0 rounded-md border h-[26px] ${t.select}`}
              />
              <button
                onClick={() => updateSortCriterion(i, { dir: sc.dir === 'asc' ? 'desc' : 'asc' })}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${t.activeSortIcon}`}
                data-tooltip={sc.dir === 'asc' ? 'Ascending' : 'Descending'}
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${sc.dir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => removeSortCriterion(i)}
                className={`transition-colors ${t.filterRemove}`}
                data-tooltip="Remove"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {sortCriteria.length < 5 && (
            <button
              onClick={addSortCriterion}
              className={`flex items-center text-xs md:text-[10px] font-medium h-6 ${t.sortIcon}`}
            >
              + Add sort {sortCriteria.length > 0 ? 'criterion' : ''}
            </button>
          )}
        </CardSection>
      )}

      {showPresets && (
        <CardSection isDark={isDark} className="mb-2">          {PRESET_GROUPS.map((group) => {
            const presets = PRESET_FILTERS.filter((p) => p.group === group)
            const activeInGroup = presets.filter((p) => activePresets.includes(p.id))
            return (
              <div key={group} className="mb-1.5 last:mb-0">
                <SectionTitle isDark={isDark} className="mb-0.5">{group}</SectionTitle>
                <div className="flex flex-wrap gap-1 items-center">
                  {presets.map((preset) => {
                    const isActive = activePresets.includes(preset.id)
                    const isPreQuery = disabledPresetIds.includes(preset.id)
                    const activeIdx = activeInGroup.indexOf(preset)
                    return (
                      <span key={preset.id} className="contents">
                        {isActive && activeIdx > 0 && (
                          <span className={`text-[11px] md:text-[9px] italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>or</span>
                        )}
                        <PresetPill
                          label={preset.label}
                          active={isActive}
                          isDark={isDark}
                          disabled={isPreQuery}
                          onClick={() => {
                            if (isActive) {
                              onPresetsChange(activePresets.filter((id) => id !== preset.id))
                            } else {
                              onPresetsChange([...activePresets, preset.id])
                            }
                          }}
                          onMouseEnter={() => setHoveredPreset(preset.id)}
                          onMouseMove={(e: React.MouseEvent) => setPresetTooltipPos({ x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => { setHoveredPreset(null); setPresetTooltipPos(null) }}
                          tooltip={isPreQuery ? 'Pre-search filter applied' : undefined}
                          tooltipPos={isPreQuery ? 'bottom-left' : undefined}
                        />
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {activePresets.length > 0 && (
            <button
              onClick={() => onPresetsChange([])}
              className={`text-[10px] font-medium mt-1.5 ${t.filterRemove}`}
            >
              Clear all tags
            </button>
          )}

          {orgQuickFilters.length > 0 && (
            <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <div className="flex items-center justify-between mb-0.5">
                <div className={`text-[11px] md:text-[9px] uppercase tracking-widest font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Organization</div>
                {(orgRole === 'owner' || orgRole === 'admin') && (
                  <a
                    href="/org#settings"
                    className={`text-xs md:text-[10px] font-medium ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Manage
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {orgQuickFilters.map((oq) => {
                  const isActive = activePresets.includes(oq.id)
                  const isPreQuery = disabledPresetIds.includes(oq.id)
                  return (
                    <PresetPill
                      key={oq.id}
                      label={oq.label}
                      active={isActive}
                      isDark={isDark}
                      org
                      disabled={isPreQuery}
                      onClick={() => {
                        if (isActive) onPresetsChange(activePresets.filter((id) => id !== oq.id))
                        else onPresetsChange([...activePresets, oq.id])
                      }}
                      onMouseEnter={() => setHoveredPreset(oq.id)}
                      onMouseMove={(e: React.MouseEvent) => setPresetTooltipPos({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => { setHoveredPreset(null); setPresetTooltipPos(null) }}
                      tooltip={isPreQuery ? 'Pre-search filter applied' : undefined}
                      tooltipPos={isPreQuery ? 'bottom-left' : undefined}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Custom labels section */}
          {canExportPremium(userTier) && (
            <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <div className="flex items-center justify-between mb-0.5">
                <div className={`text-[11px] md:text-[9px] uppercase tracking-widest font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Custom</div>
                <button
                  onClick={() => {
                    setCustomLabelForm(!customLabelForm)
                    if (!customLabelForm && columns.length > 0) setNewLabelColumn(columns[0])
                  }}
                  className={`text-xs md:text-[10px] font-medium ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {customLabelForm ? 'Cancel' : '+ New'}
                </button>
              </div>
              {customPresets.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {customPresets.map((cp) => {
                    const isActive = activePresets.includes(cp.id)
                    const isPreQuery = disabledPresetIds.includes(cp.id)
                    return (
                      <div key={cp.id} className="group/custom inline-flex items-center gap-0.5">
                        <PresetPill
                          label={cp.label}
                          active={isActive}
                          isDark={isDark}
                          custom
                          disabled={isPreQuery}
                          onClick={() => {
                            if (isActive) {
                              onPresetsChange(activePresets.filter((id) => id !== cp.id))
                            } else {
                              onPresetsChange([...activePresets, cp.id])
                            }
                          }}
                          onMouseEnter={() => setHoveredPreset(cp.id)}
                          onMouseMove={(e: React.MouseEvent) => setPresetTooltipPos({ x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => { setHoveredPreset(null); setPresetTooltipPos(null) }}
                          tooltip={isPreQuery ? 'Pre-search filter applied' : undefined}
                          tooltipPos={isPreQuery ? 'bottom-left' : undefined}
                        />
                        <button
                          onClick={() => {
                            onCustomPresetsChange(customPresets.filter((x) => x.id !== cp.id))
                            onPresetsChange(activePresets.filter((id) => id !== cp.id))
                          }}
                          className={`opacity-100 md:opacity-0 md:group-hover/custom:opacity-100 transition-opacity w-3.5 h-3.5 rounded-full flex items-center justify-center ${t.filterRemove}`}
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              {customLabelForm && (
                <div className={`rounded-lg border p-2 space-y-1.5 ${t.filterBg}`}>
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Label name…"
                    className={`w-full rounded border px-1.5 py-1 outline-none ${t.input}`}
                  />
                  <div className="flex items-center gap-1 min-w-0">
                    <ColSelect
                      value={newLabelColumn}
                      onChange={(v) => setNewLabelColumn(v)}
                      columns={columns}
                      className={`flex-1 min-w-0 rounded border h-[26px] ${t.select}`}
                    />
                    <button
                      onClick={() => setNewLabelNegate(!newLabelNegate)}
                      className={`flex-shrink-0 text-xs md:text-[10px] font-bold rounded px-1.5 py-0.5 border transition-colors ${
                        newLabelNegate
                          ? 'text-orange-400 border-orange-500/50 bg-orange-500/10'
                          : isDark ? 'text-gray-600 border-white/10 hover:text-gray-400' : 'text-gray-400 border-gray-200 hover:text-gray-600'
                      }`}
                    >
                      NOT
                    </button>
                    <select
                      value={newLabelOperator}
                      onChange={(e) => setNewLabelOperator(e.target.value as Filter['operator'])}
                      className={`rounded border px-1 py-1 outline-none ${t.select}`}
                    >
                      <option value="contains">contains</option>
                      <option value="equals">equals</option>
                      <option value="empty">empty</option>
                    </select>
                  </div>
                  {newLabelOperator !== 'empty' && (
                    <input
                      type="text"
                      value={newLabelValue}
                      onChange={(e) => setNewLabelValue(e.target.value)}
                      placeholder="value…"
                      className={`w-full rounded border px-1.5 py-1 outline-none ${t.input}`}
                    />
                  )}
                  <button
                    disabled={!newLabelName.trim() || !newLabelColumn}
                    onClick={() => {
                      const id = 'custom_' + Date.now().toString(36)
                      onCustomPresetsChange([...customPresets, {
                        id,
                        label: newLabelName.trim(),
                        column: newLabelColumn,
                        operator: newLabelOperator,
                        negate: newLabelNegate,
                        value: newLabelValue,
                      }])
                      setNewLabelName('')
                      setNewLabelValue('')
                      setNewLabelNegate(false)
                      setCustomLabelForm(false)
                    }}
                    className={`text-xs md:text-[10px] font-semibold py-1 px-3 rounded-lg transition-all disabled:opacity-40 ${
                      isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Create label
                  </button>
                </div>
              )}
            </div>
          )}
          {!canExportPremium(userTier) && (
            <button
              onClick={() => onPaywall('custom labels')}
              className={`flex items-center gap-1.5 text-xs md:text-[10px] font-medium mt-2 pt-2 border-t border-dashed transition-colors ${
                isDark ? 'text-gray-600 hover:text-gray-400 border-white/5' : 'text-gray-400 hover:text-gray-600 border-gray-200'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Custom labels — upgrade to unlock
            </button>
          )}
          {hoveredPreset && presetTooltipPos && (() => {
            const builtIn = PRESET_FILTERS.find((p) => p.id === hoveredPreset)
            const text = builtIn ? builtIn.description
              : (() => { const f = orgQuickFilters.find((p) => p.id === hoveredPreset) ?? customPresets.find((p) => p.id === hoveredPreset); return f ? `${f.negate ? 'NOT ' : ''}${f.column} ${f.operator} ${f.value}` : null })()
            if (!text) return null
            return (
              <div
                className="fixed z-[10000] pointer-events-none whitespace-nowrap"
                style={{ left: presetTooltipPos.x - 8, top: presetTooltipPos.y + 14, background: '#1f2937', color: '#f3f4f6', fontSize: '11px', fontWeight: 500, lineHeight: 1.3, padding: '4px 8px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', transform: 'translateX(-100%)' }}
              >
                {text}
              </div>
            )
          })()}
        </CardSection>
      )}

      {showFilters && (
        <CardSection isDark={isDark} className="mb-2 space-y-0">
          {filters.map((f, i) => (
            <div key={i}>
              {i > 0 && (
                <div className="flex justify-start pl-1 py-0.5">
                  <button
                    onClick={() => updateFilter(i, { joinOr: !f.joinOr })}
                    className={`text-[11px] md:text-[9px] font-bold tracking-wide rounded px-1.5 py-px border transition-colors ${
                      isDark
                        ? 'text-violet-300 border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20'
                        : 'text-violet-700 border-violet-400/60 bg-violet-50 hover:bg-violet-100'
                    }`}
                    data-tooltip={f.joinOr ? 'OR — match either condition' : 'AND — match both conditions'}
                  >
                    {f.joinOr ? 'OR' : 'AND'}
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1 min-w-0">
                <ColSelect
                  value={f.column}
                  onChange={(v) => updateFilter(i, { column: v })}
                  columns={columns}
                  className={`flex-1 min-w-0 rounded border h-[26px] ${t.select}`}
                />
                <button
                  onClick={() => updateFilter(i, { negate: !f.negate })}
                  className={`flex-shrink-0 text-xs md:text-[10px] font-bold rounded px-1.5 py-0.5 border transition-colors ${
                    f.negate
                      ? 'text-orange-400 border-orange-500/50 bg-orange-500/10'
                      : isDark ? 'text-gray-600 border-white/10 hover:text-gray-400' : 'text-gray-400 border-gray-200 hover:text-gray-600'
                  }`}
                  data-tooltip="Negate this filter condition"
                >
                  NOT
                </button>
                <select
                  value={f.operator}
                  onChange={(e) => updateFilter(i, { operator: e.target.value as Filter['operator'] })}
                  className={`rounded border px-1 py-1 outline-none ${t.select}`}
                >
                  <option value="contains">contains</option>
                  <option value="equals">equals</option>
                  <option value="empty">empty</option>
                </select>
                {f.operator !== 'empty' && (
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => updateFilter(i, { value: e.target.value })}
                    placeholder="value…"
                    className={`flex-1 min-w-0 rounded border px-1.5 py-1 outline-none ${t.input}`}
                  />
                )}
                <button onClick={() => removeFilter(i)} className={`flex-shrink-0 ${t.filterRemove}`} data-tooltip="Remove filter">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addFilter}
            className={`flex items-center text-xs md:text-[10px] font-medium h-6 ${t.sortIcon}`}
          >
            + Add filter
          </button>
        </CardSection>
      )}

      <ul className="flex-1 space-y-1 overflow-y-auto">
        {paginatedCompanies.map((company, idx) => {
          const companyId = company.fields?.SIRET || `row-${idx}`
          const isSelected = selectedCompany && (selectedCompany.fields?.SIRET === company.fields?.SIRET)
          return (
            <li
              key={companyId}
              onClick={() => onCompanySelect(company)}
              className={`cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-150 border group relative ${
                isSelected
                  ? t.itemSelectedBg
                  : `border-transparent ${t.itemHover}`
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {listColumns.length === 0 ? (
                    <p className={`text-xs italic ${t.itemSub}`}>No columns selected</p>
                  ) : (
                    listColumns.map((col, ci) => {
                      const val = company.fields?.[col] ?? ''
                      if (ci === 0) {
                        return (
                          <p key={col} className={`text-sm font-medium leading-tight truncate ${isSelected ? (isDark ? 'text-white' : 'text-violet-600') : t.itemText}`}>
                            {val || '\u2014'}
                          </p>
                        )
                      }
                      return (
                        <span key={col} className={`text-xs ${t.itemSub}`}>
                          {ci === 1 ? '' : ' \u00b7 '}{val}
                        </span>
                      )
                    })
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onExpand(company) }}
                  className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 w-8 h-8 md:w-6 md:h-6 rounded-md flex items-center justify-center ${t.toolbarBtn}`}
                  data-tooltip="View details" data-tooltip-pos="left"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {totalPages > 1 && (
        <div className={`flex items-center justify-between pt-3 mt-3 border-t ${t.paginationBorder}`}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className={`text-sm md:text-xs font-medium disabled:opacity-30 transition-colors px-4 py-2.5 md:px-2 md:py-1 ${t.paginationBtn}`}
            data-tooltip="Previous page"
          >
            &larr; Prev
          </button>
          <span className={`text-xs ${t.paginationNum}`}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className={`text-sm md:text-xs font-medium disabled:opacity-30 transition-colors px-4 py-2.5 md:px-2 md:py-1 ${t.paginationBtn}`}
            data-tooltip="Next page"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  )
}

export default memo(CompanyList)
