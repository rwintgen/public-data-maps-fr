import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { TIER_LIMITS, MAX_ENTERPRISE_RESULT_LIMIT, type UserTier } from '@/lib/usage'

interface Company {
  lat: number
  lon: number
  fields: Record<string, string>
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
 *
 * Performance notes:
 * - Preset filters use promoted real columns (not JSONB extraction) for index usage.
 * - A COUNT(*) is streamed first so the client gets an instant total before rows arrive.
 * - Batch size is 5000 to minimize SSE round-trips.
 * - When the client sends `visibleFields`, only those keys are projected from JSONB.
 */
const RESULT_LIMIT = MAX_ENTERPRISE_RESULT_LIMIT

/**
 * SQL fragment for NAF division from the promoted `naf_division` column.
 */
const NAF_DIV = `naf_division`

/**
 * Maps each built-in quick filter ID to a parameterless SQL WHERE fragment.
 * Uses promoted columns instead of JSONB extraction for index-backed performance.
 */
const PRESET_SQL: Record<string, string> = {
  active:       `statut_admin = 'Actif' AND statut_admin_ul = 'Active' AND (date_fermeture IS NULL OR date_fermeture = '') AND (date_fermeture_ul IS NULL OR date_fermeture_ul = '')`,
  closed:       `(statut_admin = 'Fermé' OR (date_fermeture IS NOT NULL AND date_fermeture != ''))`,
  hq:           `est_siege = true`,
  diffusible:   `diffusible = true`,
  company:      `(legal_form IS NOT NULL AND legal_form != '' AND legal_form NOT LIKE '1%')`,
  freelance:    `legal_form = '1000'`,
  sas:          `(legal_form = '5710' OR legal_form = '5720')`,
  sarl:         `(legal_form = '5499' OR legal_form = '5498')`,
  association:  `(legal_form LIKE '92%' OR (assoc_id IS NOT NULL AND assoc_id != ''))`,
  employer:     `employeur = 'Oui'`,
  pme:          `categorie_ent = 'PME'`,
  'eti-ge':     `(categorie_ent = 'ETI' OR categorie_ent = 'GE')`,
  '50plus':     `tranche_eff_sort >= 21`,
  ess:          `ess = 'O'`,
  mission:      `mission = 'O'`,
  agriculture:  `${NAF_DIV} BETWEEN 1 AND 3`,
  industry:     `${NAF_DIV} BETWEEN 10 AND 33`,
  construction: `${NAF_DIV} BETWEEN 40 AND 43`,
  commerce:     `${NAF_DIV} BETWEEN 44 AND 47`,
  transport:    `${NAF_DIV} BETWEEN 48 AND 53`,
  food:         `${NAF_DIV} BETWEEN 54 AND 56`,
  tech:         `${NAF_DIV} BETWEEN 57 AND 63`,
  finance:      `${NAF_DIV} BETWEEN 64 AND 66`,
  realestate:   `${NAF_DIV} = 68`,
  'pro-services': `(${NAF_DIV} = 67 OR ${NAF_DIV} BETWEEN 69 AND 75)`,
  education:    `${NAF_DIV} = 85`,
  health:       `(${NAF_DIV} = 83 OR ${NAF_DIV} BETWEEN 86 AND 88)`,
}

const PRESET_GROUP: Record<string, string> = {
  active: 'Status',
  closed: 'Status',
  hq: 'Flags',
  diffusible: 'Flags',
  company: 'Legal form',
  freelance: 'Legal form',
  sas: 'Legal form',
  sarl: 'Legal form',
  association: 'Legal form',
  employer: 'Size',
  pme: 'Size',
  'eti-ge': 'Size',
  '50plus': 'Size',
  ess: 'Values',
  mission: 'Values',
  commerce: 'Sector',
  industry: 'Sector',
  construction: 'Sector',
  tech: 'Sector',
  health: 'Sector',
  food: 'Sector',
  transport: 'Sector',
  finance: 'Sector',
  realestate: 'Sector',
  'pro-services': 'Sector',
  education: 'Sector',
  agriculture: 'Sector',
}

interface PreQueryFilter {
  column: string
  operator: 'contains' | 'equals' | 'empty'
  negate: boolean
  value: string
  joinOr?: boolean
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
      (f.joinOr === undefined || typeof f.joinOr === 'boolean') &&
      typeof f.value === 'string' && f.value.length < 500 &&
      (!knownColumns || knownColumns.includes(f.column))
    )
    .slice(0, 20)
}

