'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  isDark: boolean
  featureName: string
  onClose: () => void
}

/**
 * Premium feature paywall overlay.
 * Displays when a user attempts to access a gated feature.
 * Animates in/out with scale + opacity to match the app's modal style.
 */
export default function Paywall({ isDark, featureName, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

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
        badge: 'bg-white/10 text-gray-300 border-white/10',
        featureLabel: 'text-gray-300',
        featureCheck: 'text-green-400',
        divider: 'border-white/5',
        primaryBtn: 'bg-white text-gray-900 hover:bg-gray-200',
        secondaryBtn: 'text-gray-500 hover:text-gray-300',
      }
    : {
        overlay: 'bg-black/30',
        bg: 'bg-white border-gray-200',
        title: 'text-gray-900',
        subtitle: 'text-gray-500',
        closeBtn: 'text-gray-400 hover:text-gray-700',
        badge: 'bg-violet-50 text-violet-700 border-violet-200',
        featureLabel: 'text-gray-600',
        featureCheck: 'text-violet-600',
        divider: 'border-gray-100',
        primaryBtn: 'bg-violet-600 text-white hover:bg-violet-700',
        secondaryBtn: 'text-gray-400 hover:text-gray-600',
      }

  const premiumFeatures = [
    'AI-powered company insights',
    'Unlimited saved searches',
    'Advanced export formats',
    'Priority data updates',
  ]

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[9500] flex items-center justify-center backdrop-blur-sm transition-opacity duration-200 ${t.overlay} ${visible ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={(e) => { if (e.target === overlayRef.current) handleClose() }}
    >
      <div className={`w-[380px] rounded-2xl border shadow-2xl transition-all duration-200 ${t.bg} ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${t.badge}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                Pro
              </span>
            </div>
            <h2 className={`text-base font-semibold leading-tight mt-2 ${t.title}`}>
              Upgrade to unlock
            </h2>
            <p className={`text-xs mt-1 ${t.subtitle}`}>
              <span className="font-medium">{featureName}</span> is a premium feature
            </p>
          </div>
          <button
            onClick={handleClose}
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${t.closeBtn}`}
            data-tooltip="Close" data-tooltip-pos="left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`px-5 py-4 border-t ${t.divider}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${t.subtitle}`}>
            Included with Pro
          </p>
          <ul className="space-y-2.5">
            {premiumFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5">
                <svg className={`w-4 h-4 flex-shrink-0 ${t.featureCheck}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className={`text-sm ${t.featureLabel}`}>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`px-5 py-4 border-t ${t.divider} space-y-2`}>
          <button
            onClick={handleClose}
            className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${t.primaryBtn}`}
          >
            Coming soon
          </button>
          <button
            onClick={handleClose}
            className={`w-full text-xs font-medium py-2 transition-colors ${t.secondaryBtn}`}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
