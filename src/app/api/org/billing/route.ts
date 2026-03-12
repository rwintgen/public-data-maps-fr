/**
 * POST /api/org/billing — Returns a Stripe Customer Portal URL for the org subscription.
 * Owner only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getMember, getOrg, canManageBilling } from '@/lib/org'
import { getStripe } from '@/lib/stripe'

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
  const orgId = profile.data()?.orgId
  if (!orgId) return NextResponse.json({ error: 'Not in an organization' }, { status: 404 })

  const member = await getMember(orgId, decoded.uid)
  if (!member || !canManageBilling(member.role)) {
    return NextResponse.json({ error: 'Only the owner can manage billing' }, { status: 403 })
  }

  const org = await getOrg(orgId)
  let customerId = org?.stripeCustomerId
  if (!customerId) {
    customerId = profile.data()?.stripeCustomerId
  }
  if (!customerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const origin = req.headers.get('origin') ?? req.nextUrl.origin
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/org`,
  })

  return NextResponse.json({ url: session.url })
}
