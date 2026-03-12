/**
 * GET /api/org — Returns the caller's organization details + member list.
 * POST /api/org/create — Creates a new organization (enterprise users only).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getOrg, listMembers, listInvitations } from '@/lib/org'
import { getStripe } from '@/lib/stripe'

async function verifyToken(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    return await getAdminAuth().verifyIdToken(token)
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const decoded = await verifyToken(req)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getAdminDb().collection('userProfiles').doc(decoded.uid).get()
  const orgId = profile.data()?.orgId
  if (!orgId) return NextResponse.json({ error: 'Not in an organization' }, { status: 404 })

  const [org, members, invitations] = await Promise.all([
    getOrg(orgId),
    listMembers(orgId),
    listInvitations(orgId),
  ])

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  let billingInterval: 'monthly' | 'yearly' | null = null
  let seatPrice: number | null = null
  if (org.stripeSubscriptionId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(org.stripeSubscriptionId)
      const interval = sub.items.data[0]?.price.recurring?.interval
      billingInterval = interval === 'year' ? 'yearly' : 'monthly'
      const unitAmount = sub.items.data[0]?.price.unit_amount
      if (unitAmount) seatPrice = unitAmount / 100
    } catch {}
  }

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      iconUrl: org.iconUrl,
      domain: org.domain,
      ownerId: org.ownerId,
      seatCount: org.seatCount,
      settings: org.settings,
      billingInterval,
      seatPrice,
      subscriptionStatus: (org as any).subscriptionStatus ?? null,
      subscriptionEndDate: (org as any).subscriptionEndDate ?? null,
    },
    members: members.map((m) => ({
      uid: m.uid,
      role: m.role,
      email: m.email,
      displayName: m.displayName,
      photoURL: m.photoURL,
      joinedAt: m.joinedAt,
    })),
    invitations: invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      invitedBy: inv.invitedBy,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      status: inv.status,
      ...(inv.status === 'pending' ? { token: inv.token } : {}),
    })),
  })
}
