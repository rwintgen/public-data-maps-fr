'use client'

import { useState, useEffect, useMemo } from 'react'
import { PRESET_FILTERS, PRESET_GROUPS, applyPresets } from '@/lib/presets'

interface Filter {
  column: string
  operator: 'contains' | 'equals' | 'empty'
  negate: boolean
  value: string
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
 * Applies filters and sort on the full company array via a `useMemo`,
 * then renders a 20-items-per-page paginated view.
 */
export default function CompanyList({
  companies,
  selectedCompany,
  onCompanySelect,
  onExpand,
  isDark,
  listColumns,
  columns,
  sortBy,
  sortDir,
  onSortChange,
  filters,
  onFiltersChange,
  activePresets,
  onPresetsChange,
}: {
  companies: any[]
  selectedCompany: any
  onCompanySelect: (company: any) => void
  onExpand: (company: any) => void
  isDark: boolean
  listColumns: string[]
  columns: string[]
  sortBy: string | null
  sortDir: 'asc' | 'desc'
  onSortChange: (col: string | null, dir: 'asc' | 'desc') => void
  filters: Filter[]
  onFiltersChange: (f: Filter[]) => void
  activePresets: string[]
  onPresetsChange: (ids: string[]) => void
}) {
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null)
  const itemsPerPage = 20

  useEffect(() => {
    setPage(1)
  }, [companies, sortBy, sortDir, filters, activePresets])

