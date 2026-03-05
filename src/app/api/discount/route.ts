import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import type { UserTier } from '@/lib/usage'

const VALID_PLANS: UserTier[] = ['payg', 'individual', 'enterprise']

/**
 * POST: Redeems a discount code for the authenticated user.
 *
 * Body: `{ code: string }`
 *
 * Validates:
 * - Code exists in `discountCodes` collection
 * - Code hasn't expired (expiresAt > now)
 * - Code hasn't reached maxUses
 * - User hasn't already used this code
 *
 * On success, atomically increments usedCount, adds uid to usedBy array,
 * and writes discountCode/discountPlan/discountExpiresAt to userProfiles.
 *
 * Returns: `{ plan, expiresAt }` on success.
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

  const { code } = await req.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing discount code' }, { status: 400 })
  }

  const db = getAdminDb()
  const trimmed = code.trim().toUpperCase()

  const codesSnap = await db.collection('discountCodes')
    .where('code', '==', trimmed)
    .limit(1)
    .get()

  if (codesSnap.empty) {
    return NextResponse.json({ error: 'Invalid discount code' }, { status: 404 })
  }

  const codeDoc = codesSnap.docs[0]
  const codeRef = codeDoc.ref

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(codeRef)
      if (!snap.exists) throw new Error('Invalid discount code')

      const data = snap.data()!
      const now = new Date()

      const expiresAt = data.expiresAt?.toDate?.() ?? null
      if (expiresAt && expiresAt <= now) {
        throw new Error('This discount code has expired')
      }

      const usedCount: number = data.usedCount ?? 0
      const maxUses: number = data.maxUses ?? 0
      if (maxUses > 0 && usedCount >= maxUses) {
        throw new Error('This discount code has reached its maximum number of uses')
      }

      const usedBy: string[] = data.usedBy ?? []
      if (usedBy.includes(uid)) {
        throw new Error('You have already used this discount code')
      }

      const plan: UserTier = data.plan
      if (!VALID_PLANS.includes(plan)) {
        throw new Error('Invalid plan in discount code')
      }

      const durationDays: number = data.durationDays ?? 30
      const discountExpiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

      tx.update(codeRef, {
        usedCount: usedCount + 1,
        usedBy: [...usedBy, uid],
      })

      tx.set(db.collection('userProfiles').doc(uid), {
        discountCode: trimmed,
        discountPlan: plan,
        discountExpiresAt,
      }, { merge: true })

      return { plan, expiresAt: discountExpiresAt.toISOString() }
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to redeem code' }, { status: 400 })
  }
}
