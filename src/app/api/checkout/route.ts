import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getStripe, PRICE_IDS } from '@/lib/stripe'

/**
 * POST: Creates a Stripe Checkout session for the authenticated user.
 *
 * Body: `{ planId: 'individual' | 'enterprise', billing: 'monthly' | 'yearly' }`
 * Returns: `{ url: string }` — the Stripe-hosted checkout page URL.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let uid: string
  let email: string | undefined
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    uid = decoded.uid
    email = decoded.email
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { planId, billing } = await req.json()

  const priceId = PRICE_IDS[planId]?.[billing]
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan or billing interval' }, { status: 400 })
  }

  const profileSnap = await getAdminDb().collection('userProfiles').doc(uid).get()
  let customerId = profileSnap.exists ? profileSnap.data()?.stripeCustomerId : undefined

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email,
      metadata: { firebaseUid: uid },
    })
    customerId = customer.id
    await getAdminDb().collection('userProfiles').doc(uid).set(
      { stripeCustomerId: customerId },
      { merge: true }
    )
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: { firebaseUid: uid },
    },
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`,
    metadata: { firebaseUid: uid },
  })

  return NextResponse.json({ url: session.url })
}
