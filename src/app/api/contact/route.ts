import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Public Data Maps <onboarding@resend.dev>'
const TO = 'wintgensromain@gmail.com'

interface ContactBody {
  name: string
  email: string
  topic: string
  message: string
}

/** Receives contact form submissions and forwards them via Resend. */
export async function POST(req: Request) {
  let body: ContactBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, email, topic, message } = body
  if (!name || !email || !topic || !message) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (typeof name !== 'string' || typeof email !== 'string' || typeof topic !== 'string' || typeof message !== 'string') {
    return NextResponse.json({ error: 'Invalid field types' }, { status: 400 })
  }

  if (name.length > 200 || email.length > 200 || topic.length > 200 || message.length > 5000) {
    return NextResponse.json({ error: 'Field too long' }, { status: 400 })
  }

  if (!resend) {
    console.warn('[contact] RESEND_API_KEY not set — cannot send contact form email')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `[Contact] ${topic} — ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px 0;">
          <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 16px;">New contact form submission</h2>
          <table style="font-size: 14px; color: #333; line-height: 1.6; border-collapse: collapse;">
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 600; vertical-align: top;">Name</td><td style="padding: 4px 0;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 600; vertical-align: top;">Email</td><td style="padding: 4px 0;">${escapeHtml(email)}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 600; vertical-align: top;">Topic</td><td style="padding: 4px 0;">${escapeHtml(topic)}</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px; font-size: 14px; color: #333; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</div>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[contact] Failed to send email:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
