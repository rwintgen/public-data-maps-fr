import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { getOrg, getMember } from '@/lib/org'
import { getPool } from '@/lib/db'

const MAX_ROWS = 10_000
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * POST /api/org/connectors/csv
 *
 * Multipart form data:
 *   - file: CSV file (max 10 MB / 10 000 rows)
 *   - orgId: string
 *   - siretColumn: column name that holds SIRET numbers
 *
 * Returns matched rows enriched with SIRENE fields and a list of unmatched SIRETs.
 * Only organisation owners and admins may call this endpoint.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let uid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const orgId = formData.get('orgId')?.toString()
  const siretColumn = formData.get('siretColumn')?.toString()
  const file = formData.get('file') as File | null

  if (!orgId || !siretColumn || !file) {
    return NextResponse.json({ error: 'orgId, siretColumn, and file are required' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 })
  }

  const org = await getOrg(orgId)
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await getMember(orgId, uid)
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const text = await file.text()
  const rows = parseCSV(text)

  if (rows.length === 0) return NextResponse.json({ error: 'CSV is empty or could not be parsed' }, { status: 400 })
  if (!rows[0].hasOwnProperty(siretColumn)) {
    return NextResponse.json({ error: `Column "${siretColumn}" not found in CSV` }, { status: 400 })
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `CSV exceeds ${MAX_ROWS.toLocaleString()} row limit` }, { status: 413 })
  }

  const siretSet = new Set<string>()
  for (const r of rows) {
    const s = cleanSiret(r[siretColumn])
    if (s) siretSet.add(s)
  }
  const sirets = Array.from(siretSet)

  // Query PostGIS for matching establishments
  const pool = await getPool()
  const { rows: dbRows } = await pool.query<{ siret: string; fields: Record<string, string> }>(
    `SELECT siret, fields FROM establishments WHERE siret = ANY($1)`,
    [sirets],
  )

  const enrichmentMap = new Map<string, Record<string, string>>()
  for (const row of dbRows) enrichmentMap.set(row.siret, row.fields)

  const matched: Array<Record<string, string>> = []
  const unmatched: string[] = []

  for (const row of rows) {
    const siret = cleanSiret(row[siretColumn])
    const enrichment = siret ? enrichmentMap.get(siret) : undefined
    if (enrichment) {
      matched.push({ ...row, ...enrichment, _siret: siret })
    } else if (siret) {
      unmatched.push(siret)
    }
  }

  return NextResponse.json({
    total: rows.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    matched,
    unmatched,
  })
}

function cleanSiret(raw: string | undefined): string {
  return (raw ?? '').replace(/\s/g, '').replace(/^'/, '')
}

/** Minimal CSV parser: handles quoted fields with embedded commas/newlines. */
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []

  const headers = splitCSVLine(lines[0])
  const result: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = splitCSVLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = values[idx] ?? '' })
    result.push(obj)
  }
  return result
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let inQuote = false
  let current = ''

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
