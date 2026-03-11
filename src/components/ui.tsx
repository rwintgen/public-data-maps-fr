'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Animated modal overlay with enter/exit scale + opacity transitions.
 * Handles: backdrop click to dismiss, Escape key, 200ms animated close.
 * Children receive `handleClose` to trigger the animated exit from within.
 */
export function Modal({ isDark, onClose, zIndex, children, className = '' }: {
  isDark: boolean
  onClose: () => void
  zIndex: string
  children: (handleClose: () => void) => React.ReactNode
  className?: string
}) {
  const [visible, setVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 200)
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleClose])

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 ${zIndex} flex items-center justify-center backdrop-blur-sm transition-opacity duration-200 ${
        isDark ? 'bg-black/50' : 'bg-black/30'
      } ${visible ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={(e) => { if (e.target === overlayRef.current) handleClose() }}
    >
      <div className={`rounded-2xl border shadow-2xl transition-all duration-200 ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      } ${className}`}>
        {children(handleClose)}
      </div>
    </div>
  )
}

/**
 * Standard close button used in all modals and overlays.
 * `w-7 h-7 rounded-lg` container with a `w-4 h-4` X icon.
 * Dark: gray-600 → hover gray-300 + bg-white/10.
 * Light: gray-400 → hover gray-700 + bg-gray-100.
 */
export function CloseButton({ onClick, isDark, className = '' }: {
  onClick: () => void
  isDark: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
        isDark
          ? 'text-gray-600 hover:text-gray-300 hover:bg-white/10'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
      } ${className}`}
      data-tooltip="Close" data-tooltip-pos="left"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

/**
 * Standard checkbox used in column/field selection lists.
 * `w-3.5 h-3.5 rounded` container with a `w-2 h-2` checkmark.
 * Active: gray-400 bg (dark), violet-600 bg (light).
 */
export function Checkbox({ checked, isDark }: {
  checked: boolean
  isDark: boolean
}) {
  return (
    <div className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
      checked
        ? isDark ? 'border-gray-400 bg-gray-400' : 'border-violet-600 bg-violet-600'
        : isDark ? 'border-white/20 bg-white/5' : 'border-gray-300 bg-white'
    }`}>
      {checked && (
        <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  )
}

/**
 * Reusable button with themed variants.
 * - primary: solid fill (violet light / white dark)
 * - secondary: bordered, subtle hover
 * - danger: red-tinted for destructive actions
 * - ghost: no border, just text
 */
export function Button({ children, onClick, disabled, variant = 'primary', isDark, className = '', ...rest }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  isDark: boolean
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  const base = 'rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const variants: Record<string, string> = isDark
    ? {
        primary: 'bg-white text-gray-900 hover:bg-gray-200',
        secondary: 'border border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/5',
        danger: 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
        ghost: 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
      }
    : {
        primary: 'bg-violet-600 text-white hover:bg-violet-700',
        secondary: 'border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
        danger: 'border border-red-200 text-red-600 hover:bg-red-50',
        ghost: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
      }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * Hoverable info icon (ⓘ) with a tooltip that appears on hover.
 * Uses CSS `group-hover` for zero-JS tooltip display.
 * The icon is a 3.5×3.5 SVG circle-i; the tooltip appears above by default.
 */
export function InfoTooltip({ text, children, isDark, position = 'top', width = 'w-56' }: {
  text?: string
  children?: React.ReactNode
  isDark: boolean
  position?: 'top' | 'bottom'
  width?: string
}) {
  const iconClass = isDark
    ? 'text-gray-600 hover:text-gray-400'
    : 'text-gray-400 hover:text-gray-600'
  const tooltipClass = isDark
    ? 'bg-gray-800 border-white/10 text-gray-300'
    : 'bg-white border-gray-200 text-gray-600 shadow-lg'
  const pos = position === 'top'
    ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    : 'top-full left-1/2 -translate-x-1/2 mt-2'

  return (
    <div className="relative group">
      <svg className={`w-3.5 h-3.5 cursor-help transition-colors ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
        <path strokeLinecap="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
      </svg>
      <div className={`absolute ${pos} ${width} rounded-lg border px-3 py-2 text-[11px] leading-snug opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-10 ${tooltipClass}`}>
        {children ?? text}
      </div>
    </div>
  )
}

const QUICK_FILTER_PILL_STYLES = {
  dark: {
    base: 'bg-white/5 text-gray-500 border-white/8 hover:bg-white/10 hover:text-gray-300',
    active: 'bg-white/15 text-white border-white/25',
    customBase: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:text-emerald-300',
    customActive: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50',
    orgBase: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-300',
    orgActive: 'bg-amber-500/25 text-amber-300 border-amber-400/50',
  },
  light: {
    base: 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700',
    active: 'bg-violet-50 text-violet-700 border-violet-300',
    customBase: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800',
    customActive: 'bg-emerald-100 text-emerald-800 border-emerald-400',
    orgBase: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:text-amber-800',
    orgActive: 'bg-amber-100 text-amber-800 border-amber-400',
  },
} as const

interface PresetPillProps {
  label: string
  active: boolean
  isDark: boolean
  custom?: boolean
  org?: boolean
  disabled?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseMove?: (e: React.MouseEvent) => void
  onMouseLeave?: () => void
  tooltip?: string
  tooltipPos?: string
}

export function PresetPill({ label, active, isDark, custom, org, disabled, onClick, onMouseEnter, onMouseMove, onMouseLeave, tooltip, tooltipPos }: PresetPillProps) {
  const s = QUICK_FILTER_PILL_STYLES[isDark ? 'dark' : 'light']
  const cls = active
    ? org ? s.orgActive : custom ? s.customActive : s.active
    : org ? s.orgBase : custom ? s.customBase : s.base
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      data-tooltip={tooltip}
      data-tooltip-pos={tooltipPos}
      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
    >
      {label}
    </button>
  )
}

export function ConfirmModal({ isDark, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel }: {
  isDark: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal isDark={isDark} onClose={onCancel} zIndex="z-[9999]" className={isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}>
      {(handleClose) => (
        <div className="w-[360px] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <CloseButton onClick={handleClose} isDark={isDark} />
          </div>
          <div className={`text-[12px] leading-relaxed mb-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{message}</div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleClose}
              className={`text-[11px] font-medium px-4 py-1.5 rounded-lg border transition-colors ${
                isDark ? 'border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => { handleClose(); setTimeout(onConfirm, 200) }}
              className={`text-[11px] font-medium px-4 py-1.5 rounded-lg transition-colors ${
                danger
                  ? isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'
                  : isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-violet-600 text-white hover:bg-violet-700'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function CardSection({ isDark, children, className = '' }: {
  isDark: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-lg border p-2 ${isDark ? 'bg-white/3 border-white/5' : 'bg-gray-50 border-gray-200'} ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, isDark, className = '' }: {
  children: React.ReactNode
  isDark: boolean
  className?: string
}) {
  return (
    <div className={`text-[9px] uppercase tracking-widest font-semibold ${isDark ? 'text-gray-600' : 'text-gray-400'} ${className}`}>
      {children}
    </div>
  )
}