/**
 * Builds parameterized SQL WHERE clauses for custom pre-query filters.
 * Consecutive filters with `joinOr=true` are ORed together; groups are ANDed.
 * Returns { clauses: string[], params: any[], nextParam: number }.
 */
function buildFilterSQL(filters: PreQueryFilter[], startParam: number): { clauses: string[]; params: any[]; nextParam: number } {
  const groups: string[][] = []
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
    const normalized = f.negate ? `NOT (${clause})` : `(${clause})`
    if (f.joinOr && groups.length > 0) {
      groups[groups.length - 1].push(normalized)
    } else {
      groups.push([normalized])
    }
  }
  const clauses = groups.map((group) => group.length > 1 ? `(${group.join(' OR ')})` : group[0])
  return { clauses, params, nextParam: p }
}

function buildPresetSQL(presets: string[]): string[] {
  const grouped = new Map<string, string[]>()
  for (const id of presets) {
    const sql = PRESET_SQL[id]
    const group = PRESET_GROUP[id] ?? '__other__'
    if (!sql) continue
    if (!grouped.has(group)) grouped.set(group, [])
    grouped.get(group)!.push(`(${sql})`)
  }
  return Array.from(grouped.values()).map((groupClauses) =>
    groupClauses.length > 1 ? `(${groupClauses.join(' OR ')})` : groupClauses[0]
  )
}

async function getColumnsFromDb(): Promise<string[]> {
  if (dbColumnsCache) return dbColumnsCache
  const pool = await getPool()
  const { rows } = await pool.query('SELECT fields FROM establishments LIMIT 1')
  if (rows.length > 0) dbColumnsCache = Object.keys(rows[0].fields)
  return dbColumnsCache ?? []
}

/** GET: returns available column names. */
export async function GET() {
  try {
    const columns = await getColumnsFromDb()
    return NextResponse.json({ columns })
  } catch (error) {
    console.error('Columns API error:', error)
    return NextResponse.json({ error: 'Failed to read columns', details: String(error) }, { status: 500 })
  }
}

