/**
 * POST /api/org/dissolve — Dissolve an organization (owner only).
 *
 * Removes all members, cancels the Stripe subscription, archives the org document,
 * and clears the owner's org fields. This is irreversible.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getMember, getOrg, listMembers } from '@/lib/org'
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
  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can dissolve an organization' }, { status: 403 })
  }

  const org = await getOrg(orgId)
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const db = getAdminDb()
  const members = await listMembers(orgId)

  const batch = db.batch()

  for (const m of members) {
    batch.delete(db.collection('organizations').doc(orgId).collection('members').doc(m.uid))
    batch.update(db.collection('userProfiles').doc(m.uid), {
      orgId: null,
      orgRole: null,
      orgName: null,
    })
  }

  batch.update(db.collection('organizations').doc(orgId), {
    status: 'dissolved',
    dissolvedAt: new Date().toISOString(),
    dissolvedBy: decoded.uid,
  })

  await batch.commit()

  if (org.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(org.stripeSubscriptionId, {
        prorate: true,
      })
    } catch (err) {
      console.error('[dissolve] Failed to cancel Stripe subscription:', err)
    }
  }

  console.log(`[dissolve] org=${orgId} dissolved by uid=${decoded.uid}, ${members.length} members removed`)

  return NextResponse.json({ ok: true })
}
