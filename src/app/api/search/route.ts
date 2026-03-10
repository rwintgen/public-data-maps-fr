import { NextRequest, NextResponse } from 'next/server'
import { isDbConfigured, getPool } from '@/lib/db'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { TIER_LIMITS, type UserTier } from '@/lib/usage'

import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const GEO_COL = "Géolocalisation de l'établissement"

interface Company {
  lat: number
  lon: number
  fields: Record<string, string>
}

let csvCompaniesCache: Company[] | null = null
let csvColumnsCache: string[] | null = null

/**
 * Parses the sample CSV into an in-memory company array.
 * Results are cached after the first call for the lifetime of the process.
 * Used as a fallback when no PostGIS database is configured.
 */
function loadFromCsv(): { companies: Company[]; columns: string[] } {
  if (csvCompaniesCache && csvColumnsCache) {
    return { companies: csvCompaniesCache, columns: csvColumnsCache }
  }

  const csvPath = path.join(process.cwd(), 'data', 'economicref-france-sirene-v3-sample.csv')
  const content = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(content, { columns: true, skip_empty_lines: true })

  csvColumnsCache = records.length > 0 ? Object.keys(records[0] as Record<string, unknown>) : []

  csvCompaniesCache = (records as any[])
    .filter((r) => r[GEO_COL]?.trim())
    .map((r) => {
      const parts = r[GEO_COL].split(',')
      if (parts.length < 2) return null
      const lat = parseFloat(parts[0].trim())
      const lon = parseFloat(parts[1].trim())
      if (!isFinite(lat) || !isFinite(lon)) return null
      const fields: Record<string, string> = {}
      for (const key of csvColumnsCache!) fields[key] = r[key] ?? ''
      return { lat, lon, fields }
    })
    .filter(Boolean) as Company[]

  console.log(`[csv] Loaded ${csvCompaniesCache.length} companies.`)
  return { companies: csvCompaniesCache, columns: csvColumnsCache }
}

let dbColumnsCache: string[] | null = null

function getMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * For authenticated requests: verifies the Firebase ID token, then uses a
 * Firestore transaction to atomically read, enforce, and increment the
 * monthly search counter for that user.
 *
 * Returns the new count on success, or throws an error with `code: 'monthly_limit_reached'`
 * if the user has exhausted their quota.
 */
async function enforceAndIncrementSearchCount(token: string): Promise<number> {
  const decoded = await getAdminAuth().verifyIdToken(token)
  const uid = decoded.uid
  const month = getMonthKey()

  const profileSnap = await getAdminDb().collection('userProfiles').doc(uid).get()
  let tier: UserTier = profileSnap.exists ? (profileSnap.data()?.tier ?? 'free') : 'free'

  if (tier === 'free' && profileSnap.exists) {
    const data = profileSnap.data()!
    const discountExp = data.discountExpiresAt?.toDate?.()
    if (discountExp && discountExp > new Date() && data.discountPlan) {
      tier = data.discountPlan as UserTier
    }
  }

  const docRef = getAdminDb().collection('userProfiles').doc(uid)
  const limit = TIER_LIMITS[tier].searchesPerMonth

  let newCount = 0
  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(docRef)
    const data = snap.exists ? snap.data()! : {}
    const current = data.monthKey === month
      ? (data.searchCount ?? 0)
      : 0
    if (current >= limit) {
      const err: any = new Error('Monthly search limit reached')
      err.code = 'monthly_limit_reached'
      throw err
    }
    newCount = current + 1
    tx.set(docRef, { searchCount: newCount, monthKey: month }, { merge: true })
  })

  return newCount
}

/**
 * Queries the PostGIS `establishments` table for all rows whose `geom`
 * falls within the given GeoJSON geometry (polygon/rectangle).
 * Column names are lazily cached from the first result's JSONB `fields` keys.
 */
const RESULT_LIMIT = 50_000

/**
 * SQL fragment that extracts the numeric NAF division (first 2 chars of APE code) as an integer.
 * Returns NULL when the field is absent or non-numeric, so it safely falls out of any range check.
 */
const NAF_DIV = `CASE WHEN (fields->>'Activité principale de l''établissement') ~ '^\\d{2}' THEN CAST(SUBSTRING(fields->>'Activité principale de l''établissement', 1, 2) AS INTEGER) END`

/**
 * Maps each built-in preset ID to a parameterless SQL WHERE fragment.
 * All field names and values are hardcoded — no user input is interpolated.
 * Preset IDs are validated before lookup, so only known entries are ever used.
 */
