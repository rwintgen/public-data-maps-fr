/**
 * Server-side Stripe client singleton.
 * Imported only from API routes — never from client components.
 * Lazily initialised to avoid build-time crashes when STRIPE_SECRET_KEY is absent.
 */
import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    })
  }
  return _stripe
}

/** Maps plan IDs used in the app to their Stripe price IDs per billing interval. */
export const PRICE_IDS: Record<string, Record<string, string | undefined>> = {
  individual: {
    monthly: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY,
    yearly: process.env.STRIPE_PRICE_INDIVIDUAL_YEARLY,
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
  },
}

/** Reverse-maps a Stripe price ID back to a UserTier value. */
export function tierFromPriceId(priceId: string): 'individual' | 'enterprise' | null {
  for (const [tier, map] of Object.entries(PRICE_IDS)) {
    if (Object.values(map).includes(priceId)) return tier as 'individual' | 'enterprise'
  }
  return null
}
