/**
 * POST /api/org/invite/accept — Accepts an invitation by token.
 * Body: { token: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { acceptInvitation } from '@/lib/org'

export async function POST(req: NextRequest) {
  const authToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded
  try {
    decoded = await getAdminAuth().verifyIdToken(authToken)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const inviteToken = body.token
  if (!inviteToken || typeof inviteToken !== 'string') {
    return NextResponse.json({ error: 'Missing invitation token' }, { status: 400 })
  }

  try {
    const result = await acceptInvitation(
      inviteToken,
      decoded.uid,
      decoded.email ?? '',
      decoded.name ?? null,
      decoded.picture ?? null,
    )
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
