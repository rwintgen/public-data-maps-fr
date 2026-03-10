/**
 * POST /api/org/leave — Leave the current organization.
 * Admins and members only (owner cannot leave).
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
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 404 })

  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Owner cannot leave. Transfer ownership first.' }, { status: 400 })
  }

  const db = getAdminDb()
  const batch = db.batch()
  batch.delete(db.collection('organizations').doc(orgId).collection('members').doc(decoded.uid))
  batch.update(db.collection('userProfiles').doc(decoded.uid), {
    orgId: null,
    orgRole: null,
    orgName: null,
  })
  await batch.commit()

  return NextResponse.json({ ok: true })
}
