/**
 * Universal email sender — priority order:
 * 1. Resend API  (RESEND_API_KEY)
 * 2. Graph API   (MICROSOFT_CLIENT_ID/SECRET/TENANT_ID)
 * 3. SMTP        (SMTP_HOST/USER/PASS)
 */
import nodemailer from 'nodemailer'

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export type SendResult =
  | { ok: true;  method: string; messageId?: string; duration: number; server?: string; attempts?: number }
  | { ok: false; error: string;  method?: string;    duration: number; attempts?: number }

function now() { return Date.now() }

function log(level: 'info' | 'warn' | 'error', tag: string, msg: string, extra?: Record<string, unknown>) {
  const ts = new Date().toISOString()
  const prefix = level === 'info' ? '✔' : level === 'warn' ? '⚠' : '✖'
  console[level === 'info' ? 'log' : level](`[email][${tag}] ${prefix} ${msg}`, extra ?? '')
}

// ── 1. Resend ─────────────────────────────────────────────────────────────────
async function sendViaResend(payload: EmailPayload): Promise<{ messageId?: string }> {
  const key = process.env.RESEND_API_KEY!
  const toList = Array.isArray(payload.to) ? payload.to : [payload.to]
  const from = payload.from
    ?? (process.env.RESEND_FROM_EMAIL
        ? `CS Cockpit · XTENT <${process.env.RESEND_FROM_EMAIL}>`
        : 'CS Cockpit <onboarding@resend.dev>')

  log('info', 'resend', `Enviando para ${toList.join(', ')}`)
  let lastMessageId: string | undefined
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
    } else {
      const data = await res.json().catch(() => ({}))
      lastMessageId = data.id
      log('info', 'resend', `Aceito pelo servidor — id: ${data.id}`)
    }
  }
  if (errors.length === toList.length) {
    throw new Error(`Resend falhou para todos: ${errors.join('; ')}`)
  }
  return { messageId: lastMessageId }
}

// ── 2. Microsoft Graph API ────────────────────────────────────────────────────
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
  if (!res.ok) throw new Error(`Graph token HTTP ${res.status}`)
  const data = await res.json()
  return data.access_token
}

async function sendViaGraph(payload: EmailPayload): Promise<{ messageId?: string }> {
  log('info', 'graph', 'Obtendo token Microsoft Graph')
  const token = await getGraphToken()
  const sender = process.env.SMTP_USER!
  const toList = Array.isArray(payload.to) ? payload.to : [payload.to]
  log('info', 'graph', `Token obtido — enviando para ${toList.join(', ')}`)

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
    throw new Error(`Graph sendMail HTTP ${res.status}: ${err.substring(0, 200)}`)
  }
  log('info', 'graph', 'Servidor Graph respondeu 202 Accepted')
  return {}
}

// ── 3. SMTP (nodemailer) ──────────────────────────────────────────────────────
async function sendViaSmtp(payload: EmailPayload): Promise<{ messageId?: string; server: string }> {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE } = process.env
  const host = SMTP_HOST!
  const port = Number(SMTP_PORT ?? 587)
  const secure = SMTP_SECURE === 'true'

  log('info', 'smtp', `Conectando — host: ${host}:${port} tls: ${secure ? 'SSL/TLS' : 'STARTTLS'}`)

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  })

  log('info', 'smtp', `Autenticando como ${SMTP_USER}`)

  const toList = Array.isArray(payload.to) ? payload.to : [payload.to]
  const info = await transporter.sendMail({
    from: payload.from ?? `"CS Cockpit · XTENT" <${SMTP_USER}>`,
    to: toList.join(', '),
    subject: payload.subject,
    html: payload.html,
  })

  const messageId = info.messageId
  const response  = info.response ?? ''
  log('info', 'smtp', `Servidor respondeu: ${response}`)
  log('info', 'smtp', `Message-ID: ${messageId}`)
  log('info', 'smtp', `Entrega aceita pelo servidor — destinatários: ${toList.join(', ')}`)

  transporter.close()
  return { messageId, server: `${host}:${port}` }
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  const hasResend = !!process.env.RESEND_API_KEY
  const hasGraph  = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_TENANT_ID)
  const hasSmtp   = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  const t0 = now()

  if (hasResend) {
    try {
      const { messageId } = await sendViaResend(payload)
      return { ok: true, method: 'resend', messageId, duration: now() - t0 }
    } catch (e: any) {
      log('warn', 'resend', `Falhou: ${e.message}`)
    }
  }

  if (hasGraph) {
    try {
      const { messageId } = await sendViaGraph(payload)
      return { ok: true, method: 'graph', messageId, duration: now() - t0 }
    } catch (e: any) {
      log('warn', 'graph', `Falhou: ${e.message}`)
    }
  }

  if (hasSmtp) {
    try {
      const { messageId, server } = await sendViaSmtp(payload)
      return { ok: true, method: 'smtp', messageId, server, duration: now() - t0 }
    } catch (e: any) {
      log('error', 'smtp', `Falhou: ${e.message}`)
      return { ok: false, error: e.message, method: 'smtp', duration: now() - t0 }
    }
  }

  return { ok: false, error: 'Nenhum método de email configurado (RESEND_API_KEY, Graph API ou SMTP).', duration: now() - t0 }
}

// ── SMTP connection test (sem enviar email) ───────────────────────────────────
export async function testSmtpConnection(): Promise<{
  ok: boolean
  host: string
  port: number
  secure: boolean
  user: string
  duration: number
  error?: string
}> {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE } = process.env
  const host   = SMTP_HOST ?? ''
  const port   = Number(SMTP_PORT ?? 587)
  const secure = SMTP_SECURE === 'true'
  const t0     = now()

  if (!host || !SMTP_USER || !SMTP_PASS) {
    return { ok: false, host, port, secure, user: SMTP_USER ?? '', duration: now() - t0, error: 'SMTP_HOST, SMTP_USER ou SMTP_PASS não configurados' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
    })
    await transporter.verify()
    transporter.close()
    log('info', 'smtp-test', `✔ SMTP conectado — ${host}:${port}`)
    return { ok: true, host, port, secure, user: SMTP_USER, duration: now() - t0 }
  } catch (e: any) {
    log('error', 'smtp-test', `✖ Falha na conexão: ${e.message}`)
    return { ok: false, host, port, secure, user: SMTP_USER, duration: now() - t0, error: e.message }
  }
}
