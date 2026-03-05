import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getStripe } from '@/lib/stripe'

/**
 * POST: Permanently deletes the authenticated user's account.
 * Cancels any active Stripe subscription, removes Firestore documents
 * (userProfiles, userUsage) and the Firebase Auth record.
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

  const db = getAdminDb()
  const profileDoc = await db.collection('userProfiles').doc(uid).get()
  const profile = profileDoc.data()

  if (profile?.stripeCustomerId) {
    try {
      const stripe = getStripe()
      const subs = await stripe.subscriptions.list({
        customer: profile.stripeCustomerId,
        status: 'active',
      })
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id)
      }
    } catch {}
  }

  const batch = db.batch()
  batch.delete(db.collection('userProfiles').doc(uid))
  batch.delete(db.collection('userUsage').doc(uid))
  await batch.commit()

  await getAdminAuth().deleteUser(uid)

  return NextResponse.json({ ok: true })
}
