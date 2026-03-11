/**
 * Email sending helper using Resend.
 *
 * Requires RESEND_API_KEY and RESEND_FROM_EMAIL env vars.
 * Falls back gracefully if not configured (logs a warning, doesn't throw).
 */
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Public Data Maps <noreply@publicdatamaps.com>'

export async function sendInviteEmail(
  to: string,
  orgName: string,
  inviterName: string | null,
  role: string,
  acceptUrl: string,
): Promise<boolean> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping invite email to', to)
    return false
  }
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `You've been invited to join ${orgName} on Public Data Maps`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">Join ${escapeHtml(orgName)}</h2>
          <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 8px;">
            ${inviterName ? `<strong>${escapeHtml(inviterName)}</strong> has invited you` : 'You have been invited'} to join <strong>${escapeHtml(orgName)}</strong> as ${article(role)} <strong>${role}</strong> on Public Data Maps.
          </p>
          <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 24px;">
            Click the button below to accept the invitation. This link expires in 7 days.
          </p>
          <a href="${acceptUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Accept invitation
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 24px; line-height: 1.5;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    })
    return true
  } catch (err) {
    console.error('[email] Failed to send invite email:', err)
    return false
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function article(role: string): string {
  return /^[aeiou]/i.test(role) ? 'an' : 'a'
}