const PRESET_SQL: Record<string, string> = {
  active:       `fields->>'Etat administratif de l''établissement' = 'Actif' AND fields->>'Etat administratif de l''unité légale' = 'Active' AND (fields->>'Date de fermeture de l''établissement' IS NULL OR fields->>'Date de fermeture de l''établissement' = '') AND (fields->>'Date de fermeture de l''unité légale' IS NULL OR fields->>'Date de fermeture de l''unité légale' = '')`,
  closed:       `(fields->>'Etat administratif de l''établissement' = 'Fermé' OR (fields->>'Date de fermeture de l''établissement' IS NOT NULL AND fields->>'Date de fermeture de l''établissement' != ''))`,
  hq:           `fields->>'Etablissement siège' = 'oui'`,
  diffusible:   `fields->>'Statut de diffusion de l''établissement' = 'O'`,
  company:      `(fields->>'Catégorie juridique de l''unité légale' IS NOT NULL AND fields->>'Catégorie juridique de l''unité légale' != '' AND fields->>'Catégorie juridique de l''unité légale' NOT LIKE '1%')`,
  freelance:    `fields->>'Catégorie juridique de l''unité légale' = '1000'`,
  sas:          `(fields->>'Catégorie juridique de l''unité légale' = '5710' OR fields->>'Catégorie juridique de l''unité légale' = '5720')`,
  sarl:         `(fields->>'Catégorie juridique de l''unité légale' = '5499' OR fields->>'Catégorie juridique de l''unité légale' = '5498')`,
  association:  `(fields->>'Catégorie juridique de l''unité légale' LIKE '92%' OR (fields->>'Identifiant association de l''unité légale' IS NOT NULL AND fields->>'Identifiant association de l''unité légale' != ''))`,
  employer:     `fields->>'Caractère employeur de l''établissement' = 'Oui'`,
  pme:          `fields->>'Catégorie de l''entreprise' = 'PME'`,
  'eti-ge':     `(fields->>'Catégorie de l''entreprise' = 'ETI' OR fields->>'Catégorie de l''entreprise' = 'GE')`,
  '50plus':     `CAST(NULLIF(fields->>'Tranche de l''effectif de l''établissement triable', '') AS INTEGER) >= 21`,
  ess:          `fields->>'Economie sociale et solidaire unité légale' = 'O'`,
  mission:      `fields->>'Société à mission unité légale' = 'O'`,
  // Sector presets — NAF Rev2 division ranges (see nafSection() in presets.ts)
  agriculture:  `(${NAF_DIV}) BETWEEN 1 AND 3`,
  industry:     `(${NAF_DIV}) BETWEEN 10 AND 33`,
  construction: `(${NAF_DIV}) BETWEEN 40 AND 43`,
  commerce:     `(${NAF_DIV}) BETWEEN 44 AND 47`,
  transport:    `(${NAF_DIV}) BETWEEN 48 AND 53`,
  food:         `(${NAF_DIV}) BETWEEN 54 AND 56`,
  tech:         `(${NAF_DIV}) BETWEEN 57 AND 63`,
  finance:      `(${NAF_DIV}) BETWEEN 64 AND 66`,
  realestate:   `(${NAF_DIV}) = 68`,
  'pro-services': `((${NAF_DIV}) = 67 OR (${NAF_DIV}) BETWEEN 69 AND 75)`,
  education:    `(${NAF_DIV}) = 85`,
  health:       `((${NAF_DIV}) = 83 OR (${NAF_DIV}) BETWEEN 86 AND 88)`,
}

interface PreQueryFilter {
  column: string
  operator: 'contains' | 'equals' | 'empty'
  negate: boolean
  value: string
}

/**
 * Validates and sanitises user-submitted pre-query filters.
 * Column names are validated against the DB columns cache to prevent injection.
 */
function validateFilters(raw: unknown, knownColumns: string[] | null): PreQueryFilter[] {
  if (!Array.isArray(raw)) return []
  const validOps = new Set(['contains', 'equals', 'empty'])
  return raw
    .filter((f: any): f is PreQueryFilter =>
      typeof f === 'object' && f !== null &&
      typeof f.column === 'string' && f.column.length > 0 && f.column.length < 200 &&
      validOps.has(f.operator) &&
      typeof f.negate === 'boolean' &&
      typeof f.value === 'string' && f.value.length < 500 &&
      (!knownColumns || knownColumns.includes(f.column))
    )
    .slice(0, 20)
}

/**
 * Builds parameterized SQL WHERE clauses for custom pre-query filters.
 * Returns { clauses: string[], params: any[], nextParam: number }.
 */
function buildFilterSQL(filters: PreQueryFilter[], startParam: number): { clauses: string[]; params: any[]; nextParam: number } {
  const clauses: string[] = []
  const params: any[] = []
  let p = startParam
  for (const f of filters) {
    let clause: string
    switch (f.operator) {
      case 'contains':
        clause = `LOWER(fields->>$${p}) LIKE '%' || LOWER($${p + 1}) || '%'`
        params.push(f.column, f.value)
        p += 2
        break
      case 'equals':
        clause = `LOWER(fields->>$${p}) = LOWER($${p + 1})`
        params.push(f.column, f.value)
        p += 2
        break
      case 'empty':
        clause = `(fields->>$${p} IS NULL OR fields->>$${p} = '')`
        params.push(f.column)
        p += 1
        break
      default:
        continue
    }
    clauses.push(f.negate ? `NOT (${clause})` : `(${clause})`)
  }
  return { clauses, params, nextParam: p }
}

