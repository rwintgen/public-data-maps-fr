import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { getOrg, getMember } from '@/lib/org'
import { getStripe } from '@/lib/stripe'

/** GET /api/org/invoices — returns up to 20 Stripe invoices for the org's customer */
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let uid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId } = Object.fromEntries(req.nextUrl.searchParams)
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const org = await getOrg(orgId)
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await getMember(orgId, uid)
  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!org.stripeCustomerId) {
    return NextResponse.json({ invoices: [] })
  }

  const stripe = getStripe()
  const { data: stripeInvoices } = await stripe.invoices.list({
    customer: org.stripeCustomerId,
    limit: 20,
  })

  const invoices = stripeInvoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    amountDue: inv.amount_due,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    status: inv.status,
    created: inv.created,
    periodStart: inv.period_start,
    periodEnd: inv.period_end,
    hostedUrl: inv.hosted_invoice_url,
    pdfUrl: inv.invoice_pdf,
  }))

  return NextResponse.json({ invoices })
}
