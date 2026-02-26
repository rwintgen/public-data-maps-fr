'use client'

import { useState, useEffect, useMemo } from 'react'

interface Filter {
  column: string
  operator: 'contains' | 'equals' | 'not_empty'
  value: string
}

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
}) {
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const itemsPerPage = 20

  useEffect(() => {
    setPage(1)
  }, [companies, sortBy, sortDir, filters])

  // Apply filters then sort
  const processed = useMemo(() => {
    let result = [...companies]

    // Filters
    for (const f of filters) {
      if (!f.column) continue
      result = result.filter((c) => {
        const val = (c.fields?.[f.column] ?? '').toString().toLowerCase()
        switch (f.operator) {
          case 'contains': return val.includes(f.value.toLowerCase())
          case 'equals': return val === f.value.toLowerCase()
          case 'not_empty': return val.length > 0
          default: return true
        }
      })
    }

    // Sort
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
  }, [companies, filters, sortBy, sortDir])

  const totalPages = Math.ceil(processed.length / itemsPerPage)
  const paginatedCompanies = processed.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) setPage(newPage)
  }

  const addFilter = () => {
    onFiltersChange([...filters, { column: columns[0] || '', operator: 'contains', value: '' }])
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
        itemSelectedBg: 'bg-blue-500/15 border-blue-500/40 shadow-sm shadow-blue-500/10',
        itemText: 'text-gray-200',
        itemSub: 'text-gray-500',
        paginationBorder: 'border-white/5',
        paginationBtn: 'text-gray-400 hover:text-white disabled:hover:text-gray-400',
        paginationNum: 'text-gray-500',
        toolbarBtn: 'text-gray-500 hover:text-gray-300 bg-white/5 hover:bg-white/10 border-white/10',
        toolbarActive: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
        select: 'bg-white/5 border-white/10 text-gray-300 text-xs',
        input: 'bg-white/5 border-white/10 text-gray-300 text-xs placeholder-gray-600',
        filterBg: 'bg-white/3 border-white/5',
        filterRemove: 'text-gray-600 hover:text-red-400',
        sortIcon: 'text-gray-500 hover:text-gray-300',
        activeSortIcon: 'text-blue-400',
        fieldLabel: 'text-gray-600',
      }
    : {
        emptyText: 'text-gray-500',
        label: 'text-gray-500',
        badge: 'text-gray-500 bg-gray-100',
        itemHover: 'hover:bg-gray-100',
        itemSelectedBg: 'bg-blue-50 border-blue-300 shadow-sm shadow-blue-100',
        itemText: 'text-gray-800',
        itemSub: 'text-gray-400',
        paginationBorder: 'border-gray-200',
        paginationBtn: 'text-gray-500 hover:text-gray-900 disabled:hover:text-gray-500',
        paginationNum: 'text-gray-400',
        toolbarBtn: 'text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200',
        toolbarActive: 'text-blue-600 bg-blue-50 border-blue-300',
        select: 'bg-white border-gray-200 text-gray-700 text-xs',
        input: 'bg-white border-gray-200 text-gray-700 text-xs placeholder-gray-400',
        filterBg: 'bg-gray-50 border-gray-200',
        filterRemove: 'text-gray-400 hover:text-red-500',
        sortIcon: 'text-gray-400 hover:text-gray-700',
        activeSortIcon: 'text-blue-600',
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
    <div className="flex flex-col h-full">
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
            title="Sort"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4 4V4" />
            </svg>
          </button>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all text-xs ${filters.length > 0 ? t.toolbarActive : t.toolbarBtn}`}
            title="Filter"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sort bar */}
      {sortBy !== null && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`text-[10px] uppercase tracking-widest font-semibold ${t.fieldLabel}`}>Sort</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value, sortDir)}
            className={`flex-1 rounded-md border px-1.5 py-1 outline-none ${t.select}`}
          >
            {columns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => onSortChange(sortBy, sortDir === 'asc' ? 'desc' : 'asc')}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${t.activeSortIcon}`}
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => onSortChange(null, 'asc')}
            className={`transition-colors ${t.filterRemove}`}
            title="Clear sort"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className={`rounded-lg border p-2 mb-2 space-y-1.5 ${t.filterBg}`}>
          {filters.map((f, i) => (
            <div key={i} className="flex items-center gap-1">
              <select
                value={f.column}
                onChange={(e) => updateFilter(i, { column: e.target.value })}
                className={`flex-1 min-w-0 rounded border px-1 py-1 outline-none ${t.select}`}
              >
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={f.operator}
                onChange={(e) => updateFilter(i, { operator: e.target.value as Filter['operator'] })}
                className={`rounded border px-1 py-1 outline-none ${t.select}`}
              >
                <option value="contains">contains</option>
                <option value="equals">equals</option>
                <option value="not_empty">not empty</option>
              </select>
              {f.operator !== 'not_empty' && (
                <input
                  type="text"
                  value={f.value}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  placeholder="value…"
                  className={`flex-1 min-w-0 rounded border px-1.5 py-1 outline-none ${t.input}`}
                />
              )}
              <button onClick={() => removeFilter(i)} className={`flex-shrink-0 ${t.filterRemove}`}>
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
                          <p key={col} className={`text-sm font-medium leading-tight truncate ${isSelected ? 'text-blue-500' : t.itemText}`}>
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
                  title="View details"
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
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
