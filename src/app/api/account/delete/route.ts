import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getStripe } from '@/lib/stripe'

/**
 * POST: Permanently deletes the authenticated user's account.
 * Cancels any active Stripe subscription, removes the userProfiles document
 * and all its subcollections (aiOverviews, savedSearches), then deletes
 * the Firebase Auth record.
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

  const profileRef = db.collection('userProfiles').doc(uid)

  // Delete all subcollections under userProfiles/{uid}
  const [aiOverviews, savedSearches] = await Promise.all([
    profileRef.collection('aiOverviews').get(),
    profileRef.collection('savedSearches').get(),
  ])

  const batch = db.batch()
  aiOverviews.docs.forEach((doc) => batch.delete(doc.ref))
  savedSearches.docs.forEach((doc) => batch.delete(doc.ref))
  batch.delete(profileRef)

  await batch.commit()

  // Revert any active discount code so it can't be re-used on a fresh account
  if (profile?.discountCode) {
    try {
      const codeSnap = await db.collection('discountCodes').doc(profile.discountCode).get()
      if (codeSnap.exists) {
        await codeSnap.ref.update({ redeemedBy: null, redeemedAt: null })
      }
    } catch {}
  }

  await getAdminAuth().deleteUser(uid)

  return NextResponse.json({ ok: true })
}
