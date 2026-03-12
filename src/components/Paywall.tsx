'use client'

import { useState } from 'react'
import { Modal, CloseButton, InfoTooltip } from '@/components/ui'

interface Props {
  isDark: boolean
  featureName: string
  onClose: () => void
  onCheckout?: (planId: string, billing: 'monthly' | 'yearly') => void
  onManagePlan?: () => void
  onRedeemCode?: (code: string) => Promise<{ error?: string }>
  onRevertDiscount?: () => Promise<void>
  discountInfo?: { code: string; plan: string; expiresAt: string } | null
  currentTier?: string
}

/**
 * Premium feature paywall overlay with four plan tiers (Free → Pay-as-you-go → Individual → Enterprise).
 * Highlights the Individual plan as recommended. Animates in/out with scale + opacity.
 */
export default function Paywall({ isDark, featureName, onClose, onCheckout, onRedeemCode, onRevertDiscount, discountInfo, currentTier }: Props) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState('')
  const [discountSuccess, setDiscountSuccess] = useState(false)

  const t = isDark
    ? {
        bg: 'bg-gray-900 border-white/10',
        title: 'text-white',
        subtitle: 'text-gray-400',
        closeBtn: 'text-gray-600 hover:text-gray-300',
        card: 'bg-white/[0.03] border-white/10 hover:border-white/20',
        cardPop: 'bg-white/[0.06] border-white/20 ring-1 ring-white/10',
        cardTitle: 'text-white',
        cardPrice: 'text-white',
        cardUnit: 'text-gray-500',
        cardFeature: 'text-gray-400',
        cardCheck: 'text-green-400',
        cardDash: 'text-gray-700',
        primaryBtn: 'bg-white text-gray-900 hover:bg-gray-200',
        secondaryBtn: 'border-white/15 text-gray-300 hover:border-white/30 hover:bg-white/5',
        freeBtn: 'border-white/10 text-gray-500',
        badge: 'bg-white/10 text-white',
        saveBadge: 'bg-green-400/15 text-green-400',
        toggleBg: 'bg-white/10',
        toggleActive: 'bg-white/20 text-white',
        toggleInactive: 'text-gray-500',
        mission: 'text-gray-600',
        missionIcon: 'text-gray-600',
        tooltipLabel: 'text-gray-500',
        seatNote: 'text-gray-600',
      }
    : {
        bg: 'bg-white border-gray-200',
        title: 'text-gray-900',
        subtitle: 'text-gray-500',
        closeBtn: 'text-gray-400 hover:text-gray-700',
        card: 'bg-gray-50/50 border-gray-200 hover:border-gray-300',
        cardPop: 'bg-violet-50/50 border-violet-300 ring-1 ring-violet-200',
        cardTitle: 'text-gray-900',
        cardPrice: 'text-gray-900',
        cardUnit: 'text-gray-400',
        cardFeature: 'text-gray-600',
        cardCheck: 'text-violet-600',
        cardDash: 'text-gray-300',
        primaryBtn: 'bg-violet-600 text-white hover:bg-violet-700',
        secondaryBtn: 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
        freeBtn: 'border-gray-200 text-gray-400',
        badge: 'bg-violet-100 text-violet-700',
        saveBadge: 'bg-green-50 text-green-700',
        toggleBg: 'bg-gray-100',
        toggleActive: 'bg-white text-gray-900 shadow-sm',
        toggleInactive: 'text-gray-400',
        mission: 'text-gray-400',
        missionIcon: 'text-gray-300',
        tooltipLabel: 'text-gray-400',
        seatNote: 'text-gray-400',
      }

  const individualPrice = billing === 'yearly' ? '5' : '6'
  const enterprisePrice = billing === 'yearly' ? '12' : '15'

  interface PlanFeature {
    text: string
    included: boolean
  }

  interface Plan {
    id: string
    name: string
    description: string
    price: string | null
    priceLine: string | null
    priceUnit: string | null
    priceNote: string | null
    cta: string
    popular: boolean
    isFree: boolean
    disabled?: boolean
    isEnterprise?: boolean
    features: PlanFeature[]
  }

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Explore public data at no cost',
      price: '0',
      priceLine: null,
      priceUnit: null,
      priceNote: 'Free forever',
      cta: 'Free forever',
      popular: false,
      isFree: true,
      features: [
        { text: '10 searches / month', included: true },
        { text: '5,000 results per query', included: true },
        { text: '5 saved searches', included: true },
        { text: 'CSV & JSON export', included: true },
        { text: 'Pre-search filters', included: false },
        { text: 'Custom labels', included: false },
        { text: 'AI overviews', included: false },
      ],
    },
    {
      id: 'payg',
      name: 'Pay as you go',
      description: 'Only pay for what you use',
      price: null,
      priceLine: 'Usage-based',
      priceUnit: null,
      priceNote: null,
      cta: 'Not available yet',
      popular: false,
      isFree: false,
      disabled: true,
      features: [
        { text: 'Everything in Free plan', included: true },
        { text: 'Unlimited searches (pay-per-use)', included: true },
        { text: '10,000 results per query', included: true },
        { text: '100 saved searches', included: true },
        { text: 'All export formats', included: true },
        { text: 'Custom labels', included: true },
        { text: 'AI overviews (pay-per-use)', included: true },
      ],
    },
    {
      id: 'individual',
      name: 'Individual',
      description: 'For power users & professionals',
      price: individualPrice,
      priceLine: null,
      priceUnit: '/mo',
      priceNote: null,
      cta: 'Start free trial',
      popular: true,
      isFree: false,
      features: [
        { text: 'Everything in Pay as you go plan', included: true },
        { text: '100 searches / month', included: true },
        { text: '50,000 results per query', included: true },
        { text: 'Pre-search filters', included: true },
        { text: 'Unlimited saved searches', included: true },
        // { text: 'All export formats', included: true },
        { text: '250 AI overviews / month', included: true },
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For teams that need more',
      price: enterprisePrice,
      priceLine: null,
      priceUnit: '/seat/mo',
      priceNote: null,
      cta: 'Start free trial',
      popular: false,
      isFree: false,
      isEnterprise: false,
      features: [
        { text: 'Everything in Individual plan', included: true },
        { text: 'Unlimited searches', included: true },
        { text: 'Custom result limits', included: true },
        { text: 'Unlimited AI overviews', included: true },
        { text: 'Plug in your data', included: true },
        { text: 'Connect your enterprise software', included: true },
        { text: 'Premium 24/7 support', included: true },
      ],
    },
  ]

  return (
    <Modal isDark={isDark} onClose={onClose} zIndex="z-[9500]" className={`w-[880px] max-h-[90vh] overflow-y-auto ${t.bg}`}>
      {(handleClose) => (<>
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className={`text-lg font-semibold leading-tight ${t.title}`}>
              {featureName === 'plan'
                ? <span className={isDark ? 'text-white' : 'text-violet-600'}>Choose your plan</span>
                : <>Unlock <span className={isDark ? 'text-white' : 'text-violet-600'}>{featureName}</span></>
              }
            </h2>
            <p className={`text-xs mt-1.5 leading-relaxed max-w-md ${t.subtitle}`}>
              Choose a plan that works for you. Upgrade, downgrade, or cancel anytime.
            </p>
          </div>
          <CloseButton onClick={handleClose} isDark={isDark} />
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center px-6 pt-3 pb-1">
          <div className={`inline-flex items-center rounded-lg p-0.5 ${t.toggleBg}`}>
            <button
              onClick={() => setBilling('monthly')}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${billing === 'monthly' ? t.toggleActive : t.toggleInactive}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5 ${billing === 'yearly' ? t.toggleActive : t.toggleInactive}`}
            >
              Yearly
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${t.saveBadge}`}>−20%</span>
            </button>
          </div>
        </div>

        {discountInfo && (
          <div className={`mx-6 mt-3 flex items-center justify-between rounded-xl border px-4 py-3 ${
            isDark ? 'bg-violet-500/10 border-violet-500/20' : 'bg-violet-50 border-violet-200'
          }`}>
            <div>
              <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {discountInfo.plan.charAt(0).toUpperCase() + discountInfo.plan.slice(1)} plan
                <span className={`ml-1.5 text-[10px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  via code <code className={`font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-white/10 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>{discountInfo.code}</code>
                </span>
              </p>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Expires {new Date(discountInfo.expiresAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                {' '}({Math.max(0, Math.ceil((new Date(discountInfo.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left)
              </p>
            </div>
            {onRevertDiscount && (
              <button
                onClick={async () => {
                  await onRevertDiscount()
                  handleClose()
                }}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                  isDark
                    ? 'border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
                    : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Revert to free
              </button>
            )}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-4 gap-3 px-6 pt-4 pb-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-4 transition-all ${plan.popular ? t.cardPop : t.card}`}
            >
              {plan.popular && (
                <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full whitespace-nowrap ${t.badge}`}>
                  Most popular
                </span>
              )}

              <div className="mb-3">
                <h3 className={`text-sm font-semibold ${t.cardTitle}`}>{plan.name}</h3>
                <p className={`text-[10px] mt-0.5 ${t.cardUnit}`}>{plan.description}</p>
              </div>

              <div className="mb-4 min-h-[48px]">
                {plan.price !== null ? (
                  <>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-2xl font-bold tracking-tight ${t.cardPrice}`}>
                        ${plan.price}
                      </span>
                      {plan.priceUnit && (
                        <span className={`text-[11px] ${t.cardUnit}`}>{plan.priceUnit}</span>
                      )}
                    </div>
                    {plan.priceNote && (
                      <p className={`text-[10px] mt-0.5 ${t.cardUnit}`}>{plan.priceNote}</p>
                    )}
                    {plan.price !== '0' && billing === 'yearly' && !plan.priceUnit?.includes('seat') && (
                      <p className={`text-[10px] mt-0.5 ${t.cardUnit}`}>
                        Billed ${(parseFloat(plan.price) * 12).toFixed(2)}/year
                      </p>
                    )}
                    {plan.priceUnit?.includes('seat') && (
                      <p className={`text-[10px] mt-0.5 ${t.seatNote}`}>
                        Starting price — contact sales for a quote
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-lg font-semibold ${t.cardPrice}`}>{plan.priceLine}</span>
                    {plan.id === 'payg' && (
                      <InfoTooltip isDark={isDark} position="top" width="w-44">
                        <p className={`text-[9px] font-semibold uppercase tracking-widest mb-1.5 ${t.tooltipLabel}`}>Pricing</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span>Per result</span>
                            <span className="font-medium">$0.000007</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span>AI overview</span>
                            <span className="font-medium">$0.005 / query</span>
                          </div>
                        </div>
                      </InfoTooltip>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-2 mb-4 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2">
                    {f.included ? (
                      <svg className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${t.cardCheck}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className={`w-3.5 text-center flex-shrink-0 mt-0.5 text-sm leading-none ${t.cardDash}`}>—</span>
                    )}
                    <span className={`text-[11px] leading-snug ${f.included ? t.cardFeature : t.cardDash}`}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={(plan.isFree && !discountInfo) || plan.disabled || plan.id === currentTier}
                onClick={() => {
                  if (plan.isFree && discountInfo && onRevertDiscount) {
                    onRevertDiscount().then(() => handleClose())
                    return
                  }
                  if (onCheckout && !plan.isFree && !plan.disabled && plan.id !== currentTier) {
                    onCheckout(plan.id, billing)
                  }
                }}
                className={`w-full rounded-lg py-2 text-xs font-semibold transition-all border ${
                  plan.id === currentTier || (plan.isFree && !discountInfo) || plan.disabled
                    ? t.freeBtn + ' cursor-default'
                    : plan.popular ? t.primaryBtn : t.secondaryBtn
                }`}
              >
                {plan.id === currentTier
                  ? 'Current plan'
                  : plan.isFree && discountInfo
                    ? 'Revert to free plan'
                    : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Special services message */}
        <div className={`mx-6 mb-4 flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-white/[0.03] border border-white/5' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-2.5">
            <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Need special services or a large number of seats?
            </p>
          </div>
          <a
            href="mailto:romainwintgens@gmail.com?subject=Custom%20Enterprise%20Plan"
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all border ${isDark ? 'border-white/15 text-gray-300 hover:border-white/30 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}
          >
            Contact Sales
          </a>
        </div>

        {/* Discount code */}
        <div className="px-6 pt-2">
          <button
            onClick={() => { setDiscountOpen(!discountOpen); setDiscountError('') }}
            className={`text-[11px] font-medium transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {discountOpen ? 'Hide' : 'Have a discount code?'}
          </button>
          {discountOpen && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => { setDiscountCode(e.target.value); setDiscountError(''); setDiscountSuccess(false) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onRedeemCode && discountCode.trim() && !discountLoading) {
                    e.preventDefault()
                    setDiscountLoading(true)
                    setDiscountError('')
                    setDiscountSuccess(false)
                    onRedeemCode(discountCode.trim()).then((res) => {
                      setDiscountLoading(false)
                      if (res.error) { setDiscountError(res.error) } else { setDiscountSuccess(true); setTimeout(() => handleClose(), 1500) }
                    })
                  }
                }}
                placeholder="Enter code"
                className={`flex-1 rounded-lg border px-3 py-1.5 text-xs outline-none transition-colors ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-violet-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-500'
                }`}
              />
              <button
                disabled={discountLoading || !discountCode.trim()}
                onClick={async () => {
                  if (!onRedeemCode || !discountCode.trim()) return
                  setDiscountLoading(true)
                  setDiscountError('')
                  setDiscountSuccess(false)
                  const res = await onRedeemCode(discountCode.trim())
                  setDiscountLoading(false)
                  if (res.error) {
                    setDiscountError(res.error)
                  } else {
                    setDiscountSuccess(true)
                    setTimeout(() => handleClose(), 1500)
                  }
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                  discountLoading || !discountCode.trim()
                    ? (isDark ? 'border-white/10 text-gray-600 cursor-default' : 'border-gray-200 text-gray-400 cursor-default')
                    : (isDark ? 'border-white/15 text-gray-300 hover:border-white/30 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50')
                }`}
              >
                {discountLoading ? 'Applying…' : 'Apply'}
              </button>
            </div>
          )}
          {discountError && (
            <p className="text-[11px] mt-1.5 text-red-400">{discountError}</p>
          )}
          {discountSuccess && (
            <p className={`text-[11px] mt-1.5 ${isDark ? 'text-green-400' : 'text-green-600'}`}>Code applied! Your plan has been upgraded.</p>
          )}
        </div>

        {/* Mission statement */}
        <div className={`mx-6 mt-2 mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className={`text-[11px] leading-relaxed ${t.mission}`}>
            Public Data Maps is an open-source project committed to giving everyone free access to public data. We're not looking to make a profit — only resource-intensive features are behind a paywall to cover infrastructure costs.
          </p>
        </div>
      </>)}
    </Modal>
  )
}