  /**
   * Derives the displayable company list by applying active filters,
   * then sorting (numeric-aware, French locale fallback).
   */
  const processed = useMemo(() => {
    let result = [...companies]

    for (const f of filters) {
      if (!f.column) continue
      result = result.filter((c) => {
        const val = (c.fields?.[f.column] ?? '').toString().toLowerCase()
        let match: boolean
        switch (f.operator) {
          case 'contains': match = val.includes(f.value.toLowerCase()); break
          case 'equals': match = val === f.value.toLowerCase(); break
          case 'empty': match = val.length === 0; break
          default: match = true
        }
        return f.negate ? !match : match
      })
    }

    result = applyPresets(result, activePresets)

    if (sortBy) {
      result.sort((a, b) => {
        const va = (a.fields?.[sortBy] ?? '').toString()
        const vb = (b.fields?.[sortBy] ?? '').toString()
        const numA = parseFloat(va)
        const numB = parseFloat(vb)
        // Numeric comparison if both are numbers
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDir === 'asc' ? numA - numB : numB - numA
        }
        const cmp = va.localeCompare(vb, 'fr', { sensitivity: 'base' })
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [companies, filters, activePresets, sortBy, sortDir])

  const totalPages = Math.ceil(processed.length / itemsPerPage)
  const paginatedCompanies = processed.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) setPage(newPage)
  }

  const addFilter = () => {
    onFiltersChange([...filters, { column: columns[0] || '', operator: 'contains', negate: false, value: '' }])
  }
  const removeFilter = (i: number) => {
    onFiltersChange(filters.filter((_, idx) => idx !== i))
  }
  const updateFilter = (i: number, patch: Partial<Filter>) => {
    onFiltersChange(filters.map((f, idx) => idx === i ? { ...f, ...patch } : f))
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
      {/* Header + toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${t.label}`}>Results</h2>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.badge}`}>
            {processed.length}{processed.length !== companies.length ? `/${companies.length}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Sort toggle */}
          <button
            onClick={() => {
              if (sortBy) {
                onSortChange(null, 'asc')
              } else {
                onSortChange(columns[0] || null, 'asc')
              }
            }}
            className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all text-xs ${sortBy ? t.toolbarActive : t.toolbarBtn}`}
            data-tooltip="Sort results" data-tooltip-pos="left"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4 4V4" />
            </svg>
          </button>
          {/* Preset tags toggle */}
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all text-xs ${showPresets || activePresets.length > 0 ? t.toolbarActive : t.toolbarBtn}`}
            data-tooltip="Quick filters" data-tooltip-pos="left"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </button>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all text-xs ${showFilters || filters.length > 0 ? t.toolbarActive : t.toolbarBtn}`}
            data-tooltip="Filter results" data-tooltip-pos="left"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preset tags */}
      {showPresets && (
        <div className={`rounded-lg border p-2 mb-2 ${t.filterBg}`}>
          {PRESET_GROUPS.map((group) => {
            const presets = PRESET_FILTERS.filter((p) => p.group === group)
            return (
              <div key={group} className="mb-1.5 last:mb-0">
                <div className={`text-[9px] uppercase tracking-widest font-semibold mb-0.5 ${t.presetGroup}`}>{group}</div>
                <div className="flex flex-wrap gap-1">
                  {presets.map((preset) => {
                    const isActive = activePresets.includes(preset.id)
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          if (isActive) {
                            onPresetsChange(activePresets.filter((id) => id !== preset.id))
                          } else {
                            onPresetsChange([...activePresets, preset.id])
                          }
                        }}
                        onMouseEnter={() => setHoveredPreset(preset.id)}
                        onMouseLeave={() => setHoveredPreset(null)}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all ${isActive ? t.presetTagActive : t.presetTag}`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {hoveredPreset && (
            <p className={`text-[10px] mt-1.5 ${t.presetGroup}`}>
              {PRESET_FILTERS.find((p) => p.id === hoveredPreset)?.description}
            </p>
          )}
          {activePresets.length > 0 && (
            <button
              onClick={() => onPresetsChange([])}
              className={`text-[10px] font-medium mt-1.5 ${t.filterRemove}`}
            >
              Clear all tags
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className={`rounded-lg border p-2 mb-2 space-y-1.5 ${t.filterBg}`}>
          {filters.map((f, i) => (
            <div key={i} className="flex items-center gap-1 min-w-0">
              <ColSelect
                value={f.column}
                onChange={(v) => updateFilter(i, { column: v })}
                columns={columns}
                className={`flex-1 min-w-0 rounded border h-[26px] ${t.select}`}
              />
              <button
                onClick={() => updateFilter(i, { negate: !f.negate })}
                className={`flex-shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 border transition-colors ${
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
          ))}
          <button
            onClick={addFilter}
            className={`text-[10px] font-medium ${t.sortIcon}`}
          >
            + Add filter
          </button>
        </div>
      )}

      {/* Sort bar */}
      {sortBy !== null && (
        <div className={`rounded-lg border p-2 mb-2 ${t.filterBg}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`flex-shrink-0 text-[10px] uppercase tracking-widest font-semibold ${t.fieldLabel}`}>Sort</span>
            <ColSelect
              value={sortBy}
              onChange={(v) => onSortChange(v, sortDir)}
              columns={columns}
              className={`flex-1 min-w-0 rounded-md border h-[26px] ${t.select}`}
            />
            <button
              onClick={() => onSortChange(sortBy, sortDir === 'asc' ? 'desc' : 'asc')}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${t.activeSortIcon}`}
              data-tooltip={sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'}
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => onSortChange(null, 'asc')}
              className={`transition-colors ${t.filterRemove}`}
              data-tooltip="Clear sort"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
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
                            {val || '—'}
                          </p>
                        )
                      }
                      return (
                        <span key={col} className={`text-xs ${t.itemSub}`}>
                          {ci === 1 ? '' : ' · '}{val}
                        </span>
                      )
                    })
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onExpand(company) }}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center ${t.toolbarBtn}`}
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
            className={`text-xs font-medium disabled:opacity-30 transition-colors px-2 py-1 ${t.paginationBtn}`}
            data-tooltip="Previous page"
          >
            ← Prev
          </button>
          <span className={`text-xs ${t.paginationNum}`}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className={`text-xs font-medium disabled:opacity-30 transition-colors px-2 py-1 ${t.paginationBtn}`}
            data-tooltip="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
