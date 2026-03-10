/**
 * GET /api/org/members — Lists all members of the caller's organization.
 * PATCH /api/org/members — Changes a member's role (owner only).
 * DELETE /api/org/members — Removes a member (owner/admin).
 *
 * Body for PATCH: { uid: string, role: 'admin' | 'member' }
 * Body for DELETE: { uid: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getMember, listMembers, canManageMembers, canChangeRoles, type OrgRole } from '@/lib/org'

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

export async function GET(req: NextRequest) {
  const ctx = await verifyAndGetOrg(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canManageMembers(ctx.member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const members = await listMembers(ctx.orgId)
  return NextResponse.json({ members })
}

export async function PATCH(req: NextRequest) {
  const ctx = await verifyAndGetOrg(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canChangeRoles(ctx.member.role)) {
    return NextResponse.json({ error: 'Only the owner can change roles' }, { status: 403 })
  }

  const body = await req.json()
  const targetUid = body.uid
  const newRole = body.role

  if (!targetUid || !['admin', 'member'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid uid or role' }, { status: 400 })
  }

  if (targetUid === ctx.uid) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const target = await getMember(ctx.orgId, targetUid)
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot change the owner\'s role' }, { status: 400 })
  }

  const db = getAdminDb()
  const batch = db.batch()
  batch.update(
    db.collection('organizations').doc(ctx.orgId).collection('members').doc(targetUid),
    { role: newRole },
  )
  batch.update(db.collection('userProfiles').doc(targetUid), { orgRole: newRole })
  await batch.commit()

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const ctx = await verifyAndGetOrg(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canManageMembers(ctx.member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const targetUid = body.uid
  if (!targetUid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 })

  if (targetUid === ctx.uid) {
    return NextResponse.json({ error: 'Cannot remove yourself via this endpoint' }, { status: 400 })
  }

  const target = await getMember(ctx.orgId, targetUid)
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 400 })
  }
  if (target.role === 'admin' && ctx.member.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can remove admins' }, { status: 403 })
  }

  const db = getAdminDb()
  const batch = db.batch()
  batch.delete(db.collection('organizations').doc(ctx.orgId).collection('members').doc(targetUid))
  batch.update(db.collection('userProfiles').doc(targetUid), {
    orgId: null,
    orgRole: null,
    orgName: null,
  })
  await batch.commit()

  return NextResponse.json({ ok: true })
}
