import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

function getMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * GET: returns the current monthly search count and subscription tier for an authenticated user.
 * The client calls this on login to seed the local state with authoritative Firestore values.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const uid = decoded.uid
    const month = getMonthKey()

    const adminDb = getAdminDb()
    const [profileSnap, aiOverviewsSnap] = await Promise.all([
      adminDb.collection('userProfiles').doc(uid).get(),
      adminDb.collection('userProfiles').doc(uid).collection('aiOverviews').orderBy('createdAt', 'desc').limit(50).get(),
    ])

    const profileData = profileSnap.exists ? profileSnap.data()! : {}
    const searchCount = profileData.monthKey === month ? (profileData.searchCount ?? 0) : 0
    const aiOverviewCount = profileData.monthKey === month ? (profileData.aiOverviewCount ?? 0) : 0
    const stripeTier = profileData.tier ?? 'free'
    const subscriptionStatus = profileData.subscriptionStatus ?? null

    let effectiveTier = stripeTier
    let discount = null
    if (effectiveTier === 'free') {
      const discountExp = profileData.discountExpiresAt?.toDate?.()
      if (discountExp && discountExp > new Date() && profileData.discountPlan) {
        effectiveTier = profileData.discountPlan
        discount = {
          code: profileData.discountCode ?? null,
          plan: profileData.discountPlan,
          expiresAt: discountExp.toISOString(),
        }
      }
    }

    const aiOverviews = aiOverviewsSnap.docs.map((doc) => {
      const d = doc.data()
      return { siret: doc.id, companyName: d.companyName || doc.id, city: d.city || '', createdAt: d.createdAt || '' }
    })

    return NextResponse.json({ searchCount, aiOverviewCount, monthKey: month, tier: effectiveTier, subscriptionStatus, discount, aiOverviews })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
