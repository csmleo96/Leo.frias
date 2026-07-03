import { NextResponse } from 'next/server'
import { testSmtpConnection, sendEmail } from '@/lib/email/sender'

export const dynamic = 'force-dynamic'

// GET /api/vault/smtp-health — status da conexão SMTP
export async function GET() {
  const smtpResult = await testSmtpConnection()

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_SECURE, RESEND_API_KEY, MICROSOFT_CLIENT_ID } = process.env
  const activeMethod = RESEND_API_KEY ? 'resend' : (MICROSOFT_CLIENT_ID ? 'graph' : (SMTP_HOST ? 'smtp' : 'none'))

  return NextResponse.json({
    status:       smtpResult.ok ? 'ok' : 'error',
    activeMethod,
    smtp: {
      configured: !!(SMTP_HOST && SMTP_USER),
      connected:  smtpResult.ok,
      host:       SMTP_HOST ?? null,
      port:       Number(SMTP_PORT ?? 587),
      secure:     SMTP_SECURE === 'true',
      user:       SMTP_USER ?? null,
      latencyMs:  smtpResult.duration,
      error:      smtpResult.error ?? null,
    },
    resend:    { configured: !!RESEND_API_KEY },
    graph:     { configured: !!MICROSOFT_CLIENT_ID },
    checkedAt: new Date().toISOString(),
  }, { status: smtpResult.ok ? 200 : 500 })
}

// POST /api/vault/smtp-health — envia email de teste
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const to   = body.to ?? process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER

  if (!to) {
    return NextResponse.json({ error: 'Informe o destinatário em body.to ou configure NOTIFICATION_EMAIL_TO' }, { status: 400 })
  }

  const sentAt = new Date()
  const subject = `[SMTP TEST] CS Cockpit — ${sentAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;padding:24px">
<div style="background:#fff;border-radius:12px;padding:24px;max-width:520px;margin:0 auto;border:1px solid #e5e7eb">
  <h2 style="margin:0 0 8px;color:#0a1316;font-size:18px">Teste de envio SMTP</h2>
  <p style="color:#6b7280;font-size:13px;margin:0 0 20px">${sentAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <tr><td style="padding:8px 0;color:#9ca3af;width:140px">Servidor SMTP</td><td style="padding:8px 0;color:#111827;font-weight:600">${process.env.SMTP_HOST ?? '—'}:${process.env.SMTP_PORT ?? 587}</td></tr>
    <tr><td style="padding:8px 0;color:#9ca3af">Usuário</td><td style="padding:8px 0;color:#111827;font-weight:600">${process.env.SMTP_USER ?? '—'}</td></tr>
    <tr><td style="padding:8px 0;color:#9ca3af">Destinatário</td><td style="padding:8px 0;color:#111827;font-weight:600">${to}</td></tr>
    <tr><td style="padding:8px 0;color:#9ca3af">Assunto</td><td style="padding:8px 0;color:#111827;font-weight:600">${subject}</td></tr>
    <tr><td style="padding:8px 0;color:#9ca3af">Enviado em</td><td style="padding:8px 0;color:#111827;font-weight:600">${sentAt.toISOString()}</td></tr>
  </table>
  <div style="margin-top:20px;padding:12px 16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0">
    <p style="margin:0;color:#16a34a;font-size:13px;font-weight:600">Se você recebeu este email, o SMTP está funcionando corretamente.</p>
  </div>
  <p style="margin-top:20px;color:#9ca3af;font-size:11px;text-align:center">CS Cockpit · XTENTGROUP · Teste automático</p>
</div>
</body></html>`

  const result = await sendEmail({ to, subject, html })

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      to,
      error:    result.error,
      duration: result.duration,
      testedAt: sentAt.toISOString(),
    }, { status: 500 })
  }

  return NextResponse.json({
    ok:        true,
    method:    result.method,
    to,
    subject,
    messageId: 'messageId' in result ? result.messageId : undefined,
    server:    'server'    in result ? result.server    : undefined,
    duration:  result.duration,
    testedAt:  sentAt.toISOString(),
    smtpLog: [
      `✔ SMTP conectado — ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587}`,
      `✔ Autenticado como ${process.env.SMTP_USER}`,
      `✔ Email enviado para ${to}`,
      ...('messageId' in result && result.messageId ? [`✔ Message-ID: ${result.messageId}`] : []),
      `✔ Servidor respondeu 250 OK`,
      `✔ Entrega aceita — tempo: ${result.duration}ms`,
    ],
  })
}
