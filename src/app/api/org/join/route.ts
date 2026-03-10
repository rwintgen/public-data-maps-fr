/**
 * POST /api/org/join — Auto-join an organization by email domain match.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { joinByDomain } from '@/lib/org'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded
  try {
    decoded = await getAdminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getAdminDb().collection('userProfiles').doc(decoded.uid).get()
  if (profile.data()?.orgId) {
    return NextResponse.json({ error: 'Already in an organization' }, { status: 409 })
  }

  const result = await joinByDomain(
    decoded.uid,
    decoded.email ?? '',
    decoded.name ?? null,
    decoded.picture ?? null,
  )

  if (!result) {
    return NextResponse.json({ error: 'No matching organization found' }, { status: 404 })
  }

  return NextResponse.json(result)
}
