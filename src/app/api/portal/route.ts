import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getStripe } from '@/lib/stripe'

/**
 * POST: Creates a Stripe Customer Portal session so the user can
 * manage their subscription (upgrade, downgrade, cancel, update payment method).
 *
 * Returns: `{ url: string }` — the portal page URL.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let uid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profileSnap = await getAdminDb().collection('userProfiles').doc(uid).get()
  const customerId = profileSnap.data()?.stripeCustomerId
  if (!customerId) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: origin,
  })

  return NextResponse.json({ url: session.url })
}