/**
 * Applies pre-query filters client-side (for CSV fallback).
 */
function applyFiltersToArray(companies: Company[], filters: PreQueryFilter[]): Company[] {
  if (filters.length === 0) return companies
  return companies.filter((c) =>
    filters.every((f) => {
      const val = (c.fields[f.column] ?? '').toLowerCase()
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

async function searchWithPostGIS(geometry: any, limit: number, presets: string[] = [], filters: PreQueryFilter[] = []): Promise<{ companies: Company[]; columns: string[]; truncated: boolean }> {
  const pool = await getPool()
  const geoJson = JSON.stringify(geometry)
  const effectiveLimit = Math.min(Math.max(limit, 1), RESULT_LIMIT)

  const presetClauses = presets
    .filter((id) => Object.prototype.hasOwnProperty.call(PRESET_SQL, id))
    .map((id) => PRESET_SQL[id])

  const wherePresets = presetClauses.length > 0 ? ` AND (${presetClauses.join(') AND (')})` : ''

  const { clauses: filterClauses, params: filterParams } = buildFilterSQL(filters, 3)
  const whereFilters = filterClauses.length > 0 ? ` AND ${filterClauses.join(' AND ')}` : ''

  const { rows } = await pool.query<{ lat: number; lon: number; fields: Record<string, string> }>(
    `SELECT lat, lon, fields
     FROM establishments
     WHERE ST_Contains(ST_GeomFromGeoJSON($1), geom)${wherePresets}${whereFilters}
     LIMIT $2`,
    [geoJson, effectiveLimit, ...filterParams]
  )

  if (!dbColumnsCache && rows.length > 0) {
    dbColumnsCache = Object.keys(rows[0].fields)
  }

  return {
    companies: rows.map((r) => ({ lat: r.lat, lon: r.lon, fields: r.fields })),
    columns: dbColumnsCache ?? [],
    truncated: rows.length === effectiveLimit,
  }
}

async function getColumnsFromDb(): Promise<string[]> {
  if (dbColumnsCache) return dbColumnsCache
  const pool = await getPool()
  const { rows } = await pool.query('SELECT fields FROM establishments LIMIT 1')
  if (rows.length > 0) dbColumnsCache = Object.keys(rows[0].fields)
  return dbColumnsCache ?? []
}

/** GET: returns available column names and whether the app is running on sample data. */
export async function GET() {
  try {
    if (isDbConfigured()) {
      try {
        const columns = await getColumnsFromDb()
        return NextResponse.json({ columns, sampleData: false })
      } catch (dbError) {
        console.error('[db] Connection failed, falling back to CSV:', dbError)
        const { columns } = loadFromCsv()
        return NextResponse.json({ columns, sampleData: true, dbError: String(dbError) })
      }
    }
    const { columns } = loadFromCsv()
    return NextResponse.json({ columns, sampleData: true })
  } catch (error) {
    console.error('Columns API error:', error)
    return NextResponse.json({ error: 'Failed to read columns', details: String(error) }, { status: 500 })
  }
}

/** POST: accepts a GeoJSON geometry and an optional result limit, returns companies within that area. Streams results as SSE. */
export async function POST(req: NextRequest) {
  try {
    const { geometry, limit: requestedLimit, presets: rawPresets, filters: rawFilters } = await req.json()
    const limit = typeof requestedLimit === 'number' && requestedLimit > 0
      ? Math.min(requestedLimit, RESULT_LIMIT)
      : RESULT_LIMIT
    const presets: string[] = Array.isArray(rawPresets)
      ? rawPresets.filter((id: unknown) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(PRESET_SQL, id))
      : []
    const filters = validateFilters(rawFilters, dbColumnsCache)

    if (!geometry) return NextResponse.json({ companies: [] })
    if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) {
      return NextResponse.json({ error: 'Invalid geometry' }, { status: 400 })
    }

    let searchCountAfter: number | null = null
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (token) {
      try {
        searchCountAfter = await enforceAndIncrementSearchCount(token)
      } catch (err: any) {
        if (err.code === 'monthly_limit_reached') {
          return NextResponse.json(
            { error: 'monthly_limit_reached', searchesPerMonth: TIER_LIMITS.free.searchesPerMonth },
            { status: 429 }
          )
        }
        console.warn('[search] Server-side enforcement skipped:', err.message)
      }
    }

    const encoder = new TextEncoder()
    const sseSend = (data: any) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
    const sseHeaders = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' }

    if (isDbConfigured()) {
      let client: any = null
      try {
        const pool = await getPool()
        client = await pool.connect()
      } catch (dbError) {
        console.error('[db] Connection failed, falling back to CSV:', dbError)
      }

      if (client) {
        const dbClient = client
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const geoJson = JSON.stringify(geometry)
              const effectiveLimit = Math.min(Math.max(limit, 1), RESULT_LIMIT)

              const presetClauses = presets
                .filter((id) => Object.prototype.hasOwnProperty.call(PRESET_SQL, id))
                .map((id) => PRESET_SQL[id])
              const wherePresets = presetClauses.length > 0 ? ` AND (${presetClauses.join(') AND (')})` : ''
              const { clauses: filterClauses, params: filterParams } = buildFilterSQL(filters, 3)
              const whereFilters = filterClauses.length > 0 ? ` AND ${filterClauses.join(' AND ')}` : ''

              controller.enqueue(sseSend({ type: 'start', total: effectiveLimit }))

              await dbClient.query('BEGIN')
              await dbClient.query(
                `DECLARE search_cursor NO SCROLL CURSOR FOR SELECT lat, lon, fields FROM establishments WHERE ST_Contains(ST_GeomFromGeoJSON($1), geom)${wherePresets}${whereFilters} LIMIT $2`,
                [geoJson, effectiveLimit, ...filterParams]
              )

              const BATCH_SIZE = 1000
              let loaded = 0

              while (loaded < effectiveLimit) {
                const fetchSize = Math.min(BATCH_SIZE, effectiveLimit - loaded)
                const batch = await dbClient.query(`FETCH ${fetchSize} FROM search_cursor`)
                if (batch.rows.length === 0) break

                if (!dbColumnsCache && batch.rows.length > 0) {
                  dbColumnsCache = Object.keys(batch.rows[0].fields)
                }

                loaded += batch.rows.length
                try {
                  controller.enqueue(sseSend({
                    type: 'batch',
                    companies: batch.rows.map((r: any) => ({ lat: r.lat, lon: r.lon, fields: r.fields })),
                    loaded,
                  }))
                } catch { break }
              }

              const truncated = loaded >= effectiveLimit
              console.log(`[postgis-stream] Streamed ${loaded} establishments${truncated ? ' (truncated)' : ''}${presets.length ? ` (presets: ${presets.join(',')})` : ''}${filters.length ? ` (filters: ${filters.length})` : ''} (limit: ${effectiveLimit}).`)

              controller.enqueue(sseSend({
                type: 'complete',
                columns: dbColumnsCache ?? [],
                truncated,
                resultLimit: effectiveLimit,
                searchCountAfter,
                sampleData: false,
                activePresets: presets,
              }))
            } catch (err) {
              console.error('[postgis-stream] Error:', err)
              try { controller.enqueue(sseSend({ type: 'error', message: String(err) })) } catch {}
            } finally {
              try { await dbClient.query('ROLLBACK') } catch {}
              dbClient.release()
              try { controller.close() } catch {}
            }
          },
        })

        return new Response(stream, { headers: sseHeaders })
      }
    }

    // CSV fallback — wrap in SSE format for consistent client parsing
    const csvSearchCountAfter = searchCountAfter
    const csvPresets = presets
    const csvFilters = filters
    const csvLimit = limit
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { default: booleanPointInPolygon } = await import('@turf/boolean-point-in-polygon')
          const { point } = await import('@turf/helpers')
          const { applyPresets } = await import('@/lib/presets')
          const { companies: all, columns } = loadFromCsv()

          controller.enqueue(sseSend({ type: 'start', total: csvLimit }))

          const spatial = all.filter((c) => booleanPointInPolygon(point([c.lon, c.lat]), geometry))
          const presetFiltered = applyPresets(spatial, csvPresets)
          const filtered = applyFiltersToArray(presetFiltered, csvFilters)
          const truncated = filtered.length > csvLimit
          const companies = truncated ? filtered.slice(0, csvLimit) : filtered

          console.log(`[csv-stream] Found ${filtered.length} establishments, returning ${companies.length} (limit: ${csvLimit}).`)

          controller.enqueue(sseSend({ type: 'batch', companies, loaded: companies.length }))
          controller.enqueue(sseSend({
            type: 'complete',
            columns,
            sampleData: true,
            truncated,
            searchCountAfter: csvSearchCountAfter,
            activePresets: csvPresets,
          }))
        } catch (err) {
          console.error('[csv-stream] Error:', err)
          try { controller.enqueue(sseSend({ type: 'error', message: String(err) })) } catch {}
        } finally {
          try { controller.close() } catch {}
        }
      },
    })

    return new Response(stream, { headers: sseHeaders })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed', details: String(error) }, { status: 500 })
  }
}
