/**
 * Organization helpers for enterprise multi-seat management.
 *
 * Types, permission checks, and Firestore query builders for the
 * organizations/{orgId} collection and its subcollections.
 *
 * Server-side only — imports firebase-admin.
 */
import { getAdminDb } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import crypto from 'crypto'
import { getStripe } from './stripe'

export type OrgRole = 'owner' | 'admin' | 'member'

export interface Organization {
  name: string
  iconUrl: string | null
  domain: string | null
  ownerId: string
  createdAt: FirebaseFirestore.Timestamp
  seatCount: number
  stripeSubscriptionId: string | null
  stripeCustomerId?: string | null
  settings: {
    defaultPresets: string[]
    defaultResultLimit: number | null
  }
}

export interface OrgMember {
  uid: string
  role: OrgRole
  email: string
  displayName: string | null
  photoURL: string | null
  joinedAt: FirebaseFirestore.Timestamp
  invitedBy: string | null
}

export interface OrgInvitation {
  id: string
  email: string
  role: 'admin' | 'member'
  invitedBy: string
  createdAt: FirebaseFirestore.Timestamp
  expiresAt: FirebaseFirestore.Timestamp
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  token: string
}

const INVITE_EXPIRY_DAYS = 7

/** Returns the org document for a given orgId, or null. */
export async function getOrg(orgId: string): Promise<(Organization & { id: string }) | null> {
  const snap = await getAdminDb().collection('organizations').doc(orgId).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() } as Organization & { id: string }
}

/** Returns the caller's membership record in an org, or null. */
export async function getMember(orgId: string, uid: string): Promise<OrgMember | null> {
  const snap = await getAdminDb()
    .collection('organizations').doc(orgId)
    .collection('members').doc(uid)
    .get()
  if (!snap.exists) return null
  return { uid: snap.id, ...snap.data() } as OrgMember
}

/** Lists all members of an org. */
export async function listMembers(orgId: string): Promise<OrgMember[]> {
  const snap = await getAdminDb()
    .collection('organizations').doc(orgId)
    .collection('members')
    .orderBy('joinedAt', 'asc')
    .get()
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as OrgMember)
}

/** Returns the current member count. */
export async function memberCount(orgId: string): Promise<number> {
  const snap = await getAdminDb()
    .collection('organizations').doc(orgId)
    .collection('members')
    .count()
    .get()
  return snap.data().count
}

/** Lists invitations with optional status filter. */
export async function listInvitations(orgId: string, status?: OrgInvitation['status']): Promise<OrgInvitation[]> {
  let q: FirebaseFirestore.Query = getAdminDb()
    .collection('organizations').doc(orgId)
    .collection('invitations')
    .orderBy('createdAt', 'desc')
  if (status) q = q.where('status', '==', status)
  const snap = await q.get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OrgInvitation)
}

/** Creates a new organization and adds the owner as the first member. */
export async function createOrg(
  ownerId: string,
  ownerEmail: string,
  ownerDisplayName: string | null,
  ownerPhotoURL: string | null,
  name: string,
  seatCount: number,
  stripeSubscriptionId: string | null,
): Promise<string> {
  const db = getAdminDb()
  const orgRef = db.collection('organizations').doc()
  const now = FieldValue.serverTimestamp()

  const batch = db.batch()

  batch.set(orgRef, {
    name,
    iconUrl: null,
    domain: null,
    ownerId,
    createdAt: now,
    seatCount,
    stripeSubscriptionId,
    settings: { defaultPresets: [], defaultResultLimit: null },
  })

  batch.set(orgRef.collection('members').doc(ownerId), {
    role: 'owner' as OrgRole,
    email: ownerEmail,
    displayName: ownerDisplayName,
    photoURL: ownerPhotoURL,
    joinedAt: now,
    invitedBy: null,
  })

  batch.update(db.collection('userProfiles').doc(ownerId), {
    orgId: orgRef.id,
    orgRole: 'owner',
    orgName: name,
  })

  await batch.commit()
  return orgRef.id
}

/** Creates an invitation and returns it. */
export async function createInvitation(
  orgId: string,
  email: string,
  role: 'admin' | 'member',
  invitedBy: string,
): Promise<OrgInvitation> {
  const db = getAdminDb()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  const token = crypto.randomBytes(32).toString('hex')

  const ref = db.collection('organizations').doc(orgId).collection('invitations').doc()
  const invitation = {
    email: email.toLowerCase(),
    role,
    invitedBy,
    createdAt: now,
    expiresAt,
    status: 'pending' as const,
    token,
  }
  await ref.set(invitation)
  return { id: ref.id, ...invitation } as unknown as OrgInvitation
}