/** POST: accepts a GeoJSON geometry and an optional result limit, returns companies within that area. Streams results as SSE. */
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const { geometry, limit: requestedLimit, presets: rawPresets, filters: rawFilters, connectorId, connectorOrgId, visibleFields: rawVisibleFields, isRefinement: rawIsRefinement } = await req.json()
    const limit = typeof requestedLimit === 'number' && requestedLimit > 0
      ? Math.min(requestedLimit, RESULT_LIMIT)
      : RESULT_LIMIT
    const presets: string[] = Array.isArray(rawPresets)
      ? rawPresets.filter((id: unknown) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(PRESET_SQL, id))
      : []
    const isConnectorRequest = typeof connectorId === 'string' && typeof connectorOrgId === 'string'
    const isRefinement = rawIsRefinement === true
    const filters = validateFilters(rawFilters, isConnectorRequest ? null : dbColumnsCache)
    const visibleFields: string[] | null = Array.isArray(rawVisibleFields) && rawVisibleFields.length > 0
      ? rawVisibleFields.filter((f: unknown) => typeof f === 'string' && f.length > 0 && f.length < 200).slice(0, 120)
      : null

    if (!geometry) return NextResponse.json({ companies: [] })
    if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) {
      return NextResponse.json({ error: 'Invalid geometry' }, { status: 400 })
    }

    let connectorMeta: { id: string; columns: string[] } | null = null
    const token = req.headers.get('authorization')?.replace('Bearer ', '')

    if (typeof connectorId === 'string' && typeof connectorOrgId === 'string' && token) {
      try {
        const decoded = await getAdminAuth().verifyIdToken(token)
        const profile = await getAdminDb().collection('userProfiles').doc(decoded.uid).get()
        if (profile.data()?.orgId === connectorOrgId) {
          const connDoc = await getAdminDb()
            .collection('organizations').doc(connectorOrgId)
            .collection('connectors').doc(connectorId)
            .get()
          if (connDoc.exists) {
            const data = connDoc.data()!
            connectorMeta = { id: connectorId, columns: data.columns ?? [] }
          }
        }
      } catch {}
    }

    let searchCountAfter: number | null = null
    if (token && !isRefinement) {
      const tAuth = Date.now()
      try {
        searchCountAfter = await enforceAndIncrementSearchCount(token)
        console.log(`[search] auth+usage enforcement: ${Date.now() - tAuth}ms`)
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

    /**
     * Maps promoted PostgreSQL columns back to JSONB field names so the client
     * receives the same `{ lat, lon, fields }` shape without any TOAST I/O.
     */
    const PROMOTED_TO_FIELD: Record<string, string> = {
      siret: 'SIRET',
      denomination: "Dénomination de l'unité légale",
      denomination_usu: "Dénomination usuelle de l'établissement",
      section_etab: "Section de l'établissement",
      code_postal: "Code postal de l'établissement",
      commune: "Commune de l'établissement",
      ape_code: "Activité principale de l'établissement",
      statut_admin: "Etat administratif de l'établissement",
      statut_admin_ul: "Etat administratif de l'unité légale",
      date_fermeture: "Date de fermeture de l'établissement",
      date_fermeture_ul: "Date de fermeture de l'unité légale",
      legal_form: "Catégorie juridique de l'unité légale",
      categorie_ent: "Catégorie de l'entreprise",
      employeur: "Caractère employeur de l'établissement",
      ess: "Economie sociale et solidaire unité légale",
      mission: "Société à mission unité légale",
      assoc_id: "Identifiant association de l'unité légale",
    }

    const SKELETON_SELECT = `siret, lat, lon, denomination, denomination_usu, section_etab, code_postal, commune, ape_code, statut_admin, statut_admin_ul, date_fermeture, date_fermeture_ul, legal_form, categorie_ent, employeur, ess, mission, assoc_id, est_siege, diffusible, tranche_eff_sort`

    /** Builds a `{ lat, lon, fields }` object from promoted columns (no JSONB). */
    const buildSkeleton = (row: any): Company => {
      const fields: Record<string, string> = {}
      for (const [col, fieldName] of Object.entries(PROMOTED_TO_FIELD)) {
        const v = row[col]
        if (v != null && v !== '') fields[fieldName] = String(v)
      }
      if (row.est_siege != null) fields['Etablissement siège'] = row.est_siege ? 'Oui' : 'Non'
      if (row.diffusible != null) fields["Statut de diffusion de l'établissement"] = row.diffusible ? 'O' : 'N'
      if (row.tranche_eff_sort != null) fields["Tranche de l'effectif de l'établissement triable"] = String(row.tranche_eff_sort)
      if (row.naf_division != null) fields["naf_division"] = String(row.naf_division)
      return { lat: row.lat, lon: row.lon, fields }
    }

    /**
     * When the client sends visibleFields, project only those keys from JSONB
     * to dramatically reduce payload size (e.g. 10 fields vs 104).
     */
    const projectFields = (row: any): { lat: number; lon: number; fields: Record<string, string> } => {
      if (!visibleFields) return { lat: row.lat, lon: row.lon, fields: row.fields }
      const projected: Record<string, string> = {}
      for (const key of visibleFields) {
        if (key in row.fields) projected[key] = row.fields[key]
      }
      return { lat: row.lat, lon: row.lon, fields: projected }
    }

    const tPool = Date.now()
    const pool = await getPool()
    const client = await pool.connect()
    console.log(`[search] pool+connect: ${Date.now() - tPool}ms (total: ${Date.now() - t0}ms)`)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const geoJson = JSON.stringify(geometry)
          const effectiveLimit = Math.min(Math.max(limit, 1), RESULT_LIMIT)

          if (connectorMeta) {
            const connFilters = filters.filter((f) => connectorMeta!.columns.includes(f.column))
            const { clauses: filterClauses, params: filterParams } = buildFilterSQL(connFilters, 3)
            const whereFilters = filterClauses.length > 0 ? ` AND ${filterClauses.join(' AND ')}` : ''

            controller.enqueue(sseSend({ type: 'start', total: effectiveLimit }))

            await client.query('BEGIN')
            await client.query(
              `DECLARE search_cursor NO SCROLL CURSOR FOR SELECT lat, lon, fields FROM connector_rows WHERE connector_id = $1 AND ST_Contains(ST_GeomFromGeoJSON($2), geom)${whereFilters} LIMIT $3`,
              [connectorMeta.id, geoJson, effectiveLimit, ...filterParams]
            )

            const BATCH_SIZE = 5000
            let loaded = 0
            let detectedColumns: string[] | null = null

            while (loaded < effectiveLimit) {
              const fetchSize = Math.min(BATCH_SIZE, effectiveLimit - loaded)
              const batch = await client.query(`FETCH ${fetchSize} FROM search_cursor`)
              if (batch.rows.length === 0) break
              if (!detectedColumns && batch.rows.length > 0) {
                detectedColumns = Object.keys(batch.rows[0].fields)
              }
              loaded += batch.rows.length
              try {
                controller.enqueue(sseSend({
                  type: 'batch',
                  companies: batch.rows.map(projectFields),
                  loaded,
                }))
              } catch { break }
            }

            const truncated = loaded >= effectiveLimit
            console.log(`[connector-stream] Streamed ${loaded} connector rows (${connectorMeta.id})${truncated ? ' (truncated)' : ''}.`)

            controller.enqueue(sseSend({
              type: 'complete',
              columns: detectedColumns ?? connectorMeta.columns,
              truncated,
              resultLimit: effectiveLimit,
              searchCountAfter,
              activePresets: [],
              isConnector: true,
            }))
          } else {
            const presetClauses = buildPresetSQL(presets)
            const wherePresets = presetClauses.length > 0 ? ` AND ${presetClauses.join(' AND ')}` : ''
            const { clauses: filterClauses, params: filterParams } = buildFilterSQL(filters, 3)
            const whereFilters = filterClauses.length > 0 ? ` AND ${filterClauses.join(' AND ')}` : ''

            const whereFull = `WHERE ST_Contains(ST_GeomFromGeoJSON($1), geom)${wherePresets}${whereFilters}`

            const tCursor = Date.now()
            await client.query('BEGIN')
            await client.query(
              `DECLARE search_cursor NO SCROLL CURSOR FOR SELECT ${SKELETON_SELECT} FROM establishments ${whereFull} LIMIT $2`,
              [geoJson, effectiveLimit, ...filterParams]
            )
            console.log(`[search] DECLARE CURSOR (skeleton): ${Date.now() - tCursor}ms (total: ${Date.now() - t0}ms)`)

            controller.enqueue(sseSend({ type: 'start', total: effectiveLimit }))

            let totalMatching: number | null = null
            const countPromise = (async () => {
              const tCount = Date.now()
              const countClient = await pool.connect()
              try {
                const countResult = await countClient.query(
                  `SELECT COUNT(*) AS cnt FROM establishments ${whereFull}`,
                  [geoJson, ...filterParams]
                )
                totalMatching = parseInt(countResult.rows[0].cnt, 10)
                console.log(`[search] COUNT(*): ${totalMatching} in ${Date.now() - tCount}ms (total: ${Date.now() - t0}ms)`)
                try { controller.enqueue(sseSend({ type: 'count', total: totalMatching })) } catch {}
              } finally {
                countClient.release()
              }
            })()

            const BATCH_SIZE = 5000
            let loaded = 0
            let batchNum = 0

            while (loaded < effectiveLimit) {
              const fetchSize = Math.min(BATCH_SIZE, effectiveLimit - loaded)
              const tBatch = Date.now()
              const batch = await client.query(`FETCH ${fetchSize} FROM search_cursor`)
              batchNum++
              if (batch.rows.length === 0) break

              loaded += batch.rows.length
              console.log(`[search] FETCH batch #${batchNum}: ${batch.rows.length} rows in ${Date.now() - tBatch}ms (loaded: ${loaded}, total: ${Date.now() - t0}ms)`)
              try {
                controller.enqueue(sseSend({
                  type: 'batch',
                  companies: batch.rows.map(buildSkeleton),
                  loaded,
                }))
              } catch { break }
            }

            await countPromise.catch(() => {})

            const truncated = loaded >= effectiveLimit && (totalMatching === null || totalMatching > effectiveLimit)
            console.log(`[search] COMPLETE: ${loaded}/${totalMatching ?? '?'} in ${Date.now() - t0}ms${truncated ? ' (truncated)' : ''}${presets.length ? ` presets=${presets.join(',')}` : ''}${filters.length ? ` filters=${filters.length}` : ''} limit=${effectiveLimit}`)

            controller.enqueue(sseSend({
              type: 'complete',
              columns: dbColumnsCache ?? Object.values(PROMOTED_TO_FIELD),
              truncated,
              totalMatching,
              resultLimit: effectiveLimit,
              searchCountAfter,
              activePresets: presets,
              skeleton: true,
            }))
          }
        } catch (err) {
          console.error('[postgis-stream] Error:', err)
          try { controller.enqueue(sseSend({ type: 'error', message: String(err) })) } catch {}
        } finally {
          try { await client.query('ROLLBACK') } catch {}
          client.release()
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
