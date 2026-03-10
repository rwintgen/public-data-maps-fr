/**
 * POST /api/org/transfer — Transfer organization ownership to another admin.
 * Owner only. Body: { targetUid: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getMember } from '@/lib/org'

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
    return NextResponse.json({ error: 'Only the owner can transfer ownership' }, { status: 403 })
  }

  const body = await req.json()
  const targetUid = body.targetUid
  if (!targetUid || typeof targetUid !== 'string') {
    return NextResponse.json({ error: 'Missing target UID' }, { status: 400 })
  }

  const target = await getMember(orgId, targetUid)
  if (!target) return NextResponse.json({ error: 'Target is not a member' }, { status: 404 })
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Target is already the owner' }, { status: 400 })
  }

  const db = getAdminDb()
  const batch = db.batch()

  const membersCol = db.collection('organizations').doc(orgId).collection('members')
  batch.update(membersCol.doc(decoded.uid), { role: 'admin' })
  batch.update(membersCol.doc(targetUid), { role: 'owner' })

  batch.update(db.collection('organizations').doc(orgId), { ownerId: targetUid })

  batch.update(db.collection('userProfiles').doc(decoded.uid), { orgRole: 'admin' })
  batch.update(db.collection('userProfiles').doc(targetUid), { orgRole: 'owner' })

  await batch.commit()

  return NextResponse.json({ ok: true })
}
