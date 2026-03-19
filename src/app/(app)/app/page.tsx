'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import CompanyList from '@/components/CompanyList'
import SearchBar from '@/components/SearchBar'
import AuthModal from '@/components/AuthModal'
import CompanyDetail from '@/components/CompanyDetail'
import ExportModal from '@/components/ExportModal'
import ColumnConfig from '@/components/ColumnConfig'
import Paywall from '@/components/Paywall'
import AIOverview from '@/components/AIOverview'
import SettingsModal from '@/components/SettingsModal'
import { Modal, CloseButton, PresetPill, CardSection, SectionTitle, ConfirmModal } from '@/components/ui'
import { applyPresets, PRESET_FILTERS, PRESET_GROUPS, DEFAULT_PRE_QUERY_PRESETS, PRESET_COLUMN_KEYS, type CustomPreset } from '@/lib/presets'
import { useAppLocale, tPreset, tGroup } from '@/lib/useAppLocale'
import { getDefaultHiddenFields, getDefaultListColumns, getDefaultPopupColumns, DEFAULT_LIST_COLS, DEFAULT_POPUP_COLS } from '@/lib/defaultFields'
import {
  type UserTier,
  getUserKey,
  getResultLimit,
  canSearch,
  incrementSearchCount,
  getSearchCount,
  getSavedSearchLimit,
  canUseAI,
  canUseAIOverview,
  getAIOverviewCount,
  incrementAIOverviewCount,
  TIER_LIMITS,
  MAX_ENTERPRISE_RESULT_LIMIT,
  canUsePresets,
} from '@/lib/usage'
import { auth, db } from '@/lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import { signOut, sendEmailVerification } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore'
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

