'use client'

import { type UserTier, TIER_LIMITS } from '@/lib/usage'

interface UsageTrackerProps {
  isDark: boolean
  userTier: UserTier
  searchCount: number
  aiOverviewCount: number
  savedSearchCount: number
  isLoggedIn: boolean
  isOpen: boolean
  onToggle: () => void
}

interface UsageRow {
  label: string
  current: number
  limit: number | null
  unavailable?: boolean
}

/**
 * Collapsible panel displaying current usage of tier-limited features.
 * Styled to match the SavedSearches section in the settings dropdown.
 */
export default function UsageTracker({ isDark, userTier, searchCount, aiOverviewCount, savedSearchCount, isLoggedIn, isOpen, onToggle }: UsageTrackerProps) {
  const limits = TIER_LIMITS[userTier]

  const allRows: UsageRow[] = [
    {
      label: 'Searches this month',
      current: searchCount,
      limit: limits.searchesPerMonth === Infinity ? null : limits.searchesPerMonth,
    },
    {
      label: 'AI overviews this month',
      current: aiOverviewCount,
      limit: limits.aiOverviewsPerMonth === Infinity ? null : limits.aiOverviewsPerMonth === 0 ? null : limits.aiOverviewsPerMonth,
      unavailable: limits.aiOverviewsPerMonth === 0,
    },
    {
      label: 'Saved searches',
      current: savedSearchCount,
      limit: limits.savedSearches === Infinity ? null : limits.savedSearches,
      unavailable: !isLoggedIn,
    },
    {
      label: 'Results per query',
      current: 0,
      limit: limits.resultsPerQuery,
    },
  ]

  const rows = allRows

  const t = isDark
    ? {
        label: 'text-gray-400 hover:text-gray-200',
        rowLabel: 'text-gray-400',
        rowValue: 'text-gray-300',
        barBg: 'bg-white/10',
        barFill: 'bg-gray-400',
        barWarn: 'bg-amber-500',
        unlimited: 'text-gray-500',
        unavailable: 'text-gray-600',
        badge: 'text-gray-500 bg-white/5',
      }
    : {
        label: 'text-gray-500 hover:text-gray-800',
        rowLabel: 'text-gray-500',
        rowValue: 'text-gray-700',
        barBg: 'bg-gray-200',
        barFill: 'bg-violet-500',
        barWarn: 'bg-amber-500',
        unlimited: 'text-gray-400',
        unavailable: 'text-gray-400',
        badge: 'text-gray-500 bg-gray-100',
      }

  const tierLabel = userTier === 'payg' ? 'Pay-as-you-go' : userTier.charAt(0).toUpperCase() + userTier.slice(1)

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${t.label}`}
        >
          <span>Usage</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${t.badge}`}>{tierLabel}</span>
      </div>

      {isOpen && (
        <div className="mt-2 space-y-2.5">
          {rows.map((row) => {
            if (row.unavailable) {
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[11px] ${t.rowLabel}`}>{row.label}</span>
                    <span className={`text-[10px] italic ${t.unavailable}`}>Unavailable</span>
                  </div>
                </div>
              )
            }

            if (row.limit === null) {
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[11px] ${t.rowLabel}`}>{row.label}</span>
                    <span className={`text-[10px] ${t.unlimited}`}>{row.current} · Unlimited</span>
                  </div>
                </div>
              )
            }

            if (row.label === 'Results per query') {
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[11px] ${t.rowLabel}`}>{row.label}</span>
                    <span className={`text-[10px] ${t.rowValue}`}>Up to {row.limit.toLocaleString()}</span>
                  </div>
                </div>
              )
            }

            const pct = Math.min((row.current / row.limit) * 100, 100)
            const isWarning = pct >= 80

            return (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[11px] ${t.rowLabel}`}>{row.label}</span>
                  <span className={`text-[10px] ${isWarning ? 'text-amber-500 font-medium' : t.rowValue}`}>
                    {row.current} / {row.limit}
                  </span>
                </div>
                <div className={`h-1 rounded-full overflow-hidden ${t.barBg}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${isWarning ? t.barWarn : t.barFill}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