/** Accepts an invitation by token. Returns orgId on success. */
export async function acceptInvitation(
  token: string,
  uid: string,
  email: string,
  displayName: string | null,
  photoURL: string | null,
): Promise<{ orgId: string; orgName: string; role: OrgRole }> {
  const db = getAdminDb()

  const snap = await db.collectionGroup('invitations')
    .where('token', '==', token)
    .where('status', '==', 'pending')
    .limit(1)
    .get()

  if (snap.empty) throw new Error('Invalid or expired invitation')

  const inviteDoc = snap.docs[0]
  const invite = inviteDoc.data()
  const orgId = inviteDoc.ref.parent.parent!.id

  if (new Date(invite.expiresAt.toDate ? invite.expiresAt.toDate() : invite.expiresAt) < new Date()) {
    await inviteDoc.ref.update({ status: 'expired' })
    throw new Error('Invitation has expired')
  }

  if (invite.email !== email.toLowerCase()) {
    throw new Error('Invitation was sent to a different email address')
  }

  const org = await getOrg(orgId)
  if (!org) throw new Error('Organization not found')

  const batch = db.batch()

  batch.update(inviteDoc.ref, { status: 'accepted' })

  batch.set(
    db.collection('organizations').doc(orgId).collection('members').doc(uid),
    {
      role: invite.role,
      email: email.toLowerCase(),
      displayName,
      photoURL,
      joinedAt: FieldValue.serverTimestamp(),
      invitedBy: invite.invitedBy,
    },
  )

  batch.update(db.collection('userProfiles').doc(uid), {
    orgId,
    orgRole: invite.role,
    orgName: org.name,
  })

  await batch.commit()

  if (org.stripeSubscriptionId) {
    try {
      await incrementOrgSeats(org.stripeSubscriptionId, orgId)
    } catch (err) {
      console.error('[org] Failed to increment Stripe seats:', err)
    }
  }

  return { orgId, orgName: org.name, role: invite.role }
}

/** Auto-join by domain match. Returns orgId on success. */
export async function joinByDomain(
  uid: string,
  email: string,
  displayName: string | null,
  photoURL: string | null,
): Promise<{ orgId: string; orgName: string } | null> {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null

  const db = getAdminDb()
  const snap = await db.collection('organizations')
    .where('domain', '==', domain)
    .limit(1)
    .get()

  if (snap.empty) return null

  const orgDoc = snap.docs[0]
  const org = orgDoc.data() as Organization

  const count = await memberCount(orgDoc.id)
  if (count >= org.seatCount) return null

  const existing = await getMember(orgDoc.id, uid)
  if (existing) return null

  const batch = db.batch()

  batch.set(
    db.collection('organizations').doc(orgDoc.id).collection('members').doc(uid),
    {
      role: 'member' as OrgRole,
      email: email.toLowerCase(),
      displayName,
      photoURL,
      joinedAt: FieldValue.serverTimestamp(),
      invitedBy: null,
    },
  )

  batch.update(db.collection('userProfiles').doc(uid), {
    orgId: orgDoc.id,
    orgRole: 'member',
    orgName: org.name,
  })

  await batch.commit()
  return { orgId: orgDoc.id, orgName: org.name }
}

/** Checks if a role can perform a specific action. */
export function canManageMembers(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin'
}

export function canChangeRoles(role: OrgRole): boolean {
  return role === 'owner'
}

export function canManageBilling(role: OrgRole): boolean {
  return role === 'owner'
}

export function canEditSettings(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin'
}

export function canViewDashboard(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin'
}

/**
 * Increments the Stripe subscription quantity by 1 (new seat) and syncs to org.
 * Called after a member joins. Stripe auto-prorates the charge.
 */
export async function incrementOrgSeats(subscriptionId: string, orgId: string): Promise<void> {
  const stripe = getStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const item = sub.items.data[0]
  if (!item) return
  const newQty = (item.quantity ?? 1) + 1
  await stripe.subscriptionItems.update(item.id, {
    quantity: newQty,
    proration_behavior: 'create_prorations',
  })
  await getAdminDb().collection('organizations').doc(orgId).update({ seatCount: newQty })
}

/**
 * Decrements the Stripe subscription quantity by 1 (removed seat) and syncs to org.
 * Called after a member is removed. Stripe issues a prorated credit.
 */
export async function decrementOrgSeats(subscriptionId: string, orgId: string): Promise<void> {
  const stripe = getStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const item = sub.items.data[0]
  if (!item) return
  const newQty = Math.max(1, (item.quantity ?? 1) - 1)
  await stripe.subscriptionItems.update(item.id, {
    quantity: newQty,
    proration_behavior: 'create_prorations',
  })
  await getAdminDb().collection('organizations').doc(orgId).update({ seatCount: newQty })
}
