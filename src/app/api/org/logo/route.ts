/**
 * POST /api/org/logo — Uploads an organization logo (square, max 2 MB).
 * Body: multipart/form-data with a single "file" field.
 * Returns: { iconUrl: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb, getAdminStorage } from '@/lib/firebase-admin'
import { getMember, canEditSettings } from '@/lib/org'

const MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded
  try {
    decoded = await getAdminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getAdminDb().collection('userProfiles').doc(decoded.uid).get()
  const orgId = profile.data()?.orgId
  if (!orgId) return NextResponse.json({ error: 'Not in an organization' }, { status: 403 })

  const member = await getMember(orgId, decoded.uid)
  if (!member || !canEditSettings(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File must be PNG, JPEG, or WebP' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const filePath = `org-logos/${orgId}.${ext}`

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET
  if (!bucketName) return NextResponse.json({ error: 'Storage not configured (FIREBASE_STORAGE_BUCKET missing)' }, { status: 500 })

  try {
    const bucket = getAdminStorage().bucket(bucketName)
    const gcsFile = bucket.file(filePath)
    await gcsFile.save(buffer, {
      contentType: file.type,
      metadata: { cacheControl: 'public, max-age=31536000' },
    })
    await gcsFile.makePublic()

    const iconUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`
    await getAdminDb().collection('organizations').doc(orgId).update({ iconUrl })
    return NextResponse.json({ iconUrl })
  } catch (err: any) {
    console.error('Logo upload error:', err)
    return NextResponse.json({ error: err?.message ?? 'Storage upload failed' }, { status: 500 })
  }
}
