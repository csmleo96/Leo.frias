/**
 * Universal email sender — priority order:
 * 1. Resend API  (RESEND_API_KEY configurado)
 * 2. Graph API   (MICROSOFT_CLIENT_ID/SECRET/TENANT_ID + admin consent)
 * 3. SMTP        (SMTP_HOST/USER/PASS — fallback)
 */
import nodemailer from 'nodemailer'

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export type SendResult =
  | { ok: true;  method: string }
  | { ok: false; error: string }

// ── 1. Resend ──────────────────────────────────────────────────────────────────
async function sendViaResend(payload: EmailPayload): Promise<void> {
  const key = process.env.RESEND_API_KEY!
  const toList = Array.isArray(payload.to) ? payload.to : [payload.to]
  const from = payload.from
    ?? (process.env.RESEND_FROM_EMAIL
        ? `CS Cockpit · XTENT <${process.env.RESEND_FROM_EMAIL}>`
        : 'CS Cockpit <onboarding@resend.dev>')

  // Send one-by-one — Resend free tier restricts unverified recipient addresses
  const errors: string[] = []
  for (const to of toList) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: payload.subject, html: payload.html }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      errors.push(`${to}: ${err.message ?? res.status}`)
    }
  }
  if (errors.length === toList.length) {
    throw new Error(`Resend falhou para todos os destinatários: ${errors.join('; ')}`)
  }
}

// ── 2. Microsoft Graph API ─────────────────────────────────────────────────────
async function getGraphToken(): Promise<string> {
  const { MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID } = process.env
  const url = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: MICROSOFT_CLIENT_ID!,
    client_secret: MICROSOFT_CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
  })
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!res.ok) throw new Error(`Graph token ${res.status}`)
  const data = await res.json()
  return data.access_token
}

async function sendViaGraph(payload: EmailPayload): Promise<void> {
  const token = await getGraphToken()
  const sender = process.env.SMTP_USER!
  const toList = Array.isArray(payload.to) ? payload.to : [payload.to]

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${sender}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: payload.subject,
        body: { contentType: 'HTML', content: payload.html },
        toRecipients: toList.map(e => ({ emailAddress: { address: e } })),
      },
      saveToSentItems: false,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph sendMail ${res.status}: ${err.substring(0, 200)}`)
  }
}

// ── 3. SMTP (nodemailer) ───────────────────────────────────────────────────────
async function sendViaSmtp(payload: EmailPayload): Promise<void> {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE } = process.env
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  })
  await transporter.sendMail({
    from: payload.from ?? `"CS Cockpit · XTENT" <${SMTP_USER}>`,
    to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
    subject: payload.subject,
    html: payload.html,
  })
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  const hasResend = !!process.env.RESEND_API_KEY
  const hasGraph  = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_TENANT_ID)
  const hasSmtp   = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

  if (hasResend) {
    try {
      await sendViaResend(payload)
      return { ok: true, method: 'resend' }
    } catch (e: any) {
      console.warn('[email] Resend falhou:', e.message)
    }
  }

  if (hasGraph) {
    try {
      await sendViaGraph(payload)
      return { ok: true, method: 'graph' }
    } catch (e: any) {
      console.warn('[email] Graph API falhou:', e.message)
    }
  }

  if (hasSmtp) {
    try {
      await sendViaSmtp(payload)
      return { ok: true, method: 'smtp' }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  }

  return { ok: false, error: 'Nenhum método de email configurado (RESEND_API_KEY, Graph API ou SMTP).' }
}