export default function Home() {
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [searchArea, setSearchArea] = useState(null)
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null)
  const [restoreGeometry, setRestoreGeometry] = useState<{ geometry: any; ts: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const [resultLimit, setResultLimit] = useState<number | null>(null)
  const [totalMatching, setTotalMatching] = useState<number | null>(null)
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system')
  const [systemDark, setSystemDark] = useState(true)
  const [mapStyle, setMapStyle] = useState<'default' | 'themed' | 'satellite'>('themed')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [user, authLoading] = useAuthState(auth)
  const [authOpen, setAuthOpen] = useState(false)
  const [emailVerifyPrompt, setEmailVerifyPrompt] = useState(false)
  const [expandedCompany, setExpandedCompany] = useState<any>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [paywallFeature, setPaywallFeature] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const isSigningIn = useRef(false)
  const profileLoaded = useRef(false)
  const hasExplicitHiddenPrefs = useRef(false)
  const preQueryPresetsInit = useRef(false)
  const searchAbort = useRef<AbortController | null>(null)
  const canHover = useRef(true)
  useEffect(() => { canHover.current = window.matchMedia('(hover: hover)').matches }, [])
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [showPortalModal, setShowPortalModal] = useState(false)
  const [portalUrl, setPortalUrl] = useState<string | null>(null)
  const [usageOpen, setUsageOpen] = useState(() => {
    try { return localStorage.getItem('pdm_usage_open') === '1' } catch { return false }
  })
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false)
  const [aiCompany, setAICompany] = useState<any>(null)
  const [aiToken, setAIToken] = useState('')
  const [aiSavedOverview, setAISavedOverview] = useState<{ text: string; sources: string[] } | null>(null)
  const [aiCacheMap, setAICacheMap] = useState<Record<string, boolean>>({})
  const [savedSearchCount, setSavedSearchCount] = useState(0)
  const [searchCount, setSearchCount] = useState(0)
  const [aiOverviewCount, setAIOverviewCount] = useState(0)
  const [aiOverviewsList, setAIOverviewsList] = useState<{ siret: string; companyName: string; city: string; createdAt: string }[]>([])
  const [userTier, setUserTier] = useState<UserTier>('free')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [discountInfo, setDiscountInfo] = useState<{ code: string; plan: string; expiresAt: string } | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgRole, setOrgRole] = useState<'owner' | 'admin' | 'member' | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [orgIconUrl, setOrgIconUrl] = useState<string | null>(null)
  const [bootSteps, setBootSteps] = useState({ auth: false, columns: false, preferences: false, account: false })

  const prefsKey = (uid: string) => `prefs_${uid}`

  const [columns, setColumns] = useState<string[]>([])
  const [displayColumns, setDisplayColumns] = useState<string[]>([])
  const [hiddenFields, setHiddenFields] = useState<string[]>([])
  const [listColumns, setListColumns] = useState<string[]>(DEFAULT_LIST_COLS)
  const [popupColumns, setPopupColumns] = useState<string[]>(DEFAULT_POPUP_COLS)

  const [fieldsModalTab, setFieldsModalTab] = useState<'global' | 'list' | 'popup' | null>(null)
  const { t: txt } = useAppLocale()

  const [sortCriteria, setSortCriteria] = useState<{ column: string; dir: 'asc' | 'desc' }[]>([])
  const [filters, setFilters] = useState<{ column: string; operator: 'contains' | 'equals' | 'empty'; negate: boolean; value: string; joinOr?: boolean }[]>([])
  const [activePresets, setActivePresets] = useState<string[]>([])
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([])
  const [customResultLimit, setCustomResultLimit] = useState<number | null>(null)
  const [defaultPresets, setDefaultPresets] = useState<string[]>([...DEFAULT_PRE_QUERY_PRESETS])
  const [preQueryPresets, setPreQueryPresets] = useState<string[]>([...DEFAULT_PRE_QUERY_PRESETS])
  const [preQueryFilters, setPreQueryFilters] = useState<{ column: string; operator: 'contains' | 'equals' | 'empty'; negate: boolean; value: string; joinOr?: boolean }[]>([])
  const [preQueryCustomIds, setPreQueryCustomIds] = useState<string[]>([])
  const [pqCustomForm, setPqCustomForm] = useState(false)
  const [pqCustomLabel, setPqCustomLabel] = useState('')
  const [pqCustomColumn, setPqCustomColumn] = useState('')
  const [pqCustomOperator, setPqCustomOperator] = useState<'contains' | 'equals' | 'empty'>('contains')
  const [pqCustomNegate, setPqCustomNegate] = useState(false)
  const [pqCustomValue, setPqCustomValue] = useState('')
  const [searchProgress, setSearchProgress] = useState<{ loaded: number; total: number } | null>(null)
  const [searchETA, setSearchETA] = useState<number | null>(null)
  const batchTimestamps = useRef<{ loaded: number; time: number }[]>([])
  const searchTotal = useRef<number>(0)
  const [hoveredPQPreset, setHoveredPQPreset] = useState<string | null>(null)
  const [presetTooltipPos, setPresetTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [connectorSource, setConnectorSource] = useState<string | null>(null)
  const [orgConnectors, setOrgConnectors] = useState<{ id: string; name: string; columns: string[]; rowCount: number }[]>([])
  const [orgConnectorsLoaded, setOrgConnectorsLoaded] = useState(false)
  const [orgQuickFilters, setOrgQuickFilters] = useState<CustomPreset[]>([])
  const [preQueryOrgIds, setPreQueryOrgIds] = useState<string[]>([])

  const isDark = themeMode === 'system' ? systemDark : themeMode === 'dark'

  useEffect(() => {
    const hidden = new Set(hiddenFields)
    const display = columns.filter((c) => !hidden.has(c))
    setDisplayColumns(display)
    setListColumns((prev) => prev.filter((c) => display.includes(c)))
    setPopupColumns((prev) => prev.filter((c) => display.includes(c)))
  }, [columns, hiddenFields])

  const activeFilterColumns = useMemo(() => {
    if (connectorSource) {
      const conn = orgConnectors.find((c) => c.id === connectorSource)
      if (conn?.columns?.length) return conn.columns
    }
    return displayColumns
  }, [connectorSource, orgConnectors, displayColumns])

  /** Listen to OS color-scheme changes for system theme mode. */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!authLoading) setBootSteps((s) => ({ ...s, auth: true }))
  }, [authLoading])

  const postCheckout = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('checkout')) {
      postCheckout.current = params.get('checkout') === 'success'
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  /** Initialise search count from localStorage on mount, then sync from Firestore for logged-in users. */
  useEffect(() => {
    const uKey = getUserKey(user?.uid ?? null)
    setSearchCount(getSearchCount(uKey))
    setAIOverviewCount(getAIOverviewCount(uKey))
    if (!user) {
      setBootSteps((s) => ({ ...s, account: true }))
      return
    }

    const applyUsageData = (data: any) => {
      if (data && typeof data.searchCount === 'number') {
        setSearchCount(data.searchCount)
        const uKey2 = getUserKey(user.uid)
        try {
          localStorage.setItem(`pdm_usage_${uKey2}`, JSON.stringify({ searchCount: data.searchCount, aiOverviewCount: data.aiOverviewCount ?? 0, monthKey: data.monthKey }))
        } catch {}
      }
      if (data && typeof data.aiOverviewCount === 'number') {
        setAIOverviewCount(data.aiOverviewCount)
      }
      if (data?.aiOverviews) setAIOverviewsList(data.aiOverviews)
      if (data?.tier) setUserTier(data.tier as UserTier)
      setSubscriptionStatus(data?.subscriptionStatus ?? null)
      setDiscountInfo(data?.discount ?? null)
      if (data?.org) {
        setOrgId(data.org.orgId ?? null)
        setOrgRole(data.org.orgRole ?? null)
        setOrgName(data.org.orgName ?? null)
        setOrgIconUrl(data.org.orgIconUrl ?? null)
        if (Array.isArray(data.org.orgCustomQuickFilters)) {
          setOrgQuickFilters(data.org.orgCustomQuickFilters)
        }
      }
    }

    const fetchUsage = () =>
      user.getIdToken(true).then((token) =>
        fetch('/api/usage', { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.ok ? r.json() : null)
      )

    fetchUsage()
      .then((data) => {
        applyUsageData(data)
        if (postCheckout.current && (!data?.tier || data.tier === 'free')) {
          postCheckout.current = false
          let attempts = 0
          const poll = setInterval(() => {
            attempts++
            fetchUsage().then((d) => {
              if (d?.tier && d.tier !== 'free') {
                applyUsageData(d)
                clearInterval(poll)
              } else if (attempts >= 10) {
                clearInterval(poll)
              }
            }).catch(() => { if (attempts >= 10) clearInterval(poll) })
          }, 2000)
          return () => clearInterval(poll)
        }
        postCheckout.current = false
      })
      .catch(() => {})
      .finally(() => setBootSteps((s) => ({ ...s, account: true })))
  }, [user])

  useEffect(() => {
    if (!user || !orgId || userTier !== 'enterprise' || orgConnectorsLoaded) return
    user.getIdToken().then((token) =>
      fetch(`/api/org/connectors?orgId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.connectors) setOrgConnectors(data.connectors)
        })
        .catch(() => {})
        .finally(() => setOrgConnectorsLoaded(true))
    ).catch(() => {})
  }, [user, orgId, userTier, orgConnectorsLoaded])

  /**
   * Load user preferences on auth change.
   * localStorage is applied first to avoid a flash of defaults,
   * then Firestore is fetched for cross-device sync.
   */
  useEffect(() => {
    if (!user) {
      profileLoaded.current = false
      hasExplicitHiddenPrefs.current = false
      preQueryPresetsInit.current = false
      setDefaultPresets([...DEFAULT_PRE_QUERY_PRESETS])
      setPreQueryPresets([...DEFAULT_PRE_QUERY_PRESETS])
      setHiddenFields(getDefaultHiddenFields(columns))
      setListColumns(getDefaultListColumns(columns))
      setPopupColumns(getDefaultPopupColumns(columns))
      setBootSteps((s) => ({ ...s, preferences: true }))
      return
    }
    const key = prefsKey(user.uid)
    try {
      const cached = localStorage.getItem(key)
      if (cached) {
        const p = JSON.parse(cached)
        hasExplicitHiddenPrefs.current = Array.isArray(p.hiddenFields) && p.hiddenFields.length > 0
        const resolvedHidden = Array.isArray(p.hiddenFields) && p.hiddenFields.length > 0 ? p.hiddenFields : getDefaultHiddenFields(columns)
        setHiddenFields(resolvedHidden)
        if (Array.isArray(p.listColumns) && p.listColumns.length > 0) setListColumns(p.listColumns)
        else setListColumns(getDefaultListColumns(columns))
        if (Array.isArray(p.popupColumns) && p.popupColumns.length > 0) setPopupColumns(p.popupColumns)
        else setPopupColumns(getDefaultPopupColumns(columns))
        if (p.mapStyle) setMapStyle(p.mapStyle)
        if (p.themeMode) setThemeMode(p.themeMode)
        else if (typeof p.isDark === 'boolean') setThemeMode(p.isDark ? 'dark' : 'light')
        if (Array.isArray(p.customPresets)) setCustomPresets(p.customPresets.filter((cp: CustomPreset) => !resolvedHidden.includes(cp.column)))
        if (typeof p.customResultLimit === 'number') setCustomResultLimit(p.customResultLimit)
        if (Array.isArray(p.defaultPresets)) {
          setDefaultPresets(p.defaultPresets)
          if (!preQueryPresetsInit.current) setPreQueryPresets(p.defaultPresets)
        } else {
          setDefaultPresets([...DEFAULT_PRE_QUERY_PRESETS])
          if (!preQueryPresetsInit.current) setPreQueryPresets([...DEFAULT_PRE_QUERY_PRESETS])
        }
        preQueryPresetsInit.current = true
      }
    } catch (_) {}
    getDoc(doc(db, 'userProfiles', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const p = snap.data()
          hasExplicitHiddenPrefs.current = Array.isArray(p.hiddenFields) && p.hiddenFields.length > 0
          const resolvedHidden = Array.isArray(p.hiddenFields) && p.hiddenFields.length > 0 ? p.hiddenFields : getDefaultHiddenFields(columns)
          setHiddenFields(resolvedHidden)
          if (Array.isArray(p.listColumns) && p.listColumns.length > 0) setListColumns(p.listColumns)
          else setListColumns(getDefaultListColumns(columns))
          if (Array.isArray(p.popupColumns) && p.popupColumns.length > 0) setPopupColumns(p.popupColumns)
          else setPopupColumns(getDefaultPopupColumns(columns))
          if (p.mapStyle) setMapStyle(p.mapStyle)
          if (p.themeMode) setThemeMode(p.themeMode)
          else if (typeof p.isDark === 'boolean') setThemeMode(p.isDark ? 'dark' : 'light')
          if (Array.isArray(p.customPresets)) setCustomPresets(p.customPresets.filter((cp: CustomPreset) => !resolvedHidden.includes(cp.column)))
          if (typeof p.customResultLimit === 'number') setCustomResultLimit(p.customResultLimit)
          if (Array.isArray(p.defaultPresets)) {
            setDefaultPresets(p.defaultPresets)
            if (!preQueryPresetsInit.current) setPreQueryPresets(p.defaultPresets)
          } else {
            setDefaultPresets([...DEFAULT_PRE_QUERY_PRESETS])
            if (!preQueryPresetsInit.current) setPreQueryPresets([...DEFAULT_PRE_QUERY_PRESETS])
          }
          preQueryPresetsInit.current = true
          try { localStorage.setItem(key, JSON.stringify(p)) } catch (_) {}
        }
        profileLoaded.current = true
        setBootSteps((s) => ({ ...s, preferences: true }))
      })
      .catch((e) => {
        console.warn('Firestore prefs load failed, using local cache:', e)
        profileLoaded.current = true
        setBootSteps((s) => ({ ...s, preferences: true }))
      })
  }, [user, columns])

  /**
   * Persist preferences: writes to localStorage immediately for zero-latency,
   * then debounces a Firestore write by 1 s to avoid excessive network calls.
   */
  useEffect(() => {
    if (!user || !profileLoaded.current) return
    const prefs = { listColumns, popupColumns, mapStyle, themeMode, customPresets, customResultLimit, defaultPresets, hiddenFields }
    try { localStorage.setItem(prefsKey(user.uid), JSON.stringify(prefs)) } catch (_) {}
    const timer = setTimeout(() => {
      setDoc(doc(db, 'userProfiles', user.uid), prefs, { merge: true })
        .then(() => { setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 2000) })
        .catch((e) => console.warn('Firestore prefs save failed:', e))
    }, 1000)
    return () => clearTimeout(timer)
  }, [user, listColumns, popupColumns, mapStyle, themeMode, customPresets, customResultLimit, defaultPresets, hiddenFields])

  useEffect(() => {
    fetch('/api/search')
      .then((r) => r.json())
      .then((data) => {
        if (data.columns) {
          const nextColumns: string[] = data.columns
          setColumns(nextColumns)
          const defaultHidden = getDefaultHiddenFields(nextColumns)
          setHiddenFields((prev) => {
            const filtered = prev.filter((c) => nextColumns.includes(c))
            if (profileLoaded.current && hasExplicitHiddenPrefs.current) return filtered
            return defaultHidden
          })
          setListColumns((prev) => {
            const filtered = prev.filter((c) => nextColumns.includes(c))
            if (profileLoaded.current) return filtered
            return filtered.length > 0 ? filtered : getDefaultListColumns(nextColumns)
          })
          setPopupColumns((prev) => {
            const filtered = prev.filter((c) => nextColumns.includes(c))
            if (profileLoaded.current) return filtered
            return filtered.length > 0 ? filtered : getDefaultPopupColumns(nextColumns)
          })
        }
      })
      .catch(console.error)
      .finally(() => setBootSteps((s) => ({ ...s, columns: true })))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const handleLocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn('Geolocation denied:', err)
    )
  }

  const [orgSetupPrompt, setOrgSetupPrompt] = useState(false)

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
      setTotalMatching(null)
      setIsLoading(false)
      setSearchProgress(null)
      return
    }
    if (enterpriseNoOrg) {
      setOrgSetupPrompt(true)
      return
    }
    if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) {
      console.error('Invalid geometry:', geometry)
      return
    }
    const uKey = getUserKey(user?.uid ?? null)
    // Anonymous users: enforce limit client-side. Logged-in users: server enforces.
    if (!user && !canSearch(uKey, userTier)) {
      const limit = TIER_LIMITS[userTier].searchesPerMonth
      setPaywallFeature(`more than ${limit} searches per month`)
      return
    }
    const controller = new AbortController()
    searchAbort.current = controller
    setIsLoading(true)
    setSearchProgress(null)
    try {
      let tierLimit = getResultLimit(userTier)
      if (customResultLimit != null && (userTier === 'enterprise' || userTier === 'individual')) {
        const maxForTier = userTier === 'enterprise' ? MAX_ENTERPRISE_RESULT_LIMIT : TIER_LIMITS[userTier].resultsPerQuery
        tierLimit = Math.min(customResultLimit, maxForTier)
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (user) {
        try { headers['Authorization'] = `Bearer ${await user.getIdToken()}` } catch {}
      }
      const allFilters = [
        ...preQueryFilters,
        ...customPresets
          .filter((cp) => preQueryCustomIds.includes(cp.id))
          .map((cp) => ({ column: cp.column, operator: cp.operator, negate: cp.negate, value: cp.value, joinOr: false })),
        ...orgQuickFilters
          .filter((oq) => preQueryOrgIds.includes(oq.id))
          .map((oq) => ({ column: oq.column, operator: oq.operator, negate: oq.negate, value: oq.value, joinOr: false })),
      ]
      const searchBody: Record<string, any> = { geometry, limit: tierLimit, presets: preQueryPresets, filters: allFilters }
      if (connectorSource && orgId) {
        searchBody.connectorId = connectorSource
        searchBody.connectorOrgId = orgId
      }
      const filterColumns = filters.map((f) => f.column).filter(Boolean)
      const allVisible = Array.from(new Set([...displayColumns, ...listColumns, ...popupColumns, ...filterColumns, ...PRESET_COLUMN_KEYS]))
      if (allVisible.length > 0 && allVisible.length < 104) {
        searchBody.visibleFields = allVisible
      }
      const response = await fetch('/api/search', {
        method: 'POST',
        headers,
        body: JSON.stringify(searchBody),
        signal: controller.signal,
      })
      if (response.status === 429) {
        const limit = TIER_LIMITS[userTier].searchesPerMonth
        setPaywallFeature(`more than ${limit} searches per month`)
        return
      }
      if (!response.ok) {
        const error = await response.json()
        console.error('Search error:', error)
        return
      }

      // Parse SSE stream
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedCompanies: any[] = []
      let meta: any = {}

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop()!

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            switch (evt.type) {
              case 'count':
                meta.totalMatching = evt.total
                break
              case 'start':
                setSearchProgress({ loaded: 0, total: evt.total })
                searchTotal.current = evt.total
                batchTimestamps.current = [{ loaded: 0, time: Date.now() }]
                setSearchETA(null)
                break
              case 'batch':
                accumulatedCompanies.push(...evt.companies)
                setSearchProgress((prev) => ({ loaded: evt.loaded, total: prev?.total ?? evt.loaded }))
                batchTimestamps.current.push({ loaded: evt.loaded, time: Date.now() })
                if (evt.loaded >= 300) {
                  const stamps = batchTimestamps.current
                  const elapsed = stamps[stamps.length - 1].time - stamps[0].time
                  const msPerResult = elapsed / evt.loaded
                  const remaining = searchTotal.current - evt.loaded
                  const eta = Math.round((remaining * msPerResult) / 1000)
                  setSearchETA(eta > 0 ? eta : null)
                }
                break
              case 'complete':
                meta = evt
                break
              case 'error':
                console.error('Search stream error:', evt.message)
                break
            }
          } catch {}
        }
      }

      if (user && typeof meta.searchCountAfter === 'number') {
        setSearchCount(meta.searchCountAfter)
        try {
          const monthKey = new Date().toISOString().slice(0, 7)
          localStorage.setItem(`pdm_usage_${uKey}`, JSON.stringify({ searchCount: meta.searchCountAfter, monthKey }))
        } catch {}
      } else if (!user) {
        const newCount = incrementSearchCount(uKey)
        setSearchCount(newCount)
      }
      setCompanies(accumulatedCompanies)
      setSearchArea(geometry)
      setSelectedCompany(null)
      setActiveSearchId(null)
      if (typeof meta.truncated === 'boolean') setIsTruncated(meta.truncated)
      if (typeof meta.resultLimit === 'number') setResultLimit(meta.resultLimit)
      setTotalMatching(typeof meta.totalMatching === 'number' ? meta.totalMatching : null)
      if (meta.columns) {
        setColumns(meta.columns)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Failed to search:', err)
    } finally {
      setIsLoading(false)
      setSearchProgress(null)
      setSearchETA(null)
    }
  }

  const handleSortChange = useCallback((criteria: { column: string; dir: 'asc' | 'desc' }[]) => {
    setSortCriteria(criteria)
  }, [])

  const handleSaveSearch = useCallback(async (name: string) => {
    if (!user || !searchArea) return
    const maxSaved = getSavedSearchLimit(userTier)
    if (maxSaved !== Infinity && savedSearchCount >= maxSaved) {
      setPaywallFeature(`more than ${maxSaved} saved searches`)
      return
    }
    setSavedSearchCount((c) => c + 1)
    await addDoc(collection(db, 'userProfiles', user.uid, 'savedSearches'), {
      name,
      geometryJson: JSON.stringify(searchArea),
      filtersJson: JSON.stringify(filters),
      sortCriteriaJson: JSON.stringify(sortCriteria),
      presetsJson: JSON.stringify(activePresets),
      preQueryPresetsJson: JSON.stringify(preQueryPresets),
      preQueryFiltersJson: JSON.stringify(preQueryFilters),
      preQueryCustomIdsJson: JSON.stringify(preQueryCustomIds),
      preQueryOrgIdsJson: JSON.stringify(preQueryOrgIds),
      timestamp: new Date(),
    })
  }, [user, searchArea, filters, sortCriteria, activePresets, preQueryPresets, preQueryFilters, preQueryCustomIds, preQueryOrgIds, userTier, savedSearchCount])

  const handleSignInPrompt = useCallback(() => { setAuthOpen(true) }, [])

  /**
   * Derived company list with active filters applied.
   * Used to keep map markers in sync with the filtered list view.
   */
  const mapCompanies = useMemo(() => {
    let result: any[] = [...companies]
    if (filters.length > 0) {
      const groups: typeof filters[number][][] = []
      for (const f of filters) {
        if (!f.column) continue
        if (f.joinOr && groups.length > 0) {
          groups[groups.length - 1].push(f)
        } else {
          groups.push([f])
        }
      }
      for (const group of groups) {
        result = result.filter((c: any) =>
          group.some((f) => {
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
        )
      }
    }
    result = applyPresets(result, activePresets, [...customPresets, ...orgQuickFilters])
    return result
  }, [companies, filters, activePresets, customPresets, orgQuickFilters])

  const enterpriseNoOrg = userTier === 'enterprise' && !orgId

  const usageWarnings = useMemo(() => {
    const limits = TIER_LIMITS[userTier]
    const warnings: string[] = []
    if (limits.searchesPerMonth !== Infinity && searchCount >= limits.searchesPerMonth * 0.8) {
      warnings.push(`${searchCount}/${limits.searchesPerMonth} monthly searches used`)
    }
    if (limits.savedSearches !== Infinity && savedSearchCount >= limits.savedSearches * 0.8) {
      warnings.push(`${savedSearchCount}/${limits.savedSearches} saved searches used`)
    }
    return warnings
  }, [userTier, searchCount, savedSearchCount])

  const clearLocalDataPreservingQuotas = useCallback(() => {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        if (key.startsWith('pdm_usage_') || key === 'pdm_anon_id') continue
        keysToRemove.push(key)
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))
    } catch {}
  }, [])

  const handleSignOut = async () => {
    clearLocalDataPreservingQuotas()
    setCompanies([])
    setSearchArea(null)
    setSelectedCompany(null)
    setExpandedCompany(null)
    setActiveSearchId(null)
    setSortCriteria([])
    setFilters([])
    setActivePresets([])
    setCustomPresets([])
    setCustomResultLimit(null)
    setDefaultPresets([...DEFAULT_PRE_QUERY_PRESETS])
    setPreQueryPresets([...DEFAULT_PRE_QUERY_PRESETS])
    setPreQueryFilters([])
    setPreQueryCustomIds([])
    setPreQueryOrgIds([])
    setHiddenFields(getDefaultHiddenFields(columns))
    setListColumns(getDefaultListColumns(columns))
    setPopupColumns(getDefaultPopupColumns(columns))
    await signOut(auth)
    setUserTier('free')
    setDiscountInfo(null)
    setOrgId(null)
    setOrgRole(null)
    setOrgName(null)
    setOrgSetupPrompt(false)
  }

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const uid = user.uid
      await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      // Clear all client-side state
      setUserTier('free')
      setDiscountInfo(null)
      setSearchCount(0)
      setAIOverviewCount(0)
      setAIOverviewsList([])
      setSavedSearchCount(0)
      setCompanies([])
      setSearchArea(null)
      setSelectedCompany(null)
      setExpandedCompany(null)
      setActiveSearchId(null)
      setOrgId(null)
      setOrgRole(null)
      setOrgName(null)
      setOrgSetupPrompt(false)
      clearLocalDataPreservingQuotas()
      setSortCriteria([])
      setFilters([])
      setActivePresets([])
      setCustomPresets([])
      setCustomResultLimit(null)
      setDefaultPresets([...DEFAULT_PRE_QUERY_PRESETS])
      setPreQueryPresets([...DEFAULT_PRE_QUERY_PRESETS])
      setPreQueryFilters([])
      setPreQueryCustomIds([])
      setPreQueryOrgIds([])
      setHiddenFields(getDefaultHiddenFields(columns))
      setListColumns(getDefaultListColumns(columns))
      setPopupColumns(getDefaultPopupColumns(columns))
      await signOut(auth)
    } catch {}
  }, [user, clearLocalDataPreservingQuotas])

  const handleExpand = useCallback(async (company: any) => {
    setExpandedCompany(company)
    const siret = company.fields?.SIRET || company.fields?.siret
    if (siret && user && !(siret in aiCacheMap)) {
      try {
        const token = await user.getIdToken()
        const res = await fetch(`/api/ai-overview?siret=${encodeURIComponent(siret)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setAICacheMap((prev) => ({ ...prev, [siret]: data.cached }))
        }
      } catch { /* non-critical */ }
    }
  }, [user, aiCacheMap])

  const handleAskAI = useCallback(async (_company: any) => {
    const uKey = getUserKey(user?.uid ?? null)
    if (!canUseAIOverview(uKey, userTier)) {
      const limit = TIER_LIMITS[userTier].aiOverviewsPerMonth
      setPaywallFeature(limit === 0 ? 'AI Overview' : `more than ${limit} AI overviews per month`)
      return
    }
    const newCount = incrementAIOverviewCount(uKey)
    setAIOverviewCount(newCount)
    const fields = _company.fields ?? {}
    const siret = fields.SIRET || fields.siret || ''
    const companyName = fields["Dénomination de l'unité légale"] || fields.denominationUniteLegale || ''
    const city = fields["Commune de l'établissement"] || fields.communeEtablissement || ''
    if (siret) {
      setAIOverviewsList((prev) => [{ siret, companyName, city, createdAt: new Date().toISOString() }, ...prev.filter((e) => e.siret !== siret)])
    }
    const token = user ? await user.getIdToken() : ''
    setAIToken(token)
    setAISavedOverview(null)
    setAICompany(_company)
  }, [userTier, user])

  const handleViewAI = useCallback(async (_company: any) => {
    if (!user) return
    const siret = _company.fields?.SIRET || _company.fields?.siret
    if (!siret) return
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/ai-overview?siret=${encodeURIComponent(siret)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.cached) {
          setAIToken(token)
          setAISavedOverview({ text: data.text, sources: data.sources })
          setAICompany(_company)
          return
        }
      }
    } catch { /* fall through to generate */ }
    handleAskAI(_company)
  }, [user, handleAskAI])

  /** Open a cached AI overview from the settings modal AI overviews list. */
  const handleViewAIBySiret = useCallback(async (siret: string) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/ai-overview?siret=${encodeURIComponent(siret)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.cached) {
          const entry = aiOverviewsList.find((e) => e.siret === siret)
          const fakeCompany = { fields: { SIRET: siret, "Dénomination de l'unité légale": entry?.companyName ?? siret, "Commune de l'établissement": entry?.city ?? '' } }
          setAIToken(token)
          setAISavedOverview({ text: data.text, sources: data.sources })
          setAICompany(fakeCompany)
        }
      }
    } catch {}
  }, [user, aiOverviewsList])

  /** Redirect the user to a Stripe Checkout session for the selected plan. */
  const handleCheckout = useCallback(async (planId: string, billing: 'monthly' | 'yearly') => {
    if (!user) { setAuthOpen(true); return }
    if (user.providerData[0]?.providerId === 'password' && !user.emailVerified) {
      setEmailVerifyPrompt(true)
      return
    }
    try {
      const token = await user.getIdToken(true)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId, billing }),
      })
      const data = await res.json()
      if (res.status === 403 && data.error?.includes('verify')) {
        setEmailVerifyPrompt(true)
        return
      }
      if (data.url) window.location.href = data.url
    } catch {}
  }, [user])

  /** Redirect paid users to the Stripe Customer Portal for subscription management. */
  const handleManagePlan = useCallback(async () => {
    if (!user) return
    if (discountInfo) {
      setPaywallFeature('plan')
      return
    }
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.url) {
        setPortalUrl(data.url)
        setShowPortalModal(true)
      }
    } catch {}
  }, [user, discountInfo])

  /** Redeem a discount code — called from the Paywall component. */
  const handleRedeemCode = useCallback(async (code: string): Promise<{ error?: string }> => {
    if (!user) { setAuthOpen(true); return { error: 'Please sign in first' } }
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) return { error: data.error ?? 'Failed to redeem code' }
      if (data.plan) setUserTier(data.plan)
      if (data.plan) setDiscountInfo({ code, plan: data.plan, expiresAt: data.expiresAt })
      return {}
    } catch {
      return { error: 'Network error — please try again' }
    }
  }, [user])

  /** Revert a discount-based upgrade back to the free tier. */
  const handleRevertDiscount = useCallback(async () => {
    if (!user) return
    setRevertConfirmOpen(true)
  }, [user])

  /** Actually performs the revert after user confirms. */
  const confirmRevertDiscount = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      await fetch('/api/discount/revert', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setUserTier('free')
      setDiscountInfo(null)
      setRevertConfirmOpen(false)
      setPaywallFeature(null)
    } catch {}
  }, [user])

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
        savedSearchesBorder: 'border-white/5',
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
        savedSearchesBorder: 'border-gray-200',
        footer: 'border-gray-200',
        footerText: 'text-gray-400',
        loadingBg: 'bg-white/90 text-gray-900 border-gray-200',
      }

  const bootReady = bootSteps.auth && bootSteps.columns && bootSteps.preferences && bootSteps.account
  const bootProgress = [bootSteps.auth, bootSteps.columns, bootSteps.preferences, bootSteps.account].filter(Boolean).length
  const bootLabel = !bootSteps.auth
    ? txt.bootAuth
    : !bootSteps.columns
      ? txt.bootSchema
      : !bootSteps.preferences
        ? txt.bootPrefs
        : !bootSteps.account
          ? txt.bootAccount
          : txt.bootReady

  if (!bootReady) {
    return (
      <div className={`flex h-dvh items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
        <div className="flex flex-col items-center gap-4 w-64">
          <img src="/brand/logo-full.png" alt="Public Data Maps" className={`h-14 w-auto ${isDark ? 'invert' : ''}`} />
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${(bootProgress / 4) * 100}%`, background: '#7c3aed' }}
            />
          </div>
          <span className={`text-xs md:text-[11px] font-medium tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {bootLabel}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      <main className={`flex h-dvh ${d.main}`}>
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
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[1000] backdrop-blur-sm text-sm font-medium px-4 py-2.5 rounded-2xl shadow-lg border ${d.loadingBg}`}>
            <span className="inline-block animate-pulse">{txt.searching}</span>
            <div className="mt-1.5 h-1 w-40 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
              {searchProgress ? (
                <div
                  className="h-full rounded-full transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.min((searchProgress.loaded / searchProgress.total) * 100, 100)}%`, background: '#7c3aed' }}
                />
              ) : (
                <div className="h-full w-1/3 rounded-full animate-loading-bar" style={{ background: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.25)' }} />
              )}
            </div>
            {searchProgress && (
              <div className={`flex items-center justify-between mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="text-xs md:text-[10px]">{searchProgress.loaded.toLocaleString()} / {searchProgress.total.toLocaleString()}</span>
                {searchETA !== null && searchETA >= 1 && (
                  <span className={`text-xs md:text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    ≤{searchETA >= 60 ? `${Math.floor(searchETA / 60)}m${String(searchETA % 60).padStart(2, '0')}s` : `${searchETA}s`}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[1199] bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar toggle */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[1100] md:hidden flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border transition-colors backdrop-blur-sm ${
            isDark
              ? 'bg-gray-900/90 border-white/15 text-gray-200'
              : 'bg-white/90 border-gray-200 text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-xs font-medium">
            {companies.length > 0 ? txt.resultsCount(companies.length) : txt.openPanel}
          </span>
        </button>
      )}

      {/* Sidebar */}
      <div
          className={`
            ${d.sidebar}
            fixed inset-x-0 bottom-0 z-[1200] rounded-t-2xl shadow-2xl
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'}
            md:static md:z-auto md:rounded-none md:shadow-none
            md:flex-shrink-0 md:h-full md:overflow-hidden
            md:translate-y-0 md:transition-[width] md:duration-300 md:ease-in-out
            ${sidebarOpen ? 'md:w-[380px]' : 'md:w-0'}
          `}
        >
          {/* Mobile drag handle */}
          <div className="md:hidden flex justify-center pt-2 pb-1">
            <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
          </div>
          <div className="h-[85dvh] md:h-full w-full md:min-w-[380px] md:w-[380px] flex flex-col">
        {isTruncated && resultLimit !== null && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs md:text-[11px] font-medium">
              {txt.showingResults(resultLimit, totalMatching)} — {userTier === 'enterprise' || userTier === 'individual' ? txt.adjustLimitBelow : txt.zoomOrRefine}
            </span>
          </div>
        )}
        {user && user.providerData[0]?.providerId === 'password' && !user.emailVerified && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-xs md:text-[11px] font-medium">{txt.emailNotVerified} — <button onClick={() => setEmailVerifyPrompt(true)} className="underline hover:no-underline">{txt.resendVerification}</button> <span className="opacity-60">{txt.checkSpam}</span></span>
          </div>
        )}
        {usageWarnings.map((msg) => (
          <div key={msg} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-xs md:text-[11px] font-medium">{msg} — <button onClick={() => setPaywallFeature('higher usage limits')} className="underline hover:no-underline">{txt.upgrade}</button></span>
          </div>
        ))}
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b ${d.headerBorder}`}>
          <div className="flex items-center justify-between">
            <img src="/brand/logo-full.png" alt="Public Data Maps" className={`h-12 w-auto ${isDark ? 'invert' : ''}`} />

            <div className="flex items-center gap-2 md:gap-1.5">
              {/* Search toggle */}
              <button
                onClick={() => setSearchExpanded(!searchExpanded)}
                className={`w-10 h-10 md:w-8 md:h-8 rounded-lg flex items-center justify-center border transition-all ${
                  searchExpanded
                    ? isDark ? 'bg-white/15 border-white/25 text-white' : 'bg-violet-50 border-violet-300 text-violet-600'
                    : d.iconBtn
                }`}
                data-tooltip={txt.searchPlace} data-tooltip-pos="bottom"
              >
                <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {(orgId || (!orgId && userTier === 'enterprise')) && (
                <a
                  href="/org"
                  className={`w-10 h-10 md:w-8 md:h-8 rounded-lg flex items-center justify-center border transition-all overflow-hidden ${d.iconBtn}`}
                  data-tooltip={orgId ? txt.organization : txt.setupOrganization} data-tooltip-pos="bottom"
                >
                  {orgIconUrl ? (
                    <img src={orgIconUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                  )}
                </a>
              )}
              {/* Profile */}
              <button
                  onClick={() => { setSettingsModalOpen(true); setSearchExpanded(false) }}
                  className={`relative w-10 h-10 md:w-8 md:h-8 rounded-lg flex items-center justify-center border transition-all overflow-hidden ${d.iconBtn}`}
                  data-tooltip={user ? txt.account : txt.settings} data-tooltip-pos="left"
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full rounded-lg object-cover" />
                  ) : user ? (
                    <span className="w-full h-full rounded-lg bg-violet-600 flex items-center justify-center text-white text-xs font-semibold">
                      {(user.displayName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                    </span>
                  ) : (
                    <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}

                </button>
            </div>
          </div>

          {searchExpanded && (
            <div className="mt-3">
              <SearchBar isDark={isDark} onSelect={(lat, lon) => { setUserLocation([lat, lon]); setSearchExpanded(false) }} />
            </div>
          )}
        </div>

        {/* Pre-search filters */}
        {(() => {
          if (enterpriseNoOrg) {
            return (
              <div className={`flex-1 flex flex-col items-center justify-center border-b px-5 py-6 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                <svg className={`w-8 h-8 mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                <span className={`text-[12px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {txt.setupOrgTitle}
                </span>
                <p className={`text-xs md:text-[11px] mt-1.5 text-center leading-relaxed max-w-[260px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {txt.setupOrgDesc}
                </p>
                <a
                  href="/org"
                  className={`mt-3 text-xs md:text-[11px] font-medium px-4 py-1.5 rounded-lg border transition-colors ${
                    isDark ? 'bg-white text-gray-900 border-white hover:bg-gray-200' : 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
                  }`}
                >
                  {txt.setupOrgBtn}
                </a>
              </div>
            )
          }

          const presetsUnlocked = canUsePresets(userTier)
          const totalActive = preQueryPresets.length + preQueryFilters.length + preQueryCustomIds.length + preQueryOrgIds.length
          const locked = isLoading || !!searchArea
          const hasResults = companies.length > 0
          const hoveredDef = hoveredPQPreset ? PRESET_FILTERS.find((p) => p.id === hoveredPQPreset) ?? customPresets.find((p) => p.id === hoveredPQPreset) ?? orgQuickFilters.find((p) => p.id === hoveredPQPreset) : null
          const effectiveLimit = (userTier === 'individual' || userTier === 'enterprise')
            ? (customResultLimit ?? getResultLimit(userTier))
            : getResultLimit(userTier)

          if (!presetsUnlocked) {
            if (hasResults) return null
            return (
              <div className={`flex-1 flex flex-col items-center justify-center border-b px-5 py-6 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                <svg className={`w-5 h-5 mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className={`text-xs md:text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {txt.preSearchFilters}
                </span>
                <p className={`text-xs md:text-[10px] mt-1 text-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  {txt.filterServerSide}
                </p>
                <button
                  onClick={() => setPaywallFeature('pre-search filters')}
                  className={`mt-2 text-xs md:text-[10px] font-medium px-3 py-1 rounded-full border transition-colors ${
                    isDark ? 'border-white/15 text-gray-400 hover:text-white hover:border-white/30' : 'border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {txt.upgradeToIndividual}
                </button>
              </div>
            )
          }

          if (hasResults) {
            const activeBuiltIn = PRESET_FILTERS.filter((p) => preQueryPresets.includes(p.id))
            const activeCustom = customPresets.filter((cp) => preQueryCustomIds.includes(cp.id))
            const activeOrg = orgQuickFilters.filter((oq) => preQueryOrgIds.includes(oq.id))
            return (
              <div className={`flex-shrink-0 border-b px-5 py-2.5 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs md:text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {txt.preSearch}
                  </span>
                  {locked && (
                    <span className={`text-[11px] md:text-[9px] italic flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{txt.locked}</span>
                  )}
                  {connectorSource && (() => {
                    const conn = orgConnectors.find((c) => c.id === connectorSource)
                    return conn ? (
                      <span className={`text-xs md:text-[10px] font-medium px-1.5 py-0 rounded-full border ${isDark ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                        {conn.name}
                      </span>
                    ) : null
                  })()}
                  {activeBuiltIn.map((p) => (
                    <span key={p.id} className={`text-xs md:text-[10px] font-medium px-1.5 py-0 rounded-full border ${isDark ? 'bg-white/15 text-white border-white/25' : 'bg-violet-50 text-violet-700 border-violet-300'}`}>
                      {p.label}
                    </span>
                  ))}
                  {activeCustom.map((cp) => (
                    <span key={cp.id} className={`text-xs md:text-[10px] font-medium px-1.5 py-0 rounded-full border ${isDark ? 'bg-white/15 text-white border-white/25' : 'bg-violet-50 text-violet-700 border-violet-300'}`}>
                      {cp.label}
                    </span>
                  ))}
                  {activeOrg.map((oq) => (
                    <span key={oq.id} className={`text-xs md:text-[10px] font-medium px-1.5 py-0 rounded-full border ${isDark ? 'bg-white/15 text-white border-white/25' : 'bg-violet-50 text-violet-700 border-violet-300'}`}>
                      {oq.label}
                    </span>
                  ))}
                  {preQueryFilters.map((f, i) => (
                    <span key={`f-${i}`} className={`text-xs md:text-[10px] font-medium px-1.5 py-0 rounded-full border ${isDark ? 'bg-white/10 border-white/20 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                      {f.negate ? '!' : ''}{f.column.length > 10 ? f.column.substring(0, 10) + '…' : f.column} {f.operator}
                    </span>
                  ))}
                  <span className={`text-xs md:text-[10px] flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {txt.max} {effectiveLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            )
          }

          return (
            <div className={`flex-1 overflow-y-auto border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
              <div className="px-5 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      {txt.preSearchFilters}
                    </h2>
                    {totalActive > 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'text-gray-500 bg-white/10' : 'text-gray-500 bg-gray-100'}`}>
                        {totalActive}
                      </span>
                    )}
                    {locked && (
                      <span className={`text-[11px] md:text-[9px] italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{txt.locked}</span>
                    )}
                  </div>
                  {totalActive > 0 && !locked && (
                    <button
                      onClick={() => { setPreQueryPresets([]); setPreQueryFilters([]); setPreQueryCustomIds([]); setPreQueryOrgIds([]) }}
                      className={`text-xs md:text-[10px] font-medium ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                    >
                      {txt.clearAll}
                    </button>
                  )}
                </div>
                <p className={`text-xs md:text-[10px] leading-relaxed ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  {txt.preSearchDesc}
                </p>

                {userTier === 'enterprise' && orgConnectors.length > 0 && (
                  <CardSection isDark={isDark}>
                    <SectionTitle isDark={isDark} className="mb-1">{txt.source}</SectionTitle>
                    <select
                      value={connectorSource ?? ''}
                      onChange={(e) => {
                        const v = e.target.value || null
                        setConnectorSource(v)
                        if (v) setPreQueryPresets([])
                      }}
                      disabled={locked}
                      className={`w-full text-xs md:text-[11px] px-2.5 py-1.5 rounded-lg border outline-none ${isDark ? 'bg-gray-800 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} disabled:opacity-50`}
                    >
                      <option value="">{txt.publicData}</option>
                      {orgConnectors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.rowCount.toLocaleString()})</option>
                      ))}
                    </select>
                  </CardSection>
                )}

                {/* Quick filters card */}
                <CardSection isDark={isDark}>
                  {!connectorSource && PRESET_GROUPS.map((group) => {
                    const presets = PRESET_FILTERS.filter((p) => p.group === group)
                    const activeInGroup = presets.filter((p) => preQueryPresets.includes(p.id))
                    return (
                      <div key={group} className="mb-1.5 last:mb-0">
                        <SectionTitle isDark={isDark} className="mb-0.5">{tGroup(txt, group)}</SectionTitle>
                        <div className="flex flex-wrap gap-1 items-center">
                          {presets.map((preset) => {
                            const active = preQueryPresets.includes(preset.id)
                            const activeIdx = activeInGroup.indexOf(preset)
                            return (
                              <span key={preset.id} className="contents">
                                {active && activeIdx > 0 && (
                                  <span className={`text-[9px] italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{txt.orLabel}</span>
                                )}
                                <PresetPill
                                  label={preset.label}
                                  active={active}
                                  isDark={isDark}
                                  disabled={locked}
                                  onClick={() => setPreQueryPresets((prev) => active ? prev.filter((id) => id !== preset.id) : [...prev, preset.id])}
                                  onMouseEnter={() => { if (canHover.current) setHoveredPQPreset(preset.id) }}
                                  onMouseMove={(e: React.MouseEvent) => { if (canHover.current) setPresetTooltipPos({ x: e.clientX, y: e.clientY }) }}
                                  onMouseLeave={() => { setHoveredPQPreset(null); setPresetTooltipPos(null) }}
                                />
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  {orgQuickFilters.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                      <div className="flex items-center justify-between mb-0.5">
                        <SectionTitle isDark={isDark}>{txt.organization}</SectionTitle>
                        {(orgRole === 'owner' || orgRole === 'admin') && (
                          <a
                            href="/org#settings"
                            className={`text-[10px] font-medium ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            {txt.manage}
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {orgQuickFilters.map((oq) => {
                          const active = preQueryOrgIds.includes(oq.id)
                          return (
                            <PresetPill
                              key={oq.id}
                              label={oq.label}
                              active={active}
                              isDark={isDark}
                              org
                              disabled={locked}
                              onClick={() => setPreQueryOrgIds((prev) => active ? prev.filter((id) => id !== oq.id) : [...prev, oq.id])}
                              onMouseEnter={() => { if (canHover.current) setHoveredPQPreset(oq.id) }}
                              onMouseMove={(e: React.MouseEvent) => { if (canHover.current) setPresetTooltipPos({ x: e.clientX, y: e.clientY }) }}
                              onMouseLeave={() => { setHoveredPQPreset(null); setPresetTooltipPos(null) }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <SectionTitle isDark={isDark}>{txt.custom}</SectionTitle>
                      {!locked && (
                        <button
                          onClick={() => {
                            setPqCustomForm(!pqCustomForm)
                            if (!pqCustomForm && activeFilterColumns.length > 0) setPqCustomColumn(activeFilterColumns[0])
                          }}
                          className={`text-[10px] font-medium ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {pqCustomForm ? txt.cancel : txt.newFilter}
                        </button>
                      )}
                    </div>
                    {customPresets.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {customPresets.map((cp) => {
                          const active = preQueryCustomIds.includes(cp.id)
                          return (
                            <div key={cp.id} className="group/custom inline-flex items-center gap-0.5">
                              <PresetPill
                                label={cp.label}
                                active={active}
                                isDark={isDark}
                                custom
                                disabled={locked}
                                onClick={() => setPreQueryCustomIds((prev) => active ? prev.filter((id) => id !== cp.id) : [...prev, cp.id])}
                                onMouseEnter={() => { if (canHover.current) setHoveredPQPreset(cp.id) }}
                                onMouseMove={(e: React.MouseEvent) => { if (canHover.current) setPresetTooltipPos({ x: e.clientX, y: e.clientY }) }}
                                onMouseLeave={() => { setHoveredPQPreset(null); setPresetTooltipPos(null) }}
                              />
                              {!locked && (
                                <button
                                  onClick={() => {
                                    setCustomPresets(customPresets.filter((x) => x.id !== cp.id))
                                    setPreQueryCustomIds((prev) => prev.filter((id) => id !== cp.id))
                                  }}
                                  className={`opacity-0 group-hover/custom:opacity-100 transition-opacity w-3.5 h-3.5 rounded-full flex items-center justify-center ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {pqCustomForm && !locked && (
                      <div className={`rounded-lg border p-2 space-y-1.5 ${isDark ? 'bg-white/3 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                        <input
                          type="text"
                          value={pqCustomLabel}
                          onChange={(e) => setPqCustomLabel(e.target.value)}
                          placeholder={txt.labelName}
                          className={`w-full rounded border px-1.5 py-1 outline-none text-xs ${isDark ? 'bg-white/5 border-white/10 text-gray-300 placeholder-gray-600' : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'}`}
                        />
                        <div className="flex items-center gap-1 min-w-0">
                          <select
                            value={pqCustomColumn}
                            onChange={(e) => setPqCustomColumn(e.target.value)}
                            className={`flex-1 min-w-0 rounded border h-[26px] text-xs outline-none ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}
                          >
                            {activeFilterColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button
                            onClick={() => setPqCustomNegate(!pqCustomNegate)}
                            className={`flex-shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 border transition-colors ${
                              pqCustomNegate
                                ? isDark ? 'text-white border-white/30 bg-white/10' : 'text-gray-900 border-gray-400 bg-gray-100'
                                : isDark ? 'text-gray-600 border-white/10 hover:text-gray-400' : 'text-gray-400 border-gray-200 hover:text-gray-600'
                            }`}
                          >
                            NOT
                          </button>
                          <select
                            value={pqCustomOperator}
                            onChange={(e) => setPqCustomOperator(e.target.value as 'contains' | 'equals' | 'empty')}
                            className={`rounded border px-1 py-1 outline-none text-xs ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}
                          >
                            <option value="contains">{txt.filterOperator('contains')}</option>
                            <option value="equals">{txt.filterOperator('equals')}</option>
                            <option value="empty">{txt.filterOperator('empty')}</option>
                          </select>
                        </div>
                        {pqCustomOperator !== 'empty' && (
                          <input
                            type="text"
                            value={pqCustomValue}
                            onChange={(e) => setPqCustomValue(e.target.value)}
                            placeholder={txt.valuePlaceholder}
                            className={`w-full rounded border px-1.5 py-1 outline-none text-xs ${isDark ? 'bg-white/5 border-white/10 text-gray-300 placeholder-gray-600' : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'}`}
                          />
                        )}
                        <button
                          disabled={!pqCustomLabel.trim() || !pqCustomColumn}
                          onClick={() => {
                            const id = 'custom_' + Date.now().toString(36)
                            setCustomPresets([...customPresets, {
                              id,
                              label: pqCustomLabel.trim(),
                              column: pqCustomColumn,
                              operator: pqCustomOperator,
                              negate: pqCustomNegate,
                              value: pqCustomValue,
                            }])
                            setPqCustomLabel('')
                            setPqCustomValue('')
                            setPqCustomNegate(false)
                            setPqCustomForm(false)
                          }}
                          className={`text-[10px] font-semibold py-1 px-3 rounded-lg transition-all disabled:opacity-40 ${
                            isDark ? 'bg-white/10 text-gray-200 hover:bg-white/15' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {txt.createQuickFilter}
                        </button>
                      </div>
                    )}
                  </div>
                  {hoveredDef && presetTooltipPos && (
                    <div
                      className="fixed z-[10000] pointer-events-none whitespace-nowrap"
                      style={{ left: presetTooltipPos.x - 8, top: presetTooltipPos.y + 14, background: '#1f2937', color: '#f3f4f6', fontSize: '11px', fontWeight: 500, lineHeight: 1.3, padding: '4px 8px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', transform: 'translateX(-100%)' }}
                    >
                      {'description' in hoveredDef ? (hoveredDef as any).description : `${(hoveredDef as CustomPreset).negate ? 'NOT ' : ''}${(hoveredDef as CustomPreset).column} ${(hoveredDef as CustomPreset).operator} ${(hoveredDef as CustomPreset).value}`}
                    </div>
                  )}
                </CardSection>

                {/* Filters card */}
                <CardSection isDark={isDark} className="space-y-0">
                  {preQueryFilters.map((f, i) => (
                    <div key={i}>
                      {i > 0 && (
                        <div className="flex justify-start pl-1 py-0.5">
                          <button
                            disabled={locked}
                            onClick={() => setPreQueryFilters(preQueryFilters.map((x, idx) => idx === i ? { ...x, joinOr: !x.joinOr } : x))}
                            className={`text-[9px] font-bold tracking-wide rounded px-1.5 py-px border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
                        <select
                          value={f.column}
                          disabled={locked}
                          onChange={(e) => setPreQueryFilters(preQueryFilters.map((x, idx) => idx === i ? { ...x, column: e.target.value } : x))}
                          className={`flex-1 min-w-0 rounded border h-[26px] text-xs outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >
                          {activeFilterColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button
                          disabled={locked}
                          onClick={() => setPreQueryFilters(preQueryFilters.map((x, idx) => idx === i ? { ...x, negate: !x.negate } : x))}
                          className={`flex-shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            f.negate
                              ? isDark ? 'text-white border-white/30 bg-white/10' : 'text-gray-900 border-gray-400 bg-gray-100'
                              : isDark ? 'text-gray-600 border-white/10 hover:text-gray-400' : 'text-gray-400 border-gray-200 hover:text-gray-600'
                          }`}
                        >
                          NOT
                        </button>
                        <select
                          value={f.operator}
                          disabled={locked}
                          onChange={(e) => setPreQueryFilters(preQueryFilters.map((x, idx) => idx === i ? { ...x, operator: e.target.value as 'contains' | 'equals' | 'empty' } : x))}
                          className={`rounded border px-1 py-1 outline-none text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >
                          <option value="contains">{txt.filterOperator('contains')}</option>
                          <option value="equals">{txt.filterOperator('equals')}</option>
                          <option value="empty">{txt.filterOperator('empty')}</option>
                        </select>
                        {f.operator !== 'empty' && (
                          <input
                            type="text"
                            value={f.value}
                            disabled={locked}
                            onChange={(e) => setPreQueryFilters(preQueryFilters.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))}
                            placeholder={txt.valuePlaceholder}
                            className={`flex-1 min-w-0 rounded border px-1.5 py-1 outline-none text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                              isDark ? 'bg-white/5 border-white/10 text-gray-300 placeholder-gray-600' : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'
                            }`}
                          />
                        )}
                        {!locked && (
                          <button
                            onClick={() => setPreQueryFilters(preQueryFilters.filter((_, idx) => idx !== i))}
                            className={`flex-shrink-0 ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {!locked && (
                    <button
                      onClick={() => {
                        const col = activeFilterColumns.length > 0 ? activeFilterColumns[0] : ''
                        setPreQueryFilters([...preQueryFilters, { column: col, operator: 'contains', negate: false, value: '', joinOr: false }])
                      }}
                      className={`flex items-center text-[10px] font-medium h-6 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {txt.addFilter}
                    </button>
                  )}
                </CardSection>

                {/* Result limit card */}
                {(userTier === 'individual' || userTier === 'enterprise') && (() => {
                  const maxForTier = userTier === 'enterprise' ? MAX_ENTERPRISE_RESULT_LIMIT : TIER_LIMITS[userTier].resultsPerQuery
                  const currentValue = customResultLimit ?? getResultLimit(userTier)
                  const handleChange = (v: number) => {
                    if (isNaN(v) || v < 1) { setCustomResultLimit(null); return }
                    setCustomResultLimit(Math.min(v, maxForTier))
                  }
                  return (
                    <CardSection isDark={isDark}>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min={1}
                          max={maxForTier}
                          step={1}
                          value={currentValue}
                          disabled={locked}
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
                            disabled={locked}
                            onChange={(e) => handleChange(parseInt(e.target.value, 10))}
                            className={`flex-1 min-w-0 rounded-md border px-2 py-1 text-[11px] outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              isDark
                                ? 'bg-white/5 border-white/10 text-white focus:border-white/30'
                                : 'bg-white border-gray-200 text-gray-900 focus:border-blue-400'
                            }`}
                          />
                          <button
                            disabled={locked || currentValue === maxForTier}
                            onClick={() => setCustomResultLimit(maxForTier)}
                            className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                          >
                            Max
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{currentValue.toLocaleString()} / {maxForTier.toLocaleString()}</span>
                          {currentValue > 50_000 && (
                            <span className="text-[10px] font-medium text-amber-500">{txt.maySlow}</span>
                          )}
                        </div>
                      </div>
                    </CardSection>
                  )
                })()}

                {locked && (
                  <p className={`text-[10px] italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {txt.clearAreaToModify}
                  </p>
                )}
              </div>
            </div>
          )
        })()}

        {/* Company List */}
        {companies.length > 0 && (
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
            customPresets={customPresets}
            onCustomPresetsChange={setCustomPresets}
            disabledPresetIds={[...preQueryPresets, ...preQueryCustomIds, ...preQueryOrgIds]}
            userTier={userTier}
            orgQuickFilters={orgQuickFilters}
            orgRole={orgRole}
            canSave={!!user && !!searchArea}
            hasSearchArea={!!searchArea}
            onSaveSearch={handleSaveSearch}
            onSignInPrompt={handleSignInPrompt}
            onPaywall={setPaywallFeature}
          />
        </div>
        )}

        {/* Footer */}
        <div className={`flex-shrink-0 px-5 py-3 border-t flex items-center ${d.footer}`}>
          <p className={`text-[10px] flex-1 ${d.footerText}`}>
            {txt.dataSource}
          </p>
          <button
            onClick={() => { if (!user) { setAuthOpen(true) } else { setExportOpen(true) } }}
            disabled={companies.length === 0}
            className={`text-[10px] font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
              companies.length > 0
                ? isDark ? 'text-gray-300 border-white/15 hover:border-white/30 hover:bg-white/5' : 'text-violet-600 border-violet-300 hover:border-violet-400 hover:bg-violet-50'
                : isDark ? 'text-gray-700 border-white/5 cursor-not-allowed' : 'text-gray-400 border-gray-200 cursor-not-allowed'
            }`}
            data-tooltip={user ? txt.exportTooltip : txt.signInToExport} data-tooltip-pos="left"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {txt.export}
          </button>
        </div>
        <div className={`flex-shrink-0 px-5 py-2 border-t flex items-center justify-center gap-3 ${d.footer}`}>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className={`text-[10px] hover:underline transition-opacity ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>{txt.privacyPolicy}</a>
          <span className={`text-[10px] ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>&middot;</span>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className={`text-[10px] hover:underline transition-opacity ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>{txt.termsOfService}</a>
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

    {emailVerifyPrompt && (
      <Modal isDark={isDark} onClose={() => setEmailVerifyPrompt(false)} zIndex="z-[9800]" className={`w-full md:w-[360px] p-6 ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
        {(handleClose) => (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{txt.verifyEmailTitle}</h3>
              <CloseButton onClick={handleClose} isDark={isDark} />
            </div>
            <p className={`text-[12px] leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {txt.verifyEmailDesc}
            </p>
            <button
              onClick={async () => {
                if (user) {
                  try { await sendEmailVerification(user); alert(txt.verificationEmailSentAlert) } catch { alert(txt.verificationEmailFailAlert) }
                }
              }}
              className={`w-full text-[12px] font-medium py-2 rounded-lg transition-colors ${
                isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-violet-600 text-white hover:bg-violet-700'
              }`}
            >
              {txt.resendVerificationEmail}
            </button>
            <button onClick={handleClose} className={`w-full text-[11px] font-medium py-1.5 transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
              {txt.close}
            </button>
          </div>
        )}
      </Modal>
    )}

    {settingsModalOpen && (
      <SettingsModal
        isDark={isDark}
        onClose={() => setSettingsModalOpen(false)}
        user={user ? { uid: user.uid, email: user.email ?? null, displayName: user.displayName ?? null, photoURL: user.photoURL ?? null, emailVerified: user.emailVerified, providerId: user.providerData[0]?.providerId ?? null } : null}
        userTier={userTier}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        globalVisibleCount={displayColumns.length}
        listColumns={listColumns}
        popupColumns={popupColumns}
        onFieldsModal={setFieldsModalTab}
        onManagePlan={handleManagePlan}
        subscriptionStatus={subscriptionStatus}
        onPaywall={setPaywallFeature}
        onDeleteAccount={handleDeleteAccount}
        onSignOut={handleSignOut}
        onSignIn={() => setAuthOpen(true)}
        prefsSaved={prefsSaved && !fieldsModalTab}
        searchCount={searchCount}
        aiOverviewCount={aiOverviewCount}
        aiOverviewsList={aiOverviewsList}
        savedSearchCount={savedSearchCount}
        usageOpen={usageOpen}
        onUsageToggle={() => { const next = !usageOpen; setUsageOpen(next); try { localStorage.setItem('pdm_usage_open', next ? '1' : '0') } catch {} }}
        onRestoreSearch={(geo, restoredFilters, restoredSortCriteria, restoredPresets, id, restoredPreQueryPresets, restoredPreQueryFilters, restoredPreQueryCustomIds, restoredPreQueryOrgIds) => {
          setPreQueryPresets(restoredPreQueryPresets ?? [])
          setPreQueryFilters(restoredPreQueryFilters ?? [])
          setPreQueryCustomIds(restoredPreQueryCustomIds ?? [])
          setPreQueryOrgIds(restoredPreQueryOrgIds ?? [])
          handleSearch(geo)
          setFilters(restoredFilters)
          setSortCriteria(restoredSortCriteria)
          setActivePresets(restoredPresets)
          setActiveSearchId(id)
          setRestoreGeometry({ geometry: geo, ts: Date.now() })
        }}
        onDeleteCurrentSearch={() => handleSearch(null)}
        onSavedSearchCountChange={setSavedSearchCount}
        activeSearchId={activeSearchId}
        onViewAIOverview={handleViewAIBySiret}
        customResultLimit={customResultLimit}
        onCustomResultLimitChange={setCustomResultLimit}
        defaultPresets={defaultPresets}
        onDefaultPresetsChange={(v) => { setDefaultPresets(v); if (!searchArea) setPreQueryPresets(v) }}
        orgId={orgId}
        orgRole={orgRole}
        orgName={orgName}
        orgIconUrl={orgIconUrl}
      />
    )}

    {expandedCompany && (
      <CompanyDetail
        company={expandedCompany}
        displayColumns={displayColumns}
        isDark={isDark}
        onClose={() => setExpandedCompany(null)}
        onAskAI={handleAskAI}
        onViewAI={handleViewAI}
        hasCachedOverview={!!(expandedCompany.fields?.SIRET && aiCacheMap[expandedCompany.fields.SIRET])}
      />
    )}

    {aiCompany && (
      <AIOverview
        company={aiCompany}
        isDark={isDark}
        onClose={() => { setAICompany(null); setAISavedOverview(null); const siret = aiCompany.fields?.SIRET; if (siret) setAICacheMap((prev) => ({ ...prev, [siret]: true })) }}
        userToken={aiToken}
        savedOverview={aiSavedOverview}
      />
    )}

    {exportOpen && (
      <ExportModal
        companies={mapCompanies}
        displayColumns={displayColumns}
        isDark={isDark}
        userTier={userTier}
        onClose={() => setExportOpen(false)}
        onPaywall={setPaywallFeature}
      />
    )}

    {orgSetupPrompt && (
      <Modal isDark={isDark} onClose={() => setOrgSetupPrompt(false)} zIndex="z-[9500]" className={`w-full md:w-[360px] p-6 ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
        {(handleClose) => (<>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{txt.orgRequired}</h3>
            <CloseButton onClick={handleClose} isDark={isDark} />
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {txt.orgRequiredDesc}
          </p>
          <a
            href="/org"
            className={`mt-4 block text-center text-xs font-medium py-2 rounded-lg border transition-colors ${
              isDark ? 'bg-white text-gray-900 border-white hover:bg-gray-200' : 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
            }`}
          >
            {txt.setupOrgBtn}
          </a>
        </>)}
      </Modal>
    )}

    {paywallFeature && userTier !== 'enterprise' && (
      <Paywall
        isDark={isDark}
        featureName={paywallFeature}
        onClose={() => setPaywallFeature(null)}
        currentTier={userTier}
        onCheckout={handleCheckout}
        onRedeemCode={handleRedeemCode}
        onRevertDiscount={handleRevertDiscount}
        discountInfo={discountInfo}
      />
    )}

    {revertConfirmOpen && (
      <Modal isDark={isDark} onClose={() => setRevertConfirmOpen(false)} zIndex="z-[9600]" className={`w-full md:w-[360px] p-6 ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
        {(handleClose) => (<>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{txt.revertTitle}</h3>
            <CloseButton onClick={handleClose} isDark={isDark} />
          </div>
          <div className={`text-xs leading-relaxed space-y-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <p>{txt.revertDesc1} <strong className={isDark ? 'text-white' : 'text-gray-900'}>{txt.revertDefinitive}</strong>{txt.revertDesc2} <strong className={isDark ? 'text-white' : 'text-gray-900'}>{txt.revertCannotRedeem}</strong>{txt.revertDesc3}</p>
            <p>{txt.revertLoseAccess}</p>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => handleClose()}
              className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors ${
                isDark
                  ? 'border-white/10 text-gray-300 hover:bg-white/5'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {txt.keepPlan}
            </button>
            <button
              onClick={confirmRevertDiscount}
              className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors ${
                isDark
                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                  : 'border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              {txt.revertToFree}
            </button>
          </div>
        </>)}
      </Modal>
    )}

    {fieldsModalTab && (
        <ColumnConfig
          columns={columns}
          listColumns={listColumns}
          popupColumns={popupColumns}
          hiddenFields={hiddenFields}
          onListColumnsChange={setListColumns}
          onPopupColumnsChange={setPopupColumns}
          onHiddenFieldsChange={setHiddenFields}
          isDark={isDark}
          initialTab={fieldsModalTab}
          onClose={() => setFieldsModalTab(null)}
        />
    )}

    {showPortalModal && portalUrl && (
      <ConfirmModal
        isDark={isDark}
        title={txt.manageSubscription}
        message={
          <div className="space-y-3">
            <p>{txt.portalRedirect}</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>{txt.portalUpdate}</li>
              <li>{txt.portalBilling}</li>
              <li>{txt.portalInvoices}</li>
              <li>{txt.portalCancel}</li>
            </ul>
            <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <p className={`text-[11px] font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{txt.ifYouCancel}</p>
              <ul className={`text-[11px] mt-1 space-y-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <li>• {txt.cancelContinue}</li>
                <li>• {txt.cancelDataPreserved}</li>
                <li>• {txt.cancelResubscribe}</li>
              </ul>
            </div>
          </div>
        }
        confirmLabel={txt.openBillingPortal}
        cancelLabel={txt.goBack}
        onConfirm={() => { setShowPortalModal(false); window.location.href = portalUrl }}
        onCancel={() => setShowPortalModal(false)}
      />
    )}
    </>
  )
}
