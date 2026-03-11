'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import { Button, CardSection, SectionTitle } from '@/components/ui'

type OrgRole = 'owner' | 'admin' | 'member'
type Section = 'overview' | 'members' | 'invitations' | 'settings' | 'billing' | 'usage' | 'connectors'

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
  settings: { defaultPresets: string[]; defaultResultLimit: number | null }
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
  const [section, setSection] = useState<Section>('overview')
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

  const [usageData, setUsageData] = useState<{ month: string; totalSearches: number; totalAiOverviews: number; members: { uid: string; displayName: string | null; email: string; role: OrgRole; searchCount: number; aiOverviewCount: number; lastActiveAt: string | null }[] } | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)

  const [editName, setEditName] = useState('')
  const [editDomain, setEditDomain] = useState('')
  const [settingsSaving, setSettingsSaving] = useState(false)

  const [inviteCostConfirmed, setInviteCostConfirmed] = useState(false)

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invoicesLoaded, setInvoicesLoaded] = useState(false)

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvParsed, setCsvParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null)
  const [csvSiretColumn, setCsvSiretColumn] = useState('')
  const [csvMatchStep, setCsvMatchStep] = useState<'upload' | 'map' | 'result'>('upload')
  const [csvMatching, setCsvMatching] = useState(false)
  const [csvResult, setCsvResult] = useState<{ total: number; matchedCount: number; unmatchedCount: number; matched: Record<string, string>[]; unmatched: string[] } | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)

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
      const me = data.members.find((m: Member) => m.uid === user.uid)
      setMyRole(me?.role ?? null)
    } catch {
      setError('Failed to load organization')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && user) fetchOrg()
    if (!authLoading && !user) {
      setLoading(false)
      setError('Please sign in to access the organization dashboard.')
    }
  }, [user, authLoading, fetchOrg])

  useEffect(() => {
    if (!user || authLoading) return
    const params = new URLSearchParams(window.location.search)
    const inviteToken = params.get('invite')
    if (!inviteToken) return
    window.history.replaceState({}, '', '/org')
    ;(async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch('/api/org/invite/accept', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken }),
        })
        if (res.ok) {
          setNoOrg(false)
          fetchOrg()
        } else {
          const data = await res.json().catch(() => ({ error: 'Failed to accept invitation' }))
          setError(data.error)
        }
      } catch {
        setError('Failed to accept invitation')
      }
    })()
  }, [user, authLoading, fetchOrg])

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
    try {
      const headers = await authHeader()
      const res = await fetch('/api/org/billing', { method: 'POST', headers })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {}
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
    finally { setUsageLoading(false) }
  }, [user, org])

  useEffect(() => {
    if (section === 'usage' && !usageData && !usageLoading) fetchUsage()
  }, [section, usageData, usageLoading, fetchUsage])

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

  if (loading || authLoading) {
    return (
      <div className={`h-screen flex items-center justify-center ${t.bg}`}>
        <div className={`text-sm ${t.subtitle}`}>Loading…</div>
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

  const navItems: { key: Section; label: string; ownerOnly?: boolean }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'members', label: 'Members' },
    { key: 'invitations', label: 'Invitations' },
    { key: 'usage', label: 'Usage' },
    { key: 'connectors', label: 'Connectors' },
    { key: 'settings', label: 'Settings' },
    { key: 'billing', label: 'Billing', ownerOnly: true },
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
            .filter((item) => !item.ownerOnly || isOwner)
            .map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                section === item.key ? t.navActive : t.nav
              }`}
            >
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
                  onClick={() => setSection('members')}
                  className={`rounded-xl border p-4 text-left transition-colors ${t.card} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                >
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Members</p>
                  <p className={`text-2xl font-bold mt-1 ${t.title}`}>{members.length}</p>
                  <p className={`text-[11px] ${t.muted}`}>active {members.length === 1 ? 'member' : 'members'}</p>
                </button>
                <button
                  onClick={() => setSection('invitations')}
                  className={`rounded-xl border p-4 text-left transition-colors ${t.card} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                >
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Pending invitations</p>
                  <p className={`text-2xl font-bold mt-1 ${t.title}`}>{pendingInvites.length}</p>
                </button>
                <button
                  onClick={() => setSection('settings')}
                  className={`rounded-xl border p-4 text-left transition-colors ${t.card} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                >
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Auto-join domain</p>
                  <p className={`text-sm font-medium mt-1 ${t.title}`}>{org.domain ?? '—'}</p>
                </button>
                <div className={`rounded-xl border p-4 ${t.card}`}>
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Your role</p>
                  <div className="mt-1">{myRole && roleBadge(myRole)}</div>
                </div>
              </div>

              {isOwner && (
                <button
                  onClick={() => setSection('billing')}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${t.card} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                >
                  <p className={`text-[10px] uppercase tracking-widest font-semibold mb-1 ${t.label}`}>Billing & seats</p>
                  <p className={`text-2xl font-bold ${t.title}`}>{members.length}</p>
                  <p className={`text-[11px] mt-1 ${t.muted}`}>active seats · click to manage billing</p>
                </button>
              )}
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
                    onClick={() => setSection('invitations')}
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
                      onClick={handleInvite}
                      disabled={inviteLoading || !inviteEmail.trim() || !inviteCostConfirmed}
                      className={`text-[11px] font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-violet-600 text-white hover:bg-violet-700'
                      }`}
                    >
                      {inviteLoading ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inviteCostConfirmed}
                      onChange={(e) => setInviteCostConfirmed(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded accent-violet-600"
                    />
                    <span className={`text-[11px] leading-relaxed ${t.muted}`}>
                      I understand that when this invitation is accepted, a new seat will be added at <strong className={t.title}>$15/mo</strong> (or <strong className={t.title}>$12/mo</strong> on yearly billing), prorated for the current period.
                    </span>
                  </label>
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
                  <p className={`text-sm ${t.subtitle}`}>Member activity this month{usageData ? ` (${usageData.month})` : ''}</p>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`rounded-xl border p-4 ${t.card}`}>
                      <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Total searches</p>
                      <p className={`text-2xl font-bold mt-1 ${t.title}`}>{usageData.totalSearches.toLocaleString()}</p>
                    </div>
                    <div className={`rounded-xl border p-4 ${t.card}`}>
                      <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>AI overviews</p>
                      <p className={`text-2xl font-bold mt-1 ${t.title}`}>{usageData.totalAiOverviews.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className={`rounded-xl border overflow-hidden ${t.card}`}>
                    <div className={`grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 border-b ${t.border}`}>
                      <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Member</p>
                      <p className={`text-[10px] uppercase tracking-widest font-semibold text-right ${t.label}`}>Searches</p>
                      <p className={`text-[10px] uppercase tracking-widest font-semibold text-right ${t.label}`}>AI</p>
                    </div>
                    {[...usageData.members]
                      .sort((a, b) => b.searchCount - a.searchCount)
                      .map((m, i) => {
                        const maxSearches = Math.max(1, ...usageData.members.map((mm) => mm.searchCount))
                        return (
                          <div key={m.uid} className={`grid grid-cols-[1fr_80px_80px] gap-2 items-center px-4 py-2.5 ${i > 0 ? `border-t ${t.border}` : ''}`}>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-[12px] font-medium truncate ${t.title}`}>{m.displayName ?? m.email}</p>
                                {roleBadge(m.role)}
                              </div>
                              <div className={`h-1 rounded-full mt-1.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                <div
                                  className={`h-full rounded-full ${isDark ? 'bg-white/20' : 'bg-violet-400'}`}
                                  style={{ width: `${(m.searchCount / maxSearches) * 100}%` }}
                                />
                              </div>
                            </div>
                            <p className={`text-[12px] font-medium text-right tabular-nums ${t.title}`}>{m.searchCount.toLocaleString()}</p>
                            <p className={`text-[12px] font-medium text-right tabular-nums ${t.title}`}>{m.aiOverviewCount.toLocaleString()}</p>
                          </div>
                        )
                      })}
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

              {isOwner && (
                <>
                  <div className={`rounded-xl border p-4 space-y-3 ${t.card}`}>
                    <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>Transfer ownership</p>
                    <p className={`text-[11px] ${t.muted}`}>Transfer ownership to another member. You will become an admin.</p>
                    <div className="flex flex-wrap gap-2">
                      {members.filter((m) => m.role !== 'owner').map((m) => (
                        <button
                          key={m.uid}
                          onClick={() => {
                            if (confirm(`Transfer ownership to ${m.displayName ?? m.email}? You will become an admin.`)) {
                              handleTransfer(m.uid)
                            }
                          }}
                          className={`text-[11px] font-medium px-3 py-1 rounded-lg border transition-colors ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {m.displayName ?? m.email}
                        </button>
                      ))}
                      {members.filter((m) => m.role !== 'owner').length === 0 && (
                        <p className={`text-[11px] ${t.muted}`}>No other members to transfer to.</p>
                      )}
                    </div>
                  </div>
                </>
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

          {section === 'connectors' && (
            <div className="space-y-4 max-w-3xl">
              <div>
                <h2 className={`text-lg font-semibold ${t.title}`}>Connectors</h2>
                <p className={`text-sm ${t.subtitle}`}>Enrich your data by matching it against the SIRENE database.</p>
              </div>

              {/* CSV Matcher */}
              <div className={`rounded-xl border p-4 space-y-4 ${t.card}`}>
                <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>CSV SIRENE Matcher</p>

                {csvMatchStep === 'upload' && (
                  <div className="space-y-3">
                    <p className={`text-[12px] ${t.muted}`}>Upload a CSV file containing SIRET numbers. We'll match each row against the national SIRENE database and return enriched company data.</p>
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
                          setCsvSiretColumn('')
                          setCsvError(null)
                          if (file) {
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
                        Next: Map columns →
                      </button>
                    )}
                    {csvError && <p className="text-[11px] text-red-400">{csvError}</p>}
                  </div>
                )}

                {csvMatchStep === 'map' && csvParsed && (
                  <div className="space-y-3">
                    <div>
                      <p className={`text-[10px] uppercase tracking-widest font-semibold mb-1.5 ${t.label}`}>SIRET column</p>
                      <select
                        value={csvSiretColumn}
                        onChange={(e) => setCsvSiretColumn(e.target.value)}
                        className={`w-full text-[12px] px-3 py-1.5 rounded-lg border outline-none ${t.input}`}
                      >
                        <option value="">— Select column —</option>
                        {csvParsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <p className={`text-[10px] mt-1 ${t.muted}`}>Which column contains 14-digit SIRET numbers?</p>
                    </div>

                    <div className={`rounded-lg border overflow-auto ${t.border}`}>
                      <table className="min-w-full text-[11px]">
                        <thead>
                          <tr className={`border-b ${t.border}`}>
                            {csvParsed.headers.map((h) => (
                              <th key={h} className={`px-3 py-2 text-left font-semibold ${t.label} whitespace-nowrap ${h === csvSiretColumn ? (isDark ? 'bg-white/10' : 'bg-violet-50') : ''}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvParsed.rows.map((row, i) => (
                            <tr key={i} className={i > 0 ? `border-t ${t.border}` : ''}>
                              {csvParsed.headers.map((h) => (
                                <td key={h} className={`px-3 py-1.5 ${t.text} whitespace-nowrap ${h === csvSiretColumn ? (isDark ? 'bg-white/5' : 'bg-violet-50/50') : ''}`}>{row[h]}</td>
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
                          if (!csvSiretColumn || !csvFile || !org) return
                          setCsvMatching(true)
                          setCsvError(null)
                          try {
                            const token = await user!.getIdToken()
                            const fd = new FormData()
                            fd.append('file', csvFile)
                            fd.append('orgId', org.id)
                            fd.append('siretColumn', csvSiretColumn)
                            const res = await fetch('/api/org/connectors/csv', {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                              body: fd,
                            })
                            const data = await res.json()
                            if (!res.ok) { setCsvError(data.error ?? 'Match failed'); return }
                            setCsvResult(data)
                            setCsvMatchStep('result')
                          } catch {
                            setCsvError('An error occurred. Please try again.')
                          } finally {
                            setCsvMatching(false)
                          }
                        }}
                        disabled={!csvSiretColumn || csvMatching}
                        className={`flex-1 text-[11px] font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
                      >
                        {csvMatching ? 'Matching…' : 'Run match →'}
                      </button>
                    </div>
                    {csvError && <p className="text-[11px] text-red-400">{csvError}</p>}
                  </div>
                )}

                {csvMatchStep === 'result' && csvResult && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`rounded-lg border p-3 text-center ${t.card}`}>
                        <p className={`text-xl font-bold ${t.title}`}>{csvResult.total.toLocaleString()}</p>
                        <p className={`text-[10px] ${t.muted}`}>Total rows</p>
                      </div>
                      <div className={`rounded-lg border p-3 text-center ${t.card}`}>
                        <p className={`text-xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{csvResult.matchedCount.toLocaleString()}</p>
                        <p className={`text-[10px] ${t.muted}`}>Matched</p>
                      </div>
                      <div className={`rounded-lg border p-3 text-center ${t.card}`}>
                        <p className={`text-xl font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>{csvResult.unmatchedCount.toLocaleString()}</p>
                        <p className={`text-[10px] ${t.muted}`}>Unmatched</p>
                      </div>
                    </div>

                    {csvResult.matched.length > 0 && (
                      <button
                        onClick={() => {
                          const headers = Object.keys(csvResult.matched[0])
                          const csv = [headers.join(','), ...csvResult.matched.map((r) => headers.map((h) => `"${(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
                          const blob = new Blob([csv], { type: 'text/csv' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.download = 'enriched.csv'; a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className={`w-full text-[11px] font-medium py-2 rounded-lg transition-colors ${isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
                      >
                        Download enriched CSV ({csvResult.matchedCount.toLocaleString()} rows)
                      </button>
                    )}

                    <button
                      onClick={() => { setCsvMatchStep('upload'); setCsvFile(null); setCsvParsed(null); setCsvSiretColumn(''); setCsvResult(null); setCsvError(null) }}
                      className={`w-full text-[11px] font-medium py-2 rounded-lg border transition-colors ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      Match another file
                    </button>
                  </div>
                )}
              </div>

              {/* Coming soon */}
              <div className={`rounded-xl border p-4 space-y-2 ${t.card} opacity-50`}>
                <p className={`text-[10px] uppercase tracking-widest font-semibold ${t.label}`}>More connectors — coming soon</p>
                <p className={`text-[12px] ${t.muted}`}>Salesforce · PostgreSQL / MySQL · Google Sheets · REST API webhooks</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
