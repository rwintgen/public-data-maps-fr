/**
 * Client-side usage tracking for free-tier limits.
 *
 * Tracks monthly search count and saved-search count per user.
 * Anonymous users are assigned a random ID stored in localStorage.
 * Logged-in users are keyed by Firebase UID.
 *
 * All counters live in localStorage. This is best-effort enforcement:
 * clearing storage resets the counter. Server-side enforcement via
 * Firestore is planned for paid tiers.
 */

export type UserTier = 'free' | 'payg' | 'individual' | 'enterprise'

export interface TierLimits {
  resultsPerQuery: number
  searchesPerMonth: number
  savedSearches: number
  /** Monthly AI overview allowance. 0 = no access, Infinity = unlimited. */
  aiOverviewsPerMonth: number
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    resultsPerQuery: 5_000,
    searchesPerMonth: 10,
    savedSearches: 5,
    aiOverviewsPerMonth: 0,
  },
  payg: {
    resultsPerQuery: 10_000,
    searchesPerMonth: Infinity,
    savedSearches: 100,
    aiOverviewsPerMonth: Infinity,
  },
  individual: {
    resultsPerQuery: 50_000,
    searchesPerMonth: 100,
    savedSearches: Infinity,
    aiOverviewsPerMonth: 250,
  },
  enterprise: {
    resultsPerQuery: 50_000,
    searchesPerMonth: Infinity,
    savedSearches: Infinity,
    aiOverviewsPerMonth: Infinity,
  },
}

interface UsageData {
  searchCount: number
  aiOverviewCount: number
  monthKey: string
}

const ANON_ID_KEY = 'pdm_anon_id'
const USAGE_PREFIX = 'pdm_usage_'

function getMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function generateAnonId(): string {
  return 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Returns a stable user key for localStorage. Uses UID if logged in, otherwise a generated anonymous ID. */
export function getUserKey(uid: string | null): string {
  if (uid) return uid
  try {
    let anonId = localStorage.getItem(ANON_ID_KEY)
    if (!anonId) {
      anonId = generateAnonId()
      localStorage.setItem(ANON_ID_KEY, anonId)
    }
    return anonId
  } catch {
    return 'anon_fallback'
  }
}

function getUsageData(userKey: string): UsageData {
  const key = USAGE_PREFIX + userKey
  const month = getMonthKey()
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const data: UsageData = JSON.parse(raw)
      if (data.monthKey === month) return data
    }
  } catch {}
  return { searchCount: 0, aiOverviewCount: 0, monthKey: month }
}

function setUsageData(userKey: string, data: UsageData): void {
  try {
    localStorage.setItem(USAGE_PREFIX + userKey, JSON.stringify(data))
  } catch {}
}

/** Returns the current monthly search count for the user. */
export function getSearchCount(userKey: string): number {
  return getUsageData(userKey).searchCount
}

/** Increments the monthly search counter. Returns the new count. */
export function incrementSearchCount(userKey: string): number {
  const data = getUsageData(userKey)
  data.searchCount += 1
  setUsageData(userKey, data)
  return data.searchCount
}

/** Checks whether the user can perform another search under their tier limit. */
export function canSearch(userKey: string, tier: UserTier): boolean {
  const limit = TIER_LIMITS[tier].searchesPerMonth
  if (limit === Infinity) return true
  return getSearchCount(userKey) < limit
}

/** Returns the result-per-query limit for the given tier. */
export function getResultLimit(tier: UserTier): number {
  return TIER_LIMITS[tier].resultsPerQuery
}

/** Returns the saved-search limit for the given tier. */
export function getSavedSearchLimit(tier: UserTier): number {
  return TIER_LIMITS[tier].savedSearches
}

/** Returns the current monthly AI overview count for the user. */
export function getAIOverviewCount(userKey: string): number {
  return getUsageData(userKey).aiOverviewCount ?? 0
}

/** Increments the monthly AI overview counter. Returns the new count. */
export function incrementAIOverviewCount(userKey: string): number {
  const data = getUsageData(userKey)
  data.aiOverviewCount = (data.aiOverviewCount ?? 0) + 1
  setUsageData(userKey, data)
  return data.aiOverviewCount
}

/** Checks whether the user can use another AI overview under their tier limit. */
export function canUseAIOverview(userKey: string, tier: UserTier): boolean {
  const limit = TIER_LIMITS[tier].aiOverviewsPerMonth
  if (limit === 0) return false
  if (limit === Infinity) return true
  return getAIOverviewCount(userKey) < limit
}

/** Returns true if the tier has any AI overview access at all. */
export function canUseAI(tier: UserTier): boolean {
  return TIER_LIMITS[tier].aiOverviewsPerMonth > 0
}

/** Premium export formats (Excel, XML, GeoJSON) require at least PAYG tier. */
export function canExportPremium(tier: UserTier): boolean {
  return tier !== 'free'
}

/** Returns the maximum custom result limit an enterprise user can set. */
export const MAX_ENTERPRISE_RESULT_LIMIT = 5_000_000
