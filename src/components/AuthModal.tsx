'use client'

import { useState, useEffect, useRef } from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface Props {
  isDark: boolean
  onClose: () => void
  isSigningIn: React.MutableRefObject<boolean>
}

/**
 * Sign-in / sign-up modal supporting Google OAuth and email+password.
 * Uses `isSigningIn` ref to prevent duplicate Google popup requests.
 */
export default function AuthModal({ isDark, onClose, isSigningIn }: Props) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  /** Maps Firebase Auth error codes to user-friendly messages. */
  const friendlyError = (code: string) => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': return 'Invalid email or password.'
      case 'auth/email-already-in-use': return 'An account with this email already exists.'
      case 'auth/weak-password': return 'Password must be at least 6 characters.'
      case 'auth/invalid-email': return 'Please enter a valid email address.'
      case 'auth/too-many-requests': return 'Too many attempts. Please try again later.'
      default: return 'Something went wrong. Please try again.'
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password)
        if (name.trim()) await updateProfile(user, { displayName: name.trim() })
      }
      onClose()
    } catch (err: any) {
      setError(friendlyError(err?.code ?? ''))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (isSigningIn.current) return
    isSigningIn.current = true
    setError('')
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      onClose()
    } catch (err: any) {
      if (err?.code !== 'auth/cancelled-popup-request' && err?.code !== 'auth/popup-closed-by-user') {
        setError(friendlyError(err?.code ?? ''))
      }
    } finally {
      isSigningIn.current = false
    }
  }

  const t = isDark
    ? {
        overlay: 'bg-black/50',
        modal: 'bg-gray-900 border-white/10',
        title: 'text-white',
        tab: 'text-gray-500 hover:text-gray-300',
        tabActive: 'text-white border-b-2 border-white/60',
        tabBorder: 'border-white/8',
        label: 'text-gray-400',
        input: 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-white/30 focus:bg-white/8',
        error: 'text-red-400 bg-red-400/10 border-red-400/20',
        primaryBtn: 'bg-white hover:bg-gray-200 text-gray-900 disabled:opacity-50',
        divider: 'border-white/8',
        dividerText: 'text-gray-600',
        googleBtn: 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white',
        closeBtn: 'text-gray-600 hover:text-gray-300',
      }
    : {
        overlay: 'bg-black/30',
        modal: 'bg-white border-gray-200',
        title: 'text-gray-900',
        tab: 'text-gray-400 hover:text-gray-700',
        tabActive: 'text-gray-900 border-b-2 border-blue-600',
        tabBorder: 'border-gray-100',
        label: 'text-gray-600',
        input: 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:bg-white',
        error: 'text-red-600 bg-red-50 border-red-200',
        primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50',
        divider: 'border-gray-100',
        dividerText: 'text-gray-400',
        googleBtn: 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-900',
        closeBtn: 'text-gray-400 hover:text-gray-700',
      }

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[9000] flex items-center justify-center backdrop-blur-sm ${t.overlay}`}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={`w-[360px] rounded-2xl border shadow-2xl p-6 ${t.modal}`}>
        <div className={`flex items-center justify-between mb-5 border-b pb-0 ${t.tabBorder}`}>
          <div className="flex gap-4">
            {(['signin', 'signup'] as const).map((t_) => (
              <button
                key={t_}
                onClick={() => { setTab(t_); setError('') }}
                className={`pb-2.5 text-sm font-medium transition-colors ${tab === t_ ? t.tabActive : t.tab}`}
              >
                {t_ === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className={`mb-2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${t.closeBtn}`}
            data-tooltip="Close" data-tooltip-pos="left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          {tab === 'signup' && (
            <div>
              <label className={`block text-xs font-medium mb-1 ${t.label}`}>Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${t.input}`}
              />
            </div>
          )}
          <div>
            <label className={`block text-xs font-medium mb-1 ${t.label}`}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${t.input}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${t.label}`}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
              required
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${t.input}`}
            />
          </div>

          {error && (
            <div className={`text-xs rounded-lg border px-3 py-2 ${t.error}`}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${t.primaryBtn}`}
          >
            {loading ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className={`flex-1 border-t ${t.divider}`} />
          <span className={`text-xs ${t.dividerText}`}>or</span>
          <div className={`flex-1 border-t ${t.divider}`} />
        </div>

        <button
          onClick={handleGoogle}
          className={`w-full flex items-center justify-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${t.googleBtn}`}
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
