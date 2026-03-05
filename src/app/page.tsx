'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import CompanyList from '@/components/CompanyList'
import SavedAreas from '@/components/SavedAreas'
import SearchBar from '@/components/SearchBar'
import AuthModal from '@/components/AuthModal'
import CompanyDetail from '@/components/CompanyDetail'
import ExportModal from '@/components/ExportModal'
import ColumnConfig from '@/components/ColumnConfig'
import Paywall from '@/components/Paywall'
import { applyPresets } from '@/lib/presets'
import { auth, db } from '@/lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import { signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore'
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
  const [isTruncated, setIsTruncated] = useState(false)
  const [resultLimit, setResultLimit] = useState<number | null>(null)
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system')
  const [systemDark, setSystemDark] = useState(true)
  const [mapStyle, setMapStyle] = useState<'default' | 'themed' | 'satellite'>('themed')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [user] = useAuthState(auth)
  const [authOpen, setAuthOpen] = useState(false)
  const [expandedCompany, setExpandedCompany] = useState<any>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [paywallFeature, setPaywallFeature] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const isSigningIn = useRef(false)
  const profileLoaded = useRef(false)
  const searchAbort = useRef<AbortController | null>(null)
  const [prefsSaved, setPrefsSaved] = useState(false)

  const prefsKey = (uid: string) => `prefs_${uid}`

  const [columns, setColumns] = useState<string[]>([])
  const [displayColumns, setDisplayColumns] = useState<string[]>([])
  const [listColumns, setListColumns] = useState<string[]>(DEFAULT_LIST_COLS)
  const [popupColumns, setPopupColumns] = useState<string[]>(DEFAULT_POPUP_COLS)

  const [fieldsModalTab, setFieldsModalTab] = useState<'list' | 'popup' | null>(null)

  const [sortCriteria, setSortCriteria] = useState<{ column: string; dir: 'asc' | 'desc' }[]>([])
  const [filters, setFilters] = useState<{ column: string; operator: 'contains' | 'equals' | 'empty'; negate: boolean; value: string }[]>([])
  const [activePresets, setActivePresets] = useState<string[]>([])

  const isDark = themeMode === 'system' ? systemDark : themeMode === 'dark'

  /** Listen to OS color-scheme changes for system theme mode. */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
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
        if (p.themeMode) setThemeMode(p.themeMode)
        else if (typeof p.isDark === 'boolean') setThemeMode(p.isDark ? 'dark' : 'light')
      }
    } catch (_) {}
    getDoc(doc(db, 'userProfiles', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const p = snap.data()
          if (Array.isArray(p.listColumns) && p.listColumns.length > 0) setListColumns(p.listColumns)
          if (Array.isArray(p.popupColumns) && p.popupColumns.length > 0) setPopupColumns(p.popupColumns)
          if (p.mapStyle) setMapStyle(p.mapStyle)
          if (p.themeMode) setThemeMode(p.themeMode)
          else if (typeof p.isDark === 'boolean') setThemeMode(p.isDark ? 'dark' : 'light')
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
    const prefs = { listColumns, popupColumns, mapStyle, themeMode }
    try { localStorage.setItem(prefsKey(user.uid), JSON.stringify(prefs)) } catch (_) {}
    const timer = setTimeout(() => {
      setDoc(doc(db, 'userProfiles', user.uid), prefs, { merge: true })
        .then(() => { setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 2000) })
        .catch((e) => console.warn('Firestore prefs save failed:', e))
    }, 1000)
    return () => clearTimeout(timer)
  }, [user, listColumns, popupColumns, mapStyle, themeMode])

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
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
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
      setIsTruncated(false)
      setResultLimit(null)
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
      if (typeof data.truncated === 'boolean') setIsTruncated(data.truncated)
      if (typeof data.resultLimit === 'number') setResultLimit(data.resultLimit)
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

  const handleSortChange = useCallback((criteria: { column: string; dir: 'asc' | 'desc' }[]) => {
    setSortCriteria(criteria)
  }, [])

  const handleSaveSearch = useCallback(async (name: string) => {
    if (!user || !searchArea) return
    await addDoc(collection(db, 'savedAreas'), {
      name,
      userId: user.uid,
      geometryJson: JSON.stringify(searchArea),
      filtersJson: JSON.stringify(filters),
      sortCriteriaJson: JSON.stringify(sortCriteria),
      presetsJson: JSON.stringify(activePresets),
      timestamp: new Date(),
    })
  }, [user, searchArea, filters, sortCriteria, activePresets])

  const handleSignInPrompt = useCallback(() => { setAuthOpen(true) }, [])

  /**
   * Derived company list with active filters applied.
   * Used to keep map markers in sync with the filtered list view.
   */
  const mapCompanies = useMemo(() => {
    let result: any[] = [...companies]
    if (filters.length > 0) {
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
    }
    result = applyPresets(result, activePresets)
    return result
  }, [companies, filters, activePresets])

  const handleSignOut = async () => {
    await signOut(auth)
  }

  const handleExpand = useCallback((company: any) => {
    setExpandedCompany(company)
  }, [])

  const handleAskAI = useCallback((_company: any) => {
    setPaywallFeature('AI Overview')
  }, [])

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
        tabActive: 'text-gray-900 border-violet-600',
        tab: 'text-gray-400 hover:text-gray-600 border-transparent',
        tabBorder: 'border-gray-100',
        check: 'border-gray-300 bg-white',
        checkActive: 'border-violet-600 bg-violet-600',
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
        {isTruncated && resultLimit !== null && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] font-medium">
              Showing first {resultLimit.toLocaleString()} results — zoom in or refine your area
            </span>
          </div>
        )}
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b ${d.headerBorder}`}>
          <div className="flex items-center justify-between">
            <img src="/logo-full.png" alt="Public Data Maps" className={`h-12 w-auto ${isDark ? 'invert' : ''}`} />

            <div className="flex items-center gap-1.5">
              {/* Search toggle */}
              <button
                onClick={() => { setSearchExpanded(!searchExpanded); setProfileOpen(false) }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                  searchExpanded
                    ? isDark ? 'bg-white/15 border-white/25 text-white' : 'bg-violet-50 border-violet-300 text-violet-600'
                    : d.iconBtn
                }`}
                data-tooltip="Search a place" data-tooltip-pos="bottom"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setSearchExpanded(false) }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all overflow-hidden ${d.iconBtn}`}
                  data-tooltip={user ? 'Account' : 'Settings'} data-tooltip-pos="left"
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </button>
                {profileOpen && (
                  <div className={`absolute right-0 top-10 z-[2000] w-72 rounded-xl border shadow-2xl backdrop-blur-sm ${d.dropdownBg}`}>
                    {user && (
                      <div className={`px-4 py-3 border-b ${d.tabBorder}`}>
                        <div className="flex items-center gap-2.5">
                          {user.photoURL && <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium truncate ${d.title}`}>{user.displayName ?? 'User'}</p>
                            {user.email && <p className={`text-[11px] truncate ${d.dropdownLabel}`}>{user.email}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="px-4 py-3 space-y-3">
                      <div>
                        <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${d.dropdownLabel}`}>Theme</div>
                        <div className={`flex rounded-lg border overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
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
                                themeMode === mode
                                  ? isDark ? 'bg-white/15 text-white' : 'bg-violet-50 text-violet-700'
                                  : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {icon}
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${d.dropdownLabel}`}>Map Style</div>
                        <div className={`flex rounded-lg border overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                          {([
                            { style: 'default' as const, label: 'Default' },
                            { style: 'themed' as const, label: 'Themed' },
                            { style: 'satellite' as const, label: 'Satellite' },
                          ]).map(({ style, label }) => (
                            <button
                              key={style}
                              onClick={() => setMapStyle(style)}
                              className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                                mapStyle === style
                                  ? isDark ? 'bg-white/15 text-white' : 'bg-violet-50 text-violet-700'
                                  : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${d.dropdownLabel}`}>Visible Fields</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setFieldsModalTab('list'); setProfileOpen(false) }}
                            className={`flex-1 text-[11px] font-medium py-1.5 rounded-lg border transition-colors ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            List ({listColumns.length})
                          </button>
                          <button
                            onClick={() => { setFieldsModalTab('popup'); setProfileOpen(false) }}
                            className={`flex-1 text-[11px] font-medium py-1.5 rounded-lg border transition-colors ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            Popup ({popupColumns.length})
                          </button>
                        </div>
                      </div>

                      {user && prefsSaved && (
                        <div className="flex items-center justify-end h-5">
                          <span className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'} animate-prefs-saved`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            Preferences saved
                          </span>
                        </div>
                      )}
                    </div>

                    {user ? (
                      <>
                        <div className={`border-t ${d.tabBorder}`}>
                          <div className="px-3 py-2.5">
                            <SavedAreas
                              onRestoreSearch={(geo, restoredFilters, restoredSortCriteria, restoredPresets, id) => {
                                handleSearch(geo)
                                setFilters(restoredFilters)
                                setSortCriteria(restoredSortCriteria)
                                setActivePresets(restoredPresets)
                                setActiveSearchId(id)
                                setRestoreGeometry({ geometry: geo, ts: Date.now() })
                                setProfileOpen(false)
                              }}
                              onDeleteCurrentSearch={() => handleSearch(null)}
                              activeSearchId={activeSearchId}
                              isDark={isDark}
                            />
                          </div>
                        </div>
                        <div className={`px-4 py-2.5 border-t ${d.tabBorder}`}>
                          <button
                            onClick={handleSignOut}
                            className={`w-full text-left text-xs font-medium transition-colors ${d.signOutBtn}`}
                          >
                            Sign Out
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className={`px-4 py-3 border-t ${d.tabBorder}`}>
                        <button
                          onClick={() => { setAuthOpen(true); setProfileOpen(false) }}
                          className={`w-full flex items-center justify-center gap-2 text-sm font-medium border rounded-lg px-3 py-2 transition-all ${d.signInBtn}`}
                        >
                          Sign in / Create account
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {searchExpanded && (
            <div className="mt-3">
              <SearchBar isDark={isDark} onSelect={(lat, lon) => { setUserLocation([lat, lon]); setSearchExpanded(false) }} />
            </div>
          )}
        </div>

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
            sortCriteria={sortCriteria}
            onSortChange={handleSortChange}
            filters={filters}
            onFiltersChange={setFilters}
            activePresets={activePresets}
            onPresetsChange={setActivePresets}
            canSave={!!user && !!searchArea}
            hasSearchArea={!!searchArea}
            onSaveSearch={handleSaveSearch}
            onSignInPrompt={handleSignInPrompt}
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
                ? isDark ? 'text-gray-300 border-white/15 hover:border-white/30 hover:bg-white/5' : 'text-violet-600 border-violet-300 hover:border-violet-400 hover:bg-violet-50'
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

    {paywallFeature && (
      <Paywall
        isDark={isDark}
        featureName={paywallFeature}
        onClose={() => setPaywallFeature(null)}
      />
    )}

    {fieldsModalTab && (
      <div
        className={`fixed inset-0 z-[9000] flex items-center justify-center backdrop-blur-sm ${isDark ? 'bg-black/50' : 'bg-black/30'}`}
        onMouseDown={(e) => { if (e.target === e.currentTarget) setFieldsModalTab(null) }}
      >
        <ColumnConfig
          columns={displayColumns}
          listColumns={listColumns}
          popupColumns={popupColumns}
          onListColumnsChange={setListColumns}
          onPopupColumnsChange={setPopupColumns}
          isDark={isDark}
          initialTab={fieldsModalTab}
          onClose={() => setFieldsModalTab(null)}
        />
      </div>
    )}
    </>
  )
}
