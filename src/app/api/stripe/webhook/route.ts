import { NextRequest, NextResponse } from 'next/server'
import { getStripe, tierFromPriceId } from '@/lib/stripe'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { createOrg, getOrg } from '@/lib/org'
import type Stripe from 'stripe'

/**
 * POST: Stripe webhook handler.
 *
 * Verifies the Stripe signature, then updates the user's tier in Firestore based on
 * subscription lifecycle events. This is the single source of truth for paid tiers.
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const db = getAdminDb()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const uid = session.metadata?.firebaseUid
      if (!uid || session.mode !== 'subscription') break

      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id

      if (subscriptionId) {
        const sub = await getStripe().subscriptions.retrieve(subscriptionId)
        const priceId = sub.items.data[0]?.price.id
        const tier = tierFromPriceId(priceId ?? '') ?? 'free'

        await db.collection('userProfiles').doc(uid).set({
          tier,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: sub.status,
        }, { merge: true })

        if (tier === 'enterprise') {
          const profile = await db.collection('userProfiles').doc(uid).get()
          if (!profile.data()?.orgId) {
            try {
              const authUser = await getAdminAuth().getUser(uid)
              const orgId = await createOrg(
                uid,
                authUser.email ?? '',
                authUser.displayName ?? null,
                authUser.photoURL ?? null,
                authUser.displayName ? `${authUser.displayName}'s Organization` : 'My Organization',
                1,
                subscriptionId,
              )
              console.log(`[stripe-webhook] auto-provisioned org=${orgId} for uid=${uid}`)
            } catch (err) {
              console.error('[stripe-webhook] failed to auto-provision org:', err)
            }
          }
        }

        console.log(`[stripe-webhook] checkout.session.completed → uid=${uid} tier=${tier}`)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const uid = sub.metadata?.firebaseUid ?? await uidFromCustomer(db, sub.customer as string)
      if (!uid) break

      const priceId = sub.items.data[0]?.price.id
      const tier = tierFromPriceId(priceId ?? '') ?? 'free'
      const quantity = sub.items.data[0]?.quantity ?? 1

      await db.collection('userProfiles').doc(uid).set({
        tier,
        subscriptionStatus: sub.status,
      }, { merge: true })

      if (tier === 'enterprise') {
        const profile = await db.collection('userProfiles').doc(uid).get()
        const orgId = profile.data()?.orgId
        if (orgId) {
          await db.collection('organizations').doc(orgId).update({ seatCount: quantity })
        }
      }

      console.log(`[stripe-webhook] subscription.updated → uid=${uid} tier=${tier} status=${sub.status} seats=${quantity}`)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const uid = sub.metadata?.firebaseUid ?? await uidFromCustomer(db, sub.customer as string)
      if (!uid) break

      await db.collection('userProfiles').doc(uid).set({
        tier: 'free',
        subscriptionStatus: 'canceled',
      }, { merge: true })

      console.log(`[stripe-webhook] subscription.deleted → uid=${uid} downgraded to free`)
      break
    }
  }

  return NextResponse.json({ received: true })
}

/** Looks up a Firebase UID from a Stripe customer ID stored in userProfiles. */
async function uidFromCustomer(db: FirebaseFirestore.Firestore, customerId: string): Promise<string | null> {
  const snap = await db.collection('userProfiles')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()
  return snap.empty ? null : snap.docs[0].id
}
