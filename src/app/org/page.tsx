'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { auth } from '@/lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { Button, CardSection, SectionTitle, ConfirmModal } from '@/components/ui'

type OrgRole = 'owner' | 'admin' | 'member'
type Section = 'overview' | 'members' | 'invitations' | 'settings' | 'billing' | 'usage' | 'connectors' | 'support'

interface Member {
  uid: string
  role: OrgRole
  email: string
  displayName: string | null
  photoURL: string | null
  joinedAt: any
}

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'member'
  invitedBy: string
  createdAt: any
  expiresAt: any
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  token?: string
}

interface OrgData {
  id: string
  name: string
  iconUrl: string | null
  domain: string | null
  ownerId: string
  seatCount: number
  settings: { defaultPresets: string[]; defaultResultLimit: number | null; customQuickFilters?: { id: string; label: string; column: string; operator: 'contains' | 'equals' | 'empty'; negate: boolean; value: string }[] }
}

interface Invoice {
  id: string
  number: string | null
  amountDue: number
  amountPaid: number
  currency: string
  status: string | null
  created: number
  periodStart: number
  periodEnd: number
  hostedUrl: string | null
  pdfUrl: string | null
}

export default function OrgDashboard() {
  const [user, authLoading] = useAuthState(auth)
  const [section, setSectionRaw] = useState<Section>('overview')

  const navigateToSection = useCallback((s: Section, replace = false) => {
    setSectionRaw(s)
    const hash = s === 'overview' ? '' : `#${s}`
    if (replace) {
      window.history.replaceState(null, '', `/org${hash}`)
    } else {
      window.history.pushState(null, '', `/org${hash}`)
    }
  }, [])
  const [org, setOrg] = useState<OrgData | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<OrgRole | null>(null)
  const [userTier, setUserTier] = useState<string | null>(null)
  const [noOrg, setNoOrg] = useState(false)

  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const [usageData, setUsageData] = useState<{ month: string; totalSearches: number; totalAiOverviews: number; totalSavedSearches: number; totalCustomQuickFilters: number; orgQuickFiltersCount: number; members: { uid: string; displayName: string | null; email: string; role: OrgRole; searchCount: number; aiOverviewCount: number; lastActiveAt: string | null; savedSearches: number; customQuickFilters: number }[] } | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [usageLoaded, setUsageLoaded] = useState(false)

  const [editName, setEditName] = useState('')
  const [editDomain, setEditDomain] = useState('')
  const [settingsSaving, setSettingsSaving] = useState(false)

  const [inviteSeatConfirm, setInviteSeatConfirm] = useState(false)

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invoicesLoaded, setInvoicesLoaded] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvParsed, setCsvParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null)
  const [csvLatColumn, setCsvLatColumn] = useState('')
  const [csvLonColumn, setCsvLonColumn] = useState('')
  const [csvName, setCsvName] = useState('')
  const [csvMatchStep, setCsvMatchStep] = useState<'upload' | 'map' | 'result'>('upload')
  const [csvMatching, setCsvMatching] = useState(false)
  const [csvResult, setCsvResult] = useState<{ id: string; name: string; totalRows: number; rowCount: number; skippedCount: number } | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [connectors, setConnectors] = useState<{ id: string; name: string; columns: string[]; rowCount: number; totalRows: number; skippedCount: number; createdAt: string | null }[]>([])
  const [connectorsLoading, setConnectorsLoading] = useState(false)
  const [connectorsLoaded, setConnectorsLoaded] = useState(false)

  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('invite')
  })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const isSigningIn = useRef(false)
  const [inviteInfo, setInviteInfo] = useState<{ orgName: string; orgIconUrl: string | null; inviterName: string | null; email: string; role: string } | null>(null)
  const [inviteInfoError, setInviteInfoError] = useState<string | null>(null)
  const [inviteAccepting, setInviteAccepting] = useState(false)
  const inviteFailedRef = useRef(false)

  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading2, setAuthLoading2] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  const [transferTarget, setTransferTarget] = useState<{ uid: string; name: string } | null>(null)
  const [deleteConnector, setDeleteConnector] = useState<{ id: string; name: string } | null>(null)

  const [orgFilters, setOrgFilters] = useState<{ id: string; label: string; column: string; operator: 'contains' | 'equals' | 'empty'; negate: boolean; value: string }[]>([])
  const [orgFilterForm, setOrgFilterForm] = useState(false)
  const [ofLabel, setOfLabel] = useState('')
  const [ofColumn, setOfColumn] = useState('')
  const [ofOperator, setOfOperator] = useState<'contains' | 'equals' | 'empty'>('contains')
  const [ofNegate, setOfNegate] = useState(false)
  const [ofValue, setOfValue] = useState('')
  const [orgFiltersSaving, setOrgFiltersSaving] = useState(false)
  const [orgFiltersColumns, setOrgFiltersColumns] = useState<string[]>([])

  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system')
  const [systemDark, setSystemDark] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pdm_theme')
      if (stored === 'light' || stored === 'dark' || stored === 'system') setThemeMode(stored)
    } catch {}
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isDark = themeMode === 'system' ? systemDark : themeMode === 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const fetchOrg = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/org', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to load organization' }))
        if (res.status === 404) {
          const usageRes = await fetch('/api/usage', { headers: { Authorization: `Bearer ${token}` } })
          const usageData = usageRes.ok ? await usageRes.json() : null
          setUserTier(usageData?.tier ?? null)
          setNoOrg(true)
          return
        }
        setError(data.error || 'Failed to load organization')
        return
      }
      const data = await res.json()
      setOrg(data.org)
      setMembers(data.members)
      setInvitations(data.invitations)
      setEditName(data.org.name)
      setEditDomain(data.org.domain ?? '')
      setOrgFilters(data.org.settings?.customQuickFilters ?? [])
      const me = data.members.find((m: Member) => m.uid === user.uid)
      setMyRole(me?.role ?? null)
    } catch {
      setError('Failed to load organization')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && user && !pendingInviteToken && !inviteFailedRef.current) fetchOrg()
    if (!authLoading && !user) {
      setLoading(false)
      if (pendingInviteToken) {
        setShowAuthModal(true)
      } else {
        setError('Please sign in to access the organization dashboard.')
      }
    }
  }, [user, authLoading, fetchOrg, pendingInviteToken])

  useEffect(() => {
    fetch('/api/search')
      .then((r) => r.json())
      .then((d) => { if (d.columns?.length) setOrgFiltersColumns(d.columns) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!pendingInviteToken) return
    ;(async () => {
      try {
        const res = await fetch(`/api/org/invite/info?token=${encodeURIComponent(pendingInviteToken)}`)
        if (res.ok) {
          const data = await res.json()
          setInviteInfo(data)
          setAuthEmail(data.email)
        } else {
          const data = await res.json().catch(() => ({ error: 'Invalid invitation' }))
          setInviteInfoError(data.error)
        }
      } catch {
        setInviteInfoError('Failed to load invitation details')
      }
    })()
  }, [pendingInviteToken])

  useEffect(() => {
    if (!user || authLoading || !pendingInviteToken) return
    setShowAuthModal(false)
    setInviteAccepting(true)
    window.history.replaceState({}, '', '/org')
    ;(async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch('/api/org/invite/accept', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: pendingInviteToken }),
        })
        if (res.ok) {
          setPendingInviteToken(null)
          setInviteAccepting(false)
          setNoOrg(false)
          fetchOrg()
        } else {
          const data = await res.json().catch(() => ({ error: 'Failed to accept invitation' }))
          inviteFailedRef.current = true
          setPendingInviteToken(null)
          setInviteAccepting(false)
          setError(data.error)
        }
      } catch {
        inviteFailedRef.current = true
        setPendingInviteToken(null)
        setInviteAccepting(false)
        setError('Failed to accept invitation')
      }
    })()
  }, [user, authLoading, fetchOrg, pendingInviteToken])

  const authHeader = useCallback(async () => {
    const token = await user!.getIdToken()
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, [user])

  const handleCreateOrg = async () => {
    if (!createName.trim()) return
    setCreateLoading(true)
    setCreateError(null)
    try {
      const token = await user!.getIdToken()
      const res = await fetch('/api/org/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error); return }
      setNoOrg(false)
      fetchOrg()
    } catch {
      setCreateError('Failed to create organization')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    setInviteError(null)
    try {
      const headers = await authHeader()
      const res = await fetch('/api/org/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data.error); return }
      setInviteEmail('')
      fetchOrg()
    } catch {
      setInviteError('Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const headers = await authHeader()
      await fetch('/api/org/invite', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ inviteId }),
      })
      fetchOrg()
    } catch {}
  }

  const handleChangeRole = async (uid: string, role: 'admin' | 'member') => {
    try {
      const headers = await authHeader()
      await fetch('/api/org/members', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ uid, role }),
      })
      fetchOrg()
    } catch {}
  }

  const handleRemoveMember = async (uid: string) => {
    try {
      const headers = await authHeader()
      await fetch('/api/org/members', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ uid }),
      })
      fetchOrg()
    } catch {}
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      const headers = await authHeader()
      const body: Record<string, unknown> = {}
      if (editName !== org?.name) body.name = editName
      if ((editDomain || null) !== (org?.domain || null)) body.domain = editDomain || null
      if (Object.keys(body).length === 0) return
      await fetch('/api/org/update', { method: 'PATCH', headers, body: JSON.stringify(body) })
      fetchOrg()
    } catch {}
    finally { setSettingsSaving(false) }
  }

  const handleSaveOrgFilters = async (filters: typeof orgFilters) => {
    setOrgFiltersSaving(true)
    try {
      const headers = await authHeader()
      await fetch('/api/org/update', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ settings: { customQuickFilters: filters } }),
      })
      setOrgFilters(filters)
    } catch {}
    finally { setOrgFiltersSaving(false) }
  }

  const handleTransfer = async (targetUid: string) => {
    try {
      const headers = await authHeader()
      await fetch('/api/org/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetUid }),
      })
      fetchOrg()
    } catch {}
  }

  const handleBilling = async () => {
    setBillingError(null)
    try {
      const token = await user!.getIdToken()
      const res = await fetch('/api/org/billing', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (res.status === 404) {
        setBillingError('Your plan was activated via a promotional code. There is no Stripe subscription to manage.')
      } else {
        setBillingError(data.error ?? 'Could not open billing portal')
      }
    } catch {
      setBillingError('Failed to open billing portal')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setLogoError('File must be PNG, JPEG, or WebP')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('File must be under 2 MB')
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = async () => {
      URL.revokeObjectURL(url)
      if (img.width !== img.height) {
        setLogoError('Logo must be square')
        return
      }
      setLogoUploading(true)
      setLogoError(null)
      try {
        const token = await user!.getIdToken()
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/org/logo', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        const data = await res.json()
        if (!res.ok) { setLogoError(data.error); return }
        setOrg((prev) => prev ? { ...prev, iconUrl: data.iconUrl } : prev)
      } catch {
        setLogoError('Upload failed')
      } finally {
        setLogoUploading(false)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setLogoError('Invalid image file')
    }
    img.src = url
  }

  const fetchUsage = useCallback(async () => {
    if (!user || !org) return
    setUsageLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/org/usage', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setUsageData(await res.json())
    } catch {}
    finally { setUsageLoading(false); setUsageLoaded(true) }
  }, [user, org])

  useEffect(() => {
    if (section === 'usage' && !usageLoaded && !usageLoading) fetchUsage()
  }, [section, usageLoaded, usageLoading, fetchUsage])

  const fetchInvoices = useCallback(async () => {
    if (!user || !org) return
    setInvoicesLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/org/invoices?orgId=${org.id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices ?? [])
      }
    } catch {}
    finally { setInvoicesLoading(false); setInvoicesLoaded(true) }
  }, [user, org])

  useEffect(() => {
    if (section === 'billing' && !invoicesLoaded && !invoicesLoading) fetchInvoices()
  }, [section, invoicesLoaded, invoicesLoading, fetchInvoices])

  const fetchConnectors = useCallback(async () => {
    if (!user || !org) return
    setConnectorsLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/org/connectors?orgId=${org.id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setConnectors(data.connectors ?? [])
      }
    } catch {}
    finally { setConnectorsLoading(false); setConnectorsLoaded(true) }
  }, [user, org])

  useEffect(() => {
    if (section === 'connectors' && !connectorsLoaded && !connectorsLoading) fetchConnectors()
  }, [section, connectorsLoaded, connectorsLoading, fetchConnectors])

  useEffect(() => {
    const validSections: Section[] = ['overview', 'members', 'invitations', 'settings', 'billing', 'usage', 'connectors', 'support']
    const hash = window.location.hash.replace('#', '') as Section
    if (hash && validSections.includes(hash)) {
      setSectionRaw(hash)
    }
    const onPopState = () => {
      const h = window.location.hash.replace('#', '') as Section
      setSectionRaw(h && validSections.includes(h) ? h : 'overview')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const t = isDark
    ? {
        bg: 'bg-gray-950',
        sidebar: 'bg-gray-900 border-white/5',
        card: 'bg-gray-900 border-white/5',
        title: 'text-white',
        subtitle: 'text-gray-400',
        label: 'text-gray-500',
        text: 'text-gray-300',
        muted: 'text-gray-600',
        border: 'border-white/5',
        navActive: 'bg-white/10 text-white',
        nav: 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
        input: 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-white/30',
        badge: {
          owner: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
          admin: 'bg-white/10 text-gray-300 border-white/10',
          member: 'bg-white/5 text-gray-500 border-white/5',
          pending: 'bg-yellow-500/15 text-yellow-400',
          accepted: 'bg-green-500/15 text-green-400',
          expired: 'bg-gray-500/15 text-gray-500',
          revoked: 'bg-red-500/15 text-red-400',
        },
        dangerBtn: 'text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/10',
        backBtn: 'text-gray-400 hover:text-white',
      }
    : {
        bg: 'bg-gray-100',
        sidebar: 'bg-white border-gray-200',
        card: 'bg-white border-gray-200',
        title: 'text-gray-900',
        subtitle: 'text-gray-500',
        label: 'text-gray-400',
        text: 'text-gray-600',
        muted: 'text-gray-400',
        border: 'border-gray-200',
        navActive: 'bg-violet-50 text-violet-700',
        nav: 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
        input: 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-400',
        badge: {
          owner: 'bg-amber-50 text-amber-600 border-amber-200',
          admin: 'bg-violet-50 text-violet-600 border-violet-200',
          member: 'bg-gray-100 text-gray-500 border-gray-200',
          pending: 'bg-yellow-50 text-yellow-600',
          accepted: 'bg-green-50 text-green-600',
          expired: 'bg-gray-100 text-gray-400',
          revoked: 'bg-red-50 text-red-500',
        },
        dangerBtn: 'text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50',
        backBtn: 'text-gray-500 hover:text-gray-900',
      }

  if (loading || authLoading || inviteAccepting) {
    return (
      <div className={`h-screen flex items-center justify-center ${t.bg}`}>
        <div className={`text-sm ${t.subtitle}`}>{inviteAccepting ? 'Joining organization…' : 'Loading…'}</div>
      </div>
    )
  }

  if (inviteInfoError && !user) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center gap-4 ${t.bg}`}>
        <svg className={`w-10 h-10 ${t.subtitle}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className={`text-sm font-medium ${t.title}`}>{inviteInfoError}</p>
        <a href="/" className={`text-sm font-medium ${isDark ? 'text-white hover:text-gray-300' : 'text-violet-600 hover:text-violet-700'} transition-colors`}>← Back to map</a>
      </div>
    )
  }

  if (showAuthModal && !user) {
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
      setAuthError('')
      setAuthLoading2(true)
      try {
        if (authTab === 'signin') {
          await signInWithEmailAndPassword(auth, authEmail, authPassword)
        } else {
          const { user: newUser } = await createUserWithEmailAndPassword(auth, authEmail, authPassword)
          if (authName.trim()) await updateProfile(newUser, { displayName: authName.trim() })
          await sendEmailVerification(newUser)
          setVerificationSent(true)
        }
      } catch (err: any) {
        setAuthError(friendlyError(err?.code ?? ''))
      } finally {
        setAuthLoading2(false)
      }
    }
    const handleForgotPassword = async () => {
      if (!authEmail.trim()) { setAuthError('Enter your email address first.'); return }
      setResetLoading(true); setAuthError('')
      try { await sendPasswordResetEmail(auth, authEmail); setResetSent(true) }
      catch (err: any) { setAuthError(friendlyError(err?.code ?? '')) }
      finally { setResetLoading(false) }
    }
    const handleGoogle = async () => {
      if (isSigningIn.current) return
      isSigningIn.current = true; setAuthError('')
      try { await signInWithPopup(auth, new GoogleAuthProvider()) }
      catch (err: any) {
        if (err?.code !== 'auth/cancelled-popup-request' && err?.code !== 'auth/popup-closed-by-user') {
          setAuthError(friendlyError(err?.code ?? ''))
        }
      } finally { isSigningIn.current = false }
    }
    const at = isDark
      ? {
          label: 'text-gray-400',
          input: 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-white/30 focus:bg-white/8',
          tab: 'text-gray-500 hover:text-gray-300',
          tabActive: 'text-white border-b-2 border-white/60',
          forgotBtn: 'text-gray-500 hover:text-gray-300',
          primaryBtn: 'bg-white hover:bg-gray-200 text-gray-900 disabled:opacity-50',
          divider: 'border-white/8',
          dividerText: 'text-gray-600',
          googleBtn: 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white',
          errorBox: 'text-red-400 bg-red-400/10 border-red-400/20',
          successBox: 'text-green-400 bg-green-400/10 border-green-400/20',
        }
      : {
          label: 'text-gray-600',
          input: 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-400 focus:bg-white',
          tab: 'text-gray-400 hover:text-gray-700',
          tabActive: 'text-gray-900 border-b-2 border-violet-600',
          forgotBtn: 'text-gray-400 hover:text-violet-600',
          primaryBtn: 'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50',
          divider: 'border-gray-100',
          dividerText: 'text-gray-400',
          googleBtn: 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-900',
          errorBox: 'text-red-600 bg-red-50 border-red-200',
          successBox: 'text-green-600 bg-green-50 border-green-200',
        }
    return (
      <div className={`h-screen flex flex-col items-center justify-center ${t.bg}`}>
        <div className={`w-[400px] rounded-2xl border p-6 space-y-5 ${t.card}`}>
          <div className="text-center">
            {inviteInfo?.orgIconUrl ? (
              <img src={inviteInfo.orgIconUrl} alt="" referrerPolicy="no-referrer" className={`w-12 h-12 rounded-xl mx-auto mb-3 object-cover`} />
            ) : (
              <svg className={`w-10 h-10 mx-auto mb-3 ${t.subtitle}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            )}
            {inviteInfo ? (
              <>
                <h2 className={`text-lg font-semibold ${t.title}`}>Join {inviteInfo.orgName}</h2>
                <p className={`text-sm mt-1 ${t.subtitle}`}>
                  {inviteInfo.inviterName ? `${inviteInfo.inviterName} invited you` : 'You\u2019ve been invited'} as {inviteInfo.role === 'admin' ? 'an admin' : 'a member'}.
                </p>
              </>
            ) : (
              <>
                <h2 className={`text-lg font-semibold ${t.title}`}>You&apos;ve been invited</h2>
                <p className={`text-sm mt-1 ${t.subtitle}`}>Sign in or create an account to join the organization.</p>
              </>
            )}
          </div>

          <div className={`flex gap-4 border-b ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
            {(['signin', 'signup'] as const).map((tb) => (
              <button
                key={tb}
                onClick={() => { setAuthTab(tb); setAuthError(''); setResetSent(false); setVerificationSent(false) }}
                className={`pb-2.5 text-sm font-medium transition-colors ${authTab === tb ? at.tabActive : at.tab}`}
              >
                {tb === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {authTab === 'signup' && (
              <div>
                <label className={`block text-xs font-medium mb-1 ${at.label}`}>Name (optional)</label>
                <input type="text" value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Your name"
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${at.input}`} />
              </div>
            )}
            <div>
              <label className={`block text-xs font-medium mb-1 ${at.label}`}>Email</label>
              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com"
                required autoFocus className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${at.input}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${at.label}`}>Password</label>
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                placeholder={authTab === 'signup' ? 'At least 6 characters' : '••••••••'}
                required className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${at.input}`} />
              {authTab === 'signin' && (
                <button type="button" onClick={handleForgotPassword} disabled={resetLoading}
                  className={`text-[11px] mt-1 transition-colors ${at.forgotBtn}`}>
                  {resetLoading ? 'Sending…' : 'Forgot password?'}
                </button>
              )}
            </div>

            {resetSent && <div className={`text-xs rounded-lg border px-3 py-2 ${at.successBox}`}>Password reset email sent. Check your inbox.</div>}
            {verificationSent && <div className={`text-xs rounded-lg border px-3 py-2 ${at.successBox}`}>Verification email sent. Please check your inbox.</div>}
            {authError && <div className={`text-xs rounded-lg border px-3 py-2 ${at.errorBox}`}>{authError}</div>}

            <button type="submit" disabled={authLoading2}
              className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${at.primaryBtn}`}>
              {authLoading2 ? 'Please wait…' : authTab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className={`flex-1 border-t ${at.divider}`} />
            <span className={`text-xs ${at.dividerText}`}>or</span>
            <div className={`flex-1 border-t ${at.divider}`} />
          </div>

          <button onClick={handleGoogle}
            className={`w-full flex items-center justify-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${at.googleBtn}`}>
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <a href="/" className={`block text-center text-[11px] font-medium transition-colors ${t.backBtn}`}>← Back to map</a>
        </div>
      </div>
    )
  }

  if (error || (!org && !noOrg)) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center gap-4 ${t.bg}`}>
        <p className={`text-sm ${t.subtitle}`}>{error || 'Organization not found'}</p>
        <a href="/" className={`text-sm font-medium ${isDark ? 'text-white hover:text-gray-300' : 'text-violet-600 hover:text-violet-700'} transition-colors`}>← Back to map</a>
      </div>
    )
  }

  if (noOrg && userTier === 'enterprise') {
    return (
      <div className={`h-screen flex flex-col items-center justify-center ${t.bg}`}>
        <div className={`w-[420px] rounded-2xl border p-6 space-y-5 ${t.card}`}>
          <div className="text-center">
            <svg className={`w-10 h-10 mx-auto mb-3 ${t.subtitle}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            <h2 className={`text-lg font-semibold ${t.title}`}>Set up your organization</h2>
            <p className={`text-sm mt-1 ${t.subtitle}`}>Create your organization to manage team members and permissions.</p>
          </div>

          <div>
            <label className={`block text-[10px] uppercase tracking-widest font-semibold mb-1.5 ${t.label}`}>Organization name</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Your company name"
              className={`w-full text-[13px] px-3 py-2 rounded-lg border outline-none transition-colors ${t.input}`}
            />
          </div>

          {createError && <p className="text-[11px] text-red-400">{createError}</p>}

          <button
            onClick={handleCreateOrg}
            disabled={createLoading || !createName.trim()}
            className={`w-full text-[12px] font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            {createLoading ? 'Creating…' : 'Create organization'}
          </button>

          <a href="/" className={`block text-center text-[11px] font-medium transition-colors ${t.backBtn}`}>← Back to map</a>
        </div>
      </div>
    )
  }

  if (noOrg) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center gap-4 ${t.bg}`}>
        <p className={`text-sm ${t.subtitle}`}>Organization management requires an Enterprise plan.</p>
        <a href="/" className={`text-sm font-medium ${isDark ? 'text-white hover:text-gray-300' : 'text-violet-600 hover:text-violet-700'} transition-colors`}>← Back to map</a>
      </div>
    )
  }

  if (!org) return null

  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'admin'
  const canManage = isOwner || isAdmin

  const navItems: { key: Section; label: string; ownerOnly?: boolean; adminOnly?: boolean; icon: JSX.Element }[] = [
    { key: 'overview', label: 'Overview', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /> },
    { key: 'members', label: 'Members', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /> },
    { key: 'invitations', label: 'Invitations', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /> },
    { key: 'usage', label: 'Usage', adminOnly: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /> },
    { key: 'connectors', label: 'Connectors', adminOnly: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /> },
    { key: 'support', label: 'Support', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /> },
    { key: 'settings', label: 'Settings', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.528-.738a1.125 1.125 0 0 1 .12-1.45l.774-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></> },
    { key: 'billing', label: 'Billing', ownerOnly: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /> },
  ]

  const pendingInvites = invitations.filter((inv) => inv.status === 'pending')

  const roleBadge = (role: OrgRole) => (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${t.badge[role]}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )

  const statusBadge = (status: Invitation['status']) => (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${t.badge[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )

  return (
    <div className={`h-screen flex flex-col ${t.bg}`}>
      {/* Top bar */}
      <header className={`flex items-center justify-between px-6 py-3 border-b ${t.border} ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <a href="/" className={`flex items-center gap-2 text-sm font-medium transition-colors ${t.backBtn}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to map
        </a>
        <img src="/logo-full.png" alt="Public Data Maps" className={`h-7 w-auto ${isDark ? 'invert' : ''}`} />
        <div className="w-20" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <nav className={`w-[200px] flex-shrink-0 border-r p-3 space-y-0.5 ${t.sidebar}`}>
          <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2">
            {org.iconUrl ? (
              <img src={org.iconUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                <svg className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
            )}
            <p className={`text-[12px] font-semibold truncate ${t.title}`}>{org.name}</p>
          </div>
          <div className={`border-b mb-2 ${t.border}`} />
          {navItems
            .filter((item) => {
              if (item.ownerOnly && !isOwner) return false
              if (item.adminOnly && !canManage) return false
              return true
            })
            .map((item) => (
            <button
              key={item.key}
              onClick={() => navigateToSection(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-2 ${
                section === item.key ? t.navActive : t.nav
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
              {item.label}
              {item.key === 'invitations' && pendingInvites.length > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-gray-300' : 'bg-violet-100 text-violet-600'}`}>
                  {pendingInvites.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {section === 'overview' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className={`text-lg font-semibold ${t.title}`}>{org.name}</h2>
                <p className={`text-sm ${t.subtitle}`}>Organization overview</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => navigateToSection('members')}
                  className={`rounded-xl border p-4 text-left transition-colors ${t.card} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                >
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Members</p>
                  <p className={`text-2xl font-bold mt-1 ${t.title}`}>{members.length}</p>
                  <p className={`text-[11px] ${t.muted}`}>active {members.length === 1 ? 'member' : 'members'}</p>
                </button>
                <button
                  onClick={() => navigateToSection('invitations')}
                  className={`rounded-xl border p-4 text-left transition-colors ${t.card} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                >
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Pending invitations</p>
                  <p className={`text-2xl font-bold mt-1 ${t.title}`}>{pendingInvites.length}</p>
                </button>
                <button
                  onClick={() => navigateToSection('settings')}
                  className={`rounded-xl border p-4 text-left transition-colors ${t.card} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                >
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Auto-join domain</p>
                  <p className={`text-sm font-medium mt-1 ${t.title}`}>{org.domain ?? '—'}</p>
                </button>
                <div className={`rounded-xl border p-4 ${t.card}`}>
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Your role</p>
                  <div className="mt-1">{myRole && roleBadge(myRole)}</div>
                </div>

                {isOwner && (
                  <button
                    onClick={() => navigateToSection('billing')}
                    className={`col-span-2 rounded-xl border p-4 text-left transition-colors ${t.card} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                  >
                    <p className={`text-[10px] uppercase tracking-widest font-semibold mb-1 ${t.label}`}>Billing & seats</p>
                    <p className={`text-2xl font-bold ${t.title}`}>{members.length}</p>
                    <p className={`text-[11px] mt-1 ${t.muted}`}>active seats · click to manage billing</p>
                  </button>
                )}
              </div>
            </div>
          )}

          {section === 'members' && (
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${t.title}`}>Members</h2>
                  <p className={`text-sm ${t.subtitle}`}>{members.length} {members.length === 1 ? 'member' : 'members'}</p>
                </div>
                {canManage && (
                  <button
                    onClick={() => navigateToSection('invitations')}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    + Invite
                  </button>
                )}
              </div>

              <div className={`rounded-xl border overflow-hidden ${t.card}`}>
                {members.map((m, i) => (
                  <div key={m.uid} className={`flex items-center px-4 py-3 ${i > 0 ? `border-t ${t.border}` : ''}`}>
                    {m.photoURL ? (
                      <img src={m.photoURL} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full flex-shrink-0" />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                        {(m.displayName?.[0] ?? m.email?.[0] ?? '?').toUpperCase()}
                      </span>
                    )}
                    <div className="ml-3 min-w-0 flex-1">
                      <p className={`text-[12px] font-medium truncate ${t.title}`}>{m.displayName ?? m.email}</p>
                      <p className={`text-[11px] truncate ${t.muted}`}>{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {roleBadge(m.role)}
                      {isOwner && m.role !== 'owner' && (
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.uid, e.target.value as 'admin' | 'member')}
                          className={`text-[10px] rounded border px-1 py-0.5 outline-none ${t.input}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      )}
                      {canManage && m.role !== 'owner' && !(m.role === 'admin' && !isOwner) && (
                        <button
                          onClick={() => handleRemoveMember(m.uid)}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${t.dangerBtn}`}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'invitations' && (
            <div className="space-y-4 max-w-3xl">
              <h2 className={`text-lg font-semibold ${t.title}`}>Invitations</h2>

              {canManage && (
                <div className={`rounded-xl border p-4 space-y-3 ${t.card}`}>
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Send invitation</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className={`flex-1 text-[12px] px-3 py-1.5 rounded-lg border outline-none transition-colors ${t.input}`}
                    />
                    {isOwner && (
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                        className={`text-[12px] px-2 py-1.5 rounded-lg border outline-none ${t.input}`}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    <button
                      onClick={() => { if (!inviteEmail.trim()) return; setInviteSeatConfirm(true) }}
                      disabled={inviteLoading || !inviteEmail.trim()}
                      className={`text-[11px] font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-violet-600 text-white hover:bg-violet-700'
                      }`}
                    >
                      {inviteLoading ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                  {inviteError && <p className="text-[11px] text-red-400">{inviteError}</p>}
                </div>
              )}

              <div className={`rounded-xl border overflow-hidden ${t.card}`}>
                {invitations.length === 0 ? (
                  <div className={`px-4 py-8 text-center text-[12px] ${t.muted}`}>No invitations yet</div>
                ) : (
                  invitations.map((inv, i) => (
                    <div key={inv.id} className={`flex items-center px-4 py-3 ${i > 0 ? `border-t ${t.border}` : ''}`}>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[12px] font-medium truncate ${t.title}`}>{inv.email}</p>
                        <p className={`text-[10px] ${t.muted}`}>
                          Role: {inv.role} · Sent {new Date(inv.createdAt?._seconds ? inv.createdAt._seconds * 1000 : inv.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {statusBadge(inv.status)}
                        {inv.status === 'pending' && inv.token && canManage && (
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/org?invite=${inv.token}`
                              navigator.clipboard.writeText(link)
                              setCopiedToken(inv.id)
                              setTimeout(() => setCopiedToken(null), 2000)
                            }}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${isDark ? 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                          >
                            {copiedToken === inv.id ? 'Copied!' : 'Copy link'}
                          </button>
                        )}
                        {inv.status === 'pending' && canManage && (
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${t.dangerBtn}`}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {section === 'usage' && (
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${t.title}`}>Usage</h2>
                  <p className={`text-sm ${t.subtitle}`}>Organization activity this month{usageData ? ` (${usageData.month})` : ''}</p>
                </div>
                <button
                  onClick={fetchUsage}
                  disabled={usageLoading}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {usageLoading ? 'Loading…' : 'Refresh'}
                </button>
              </div>

              {usageData && (
                <>
                  <div className={`rounded-xl border overflow-hidden ${t.card}`}>
                    <table className="w-full text-[12px]">
                      <tbody>
                        {[
                          { label: 'Total searches', value: usageData.totalSearches.toLocaleString() },
                          { label: 'AI overviews', value: usageData.totalAiOverviews.toLocaleString() },
                          { label: 'Saved searches', value: usageData.totalSavedSearches.toLocaleString() },
                          { label: 'Custom quick filters', value: usageData.totalCustomQuickFilters.toLocaleString() },
                          { label: 'Org quick filters', value: `${usageData.orgQuickFiltersCount}` },
                          { label: 'Active members', value: `${members.length}` },
                        ].map((row, i) => (
                          <tr key={row.label} className={i > 0 ? `border-t ${t.border}` : ''}>
                            <td className={`px-4 py-2.5 font-medium ${t.muted}`}>{row.label}</td>
                            <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${t.title}`}>{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={`rounded-xl border overflow-hidden ${t.card}`}>
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className={`border-b ${t.border}`}>
                          <th className={`text-left px-4 py-2 text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Member</th>
                          <th className={`text-right px-4 py-2 text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Searches</th>
                          <th className={`text-right px-4 py-2 text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>AI</th>
                          <th className={`text-right px-4 py-2 text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Saved</th>
                          <th className={`text-right px-4 py-2 text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Filters</th>
                          <th className={`text-right px-4 py-2 text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Last active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...usageData.members]
                          .sort((a, b) => b.searchCount - a.searchCount)
                          .map((m, i) => (
                            <tr key={m.uid} className={i > 0 ? `border-t ${t.border}` : ''}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium truncate ${t.title}`}>{m.displayName ?? m.email}</span>
                                  {roleBadge(m.role)}
                                </div>
                              </td>
                              <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${t.title}`}>{m.searchCount.toLocaleString()}</td>
                              <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${t.title}`}>{m.aiOverviewCount.toLocaleString()}</td>
                              <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${t.title}`}>{m.savedSearches}</td>
                              <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${t.title}`}>{m.customQuickFilters}</td>
                              <td className={`px-4 py-2.5 text-right ${t.muted}`}>
                                {m.lastActiveAt ? new Date(m.lastActiveAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {!usageData && usageLoading && (
                <div className={`text-center py-12 text-[12px] ${t.muted}`}>Loading usage data…</div>
              )}
            </div>
          )}

          {section === 'settings' && (
            <div className="space-y-4 max-w-2xl">
              <h2 className={`text-lg font-semibold ${t.title}`}>Organization Settings</h2>

              <div className={`rounded-xl border p-4 space-y-4 ${t.card}`}>
                <div>
                  <label className={`block text-[10px] uppercase tracking-widest font-semibold mb-1.5 ${t.label}`}>Logo</label>
                  <div className="flex items-center gap-3">
                    {org.iconUrl ? (
                      <img src={org.iconUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                    ) : (
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'}`}>
                        <svg className={`w-5 h-5 ${t.muted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                        </svg>
                      </div>
                    )}
                    {canManage && (
                      <div>
                        <label className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border cursor-pointer transition-colors inline-block ${
                          isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        } ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          {logoUploading ? 'Uploading…' : 'Upload logo'}
                          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        <p className={`text-[10px] mt-1 ${t.muted}`}>Square, max 2 MB</p>
                        {logoError && <p className="text-[10px] mt-0.5 text-red-400">{logoError}</p>}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`block text-[10px] uppercase tracking-widest font-semibold mb-1.5 ${t.label}`}>Organization name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={!canManage}
                    className={`w-full text-[12px] px-3 py-1.5 rounded-lg border outline-none transition-colors disabled:opacity-50 ${t.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] uppercase tracking-widest font-semibold mb-1.5 ${t.label}`}>Auto-join domain</label>
                  <input
                    type="text"
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    placeholder="e.g. company.com"
                    disabled={!canManage}
                    className={`w-full text-[12px] px-3 py-1.5 rounded-lg border outline-none transition-colors disabled:opacity-50 ${t.input}`}
                  />
                  <p className={`text-[10px] mt-1 ${t.muted}`}>Users with this email domain can auto-join the organization.</p>
                </div>

                {canManage && (
                  <button
                    onClick={handleSaveSettings}
                    disabled={settingsSaving || (editName === org.name && (editDomain || null) === (org.domain || null))}
                    className={`text-[11px] font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-violet-600 text-white hover:bg-violet-700'
                    }`}
                  >
                    {settingsSaving ? 'Saving…' : 'Save changes'}
                  </button>
                )}
              </div>

              {canManage && (
                <div className={`rounded-xl border p-4 space-y-3 ${t.card}`}>
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Organization quick filters</p>
                  <p className={`text-[11px] ${t.muted}`}>Shared quick filters available to all members in the map panel.</p>

                  {orgFilters.length > 0 && (
                    <div className="space-y-1.5">
                      {orgFilters.map((f) => (
                        <div key={f.id} className={`flex items-center justify-between rounded-lg border px-3 py-1.5 ${isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[11px] font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{f.label}</span>
                            <span className={`text-[10px] ${t.muted}`}>
                              {f.negate ? 'NOT ' : ''}{f.column.length > 20 ? f.column.substring(0, 20) + '…' : f.column} {f.operator}{f.operator !== 'empty' ? ` "${f.value}"` : ''}
                            </span>
                          </div>
                          <button
                            disabled={orgFiltersSaving}
                            onClick={() => handleSaveOrgFilters(orgFilters.filter((x) => x.id !== f.id))}
                            className={`flex-shrink-0 text-[10px] transition-colors disabled:opacity-50 ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {orgFilterForm ? (
                    <div className={`rounded-lg border p-3 space-y-2 ${isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'}`}>
                      <input
                        type="text"
                        value={ofLabel}
                        onChange={(e) => setOfLabel(e.target.value)}
                        placeholder="Label…"
                        className={`w-full text-[12px] px-2.5 py-1.5 rounded-lg border outline-none ${t.input}`}
                      />
                      <select
                        value={ofColumn}
                        onChange={(e) => setOfColumn(e.target.value)}
                        className={`w-full text-[12px] px-2.5 py-1.5 rounded-lg border outline-none ${t.input}`}
                      >
                        <option value="">Select column…</option>
                        {orgFiltersColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setOfNegate(!ofNegate)}
                          className={`text-[10px] font-bold rounded px-2 py-0.5 border transition-colors ${
                            ofNegate
                              ? 'text-orange-400 border-orange-500/50 bg-orange-500/10'
                              : isDark ? 'text-gray-600 border-white/10 hover:text-gray-400' : 'text-gray-400 border-gray-200 hover:text-gray-600'
                          }`}
                        >
                          NOT
                        </button>
                        <select
                          value={ofOperator}
                          onChange={(e) => setOfOperator(e.target.value as 'contains' | 'equals' | 'empty')}
                          className={`text-[12px] px-2 py-1 rounded-lg border outline-none ${t.input}`}
                        >
                          <option value="contains">contains</option>
                          <option value="equals">equals</option>
                          <option value="empty">empty</option>
                        </select>
                      </div>
                      {ofOperator !== 'empty' && (
                        <input
                          type="text"
                          value={ofValue}
                          onChange={(e) => setOfValue(e.target.value)}
                          placeholder="Value…"
                          className={`w-full text-[12px] px-2.5 py-1.5 rounded-lg border outline-none ${t.input}`}
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          disabled={!ofLabel.trim() || !ofColumn || orgFiltersSaving}
                          onClick={() => {
                            const id = 'org_' + Date.now().toString(36)
                            handleSaveOrgFilters([...orgFilters, { id, label: ofLabel.trim(), column: ofColumn, operator: ofOperator, negate: ofNegate, value: ofValue }])
                            setOfLabel('')
                            setOfValue('')
                            setOfNegate(false)
                            setOrgFilterForm(false)
                          }}
                          className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDark ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {orgFiltersSaving ? 'Saving…' : 'Add quick filter'}
                        </button>
                        <button
                          onClick={() => setOrgFilterForm(false)}
                          className={`text-[11px] font-medium ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setOrgFilterForm(true)
                        if (orgFiltersColumns.length > 0 && !ofColumn) setOfColumn(orgFiltersColumns[0])
                      }}
                      className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      + Add quick filter
                    </button>
                  )}
                </div>
              )}

              {isOwner && (
                <div className={`rounded-xl border p-4 space-y-5 ${isDark ? 'border-red-500/20 bg-red-500/5' : 'border-red-200 bg-red-50'}`}>
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>Danger zone</p>

                  <div className="space-y-2">
                    <p className={`text-[11px] font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Transfer ownership</p>
                    <p className={`text-[11px] ${t.muted}`}>Transfer ownership to another member. You will become an admin.</p>
                    <div className="flex flex-wrap gap-2">
                      {members.filter((m) => m.role !== 'owner').map((m) => (
                        <button
                          key={m.uid}
                          onClick={() => setTransferTarget({ uid: m.uid, name: m.displayName ?? m.email })}
                          className={`text-[11px] font-medium px-3 py-1 rounded-lg border transition-colors ${isDark ? 'border-red-500/30 text-gray-300 hover:bg-red-500/10' : 'border-red-200 text-gray-600 hover:bg-red-100'}`}
                        >
                          {m.displayName ?? m.email}
                        </button>
                      ))}
                      {members.filter((m) => m.role !== 'owner').length === 0 && (
                        <p className={`text-[11px] ${t.muted}`}>No other members to transfer to.</p>
                      )}
                    </div>
                  </div>

                  <div className={`border-t pt-4 space-y-2 ${isDark ? 'border-red-500/20' : 'border-red-200'}`}>
                    <p className={`text-[11px] font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Delete organization</p>
                    <p className={`text-[11px] ${t.muted}`}>
                      Deleting an organization is permanent and cannot be undone. All members, connectors, saved searches, and billing data will be removed.
                    </p>
                    <button
                      onClick={() => navigateToSection('support')}
                      className={`text-[11px] font-medium px-4 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-100'}`}
                    >
                      Contact support to delete organization
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {section === 'billing' && isOwner && (
            <div className="space-y-4 max-w-2xl">
              <h2 className={`text-lg font-semibold ${t.title}`}>Billing</h2>

              <div className={`rounded-xl border p-4 space-y-4 ${t.card}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Current plan</p>
                    <p className={`text-sm font-medium mt-1 ${t.title}`}>Enterprise — per seat</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Active seats</p>
                    <p className={`text-sm font-medium mt-1 ${t.title}`}>{members.length}</p>
                  </div>
                </div>

                <p className={`text-[11px] leading-relaxed ${t.muted}`}>
                  Seats are allocated automatically when a member accepts an invitation and released when a member is removed. Charges are prorated.
                </p>

                <button
                  onClick={handleBilling}
                  className={`text-[11px] font-medium px-4 py-1.5 rounded-lg border w-full text-center transition-colors ${
                    isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Manage subscription →
                </button>
                {billingError && (
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>{billingError}</p>
                )}
              </div>

              <div className={`rounded-xl border overflow-hidden ${t.card}`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border}`}>
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Invoices</p>
                  <button
                    onClick={fetchInvoices}
                    disabled={invoicesLoading}
                    className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {invoicesLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                {invoicesLoading && !invoicesLoaded ? (
                  <div className={`px-4 py-8 text-center text-[12px] ${t.muted}`}>Loading invoices…</div>
                ) : invoices.length === 0 ? (
                  <div className={`px-4 py-8 text-center text-[12px] ${t.muted}`}>No invoices yet</div>
                ) : (
                  invoices.map((inv, i) => {
                    const statusColors: Record<string, string> = {
                      paid: isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-700',
                      open: isDark ? 'bg-yellow-500/15 text-yellow-400' : 'bg-yellow-50 text-yellow-700',
                      past_due: isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-700',
                      void: isDark ? 'bg-gray-500/15 text-gray-500' : 'bg-gray-100 text-gray-500',
                      draft: isDark ? 'bg-gray-500/15 text-gray-500' : 'bg-gray-100 text-gray-500',
                    }
                    const statusLabel = inv.status === 'past_due' ? 'Past due' : inv.status ?? '—'
                    const amount = (inv.amountDue / 100).toLocaleString('en-US', { style: 'currency', currency: inv.currency.toUpperCase() })
                    return (
                      <div key={inv.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? `border-t ${t.border}` : ''}`}>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12px] font-medium ${t.title}`}>{inv.number ?? inv.id.slice(-8)}</p>
                          <p className={`text-[10px] ${t.muted}`}>
                            {new Date(inv.periodStart * 1000).toLocaleDateString()} – {new Date(inv.periodEnd * 1000).toLocaleDateString()}
                          </p>
                        </div>
                        <p className={`text-[12px] font-medium ${t.title}`}>{amount}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[inv.status ?? ''] ?? (isDark ? 'bg-gray-500/15 text-gray-500' : 'bg-gray-100 text-gray-500')}`}>
                          {statusLabel}
                        </span>
                        <div className="flex items-center gap-1">
                          {inv.hostedUrl && (
                            <a href={inv.hostedUrl} target="_blank" rel="noreferrer" className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors ${isDark ? 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                              View
                            </a>
                          )}
                          {inv.pdfUrl && (
                            <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors ${isDark ? 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                              PDF
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {section === 'support' && (
            <div className="space-y-4 max-w-3xl">
              <div>
                <h2 className={`text-lg font-semibold ${t.title}`}>Support</h2>
                <p className={`text-sm ${t.subtitle}`}>Get help from our team — premium 24/7 support</p>
              </div>

              <div className={`rounded-xl border p-8 text-center space-y-3 ${t.card}`}>
                <svg className={`w-10 h-10 mx-auto ${t.muted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
                <p className={`text-sm font-medium ${t.title}`}>Coming soon</p>
                <p className={`text-[12px] leading-relaxed max-w-sm mx-auto ${t.muted}`}>
                  This section will display your support conversations with our team, each with a unique ticket ID and full message history.
                </p>
                <a
                  href="mailto:support@publicdatamaps.com"
                  className={`inline-block text-[11px] font-medium px-4 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Contact support via email →
                </a>
              </div>
            </div>
          )}

          {section === 'connectors' && (
            <div className="space-y-4 max-w-3xl">
              <div>
                <h2 className={`text-lg font-semibold ${t.title}`}>Connectors</h2>
                <p className={`text-sm ${t.subtitle}`}>Import your own data to use as a source on the map. Your CSV must include latitude and longitude columns.</p>
              </div>

              {/* Saved connectors */}
              {connectorsLoading && connectors.length === 0 ? (
                <div className={`rounded-xl border p-6 text-center ${t.card}`}>
                  <p className={`text-[12px] ${t.muted}`}>Loading connectors…</p>
                </div>
              ) : connectors.length > 0 && (
                <div className={`rounded-xl border overflow-hidden ${t.card}`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border}`}>
                    <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Your connectors</p>
                    <button
                      onClick={fetchConnectors}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      Refresh
                    </button>
                  </div>
                  {connectors.map((c, i) => (
                    <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? `border-t ${t.border}` : ''}`}>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[12px] font-medium ${t.title}`}>{c.name}</p>
                        <p className={`text-[10px] ${t.muted}`}>
                          {c.rowCount.toLocaleString()} rows{c.skippedCount > 0 && ` · ${c.skippedCount.toLocaleString()} skipped`} · {c.columns.length} columns
                          {c.createdAt && ` · ${new Date(c.createdAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-700'}`}>
                        Active
                      </span>
                      {canManage && (
                      <button
                        onClick={() => setDeleteConnector({ id: c.id, name: c.name })}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors ${isDark ? 'border-white/10 text-red-400 hover:bg-red-500/10' : 'border-gray-200 text-red-500 hover:bg-red-50'}`}
                      >
                        Delete
                      </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canManage && (
              <div className={`rounded-xl border p-4 space-y-4 ${t.card}`}>
                <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Import CSV</p>

                {csvMatchStep === 'upload' && (
                  <div className="space-y-3">
                    <p className={`text-[12px] ${t.muted}`}>Upload a CSV file with latitude and longitude columns. All rows with valid coordinates will be imported as a data source for the map.</p>
                    <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer py-8 transition-colors ${isDark ? 'border-white/10 hover:border-white/20 text-gray-500 hover:text-gray-400' : 'border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-500'}`}>
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/></svg>
                      <span className={`text-[12px] font-medium ${t.title}`}>{csvFile ? csvFile.name : 'Click to upload a CSV file'}</span>
                      <span className={`text-[10px] ${t.muted}`}>Max 10 MB · Max 10,000 rows</span>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          setCsvFile(file)
                          setCsvParsed(null)
                          setCsvLatColumn('')
                          setCsvLonColumn('')
                          setCsvName('')
                          setCsvError(null)
                          if (file) {
                            const defaultName = file.name.replace(/\.csv$/i, '')
                            setCsvName(defaultName)
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              const text = ev.target?.result as string
                              const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
                              if (lines.length < 2) { setCsvError('CSV must have at least one data row.'); return }
                              const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
                              const preview = lines.slice(1, 6).map((line) => {
                                const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
                                const obj: Record<string, string> = {}
                                headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
                                return obj
                              })
                              setCsvParsed({ headers, rows: preview })
                            }
                            reader.readAsText(file)
                          }
                        }}
                      />
                    </label>
                    {csvFile && csvParsed && (
                      <button
                        onClick={() => setCsvMatchStep('map')}
                        className={`w-full text-[11px] font-medium py-2 rounded-lg transition-colors ${isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
                      >
                        Next: Configure connector →
                      </button>
                    )}
                    {csvError && <p className="text-[11px] text-red-400">{csvError}</p>}
                  </div>
                )}

                {csvMatchStep === 'map' && csvParsed && (
                  <div className="space-y-3">
                    <div>
                      <p className={`text-[10px] uppercase tracking-widest font-semibold mb-1.5 ${t.label}`}>Connector name</p>
                      <input
                        value={csvName}
                        onChange={(e) => setCsvName(e.target.value)}
                        placeholder="e.g. My Prospects Q1"
                        className={`w-full text-[12px] px-3 py-1.5 rounded-lg border outline-none ${t.input}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className={`text-[10px] uppercase tracking-widest font-semibold mb-1.5 ${t.label}`}>Latitude column</p>
                        <select
                          value={csvLatColumn}
                          onChange={(e) => setCsvLatColumn(e.target.value)}
                          className={`w-full text-[12px] px-3 py-1.5 rounded-lg border outline-none ${t.input}`}
                        >
                          <option value="">— Select column —</option>
                          {csvParsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className={`text-[10px] uppercase tracking-widest font-semibold mb-1.5 ${t.label}`}>Longitude column</p>
                        <select
                          value={csvLonColumn}
                          onChange={(e) => setCsvLonColumn(e.target.value)}
                          className={`w-full text-[12px] px-3 py-1.5 rounded-lg border outline-none ${t.input}`}
                        >
                          <option value="">— Select column —</option>
                          {csvParsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className={`rounded-lg border overflow-auto ${t.border}`}>
                      <table className="min-w-full text-[11px]">
                        <thead>
                          <tr className={`border-b ${t.border}`}>
                            {csvParsed.headers.map((h) => (
                              <th key={h} className={`px-3 py-2 text-left font-semibold ${t.label} whitespace-nowrap ${h === csvLatColumn || h === csvLonColumn ? (isDark ? 'bg-white/10' : 'bg-violet-50') : ''}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvParsed.rows.map((row, i) => (
                            <tr key={i} className={i > 0 ? `border-t ${t.border}` : ''}>
                              {csvParsed.headers.map((h) => (
                                <td key={h} className={`px-3 py-1.5 ${t.text} whitespace-nowrap ${h === csvLatColumn || h === csvLonColumn ? (isDark ? 'bg-white/5' : 'bg-violet-50/50') : ''}`}>{row[h]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setCsvMatchStep('upload'); setCsvError(null) }}
                        className={`flex-1 text-[11px] font-medium py-2 rounded-lg border transition-colors ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        ← Back
                      </button>
                      <button
                        onClick={async () => {
                          if (!csvLatColumn || !csvLonColumn || !csvFile || !org || !csvName.trim()) return
                          setCsvMatching(true)
                          setCsvError(null)
                          try {
                            const token = await user!.getIdToken()
                            const fd = new FormData()
                            fd.append('file', csvFile)
                            fd.append('orgId', org.id)
                            fd.append('latColumn', csvLatColumn)
                            fd.append('lonColumn', csvLonColumn)
                            fd.append('name', csvName.trim())
                            const res = await fetch('/api/org/connectors/csv', {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                              body: fd,
                            })
                            const data = await res.json()
                            if (!res.ok) { setCsvError(data.error ?? 'Import failed'); return }
                            setCsvResult(data)
                            setCsvMatchStep('result')
                            setConnectors((prev) => [{ ...data, createdAt: new Date().toISOString() }, ...prev])
                          } catch {
                            setCsvError('An error occurred. Please try again.')
                          } finally {
                            setCsvMatching(false)
                          }
                        }}
                        disabled={!csvLatColumn || !csvLonColumn || !csvName.trim() || csvMatching}
                        className={`flex-1 text-[11px] font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
                      >
                        {csvMatching ? 'Importing…' : 'Import connector →'}
                      </button>
                    </div>
                    {csvError && <p className="text-[11px] text-red-400">{csvError}</p>}
                  </div>
                )}

                {csvMatchStep === 'result' && csvResult && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`rounded-lg border p-3 text-center ${t.card}`}>
                        <p className={`text-xl font-bold ${t.title}`}>{csvResult.totalRows.toLocaleString()}</p>
                        <p className={`text-[10px] ${t.muted}`}>Total rows</p>
                      </div>
                      <div className={`rounded-lg border p-3 text-center ${t.card}`}>
                        <p className={`text-xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{csvResult.rowCount.toLocaleString()}</p>
                        <p className={`text-[10px] ${t.muted}`}>Imported</p>
                      </div>
                      <div className={`rounded-lg border p-3 text-center ${t.card}`}>
                        <p className={`text-xl font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>{csvResult.skippedCount.toLocaleString()}</p>
                        <p className={`text-[10px] ${t.muted}`}>Skipped</p>
                      </div>
                    </div>

                    <p className={`text-[12px] ${t.muted}`}>
                      Connector <strong className={t.title}>{csvResult.name}</strong> saved. You can now select it as a data source in the map's pre-search filters.
                    </p>

                    <button
                      onClick={() => { setCsvMatchStep('upload'); setCsvFile(null); setCsvParsed(null); setCsvLatColumn(''); setCsvLonColumn(''); setCsvName(''); setCsvResult(null); setCsvError(null) }}
                      className={`w-full text-[11px] font-medium py-2 rounded-lg border transition-colors ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      Import another file
                    </button>
                  </div>
                )}
              </div>
              )}

              {canManage && (
              <div className={`rounded-xl border p-4 space-y-2 ${t.card} opacity-50`}>
                <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>More connectors — coming soon</p>
                <p className={`text-[12px] ${t.muted}`}>Salesforce · PostgreSQL / MySQL · Google Sheets · REST API webhooks</p>
              </div>
              )}
            </div>
          )}
        </main>
      </div>

      {transferTarget && (
        <ConfirmModal
          isDark={isDark}
          title="Transfer ownership"
          message={`Transfer ownership to ${transferTarget.name}? You will become an admin and will no longer be able to manage billing or transfer ownership.`}
          confirmLabel="Transfer"
          danger
          onConfirm={() => { handleTransfer(transferTarget.uid); setTransferTarget(null) }}
          onCancel={() => setTransferTarget(null)}
        />
      )}

      {inviteSeatConfirm && (
        <ConfirmModal
          isDark={isDark}
          title="Confirm seat purchase"
          message={<>Inviting <strong className={isDark ? 'text-white' : 'text-gray-900'}>{inviteEmail}</strong> will add a new seat when accepted.<br /><br />Cost: <strong className={isDark ? 'text-white' : 'text-gray-900'}>$15/mo</strong> (or <strong className={isDark ? 'text-white' : 'text-gray-900'}>$12/mo</strong> on yearly billing), prorated for the current period.<br /><br />Current seats: <strong className={isDark ? 'text-white' : 'text-gray-900'}>{members.length}</strong> → Total after acceptance: <strong className={isDark ? 'text-white' : 'text-gray-900'}>{members.length + 1}</strong></>}
          confirmLabel="Send invitation"
          onConfirm={() => { setInviteSeatConfirm(false); handleInvite() }}
          onCancel={() => setInviteSeatConfirm(false)}
        />
      )}

      {deleteConnector && (
        <ConfirmModal
          isDark={isDark}
          title="Delete connector"
          message={`Delete connector "${deleteConnector.name}"? This action cannot be undone and all imported rows will be removed.`}
          confirmLabel="Delete"
          danger
          onConfirm={async () => {
            const cid = deleteConnector.id
            setDeleteConnector(null)
            try {
              const token = await user!.getIdToken()
              await fetch('/api/org/connectors', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgId: org!.id, connectorId: cid }),
              })
              setConnectors((prev) => prev.filter((x) => x.id !== cid))
            } catch {}
          }}
          onCancel={() => setDeleteConnector(null)}
        />
      )}
    </div>
  )
}
