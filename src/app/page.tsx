'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import CompanyList from '@/components/CompanyList'
import SavedAreas from '@/components/SavedAreas'
import SearchBar from '@/components/SearchBar'
import AuthModal from '@/components/AuthModal'
import CompanyDetail from '@/components/CompanyDetail'
import { auth, db } from '@/lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import { signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const HIDDEN_COLS = ['Géolocalisation de l\'établissement']
const DEFAULT_LIST_COLS = ['Dénomination usuelle de l\'établissement', 'Code postal de l\'établissement', 'Commune de l\'établissement']
const DEFAULT_POPUP_COLS = ['Dénomination usuelle de l\'établissement', 'SIRET', 'Code postal de l\'établissement', 'Commune de l\'établissement']

export default function Home() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [searchArea, setSearchArea] = useState(null)
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [mapStyle, setMapStyle] = useState<'themed' | 'default'>('themed')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [user] = useAuthState(auth)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [expandedCompany, setExpandedCompany] = useState<any>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const isSigningIn = useRef(false)
  const profileLoaded = useRef(false)
  const [prefsSaved, setPrefsSaved] = useState(false)

  const prefsKey = (uid: string) => `prefs_${uid}`

  // Column system
  const [columns, setColumns] = useState<string[]>([])
  const [displayColumns, setDisplayColumns] = useState<string[]>([])
  const [listColumns, setListColumns] = useState<string[]>(DEFAULT_LIST_COLS)
  const [popupColumns, setPopupColumns] = useState<string[]>(DEFAULT_POPUP_COLS)

  // Settings panel sub-section
  const [settingsTab, setSettingsTab] = useState<'general' | 'list' | 'popup'>('general')

  // Sort & filter
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<{ column: string; operator: 'contains' | 'equals' | 'not_empty'; value: string }[]>([])

  // Load preferences: Firestore first (source of truth), localStorage as fallback/cache
  useEffect(() => {
    if (!user) { profileLoaded.current = false; return }
    const key = prefsKey(user.uid)
    // Apply localStorage immediately so there's no flash of default settings
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
    // Then fetch from Firestore and override (handles cross-device sync)
    getDoc(doc(db, 'userProfiles', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const p = snap.data()
          if (Array.isArray(p.listColumns) && p.listColumns.length > 0) setListColumns(p.listColumns)
          if (Array.isArray(p.popupColumns) && p.popupColumns.length > 0) setPopupColumns(p.popupColumns)
          if (p.mapStyle) setMapStyle(p.mapStyle)
          if (typeof p.isDark === 'boolean') setIsDark(p.isDark)
          // Keep localStorage in sync with remote
          try { localStorage.setItem(key, JSON.stringify(p)) } catch (_) {}
        }
        profileLoaded.current = true
      })
      .catch((e) => {
        console.warn('Firestore prefs load failed, using local cache:', e)
        profileLoaded.current = true
      })
  }, [user])

  // Auto-save preferences: localStorage immediately, Firestore debounced
  useEffect(() => {
    if (!user || !profileLoaded.current) return
    const prefs = { listColumns, popupColumns, mapStyle, isDark }
    // Write to localStorage immediately (instant, no latency)
    try { localStorage.setItem(prefsKey(user.uid), JSON.stringify(prefs)) } catch (_) {}
    // Debounce Firestore write
    const timer = setTimeout(() => {
      setDoc(doc(db, 'userProfiles', user.uid), prefs, { merge: true })
        .then(() => { setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 2000) })
        .catch((e) => console.warn('Firestore prefs save failed:', e))
    }, 1000)
    return () => clearTimeout(timer)
  }, [user, listColumns, popupColumns, mapStyle, isDark])

  // Fetch columns on mount
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
    if (!geometry) {
      setCompanies([])
      setSearchArea(null)
      setSelectedCompany(null)
      setActiveSearchId(null)
      return
    }
    if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) {
      console.error('Invalid geometry:', geometry)
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry }),
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
      setActiveSearchId(null) // cleared when drawing a new shape manually
      if (data.columns && columns.length === 0) {
        setColumns(data.columns)
        const display = data.columns.filter((c: string) => !HIDDEN_COLS.includes(c))
        setDisplayColumns(display)
      }
    } catch (err) {
      console.error('Failed to search:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSortChange = useCallback((col: string | null, dir: 'asc' | 'desc') => {
    setSortBy(col)
    setSortDir(dir)
  }, [])

  // Apply filters to companies so the map only shows matching markers
  const mapCompanies = useMemo(() => {
    if (filters.length === 0) return companies
    let result = [...companies]
    for (const f of filters) {
      if (!f.column) continue
      result = result.filter((c: any) => {
        const val = (c.fields?.[f.column] ?? '').toString().toLowerCase()
        switch (f.operator) {
          case 'contains': return val.includes(f.value.toLowerCase())
          case 'equals': return val === f.value.toLowerCase()
          case 'not_empty': return val.length > 0
          default: return true
        }
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
    // Placeholder — will be wired to actual AI call later
    console.log('Ask AI about:', company)
  }, [])

  // Toggle column helper for settings panel
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
        sidebar: 'bg-gray-900 border-white/5',
        headerBorder: 'border-white/5',
        title: 'text-white',
        iconBtn: 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white',
        themeBtnBg: 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white',
        dropdownBg: 'bg-gray-900 border-white/10',
        dropdownLabel: 'text-gray-600',
        dropdownActive: 'text-white bg-white/10',
        dropdownItem: 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
        tabActive: 'text-white border-blue-500',
        tab: 'text-gray-600 hover:text-gray-400 border-transparent',
        tabBorder: 'border-white/5',
        check: 'border-white/20 bg-white/5',
        checkActive: 'border-blue-500 bg-blue-500',
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
        sidebar: 'bg-white border-gray-200',
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

  // Column list for current settings tab
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
          isDark={isDark}
          mapStyle={mapStyle}
          userLocation={userLocation}
          popupColumns={popupColumns}
        />
        {isLoading && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[1000] backdrop-blur-sm text-sm font-medium px-4 py-2 rounded-full shadow-lg border ${d.loadingBg}`}>
            <span className="inline-block animate-pulse">Searching...</span>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className={`w-[380px] h-full flex flex-col border-l shadow-2xl ${d.sidebar}`}>
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b ${d.headerBorder}`}>
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-lg font-semibold tracking-tight ${d.title}`}>
              Public Data Maps
            </h1>

            <div className="flex items-center gap-1.5">
              {/* Location */}
              <button
                onClick={handleLocate}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${d.iconBtn}`}
                title="Go to my location"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Settings */}
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => { setSettingsOpen(!settingsOpen); setSettingsTab('general') }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${d.iconBtn}`}
                  title="Settings"
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
                        {(['themed', 'default'] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => setMapStyle(style)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${mapStyle === style ? d.dropdownActive : d.dropdownItem}`}
                          >
                            <span className="capitalize">{style}</span>
                            {mapStyle === style && (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                        {user && (
                          <div className={`mx-3 mt-2 mb-1 flex items-center justify-end h-5`}>
                            {prefsSaved && (
                              <span className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                Preferences saved
                              </span>
                            )}
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
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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
              <button onClick={handleSignOut} className={`text-xs transition-colors ${d.signOutBtn}`}>
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
        <div className="flex-1 overflow-y-auto px-5 py-4">
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
        <div className={`px-5 py-3 border-t ${d.footer}`}>
          <p className={`text-[10px] text-center ${d.footerText}`}>
            Data source: SIRENE (INSEE) &middot; Open Data
          </p>
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
    </>
  )
}
