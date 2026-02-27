'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import CompanyList from '@/components/CompanyList'
import SavedAreas from '@/components/SavedAreas'
import SearchBar from '@/components/SearchBar'
import AuthModal from '@/components/AuthModal'
import CompanyDetail from '@/components/CompanyDetail'
import ExportModal from '@/components/ExportModal'
import { auth, db } from '@/lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import { signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const HIDDEN_COLS = ['Géolocalisation de l\'établissement']
const DEFAULT_LIST_COLS = ['Dénomination de l\'unité légale', 'Code postal de l\'établissement', 'Commune de l\'établissement']
const DEFAULT_POPUP_COLS = ['Dénomination de l\'unité légale', 'SIRET', 'Code postal de l\'établissement', 'Commune de l\'établissement']

export default function Home() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [searchArea, setSearchArea] = useState(null)
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null)
  const [restoreGeometry, setRestoreGeometry] = useState<{ geometry: any; ts: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSampleData, setIsSampleData] = useState<boolean | null>(null)
  const [isDark, setIsDark] = useState(true)
  const [mapStyle, setMapStyle] = useState<'default' | 'themed' | 'satellite'>('themed')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [user] = useAuthState(auth)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [expandedCompany, setExpandedCompany] = useState<any>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const settingsRef = useRef<HTMLDivElement>(null)
  const isSigningIn = useRef(false)
  const profileLoaded = useRef(false)
  const searchAbort = useRef<AbortController | null>(null)
  const [prefsSaved, setPrefsSaved] = useState(false)

  const prefsKey = (uid: string) => `prefs_${uid}`

  const [columns, setColumns] = useState<string[]>([])
  const [displayColumns, setDisplayColumns] = useState<string[]>([])
  const [listColumns, setListColumns] = useState<string[]>(DEFAULT_LIST_COLS)
  const [popupColumns, setPopupColumns] = useState<string[]>(DEFAULT_POPUP_COLS)

  const [settingsTab, setSettingsTab] = useState<'general' | 'list' | 'popup'>('general')

  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<{ column: string; operator: 'contains' | 'equals' | 'empty'; negate: boolean; value: string }[]>([])

  /** Apply the OS color-scheme preference on first mount (before any user pref overrides). */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mq.matches)
  }, [])

  /**
   * Load user preferences on auth change.
   * localStorage is applied first to avoid a flash of defaults,
   * then Firestore is fetched for cross-device sync.
   */
  useEffect(() => {
    if (!user) { profileLoaded.current = false; return }
    const key = prefsKey(user.uid)
    try {
      const cached = localStorage.getItem(key)
      if (cached) {
        const p = JSON.parse(cached)
        if (Array.isArray(p.listColumns) && p.listColumns.length > 0) setListColumns(p.listColumns)
        if (Array.isArray(p.popupColumns) && p.popupColumns.length > 0) setPopupColumns(p.popupColumns)
        if (p.mapStyle) setMapStyle(p.mapStyle)
        if (typeof p.isDark === 'boolean') setIsDark(p.isDark)
      }
    } catch (_) {}
    getDoc(doc(db, 'userProfiles', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const p = snap.data()
          if (Array.isArray(p.listColumns) && p.listColumns.length > 0) setListColumns(p.listColumns)
          if (Array.isArray(p.popupColumns) && p.popupColumns.length > 0) setPopupColumns(p.popupColumns)
          if (p.mapStyle) setMapStyle(p.mapStyle)
          if (typeof p.isDark === 'boolean') setIsDark(p.isDark)
          try { localStorage.setItem(key, JSON.stringify(p)) } catch (_) {}
        }
        profileLoaded.current = true
      })
      .catch((e) => {
        console.warn('Firestore prefs load failed, using local cache:', e)
        profileLoaded.current = true
      })
  }, [user])

  /**
   * Persist preferences: writes to localStorage immediately for zero-latency,
   * then debounces a Firestore write by 1 s to avoid excessive network calls.
   */
  useEffect(() => {
    if (!user || !profileLoaded.current) return
    const prefs = { listColumns, popupColumns, mapStyle, isDark }
    try { localStorage.setItem(prefsKey(user.uid), JSON.stringify(prefs)) } catch (_) {}
    const timer = setTimeout(() => {
      setDoc(doc(db, 'userProfiles', user.uid), prefs, { merge: true })
        .then(() => { setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 2000) })
        .catch((e) => console.warn('Firestore prefs save failed:', e))
    }, 1000)
    return () => clearTimeout(timer)
  }, [user, listColumns, popupColumns, mapStyle, isDark])

  useEffect(() => {
    fetch('/api/search')
      .then((r) => r.json())
      .then((data) => {
        if (data.columns) {
          setColumns(data.columns)
          const display = data.columns.filter((c: string) => !HIDDEN_COLS.includes(c))
          setDisplayColumns(display)
          setListColumns((prev) => prev.filter((c) => display.includes(c)))
          setPopupColumns((prev) => prev.filter((c) => display.includes(c)))
        }
        if (typeof data.sampleData === 'boolean') setIsSampleData(data.sampleData)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn('Geolocation denied:', err)
    )
  }

  const handleSearch = async (geometry: any) => {
    if (searchAbort.current) {
      searchAbort.current.abort()
      searchAbort.current = null
    }
    if (!geometry) {
      setCompanies([])
      setSearchArea(null)
      setSelectedCompany(null)
      setActiveSearchId(null)
      setIsLoading(false)
      return
    }
    if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) {
      console.error('Invalid geometry:', geometry)
      return
    }
    const controller = new AbortController()
    searchAbort.current = controller
    setIsLoading(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const error = await response.json()
        console.error('Search error:', error)
        return
      }
      const data = await response.json()
      setCompanies(data.companies)
      setSearchArea(geometry)
      setSelectedCompany(null)
      setActiveSearchId(null)
      if (typeof data.sampleData === 'boolean') setIsSampleData(data.sampleData)
      if (data.columns && columns.length === 0) {
        setColumns(data.columns)
        const display = data.columns.filter((c: string) => !HIDDEN_COLS.includes(c))
        setDisplayColumns(display)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Failed to search:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSortChange = useCallback((col: string | null, dir: 'asc' | 'desc') => {
    setSortBy(col)
    setSortDir(dir)
  }, [])

  /**
   * Derived company list with active filters applied.
   * Used to keep map markers in sync with the filtered list view.
   */
  const mapCompanies = useMemo(() => {
    if (filters.length === 0) return companies
    let result = [...companies]
    for (const f of filters) {
      if (!f.column) continue
      result = result.filter((c: any) => {
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
    return result
  }, [companies, filters])

  const handleSignOut = async () => {
    await signOut(auth)
  }

  const handleExpand = useCallback((company: any) => {
    setExpandedCompany(company)
  }, [])

  const handleAskAI = useCallback((company: any) => {
    console.log('Ask AI about:', company)
  }, [])

  const toggleCol = (col: string, target: 'list' | 'popup') => {
    const setter = target === 'list' ? setListColumns : setPopupColumns
    const current = target === 'list' ? listColumns : popupColumns
    if (current.includes(col)) {
      setter(current.filter((c) => c !== col))
    } else {
      setter([...current, col])
    }
  }

  const d = isDark
    ? {
        main: 'bg-gray-950',
        sidebar: 'bg-gray-900',
        headerBorder: 'border-white/5',
        title: 'text-white',
        iconBtn: 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white',
        themeBtnBg: 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white',
        dropdownBg: 'bg-gray-900 border-white/10',
        dropdownLabel: 'text-gray-600',
        dropdownActive: 'text-white bg-white/10',
        dropdownItem: 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
        tabActive: 'text-white border-white/60',
        tab: 'text-gray-600 hover:text-gray-400 border-transparent',
        tabBorder: 'border-white/5',
        check: 'border-white/20 bg-white/5',
        checkActive: 'border-gray-400 bg-gray-400',
        colItem: 'text-gray-400 hover:bg-white/5',
        allBtn: 'text-gray-600 hover:text-gray-400',
        userName: 'text-gray-400',
        signOutBtn: 'text-gray-500 hover:text-red-400',
        signInBtn: 'text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10',
        savedAreasBorder: 'border-white/5',
        footer: 'border-white/5',
        footerText: 'text-gray-600',
        loadingBg: 'bg-gray-900/90 text-white border-white/10',
      }
    : {
        main: 'bg-gray-100',
        sidebar: 'bg-white',
        headerBorder: 'border-gray-200',
        title: 'text-gray-900',
        iconBtn: 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600 hover:text-gray-900',
        themeBtnBg: 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600 hover:text-gray-900',
        dropdownBg: 'bg-white border-gray-200',
        dropdownLabel: 'text-gray-400',
        dropdownActive: 'text-gray-900 bg-gray-100',
        dropdownItem: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
        tabActive: 'text-gray-900 border-blue-600',
        tab: 'text-gray-400 hover:text-gray-600 border-transparent',
        tabBorder: 'border-gray-100',
        check: 'border-gray-300 bg-white',
        checkActive: 'border-blue-600 bg-blue-600',
        colItem: 'text-gray-600 hover:bg-gray-50',
        allBtn: 'text-gray-400 hover:text-gray-600',
        userName: 'text-gray-500',
        signOutBtn: 'text-gray-400 hover:text-red-500',
        signInBtn: 'text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border-gray-200',
        savedAreasBorder: 'border-gray-200',
        footer: 'border-gray-200',
        footerText: 'text-gray-400',
        loadingBg: 'bg-white/90 text-gray-900 border-gray-200',
      }

  const activeColTarget = settingsTab === 'list' ? 'list' : 'popup'
  const activeCols = settingsTab === 'list' ? listColumns : popupColumns
  const activeColSetter = settingsTab === 'list' ? setListColumns : setPopupColumns

  return (
    <>
      <main className={`flex h-screen ${d.main}`}>
      {/* Map */}
      <div className="flex-1 h-full relative">
        <Map
          companies={mapCompanies}
          selectedCompany={selectedCompany}
          onSearch={handleSearch}
          onCompanySelect={setSelectedCompany}
          onExpand={handleExpand}
          onLocate={handleLocate}
          isDark={isDark}
          mapStyle={mapStyle}
          userLocation={userLocation}
          popupColumns={popupColumns}
          restoreGeometry={restoreGeometry}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        {isLoading && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[1000] backdrop-blur-sm text-sm font-medium px-4 py-2 rounded-full shadow-lg border ${d.loadingBg}`}>
            <span className="inline-block animate-pulse">Searching...</span>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div
          className={`flex-shrink-0 h-full transition-[width] duration-300 ease-in-out overflow-hidden ${d.sidebar} ${
            sidebarOpen ? 'w-[380px]' : 'w-0'
          }`}
        >
          <div className="min-w-[380px] w-[380px] h-full flex flex-col">
        {/* Sample data banner */}
        {isSampleData && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-[11px] font-medium">Running on sample data — full dataset not connected</span>
          </div>
        )}
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b ${d.headerBorder}`}>
          <div className="flex items-center justify-between mb-4">
            <img src="/logo-full.png" alt="Public Data Maps" className={`h-12 w-auto ${isDark ? 'invert' : ''}`} />

            <div className="flex items-center gap-1.5">
              {/* Settings */}
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => { setSettingsOpen(!settingsOpen); setSettingsTab('general') }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${d.iconBtn}`}
                  data-tooltip="Settings" data-tooltip-pos="bottom"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {settingsOpen && (
                  <div className={`absolute right-0 top-10 z-[2000] w-64 rounded-xl border shadow-2xl backdrop-blur-sm overflow-hidden ${d.dropdownBg}`}>
                    {/* Tabs */}
                    <div className={`flex border-b ${d.tabBorder}`}>
                      {(['general', 'list', 'popup'] as const).map((t_) => (
                        <button
                          key={t_}
                          onClick={() => setSettingsTab(t_)}
                          className={`flex-1 text-[10px] font-semibold uppercase tracking-wider py-2.5 border-b-2 transition-colors ${
                            settingsTab === t_ ? d.tabActive : d.tab
                          }`}
                        >
                          {t_ === 'general' ? 'General' : t_ === 'list' ? 'List' : 'Popup'}
                        </button>
                      ))}
                    </div>

                    {/* General tab */}
                    {settingsTab === 'general' && (
                      <div className="py-1">
                        <div className={`px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest ${d.dropdownLabel}`}>Map Style</div>
                        {(['default', 'themed', 'satellite'] as const).map((style) => {
                          const labels: Record<string, string> = { default: 'Default', themed: 'Themed', satellite: 'Satellite' }
                          return (
                            <button
                              key={style}
                              onClick={() => setMapStyle(style)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${mapStyle === style ? d.dropdownActive : d.dropdownItem}`}
                            >
                              <span>{labels[style]}</span>
                              {mapStyle === style && (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                        {user && (
                          <div className="mx-3 mt-2 mb-1 flex items-center justify-end h-5">
                            <span className={`text-[10px] flex items-center gap-1 transition-opacity ${isDark ? 'text-green-400' : 'text-green-600'} ${prefsSaved ? 'animate-prefs-saved' : 'opacity-0'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              Preferences saved
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* List / Popup column tabs */}
                    {(settingsTab === 'list' || settingsTab === 'popup') && (
                      <div>
                        <div className="flex gap-3 px-3 pt-2 pb-1 items-center">
                          <button onClick={() => activeColSetter([...displayColumns])} className={`text-[10px] font-medium ${d.allBtn}`}>All</button>
                          <button onClick={() => activeColSetter([])} className={`text-[10px] font-medium ${d.allBtn}`}>None</button>
                          <button
                            onClick={() => activeColSetter(settingsTab === 'list' ? DEFAULT_LIST_COLS.filter(c => displayColumns.includes(c)) : DEFAULT_POPUP_COLS.filter(c => displayColumns.includes(c)))}
                            className={`text-[10px] font-medium ml-auto ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                          >
                            Restore defaults
                          </button>
                        </div>
                        <div className="max-h-[280px] overflow-y-auto px-1.5 py-1">
                          {displayColumns.map((col) => {
                            const isOn = activeCols.includes(col)
                            return (
                              <button
                                key={col}
                                onClick={() => toggleCol(col, activeColTarget)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${d.colItem}`}
                              >
                                <div className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border transition-all ${isOn ? d.checkActive : d.check}`}>
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
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${d.themeBtnBg}`}
                data-tooltip={isDark ? 'Switch to light mode' : 'Switch to dark mode'} data-tooltip-pos="bottom"
              >
                {isDark ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-4">
            <SearchBar
              isDark={isDark}
              onSelect={(lat, lon) => setUserLocation([lat, lon])}
            />
          </div>

          {/* Auth */}
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
                )}
                <span className={`text-xs ${d.userName}`}>{user.displayName ?? user.email}</span>
              </div>
              <button onClick={handleSignOut} className={`text-xs transition-colors ${d.signOutBtn}`} data-tooltip="Sign out of your account" data-tooltip-pos="bottom">
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className={`w-full flex items-center justify-center gap-2 text-sm font-medium border rounded-lg px-3 py-2 transition-all ${d.signInBtn}`}
            >
              Sign in / Create account
            </button>
          )}
        </div>

        {/* Saved Searches */}
        {user && (
          <div className={`px-5 py-3 border-b ${d.savedAreasBorder}`}>
            <SavedAreas
              onRestoreSearch={(geo, restoredFilters, restoredSortBy, restoredSortDir, id) => {
                handleSearch(geo)
                setFilters(restoredFilters)
                setSortBy(restoredSortBy)
                setSortDir(restoredSortDir)
                setActiveSearchId(id)
                setRestoreGeometry({ geometry: geo, ts: Date.now() })
              }}
              onDeleteCurrentSearch={() => handleSearch(null)}
              activeSearchId={activeSearchId}
              currentSearchArea={searchArea}
              currentFilters={filters}
              currentSortBy={sortBy}
              currentSortDir={sortDir}
              isDark={isDark}
            />
          </div>
        )}

        {/* Company List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          <CompanyList
            companies={companies}
            selectedCompany={selectedCompany}
            onCompanySelect={setSelectedCompany}
            onExpand={handleExpand}
            isDark={isDark}
            listColumns={listColumns}
            columns={displayColumns}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        {/* Footer */}
        <div className={`flex-shrink-0 px-5 py-3 border-t flex items-center ${d.footer}`}>
          <p className={`text-[10px] flex-1 ${d.footerText}`}>
            Data source: SIRENE (INSEE) &middot; Open Data
          </p>
          <button
            onClick={() => setExportOpen(true)}
            disabled={companies.length === 0}
            className={`text-[10px] font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
              companies.length > 0
                ? isDark ? 'text-gray-300 border-white/15 hover:border-white/30 hover:bg-white/5' : 'text-blue-600 border-blue-300 hover:border-blue-400 hover:bg-blue-50'
                : isDark ? 'text-gray-700 border-white/5 cursor-not-allowed' : 'text-gray-400 border-gray-200 cursor-not-allowed'
            }`}
            data-tooltip="Export search results" data-tooltip-pos="left"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
          </div>
        </div>
    </main>

    {authOpen && (
      <AuthModal
        isDark={isDark}
        onClose={() => setAuthOpen(false)}
        isSigningIn={isSigningIn}
      />
    )}

    {expandedCompany && (
      <CompanyDetail
        company={expandedCompany}
        displayColumns={displayColumns}
        isDark={isDark}
        onClose={() => setExpandedCompany(null)}
        onAskAI={handleAskAI}
      />
    )}

    {exportOpen && (
      <ExportModal
        companies={mapCompanies}
        displayColumns={displayColumns}
        isDark={isDark}
        onClose={() => setExportOpen(false)}
      />
    )}
    </>
  )
}
