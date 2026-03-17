'use client'

import { useState } from 'react'
import { Modal, CloseButton, PresetPill, SectionTitle } from './ui'
import SavedSearches from './SavedSearches'
import UsageTracker from './UsageTracker'
import { PRESET_FILTERS, PRESET_GROUPS } from '@/lib/presets'
import { TIER_LIMITS, getResultLimit, MAX_ENTERPRISE_RESULT_LIMIT, canUsePresets, type UserTier } from '@/lib/usage'

interface AIOverviewEntry {
  siret: string
  companyName: string
  city: string
  createdAt: string
}

interface Filter {
  column: string
  operator: 'contains' | 'equals' | 'empty'
  negate: boolean
  value: string
  joinOr?: boolean
}

interface SettingsModalProps {
  isDark: boolean
  onClose: () => void
  user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null; emailVerified: boolean; providerId: string | null } | null
  userTier: UserTier
  themeMode: 'system' | 'light' | 'dark'
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void
  mapStyle: 'default' | 'themed' | 'satellite'
  setMapStyle: (style: 'default' | 'themed' | 'satellite') => void
  listColumns: string[]
  popupColumns: string[]
  onFieldsModal: (tab: 'list' | 'popup') => void
  onManagePlan: () => void
  onPaywall: (feature: string) => void
  onDeleteAccount: () => void
  onSignOut: () => void
  onSignIn: () => void
  prefsSaved: boolean
  searchCount: number
  aiOverviewCount: number
  aiOverviewsList: AIOverviewEntry[]
  savedSearchCount: number
  usageOpen: boolean
  onUsageToggle: () => void
  onRestoreSearch: (geometry: any, filters: Filter[], sortCriteria: { column: string; dir: 'asc' | 'desc' }[], activePresets: string[], id: string, preQueryPresets?: string[], preQueryFilters?: Filter[], preQueryCustomIds?: string[], preQueryOrgIds?: string[]) => void
  onDeleteCurrentSearch: () => void
  onSavedSearchCountChange: (count: number) => void
  activeSearchId: string | null
  onViewAIOverview: (siret: string) => void
  customResultLimit: number | null
  onCustomResultLimitChange: (limit: number | null) => void
  defaultPresets: string[]
  onDefaultPresetsChange: (presets: string[]) => void
  orgId: string | null
  orgRole: 'owner' | 'admin' | 'member' | null
  orgName: string | null
  orgIconUrl: string | null
  subscriptionStatus: string | null
}

