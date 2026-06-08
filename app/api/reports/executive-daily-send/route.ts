import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

// ── Generate Report HTML ───────────────────────────────────────────────────
async function getExecutiveReport() {
  try {
    const r = await fetch('http://localhost:3000/api/reports/executive-daily', { cache: 'no-store' })
    return await r.json()
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    return null
  }
}

function generateReportHTML(report: any): string {
  const healthConfig = {
    healthy: { emoji: '🟢', label: 'HEALTHY', color: '#7dd3a8', bgLight: 'rgba(125,211,168,0.08)', borderColor: 'rgba(125,211,168,0.20)' },
    attention: { emoji: '🟡', label: 'ATTENTION', color: '#fbbf24', bgLight: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.20)' },
    critical: { emoji: '🔴', label: 'CRITICAL', color: '#f87171', bgLight: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.20)' },
  }
  const h = healthConfig[report.health as keyof typeof healthConfig] || healthConfig.healthy
  const date = new Date(report.generatedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const metrics = report.metrics || {}
  const jira = report.jira || {}
  const glpi = report.glpi || {}
  const risks = report.risks || []
  const recommendations = report.recommendations || []

  // Colors matching portal design system
  const teal = '#8fbfc2'
  const darkBg = '#0a1316'
  const cardBg = '#0d1a1e'
  const border = 'rgba(143,191,194,0.10)'
  const borderLight = 'rgba(143,191,194,0.15)'
  const muted = 'rgba(243,250,250,0.45)'
  const text = '#f3fafa'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Executive Daily Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Arial, sans-serif;
    background: ${darkBg};
    color: ${text};
    line-height: 1.6;
    padding: 24px 12px;
  }
  .container {
    max-width: 800px;
    margin: 0 auto;
    background: ${cardBg};
    border: 1px solid ${borderLight};
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .header {
    background: linear-gradient(135deg, ${cardBg} 0%, #1a2d31 100%);
    border-bottom: 1px solid ${borderLight};
    padding: 48px 24px;
    text-align: center;
  }
  .header h1 {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 8px;
    color: ${text};
    letter-spacing: -0.5px;
  }
  .header p {
    font-size: 13px;
    opacity: 0.6;
    color: ${text};
  }
  .health-badge {
    display: inline-block;
    background: ${h.bgLight};
    color: ${h.color};
    padding: 10px 16px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 12px;
    margin-top: 16px;
    border: 1px solid ${h.borderColor};
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .content { padding: 32px 24px; }
  .section { margin-bottom: 28px; }
  .section:last-child { margin-bottom: 0; }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    color: ${muted};
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 12px;
    border-bottom: 1px solid ${border};
    padding-bottom: 8px;
  }
  .summary-text {
    font-size: 13px;
    line-height: 1.8;
    color: ${text};
    margin-bottom: 0;
    opacity: 0.85;
  }
  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 0;
  }
  .metric-card {
    background: rgba(0,0,0,0.2);
    border: 1px solid ${border};
    border-radius: 8px;
    padding: 14px 12px;
    text-align: center;
  }
  .metric-val {
    font-size: 26px;
    font-weight: 700;
    color: ${teal};
    line-height: 1;
  }
  .metric-label {
    font-size: 10px;
    color: ${muted};
    margin-top: 6px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid ${border};
    font-size: 12px;
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-label {
    font-weight: 600;
    color: ${muted};
  }
  .detail-value {
    color: ${text};
    font-weight: 500;
  }
  .risk-box {
    border-left: 3px solid;
    padding: 12px 14px;
    border-radius: 0 6px 6px 0;
    margin: 10px 0;
  }
  .risk-critical {
    border-color: #f87171;
    background: rgba(248, 113, 113, 0.06);
  }
  .risk-high {
    border-color: #fbbf24;
    background: rgba(251, 191, 36, 0.06);
  }
  .risk-title {
    font-weight: 600;
    font-size: 12px;
    margin-bottom: 4px;
    color: ${text};
  }
  .risk-desc {
    font-size: 11px;
    color: ${muted};
    margin-bottom: 4px;
  }
  .risk-action {
    font-size: 10px;
    margin-top: 4px;
    color: ${muted};
    font-style: italic;
  }
  .bullet {
    font-size: 12px;
    margin: 8px 0;
    padding-left: 18px;
    position: relative;
    color: ${text};
  }
  .bullet:before {
    content: '•';
    position: absolute;
    left: 0;
    color: ${teal};
  }
  .footer {
    background: rgba(0,0,0,0.2);
    padding: 20px 24px;
    text-align: center;
    font-size: 10px;
    color: ${muted};
    border-top: 1px solid ${border};
  }
  .footer-logo {
    font-weight: 600;
    color: ${teal};
    margin-bottom: 4px;
  }
  .footer a {
    color: ${teal};
    text-decoration: none;
  }
  .footer a:hover {
    text-decoration: underline;
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>📊 Executive Daily Report</h1>
    <p>${date}</p>
    <div class="health-badge">${h.emoji} ${h.label}</div>
  </div>

  <div class="content">
    <!-- Executive Summary -->
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <p class="summary-text">${report.executiveSummary || 'Análise executiva não disponível'}</p>
    </div>

    <!-- Principais Indicadores -->
    <div class="section">
      <div class="section-title">Principais Indicadores</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-val">${metrics.totalOpen || 0}</div>
          <div class="metric-label">Total Aberto</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${metrics.totalResolved || 0}</div>
          <div class="metric-label">Resolvidos</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${metrics.totalCritical || 0}</div>
          <div class="metric-label">Críticos</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${(metrics.jiraOverdue || 0) + (metrics.glpiUnattended || 0)}</div>
          <div class="metric-label">Vencidos</div>
        </div>
      </div>
    </div>

    <!-- Jira Status -->
    ${jira.total > 0 ? `
    <div class="section">
      <div class="section-title">Jira — Delivery Status</div>
      <div class="detail-row">
        <span class="detail-label">Total Issues:</span>
        <span class="detail-value">${jira.total}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Em Aberto:</span>
        <span class="detail-value">${jira.open}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Completadas:</span>
        <span class="detail-value">${jira.completed}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Críticas:</span>
        <span class="detail-value">${jira.critical}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Vencidas:</span>
        <span class="detail-value">${jira.overdue}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Sem Responsável:</span>
        <span class="detail-value">${jira.unassigned}</span>
      </div>
    </div>
    ` : ''}

    <!-- GLPI Status -->
    ${glpi.total > 0 ? `
    <div class="section">
      <div class="section-title">GLPI — Operational Overview</div>
      <div class="detail-row">
        <span class="detail-label">Total Chamados:</span>
        <span class="detail-value">${glpi.total}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Abertos:</span>
        <span class="detail-value">${glpi.open}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Resolvidos:</span>
        <span class="detail-value">${glpi.resolved}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Críticos:</span>
        <span class="detail-value">${glpi.critical}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Sem Atendimento:</span>
        <span class="detail-value">${glpi.unattended}</span>
      </div>
    </div>
    ` : ''}

    <!-- Risks -->
    ${risks.length > 0 ? `
    <div class="section">
      <div class="section-title">Executive Risks</div>
      ${risks.map(r => `
        <div class="risk-box risk-${r.severity}">
          <div class="risk-title">${r.title}</div>
          <div class="risk-desc">${r.description}</div>
          <div class="risk-action">💡 ${r.action}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Recommendations -->
    ${recommendations.length > 0 ? `
    <div class="section">
      <div class="section-title">Executive Recommendations</div>
      ${recommendations.map(r => `<div class="bullet">${r}</div>`).join('')}
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <div class="footer-logo">Xtentgroup · CS Cockpit</div>
    <p>Executive Daily Report — Gerado automaticamente às ${new Date(report.generatedAt).toLocaleTimeString('pt-BR')}</p>
    <p style="margin-top: 8px;">Acesse o portal em: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reports/executive-daily">/reports/executive-daily</a></p>
  </div>
</div>
</body>
</html>`
}

// ── Send Email ─────────────────────────────────────────────────────────────
async function sendEmail(html: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP não configurado')
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

    const emailList = (process.env.NOTIFICATION_EMAIL_TO || process.env.SMTP_USER)
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)
    const toList = emailList.join(', ')

    const info = await transporter.sendMail({
      from: `"CS Cockpit" <${process.env.SMTP_USER}>`,
      to: toList,
      subject: `📊 Executive Daily Report — ${new Date().toLocaleDateString('pt-BR')}`,
      html,
    })

    console.log('✅ Executive Daily Report enviado:', emailList.join('; '))
    return { ok: true, to: emailList, count: emailList.length, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error)
    return { ok: false, error: String(error) }
  }
}

// ── Main Handler ───────────────────────────────────────────────────────────
export async function GET() {
  const sb = await createClient()
  const startTime = Date.now()

  try {
    console.log('🚀 Enviando Executive Daily Report...')

    // Get report
    const report = await getExecutiveReport()
    if (!report) {
      throw new Error('Falha ao gerar relatório')
    }

    // Generate HTML
    const html = generateReportHTML(report)

    // Send email
    const emailResult = await sendEmail(html)

    // Log
    const deliveryTime = Date.now() - startTime
    try {
      await sb.from('audit_log').insert({
        action: 'executive_daily_report_sent',
        module: 'reports',
        description: `Executive Daily Report enviado — ${report.health} (${report.metrics?.totalOpen || 0} abertos)`,
        metadata: {
          health: report.health,
          recipients: emailResult.to,
          deliveryTime,
          metrics: report.metrics,
        },
        level: report.health === 'critical' ? 'warning' : 'info',
      })
    } catch (logError) {
      console.warn('⚠️  Erro ao registrar log:', logError)
    }

    console.log(`✅ Executive Daily Report finalizado em ${deliveryTime}ms`)

    return NextResponse.json({
      ok: true,
      report: report.health,
      email: emailResult,
      deliveryTime,
    })
  } catch (error) {
    console.error('❌ Erro ao enviar Daily Report:', error)

    // Log error
    try {
      await sb.from('audit_log').insert({
        action: 'executive_daily_report_failed',
        module: 'reports',
        description: `Falha ao enviar Executive Daily Report: ${String(error)}`,
        error_message: String(error),
        level: 'error',
      })
    } catch (logError) {
      console.warn('⚠️  Erro ao registrar log de erro:', logError)
    }

    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
