/**
 * Firebase Admin SDK singleton.
 *
 * Uses Application Default Credentials (ADC) with an explicit projectId
 * sourced from GCP_PROJECT_ID (set in .env.local / apphosting.yaml).
 *
 * Without the explicit projectId, verifyIdToken() fails locally because
 * the Admin SDK cannot determine which Firebase project issued the token.
 *
 * Imported only in server-side code (API routes). Never imported from client components.
 */
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp({ projectId: process.env.GCP_PROJECT_ID })
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}
