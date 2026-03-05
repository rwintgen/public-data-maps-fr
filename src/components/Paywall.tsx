'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  isDark: boolean
  featureName: string
  onClose: () => void
}

/**
 * Premium feature paywall overlay with four plan tiers (Free → Pay-as-you-go → Individual → Enterprise).
 * Highlights the Individual plan as recommended. Animates in/out with scale + opacity.
 */
export default function Paywall({ isDark, featureName, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const t = isDark
    ? {
        overlay: 'bg-black/50',
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
        infoIcon: 'text-gray-600 hover:text-gray-400',
        tooltip: 'bg-gray-800 border-white/10 text-gray-300',
        tooltipLabel: 'text-gray-500',
        seatNote: 'text-gray-600',
      }
    : {
        overlay: 'bg-black/30',
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
        infoIcon: 'text-gray-400 hover:text-gray-600',
        tooltip: 'bg-white border-gray-200 text-gray-600 shadow-lg',
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
      cta: 'Current plan',
      popular: false,
      isFree: true,
      features: [
        { text: '10 searches / month', included: true },
        { text: '5,000 results per query', included: true },
        { text: '5 saved searches', included: true },
        { text: 'CSV & JSON export', included: true },
        { text: 'AI company overviews', included: false },
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
      cta: 'Get started',
      popular: false,
      isFree: false,
      features: [
        { text: 'First 50,000 results free', included: true },
        { text: 'Unlimited searches', included: true },
        { text: '10,000 results per query', included: true },
        { text: '20 saved searches', included: true },
        { text: 'Pay-per-use after free tier', included: true },
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
        { text: '100 searches / month', included: true },
        { text: '50,000 results per query', included: true },
        { text: 'Unlimited saved searches', included: true },
        { text: '250 AI company overviews', included: true },
        { text: 'All export formats', included: true },
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
      features: [
        { text: 'Everything in Individual', included: true },
        { text: 'Custom result limits', included: true },
        { text: 'Custom presets & filters', included: true },
        { text: 'Seat allocation & permissions', included: true },
        { text: 'Plug in your own data', included: true },
      ],
    },
  ]

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[9500] flex items-center justify-center backdrop-blur-sm transition-opacity duration-200 ${t.overlay} ${visible ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={(e) => { if (e.target === overlayRef.current) handleClose() }}
    >
      <div className={`w-[880px] max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl transition-all duration-200 ${t.bg} ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className={`text-lg font-semibold leading-tight ${t.title}`}>
              Unlock <span className={isDark ? 'text-white' : 'text-violet-600'}>{featureName}</span>
            </h2>
            <p className={`text-xs mt-1.5 leading-relaxed max-w-md ${t.subtitle}`}>
              Choose a plan that works for you. Upgrade, downgrade, or cancel anytime.
            </p>
          </div>
          <button
            onClick={handleClose}
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${t.closeBtn}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
                        Final pricing may vary based on requested features
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-lg font-semibold ${t.cardPrice}`}>{plan.priceLine}</span>
                    {plan.id === 'payg' && (
                      <div className="relative group">
                        <svg className={`w-3.5 h-3.5 cursor-help transition-colors ${t.infoIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth={2} />
                          <path strokeLinecap="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
                        </svg>
                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded-lg border p-2.5 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-10 ${t.tooltip}`}>
                          <p className={`text-[9px] font-semibold uppercase tracking-widest mb-1.5 ${t.tooltipLabel}`}>Pricing</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span>Per result</span>
                              <span className="font-medium">$0.0001</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span>AI overview</span>
                              <span className="font-medium">$0.005 / query</span>
                            </div>
                          </div>
                        </div>
                      </div>
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
                disabled={plan.isFree}
                className={`w-full rounded-lg py-2 text-xs font-semibold transition-all border ${
                  plan.isFree ? t.freeBtn + ' cursor-default' : plan.popular ? t.primaryBtn : t.secondaryBtn
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
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
      </div>
    </div>
  )
}
