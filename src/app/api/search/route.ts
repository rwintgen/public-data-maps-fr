import { NextRequest, NextResponse } from 'next/server'
import { isDbConfigured, getPool } from '@/lib/db'

// ─── CSV fallback (used when no DB is configured) ──────────────────────────
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const GEO_COL = "Géolocalisation de l'établissement"

interface Company {
  lat: number
  lon: number
  fields: Record<string, string>
}

// ─── CSV fallback ──────────────────────────────────────────────────────────

let csvCompaniesCache: Company[] | null = null
let csvColumnsCache: string[] | null = null

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

// ─── PostGIS query ──────────────────────────────────────────────────────────

let dbColumnsCache: string[] | null = null

async function searchWithPostGIS(geometry: any): Promise<{ companies: Company[]; columns: string[] }> {
  const pool = await getPool()
  const geoJson = JSON.stringify(geometry)

  const { rows } = await pool.query<{ lat: number; lon: number; fields: Record<string, string> }>(
    `SELECT lat, lon, fields
     FROM establishments
     WHERE ST_Contains(ST_GeomFromGeoJSON($1), geom)
     LIMIT 5000`,
    [geoJson]
  )

  if (!dbColumnsCache && rows.length > 0) {
    dbColumnsCache = Object.keys(rows[0].fields)
  }

  return {
    companies: rows.map((r) => ({ lat: r.lat, lon: r.lon, fields: r.fields })),
    columns: dbColumnsCache ?? [],
  }
}

async function getColumnsFromDb(): Promise<string[]> {
  if (dbColumnsCache) return dbColumnsCache
  const pool = await getPool()
  const { rows } = await pool.query('SELECT fields FROM establishments LIMIT 1')
  if (rows.length > 0) dbColumnsCache = Object.keys(rows[0].fields)
  return dbColumnsCache ?? []
}

// ─── Route handlers ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const columns = isDbConfigured() ? await getColumnsFromDb() : loadFromCsv().columns
    return NextResponse.json({ columns })
  } catch (error) {
    console.error('Columns API error:', error)
    return NextResponse.json({ error: 'Failed to read columns', details: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { geometry } = await req.json()

    if (!geometry) return NextResponse.json({ companies: [] })
    if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) {
      return NextResponse.json({ error: 'Invalid geometry' }, { status: 400 })
    }

    if (isDbConfigured()) {
      const { companies, columns } = await searchWithPostGIS(geometry)
      console.log(`[postgis] Found ${companies.length} establishments.`)
      return NextResponse.json({ companies, columns })
    }

    // CSV fallback
    const { default: booleanPointInPolygon } = await import('@turf/boolean-point-in-polygon')
    const { point } = await import('@turf/helpers')
    const { companies: all, columns } = loadFromCsv()
    const companies = all.filter((c) => booleanPointInPolygon(point([c.lon, c.lat]), geometry))
    console.log(`[csv] Found ${companies.length} establishments.`)
    return NextResponse.json({ companies, columns })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed', details: String(error) }, { status: 500 })
  }
}
