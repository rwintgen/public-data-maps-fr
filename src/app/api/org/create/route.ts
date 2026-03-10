/**
 * POST /api/org/create — Creates a new organization.
 * Only enterprise-tier users who are not already in an org can create one.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { createOrg } from '@/lib/org'

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
  const data = profile.data()

  let effectiveTier = data?.tier ?? 'free'
  if (effectiveTier === 'free') {
    const discountExp = data?.discountExpiresAt?.toDate?.()
    if (discountExp && discountExp > new Date() && data?.discountPlan) {
      effectiveTier = data.discountPlan
    }
  }

  if (effectiveTier !== 'enterprise') {
    return NextResponse.json({ error: 'Enterprise tier required' }, { status: 403 })
  }
  if (data?.orgId) {
    return NextResponse.json({ error: 'Already in an organization' }, { status: 409 })
  }

  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'Invalid organization name' }, { status: 400 })
  }

  const seatCount = typeof body.seatCount === 'number' && body.seatCount >= 1 && body.seatCount <= 1000
    ? Math.floor(body.seatCount)
    : 5

  const orgId = await createOrg(
    decoded.uid,
    decoded.email ?? '',
    decoded.name ?? null,
    decoded.picture ?? null,
    name,
    seatCount,
    data?.stripeSubscriptionId ?? null,
  )

  return NextResponse.json({ orgId })
}
