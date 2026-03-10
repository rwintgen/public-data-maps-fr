/**
 * POST /api/org/invite — Sends an invitation to join the organization.
 * Body: { email: string, role?: 'admin' | 'member' }
 *
 * DELETE /api/org/invite — Revokes a pending invitation.
 * Body: { inviteId: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getMember, getOrg, memberCount, canManageMembers, createInvitation } from '@/lib/org'

async function verifyAndGetOrg(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const profile = await getAdminDb().collection('userProfiles').doc(decoded.uid).get()
    const orgId = profile.data()?.orgId
    if (!orgId) return null
    const member = await getMember(orgId, decoded.uid)
    if (!member) return null
    return { uid: decoded.uid, orgId, member }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const ctx = await verifyAndGetOrg(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canManageMembers(ctx.member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
  const role = body.role === 'admin' ? 'admin' : 'member'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  if (role === 'admin' && ctx.member.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can invite admins' }, { status: 403 })
  }

  const org = await getOrg(ctx.orgId)
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const count = await memberCount(ctx.orgId)
  if (count >= org.seatCount) {
    return NextResponse.json({ error: 'Seat limit reached' }, { status: 409 })
  }

  const existingSnap = await getAdminDb()
    .collection('organizations').doc(ctx.orgId)
    .collection('invitations')
    .where('email', '==', email)
    .where('status', '==', 'pending')
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 409 })
  }

  const invitation = await createInvitation(ctx.orgId, email, role, ctx.uid)

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    },
  })
}

export async function DELETE(req: NextRequest) {
  const ctx = await verifyAndGetOrg(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canManageMembers(ctx.member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const inviteId = body.inviteId
  if (!inviteId) return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 })

  const ref = getAdminDb()
    .collection('organizations').doc(ctx.orgId)
    .collection('invitations').doc(inviteId)
  const snap = await ref.get()

  if (!snap.exists || snap.data()?.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation not found or not pending' }, { status: 404 })
  }

  await ref.update({ status: 'revoked' })
  return NextResponse.json({ ok: true })
}
