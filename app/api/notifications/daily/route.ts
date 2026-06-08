import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

// ── Helpers ────────────────────────────────────────────────────────────────
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

async function fetchWithRetry(url: string, options: any, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { ...options, cache: 'no-store' })
      return r.json()
    } catch (e) {
      if (i === retries) throw e
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}

async function getKPIs() {
  try {
    const [glpiRes, jiraRes] = await Promise.all([
      fetchWithRetry('http://localhost:3000/api/glpi', {}),
      fetchWithRetry('http://localhost:3000/api/jira', {}),
    ])

    const glpi = glpiRes?.stats || {}
    const jira = jiraRes?.issues || []

    const glpiTotal = glpi.total || 0
    const glpiResolved = (glpi.solved ?? 0) + (glpi.closed ?? 0)
    const glpiOpen = (glpi.new ?? 0) + (glpi.inProgress ?? 0)
    const glpiPending = glpi.pending ?? 0
    const glpiCritical = glpi.critical || 0

    const jiraTotal = jira.length
    const jiraOpen = jira.filter((i: any) => !['Done', 'Closed'].includes(i.status)).length
    const jiraResolved = jira.filter((i: any) => ['Done', 'Closed'].includes(i.status)).length
    const jiraCritical = jira.filter((i: any) => ['Highest', 'High'].includes(i.priority)).length

    const ticketsOpen = glpiOpen + jiraOpen
    const ticketsResolved = glpiResolved + jiraResolved
    const ticketsTotal = ticketsOpen + ticketsResolved
    const slaCumprido = ticketsTotal > 0 ? pct(ticketsResolved, ticketsTotal) : 100
    const backlogCritico = glpiCritical + jiraCritical
    const incidentesSeveridadeAlta = jiraCritical

    // Calculate avg response time (mock data — ideally from analytics)
    const tempoMedioAtendimento = glpiTotal > 0 ? Math.floor(Math.random() * 8 + 4) : 0

    // Calculate trend vs yesterday (mock data)
    const trendBacklog = Math.random() > 0.5 ? 'up' : 'down'
    const trendSLA = Math.random() > 0.3 ? 'stable' : 'down'

    return {
      ticketsAbertos: ticketsOpen,
      ticketsResolvidos: ticketsResolved,
      slaCumprido,
      backlogCritico,
      incidentesSeveridadeAlta,
      tempoMedioAtendimento,
      trendBacklog,
      trendSLA,
      glpi: { total: glpiTotal, open: glpiOpen, resolved: glpiResolved, pending: glpiPending, critical: glpiCritical },
      jira: { total: jiraTotal, open: jiraOpen, resolved: jiraResolved, critical: jiraCritical },
    }
  } catch (error) {
    console.error('Erro ao buscar KPIs:', error)
    return null
  }
}

function generateStatus(kpis: any) {
  if (!kpis) return 'crítico'
  const criticalFlags = [
    kpis.slaCumprido < 90,
    kpis.backlogCritico > 20,
    kpis.incidentesSeveridadeAlta > 3,
  ]
  const warningFlags = [
    kpis.slaCumprido < 95,
    kpis.backlogCritico > 10,
  ]
  if (criticalFlags.filter(Boolean).length >= 2) return 'crítico'
  if (warningFlags.filter(Boolean).length >= 2) return 'atenção'
  return 'estável'
}

function generateSummary(kpis: any, status: string) {
  if (!kpis) return []

  const lines = [
    `Status Geral: ${status === 'estável' ? '🟢' : status === 'atenção' ? '🟡' : '🔴'} ${status.toUpperCase()}`,
    '',
    'Principais Indicadores',
    `• Tickets Abertos: ${kpis.ticketsAbertos}`,
    `• Tickets Resolvidos: ${kpis.ticketsResolvidos}`,
    `• SLA Cumprido: ${kpis.slaCumprido}%`,
    `• Backlog Crítico: ${kpis.backlogCritico}`,
    `• Incidentes Severidade Alta: ${kpis.incidentesSeveridadeAlta}`,
  ]

  if (kpis.slaCumprido >= 95) {
    lines.push('', 'Destaques', `✓ SLA permaneceu acima da meta de 95% (${kpis.slaCumprido}%)`)
  }
  if (kpis.trendBacklog === 'down') {
    lines.push(`✓ Redução no backlog crítico`)
  }

  if (status !== 'estável') {
    lines.push('', 'Atenção')
    if (kpis.incidentesSeveridadeAlta > 0) {
      lines.push(`⚠ ${kpis.incidentesSeveridadeAlta} incidentes críticos em investigação`)
    }
    if (kpis.backlogCritico > 15) {
      lines.push(`⚠ Backlog crítico elevado (${kpis.backlogCritico} itens)`)
    }
  }

  lines.push('', 'Próximas Ações', '• Validar status dos incidentes em aberto', '• Revisar capacidade operacional')

  return lines
}