export default function SettingsModal({
  isDark,
  onClose,
  user,
  userTier,
  themeMode,
  setThemeMode,
  mapStyle,
  setMapStyle,
  listColumns,
  popupColumns,
  onFieldsModal,
  onManagePlan,
  onPaywall,
  onDeleteAccount,
  onSignOut,
  onSignIn,
  prefsSaved,
  searchCount,
  aiOverviewCount,
  aiOverviewsList,
  savedSearchCount,
  usageOpen,
  onUsageToggle,
  onRestoreSearch,
  onDeleteCurrentSearch,
  onSavedSearchCountChange,
  activeSearchId,
  onViewAIOverview,
  customResultLimit,
  onCustomResultLimitChange,
  defaultPresets,
  onDefaultPresetsChange,
  orgId,
  orgRole,
  orgName,
  orgIconUrl,
  subscriptionStatus,
}: SettingsModalProps) {
  const [settingsOpen, setSettingsOpen] = useState(() => {
    try { return localStorage.getItem('pdm_section_settings') !== '0' } catch { return true }
  })
  const [aiOpen, setAiOpen] = useState(() => {
    try { return localStorage.getItem('pdm_section_ai') === '1' } catch { return false }
  })
  const [savedOpen, setSavedOpen] = useState(() => {
    try { return localStorage.getItem('pdm_section_saved') === '1' } catch { return false }
  })
  const [deleteActive, setDeleteActive] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')

  const toggleSection = (key: string, setter: (v: boolean) => void, current: boolean) => {
    const next = !current
    setter(next)
    try { localStorage.setItem(`pdm_section_${key}`, next ? '1' : '0') } catch {}
  }

  const allOpen = settingsOpen && usageOpen && aiOpen && savedOpen

  const toggleAll = () => {
    const next = !allOpen
    setSettingsOpen(next)
    setAiOpen(next)
    setSavedOpen(next)
    if (usageOpen !== next) onUsageToggle()
    const v = next ? '1' : '0'
    try {
      localStorage.setItem('pdm_section_settings', v)
      localStorage.setItem('pdm_section_ai', v)
      localStorage.setItem('pdm_section_saved', v)
    } catch {}
  }

  const t = isDark
    ? {
        bg: 'bg-gray-900 border-white/10',
        title: 'text-white',
        label: 'text-gray-600',
        sectionBorder: 'border-white/5',
        segmentBorder: 'border-white/10',
        segmentActive: 'bg-white/15 text-white',
        segmentInactive: 'text-gray-500 hover:text-gray-300 hover:bg-white/5',
        btn: 'border-white/10 text-gray-300 hover:bg-white/5',
        btnHover: 'hover:border-white/20',
        signOutBtn: 'text-gray-500 hover:text-red-400',
        signInBtn: 'text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10',
        chevronBtn: 'text-gray-400 hover:text-gray-200',
        aiItem: 'text-gray-400 hover:bg-white/5',
        aiItemSub: 'text-gray-600',
        emptyText: 'text-gray-600',
        dangerText: 'text-red-400',
        dangerBtn: 'text-red-400 hover:text-red-300',
        dangerBtnDisabled: 'text-gray-700 cursor-not-allowed',
        cancelBtn: 'text-gray-500 hover:text-gray-300',
        dangerInput: 'bg-white/5 border-red-500/50 text-white placeholder-gray-600 focus:border-red-400',
      }
    : {
        bg: 'bg-white border-gray-200',
        title: 'text-gray-900',
        label: 'text-gray-400',
        sectionBorder: 'border-gray-100',
        segmentBorder: 'border-gray-200',
        segmentActive: 'bg-violet-50 text-violet-700',
        segmentInactive: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
        btn: 'border-gray-200 text-gray-600 hover:bg-gray-50',
        btnHover: 'hover:border-gray-300',
        signOutBtn: 'text-gray-400 hover:text-red-500',
        signInBtn: 'text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border-gray-200',
        chevronBtn: 'text-gray-500 hover:text-gray-800',
        aiItem: 'text-gray-600 hover:bg-gray-50',
        aiItemSub: 'text-gray-400',
        emptyText: 'text-gray-400',
        dangerText: 'text-red-500',
        dangerBtn: 'text-red-500 hover:text-red-600',
        dangerBtnDisabled: 'text-gray-300 cursor-not-allowed',
        cancelBtn: 'text-gray-400 hover:text-gray-600',
        dangerInput: 'bg-gray-50 border-red-300 text-gray-900 placeholder-gray-400 focus:border-red-500',
      }

  return (
    <Modal isDark={isDark} onClose={onClose} zIndex="z-[7500]" className={`w-[400px] max-h-[85vh] flex flex-col ${t.bg}`}>
      {(handleClose) => (
        <>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${t.sectionBorder}`}>
            {user ? (
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full flex-shrink-0" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {(user.displayName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${t.title}`}>{user.displayName ?? 'User'}</p>
                  {user.email && (
                    <div className="flex items-center gap-1">
                      <p className={`text-[11px] truncate ${t.label}`}>{user.email}</p>
                      {user.emailVerified ? (
                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : user.providerId === 'password' ? (
                        <span className="text-[9px] font-medium text-amber-500 flex-shrink-0">unverified</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <h2 className={`text-sm font-semibold ${t.title}`}>Settings</h2>
            )}
            <CloseButton onClick={handleClose} isDark={isDark} />
          </div>

          {/* Expand/Collapse all */}
          <div className={`px-4 py-1.5 border-b ${t.sectionBorder}`}>
            {orgId && orgName ? (
              <div className={`flex items-center gap-2 mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {orgIconUrl ? (
                  <img src={orgIconUrl} alt="" referrerPolicy="no-referrer" className="w-4 h-4 rounded flex-shrink-0 object-cover" />
                ) : (
                  <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                )}
                <span className="text-[11px] font-medium truncate">{orgName}</span>
                {(orgRole === 'owner' || orgRole === 'admin') && (
                  <a href="/org" onClick={handleClose} className={`text-[10px] font-medium ml-auto flex-shrink-0 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>Manage</a>
                )}
              </div>
            ) : userTier === 'enterprise' && !orgId ? (
              <a href="/org" onClick={handleClose} className="flex items-center gap-1.5 mb-1.5 text-[11px] font-medium text-violet-500 hover:text-violet-400 transition-colors">
                <span>+ Set up your organization</span>
              </a>
            ) : null}
            <button
              onClick={toggleAll}
              className={`text-[10px] font-medium transition-colors ${t.chevronBtn}`}
            >
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1">
            {/* Settings */}
            <div className={`border-b ${t.sectionBorder}`}>
              <div className="px-4 py-3">
                <button
                  onClick={() => toggleSection('settings', setSettingsOpen, settingsOpen)}
                  className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${t.chevronBtn}`}
                >
                  <span>Settings</span>
                  <svg className={`w-3 h-3 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {settingsOpen && (
                  <div className="mt-2 space-y-3">
              <div>
                <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${t.label}`}>Theme</div>
                <div className={`flex rounded-lg border overflow-hidden ${t.segmentBorder}`}>
                  {([
                    { mode: 'system' as const, label: 'Auto', icon: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )},
                    { mode: 'light' as const, label: 'Light', icon: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                      </svg>
                    )},
                    { mode: 'dark' as const, label: 'Dark', icon: (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                      </svg>
                    )},
                  ]).map(({ mode, label, icon }) => (
                    <button
                      key={mode}
                      onClick={() => setThemeMode(mode)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors ${
                        themeMode === mode ? t.segmentActive : t.segmentInactive
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${t.label}`}>Map Style</div>
                <div className={`flex rounded-lg border overflow-hidden ${t.segmentBorder}`}>
                  {([
                    { style: 'default' as const, label: 'Default' },
                    { style: 'themed' as const, label: 'Themed' },
                    { style: 'satellite' as const, label: 'Satellite' },
                  ]).map(({ style, label }) => (
                    <button
                      key={style}
                      onClick={() => setMapStyle(style)}
                      className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                        mapStyle === style ? t.segmentActive : t.segmentInactive
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {user && subscriptionStatus === 'past_due' && userTier !== 'enterprise' && (
                <div className={`rounded-lg border p-2.5 ${isDark ? 'border-red-500/30 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
                  <p className={`text-[11px] font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Payment failed</p>
                  <p className={`text-[10px] mt-0.5 ${isDark ? 'text-red-400/80' : 'text-red-600'}`}>Update your payment method to avoid losing access.</p>
                  <button
                    onClick={() => { onManagePlan(); handleClose() }}
                    className={`text-[10px] font-medium mt-1.5 px-2.5 py-1 rounded-lg transition-colors ${isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                  >
                    Update payment method →
                  </button>
                </div>
              )}

              {user && userTier !== 'enterprise' && (
                <div>
                  <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${t.label}`}>Plan</div>
                  <button
                    onClick={() => {
                      if (userTier !== 'free') { onManagePlan(); handleClose() }
                      else { onPaywall('plan'); handleClose() }
                    }}
                    className={`w-full text-[11px] font-medium py-1.5 rounded-lg border transition-colors ${t.btn} ${t.btnHover}`}
                  >
                    {userTier === 'free' ? 'Upgrade plan' : 'Manage plan'}
                  </button>
                </div>
              )}

              <div>
                <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${t.label}`}>Visible Fields</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onFieldsModal('list'); handleClose() }}
                    className={`flex-1 text-[11px] font-medium py-1.5 rounded-lg border transition-colors ${t.btn}`}
                  >
                    List ({listColumns.length})
                  </button>
                  <button
                    onClick={() => { onFieldsModal('popup'); handleClose() }}
                    className={`flex-1 text-[11px] font-medium py-1.5 rounded-lg border transition-colors ${t.btn}`}
                  >
                    Popup ({popupColumns.length})
                  </button>
                </div>
              </div>

              {canUsePresets(userTier) && (
                <div>
                  <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${t.label}`}>Default Quick Filters</div>
                  <div className={`rounded-lg border p-3 space-y-1.5 ${isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50/50 border-gray-200'}`}>
                    {PRESET_GROUPS.map((group) => {
                      const presets = PRESET_FILTERS.filter((p) => p.group === group)
                      return (
                        <div key={group} className="mb-1 last:mb-0">
                          <SectionTitle isDark={isDark} className="mb-0.5">{group}</SectionTitle>
                          <div className="flex flex-wrap gap-1">
                            {presets.map((preset) => {
                              const active = defaultPresets.includes(preset.id)
                              return (
                                <PresetPill
                                  key={preset.id}
                                  label={preset.label}
                                  active={active}
                                  isDark={isDark}
                                  onClick={() => onDefaultPresetsChange(
                                    active
                                      ? defaultPresets.filter((id) => id !== preset.id)
                                      : [...defaultPresets, preset.id]
                                  )}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    {defaultPresets.length > 0 && (
                      <button
                        onClick={() => onDefaultPresetsChange([])}
                        className={`text-[10px] font-medium mt-1 ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                      >
                        Clear all
                      </button>
                    )}
                    <p className={`text-[10px] ${t.label}`}>
                      These quick filters will be automatically selected as pre-search filters on every new search.
                    </p>
                  </div>
                </div>
              )}

              {(userTier === 'individual' || userTier === 'enterprise') && (() => {
                const maxForTier = userTier === 'enterprise' ? MAX_ENTERPRISE_RESULT_LIMIT : TIER_LIMITS[userTier].resultsPerQuery
                const currentValue = customResultLimit ?? getResultLimit(userTier)
                const handleChange = (v: number) => {
                  if (isNaN(v) || v < 1) { onCustomResultLimitChange(null); return }
                  onCustomResultLimitChange(Math.min(v, maxForTier))
                }
                return (
                  <div>
                    <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${t.label}`}>Result Limit</div>
                    <div className={`rounded-lg border p-3 space-y-2.5 ${isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50/50 border-gray-200'}`}>
                      <input
                        type="range"
                        min={1}
                        max={maxForTier}
                        step={1}
                        value={currentValue}
                        onChange={(e) => handleChange(parseInt(e.target.value, 10))}
                        className="pdm-range"
                        style={{ background: `linear-gradient(to right, #7c3aed ${maxForTier > 1 ? ((currentValue - 1) / (maxForTier - 1)) * 100 : 100}%, ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} ${maxForTier > 1 ? ((currentValue - 1) / (maxForTier - 1)) * 100 : 100}%)` }}
                      />
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={maxForTier}
                          value={currentValue}
                          onChange={(e) => handleChange(parseInt(e.target.value, 10))}
                          className={`flex-1 min-w-0 rounded-md border px-2 py-1 text-[11px] outline-none transition-colors ${
                            isDark
                              ? 'bg-white/5 border-white/10 text-white focus:border-white/30'
                              : 'bg-white border-gray-200 text-gray-900 focus:border-blue-400'
                          }`}
                        />
                        <button
                          disabled={currentValue === maxForTier}
                          onClick={() => onCustomResultLimitChange(maxForTier)}
                          className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                        >
                          Max
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] ${t.label}`}>{currentValue.toLocaleString()} / {maxForTier.toLocaleString()}</span>
                        {currentValue > 50_000 && (
                          <span className="text-[10px] font-medium text-amber-500">⚠ May be slow</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
                  </div>
                )}
              </div>
            </div>

            {/* Usage */}
            <div className={`border-t ${t.sectionBorder}`}>
              <div className="px-4 py-3">
                <UsageTracker
                  isDark={isDark}
                  userTier={userTier}
                  searchCount={searchCount}
                  aiOverviewCount={aiOverviewCount}
                  savedSearchCount={savedSearchCount}
                  isLoggedIn={!!user}
                  isOpen={usageOpen}
                  onToggle={onUsageToggle}
                />
              </div>
            </div>

            {/* AI Overviews */}
            {user && (
              <div className={`border-t ${t.sectionBorder}`}>
                <div className="px-4 py-3">
                  <button
                    onClick={() => toggleSection('ai', setAiOpen, aiOpen)}
                    className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${t.chevronBtn}`}
                  >
                    <span>AI Overviews</span>
                    <svg className={`w-3 h-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {aiOpen && (
                    <div className="mt-2">
                      {aiOverviewsList.length === 0 ? (
                        <p className={`text-[11px] ${t.emptyText}`}>No AI overviews yet</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {aiOverviewsList.map((entry) => (
                            <button
                              key={entry.siret}
                              onClick={() => { onViewAIOverview(entry.siret); handleClose() }}
                              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] transition-colors cursor-pointer text-left ${t.aiItem}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{entry.companyName}</p>
                                {entry.city && <p className={`text-[10px] truncate ${t.aiItemSub}`}>{entry.city}</p>}
                              </div>
                              <span className={`text-[10px] flex-shrink-0 ml-2 ${t.aiItemSub}`}>
                                {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Saved Searches */}
            {user && (
              <div className={`border-t ${t.sectionBorder}`}>
                <div className="px-4 py-3">
                  <SavedSearches
                    onRestoreSearch={(...args) => { onRestoreSearch(...args); handleClose() }}
                    onDeleteCurrentSearch={onDeleteCurrentSearch}
                    onCountChange={onSavedSearchCountChange}
                    activeSearchId={activeSearchId}
                    isDark={isDark}
                    isOpen={savedOpen}
                    onToggle={() => toggleSection('saved', setSavedOpen, savedOpen)}
                  />
                </div>
              </div>
            )}

            {/* Danger Zone */}
            {user && userTier !== 'enterprise' && !orgId && (
              <div className={`border-t ${t.sectionBorder}`}>
                <div className="px-4 py-3">
                  <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${t.label}`}>Danger Zone</div>
                  {!deleteActive ? (
                    <button
                      onClick={() => setDeleteActive(true)}
                      className={`text-xs font-medium transition-colors ${t.signOutBtn}`}
                    >
                      Delete account
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <p className={`text-[11px] ${t.dangerText}`}>
                        Type your email to confirm deletion
                      </p>
                      <input
                        type="email"
                        value={deleteEmail}
                        onChange={(e) => setDeleteEmail(e.target.value)}
                        placeholder={user.email ?? 'your@email.com'}
                        className={`w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-all ${t.dangerInput}`}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { if (deleteEmail === user.email) { onDeleteAccount(); handleClose() } }}
                          disabled={deleteEmail !== user.email}
                          className={`text-xs font-medium transition-colors ${
                            deleteEmail === user.email ? t.dangerBtn : t.dangerBtnDisabled
                          }`}
                        >
                          Delete permanently
                        </button>
                        <button
                          onClick={() => { setDeleteActive(false); setDeleteEmail('') }}
                          className={`text-xs font-medium transition-colors ${t.cancelBtn}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`border-t ${t.sectionBorder}`}>
            {user ? (
              <div className="px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => { onSignOut(); handleClose() }}
                  className={`text-xs font-medium transition-colors ${t.signOutBtn}`}
                >
                  Sign Out
                </button>
                {prefsSaved && (
                  <span className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'} animate-prefs-saved`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Preferences saved
                  </span>
                )}
              </div>
            ) : (
              <div className="px-4 py-3">
                <button
                  onClick={() => { onSignIn(); handleClose() }}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-medium border rounded-lg px-3 py-2 transition-all ${t.signInBtn}`}
                >
                  Sign in / Create account
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
