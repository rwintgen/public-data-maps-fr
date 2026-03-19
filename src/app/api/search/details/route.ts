import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAdminAuth } from '@/lib/firebase-admin'

/**
 * POST /api/search/details
 * Fetches full JSONB fields for a batch of SIRETs.
 * Used for: detail modal (1 SIRET) and export preparation (many SIRETs).
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (token) {
      try { await getAdminAuth().verifyIdToken(token) } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { sirets } = await req.json()
    if (!Array.isArray(sirets) || sirets.length === 0) {
      return NextResponse.json({ error: 'sirets array required' }, { status: 400 })
    }
    if (sirets.length > 10000) {
      return NextResponse.json({ error: 'Too many SIRETs (max 10000)' }, { status: 400 })
    }

    const pool = await getPool()
    const client = await pool.connect()
    try {
      const t0 = Date.now()
      const result = await client.query(
        `SELECT siret, fields FROM establishments WHERE siret = ANY($1::varchar[])`,
        [sirets]
      )
      console.log(`[details] ${result.rows.length} rows in ${Date.now() - t0}ms`)

      const map: Record<string, Record<string, string>> = {}
      for (const row of result.rows) {
        map[row.siret] = row.fields
      }
      return NextResponse.json({ fields: map })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Details API error:', error)
    return NextResponse.json({ error: 'Failed', details: String(error) }, { status: 500 })
  }
}
