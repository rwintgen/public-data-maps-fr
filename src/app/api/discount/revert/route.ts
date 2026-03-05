import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * POST: Reverts a discount-based plan upgrade, setting the user back to free tier.
 * Clears discountCode, discountPlan, and discountExpiresAt from the user profile.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let uid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await getAdminDb().collection('userProfiles').doc(uid).update({
    discountCode: FieldValue.delete(),
    discountPlan: FieldValue.delete(),
    discountExpiresAt: FieldValue.delete(),
  })

  return NextResponse.json({ tier: 'free' })
}