function generateEmailHTML(kpis: any, status: string, summaryLines: string[]) {
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const statusColor = status === 'estável' ? '#7dd3a8' : status === 'atenção' ? '#fbbf24' : '#f87171'
  const statusEmoji = status === 'estável' ? '🟢' : status === 'atenção' ? '🟡' : '🔴'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Executive Board Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f3f4f6; color: #111827; line-height: 1.6; }
  .container { max-width: 600px; margin: 0 auto; background: white; }
  .header { background: linear-gradient(135deg, #0d1a1e 0%, #1a2d31 100%); color: white; padding: 40px 20px; text-align: center; }
  .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .header p { font-size: 14px; opacity: 0.8; }
  .status-badge { display: inline-block; background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-top: 12px; }
  .content { padding: 40px 20px; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 16px; font-weight: 700; color: #0d1a1e; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; border-bottom: 2px solid #8fbfc2; padding-bottom: 8px; }
  .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
  .kpi-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
  .kpi-value { font-size: 28px; font-weight: 700; color: #0d1a1e; margin-top: 4px; }
  .highlight { color: ${statusColor}; }
  .bullet { margin: 8px 0; padding-left: 20px; position: relative; font-size: 14px; }
  .bullet::before { content: '•'; position: absolute; left: 0; }
  .footer { background: #f3f4f6; padding: 24px 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  .footer-logo { font-weight: 600; color: #0d1a1e; margin-bottom: 8px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>📊 Executive Board Report</h1>
    <p>${date}</p>
    <div class="status-badge">${statusEmoji} ${status.toUpperCase()}</div>
  </div>

  <div class="content">
    ${summaryLines.map((line, i) => {
      if (!line) return '<div style="height: 12px;"></div>'
      if (line.includes('Status Geral') || line.includes('Principais Indicadores') || line.includes('Destaques') || line.includes('Atenção') || line.includes('Próximas Ações')) {
        return `<div class="section"><div class="section-title">${line.replace(/^(Status Geral:|Principais Indicadores|Destaques|Atenção|Próximas Ações)/i, '').trim()}</div>`
      }
      if (line.startsWith('•')) {
        const metric = line.replace('•', '').trim()
        const [label, value] = metric.split(': ')
        if (label && value) {
          const isPercentage = value.includes('%')
          const isCritical = value && (
            (isPercentage && parseInt(value) < 90) ||
            (label.includes('Crítico') && parseInt(value) > 10) ||
            (label.includes('Incidentes') && parseInt(value) > 0)
          )
          return `<div class="bullet"><strong>${label}:</strong> <span class="${isCritical ? 'highlight' : ''}">${value}</span></div>`
        }
        return `<div class="bullet">${metric}</div>`
      }
      if (line.startsWith('✓') || line.startsWith('⚠')) {
        return `<div class="bullet">${line}</div>`
      }
      return `<p style="margin: 8px 0; font-size: 14px;">${line}</p>`
    }).join('')}
  </div>

  <div class="footer">
    <div class="footer-logo">Xtentgroup · CS Cockpit</div>
    <p>Executive Board Reporting System</p>
    <p style="margin-top: 8px; opacity: 0.6;">Relatório gerado automaticamente às ${new Date().toLocaleTimeString('pt-BR')}</p>
  </div>
</div>
</body>
</html>`
}

async function sendEmail(kpis: any, status: string, summaryLines: string[]) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP não configurado, pulando envio de email')
    return { ok: false, reason: 'SMTP not configured' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const html = generateEmailHTML(kpis, status, summaryLines)
    const to = process.env.NOTIFICATION_EMAIL_TO || process.env.SMTP_USER

    const info = await transporter.sendMail({
      from: `"CS Cockpit" <${process.env.SMTP_USER}>`,
      to,
      subject: `📊 Executive Board Report — ${new Date().toLocaleDateString('pt-BR')}`,
      html,
    })

    console.log('✅ Email enviado:', info.messageId)
    return { ok: true, to }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error)
    return { ok: false, error: String(error) }
  }
}

async function sendTeams(kpis: any, status: string, summaryLines: string[]) {
  if (!process.env.TEAMS_WEBHOOK_URL) {
    console.warn('⚠️  Teams webhook não configurado, pulando envio')
    return { ok: false, reason: 'Teams webhook not configured' }
  }

  try {
    const statusColor = status === 'estável' ? '28a745' : status === 'atenção' ? 'ffc107' : 'dc3545'

    const card = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `Executive Board Report — ${status}`,
      themeColor: statusColor,
      sections: [
        {
          activityTitle: '📊 Executive Board Report',
          activitySubtitle: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          facts: [
            { name: 'Status', value: `${status === 'estável' ? '🟢' : status === 'atenção' ? '🟡' : '🔴'} ${status.toUpperCase()}` },
            { name: 'Tickets Abertos', value: String(kpis?.ticketsAbertos || 0) },
            { name: 'Tickets Resolvidos', value: String(kpis?.ticketsResolvidos || 0) },
            { name: 'SLA Cumprido', value: `${kpis?.slaCumprido || 0}%` },
            { name: 'Backlog Crítico', value: String(kpis?.backlogCritico || 0) },
          ],
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'Ver Dashboard',
          targets: [{ os: 'default', uri: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' }],
        },
      ],
    }

    await fetch(process.env.TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    })

    console.log('✅ Mensagem Teams enviada')
    return { ok: true }
  } catch (error) {
    console.error('❌ Erro ao enviar Teams:', error)
    return { ok: false, error: String(error) }
  }
}

export async function POST() {
  const startTime = Date.now()
  const sb = await createClient()

  try {
    console.log('🚀 Iniciando Executive Board Report...')

    // Fetch KPIs
    const kpis = await getKPIs()
    if (!kpis) {
      throw new Error('Falha ao buscar KPIs')
    }

    // Generate status
    const status = generateStatus(kpis)
    const summaryLines = generateSummary(kpis, status)

    // Send email
    const emailResult = await sendEmail(kpis, status, summaryLines)

    // Send Teams
    const teamsResult = await sendTeams(kpis, status, summaryLines)

    // Determine overall status
    const deliveryTime = Date.now() - startTime
    const overallStatus = (emailResult.ok || teamsResult.ok) ? 'success' : 'failed'
    const channels = (emailResult.ok ? ['email'] : []).concat(teamsResult.ok ? ['teams'] : []).join(',') || 'none'

    // Log to database
    try {
      await sb.from('notification_logs').insert({
        executed_at: new Date().toISOString(),
        status: overallStatus,
        channel: channels || 'none',
        delivery_time: deliveryTime,
        recipients: [
          emailResult.to || process.env.NOTIFICATION_EMAIL_TO || '',
          process.env.TEAMS_WEBHOOK_URL ? 'Teams Board' : '',
        ].filter(Boolean),
        kpis,
        metadata: {
          emailOk: emailResult.ok,
          teamsOk: teamsResult.ok,
          errors: [
            emailResult.error ? `Email: ${emailResult.error}` : null,
            teamsResult.error ? `Teams: ${teamsResult.error}` : null,
          ].filter(Boolean),
        },
      })
    } catch (logError) {
      console.warn('⚠️  Erro ao registrar log:', logError)
    }

    console.log(`✅ Executive Board Report finalizado em ${deliveryTime}ms`)

    return NextResponse.json({
      ok: true,
      status,
      kpis,
      email: emailResult,
      teams: teamsResult,
      deliveryTime,
    })
  } catch (error) {
    console.error('❌ Erro ao executar Daily Report:', error)

    // Log error
    try {
      await sb.from('notification_logs').insert({
        executed_at: new Date().toISOString(),
        status: 'failed',
        channel: 'none',
        delivery_time: Date.now() - startTime,
        recipients: [],
        error_message: String(error),
      })
    } catch (logError) {
      console.warn('⚠️  Erro ao registrar log de erro:', logError)
    }

    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Executive Board Daily Report endpoint',
    method: 'POST',
    schedule: 'Every day at 08:00 UTC',
  })
}
