/**
 * PATCH /api/org/update — Updates organization settings.
 * Owner or admin only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getMember, canEditSettings } from '@/lib/org'

export async function PATCH(req: NextRequest) {
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
  if (!member || !canEditSettings(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }
    updates.name = name
  }

  if (body.iconUrl !== undefined) {
    updates.iconUrl = typeof body.iconUrl === 'string' ? body.iconUrl : null
  }

  if (body.domain !== undefined) {
    if (body.domain === null || body.domain === '') {
      updates.domain = null
    } else if (typeof body.domain === 'string') {
      const domain = body.domain.toLowerCase().trim()
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
        return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
      }
      updates.domain = domain
    }
  }

  if (body.settings) {
    if (Array.isArray(body.settings.defaultPresets)) {
      updates['settings.defaultPresets'] = body.settings.defaultPresets
    }
    if (body.settings.defaultResultLimit !== undefined) {
      updates['settings.defaultResultLimit'] = body.settings.defaultResultLimit
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  await getAdminDb().collection('organizations').doc(orgId).update(updates)

  if (updates.name) {
    const membersSnap = await getAdminDb()
      .collection('organizations').doc(orgId)
      .collection('members').get()
    const batch = getAdminDb().batch()
    membersSnap.docs.forEach((d) => {
      batch.update(getAdminDb().collection('userProfiles').doc(d.id), { orgName: updates.name })
    })
    await batch.commit()
  }

  return NextResponse.json({ ok: true })
}
