import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, testSmtpConnection } from '@/lib/email/sender'

export const dynamic = 'force-dynamic'

function buildEmailHtml(data: any): string {
  const { summaryLines, metrics, insights } = data
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const critical = (insights ?? []).filter((i: any) => ['critical', 'high'].includes(i.severity))

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>
body { font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
.card { background: white; border-radius: 12px; padding: 24px; max-width: 680px; margin: 0 auto; }
h1 { color: #0d1a1e; font-size: 22px; margin: 0 0 4px; }
.date { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
.kpi { background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; }
.kpi-val { font-size: 28px; font-weight: 700; color: #0d1a1e; }
.kpi-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: .05em; }
.red { color: #ef4444; } .amber { color: #f59e0b; } .green { color: #10b981; } .blue { color: #3b82f6; }
.section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: .08em; margin: 20px 0 8px; }
.summary-line { font-size: 14px; color: #374151; margin: 8px 0; line-height: 1.6; }
.alert-card { border-left: 4px solid; padding: 10px 12px; border-radius: 0 8px 8px 0; margin: 8px 0; }
.alert-critical { border-color: #ef4444; background: #fef2f2; }
.alert-high { border-color: #f59e0b; background: #fffbeb; }
.alert-title { font-weight: 600; font-size: 13px; color: #111827; }
.alert-desc { font-size: 12px; color: #6b7280; margin-top: 4px; }
.footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
</style></head>
<body>
<div class="card">
  <h1>CS Cockpit — Resumo Executivo</h1>
  <p class="date">${date}</p>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-val blue">${(metrics?.glpiTotal ?? 0) + (metrics?.jiraTotal ?? 0)}</div><div class="kpi-label">Total Chamados</div></div>
    <div class="kpi"><div class="kpi-val ${(metrics?.breached ?? 0) > 0 ? 'red' : 'green'}">${metrics?.breached ?? 0}</div><div class="kpi-label">SLA Vencido</div></div>
    <div class="kpi"><div class="kpi-val ${(metrics?.noOwner ?? 0) > 0 ? 'amber' : 'green'}">${metrics?.noOwner ?? 0}</div><div class="kpi-label">Sem Responsável</div></div>
  </div>
  <div class="section-title">Análise do Dia</div>
  ${(summaryLines ?? []).map((l: string) => `<p class="summary-line">• ${l}</p>`).join('')}
  ${critical.length > 0 ? `<div class="section-title">Alertas Críticos</div>
  ${critical.slice(0, 5).map((i: any) => `<div class="alert-card alert-${i.severity}"><div class="alert-title">${i.title}</div><div class="alert-desc">${i.description}</div></div>`).join('')}` : ''}
  <div class="footer">Gerado automaticamente pelo CS Cockpit · Xtentgroup<br>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}">Acessar plataforma</a></div>
</div>
</body></html>`
}

// POST /api/notifications/email — envia resumo executivo
export async function POST(request: NextRequest) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env
  const TO = process.env.NOTIFICATION_EMAIL_TO ?? SMTP_USER

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return NextResponse.json({
      error: 'Configure SMTP_HOST, SMTP_USER e SMTP_PASS no .env.local para envio de email.',
      setup: {
        SMTP_HOST: 'smtp.office365.com',
        SMTP_PORT: '587',
        SMTP_USER: 'seu-usuario@dominio.com',
        SMTP_PASS: 'senha-de-aplicativo',
        NOTIFICATION_EMAIL_TO: 'destinatário (padrão: SMTP_USER)',
      },
    }, { status: 500 })
  }

  const t0 = Date.now()
  try {
    const data = await request.json().catch(() => ({}))
    const html = buildEmailHtml(data)

    const result = await sendEmail({
      to: TO!,
      subject: `CS Cockpit — Resumo Executivo ${new Date().toLocaleDateString('pt-BR')}`,
      html,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error, duration: result.duration }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      method: result.method,
      to: TO,
      subject: `CS Cockpit — Resumo Executivo ${new Date().toLocaleDateString('pt-BR')}`,
      messageId: 'messageId' in result ? result.messageId : undefined,
      server:    'server'    in result ? result.server    : undefined,
      duration:  result.duration,
      sentAt:    new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, duration: Date.now() - t0 }, { status: 500 })
  }
}

// GET /api/notifications/email — testa conexão SMTP sem enviar email
export async function GET() {
  const result = await testSmtpConnection()
  return NextResponse.json({
    smtp: {
      ok:       result.ok,
      host:     result.host,
      port:     result.port,
      secure:   result.secure,
      user:     result.user,
      duration: result.duration,
      error:    result.error,
    },
    checkedAt: new Date().toISOString(),
  }, { status: result.ok ? 200 : 500 })
}
