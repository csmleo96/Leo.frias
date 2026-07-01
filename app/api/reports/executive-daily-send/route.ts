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
  const hc = {
    healthy:   { label: 'HEALTHY',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)'   },
    attention: { label: 'ATTENTION', color: '#FACC15', bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.25)'  },
    critical:  { label: 'CRITICAL',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'   },
  }
  const h = hc[report.health as keyof typeof hc] || hc.healthy
  const date = new Date(report.generatedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = new Date(report.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const metrics = report.metrics || {}
  const jira = report.jira || {}
  const glpi = report.glpi || {}
  const zabbix = report.zabbix || null
  const datadog = report.datadog || null
  const risks = report.risks || []
  const recommendations = report.recommendations || []
  const healthScore: number = report.healthScore ?? 0
  const hsColor = healthScore >= 80 ? '#22C55E' : healthScore >= 60 ? '#FACC15' : '#EF4444'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const scoreBar = (val: number, max: number, color: string) => {
    const pct = max > 0 ? Math.round((val / max) * 100) : 0
    return `<div style="background:rgba(255,255,255,0.06);border-radius:4px;height:6px;overflow:hidden;margin-top:4px"><div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div></div>`
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Executive Daily Report — XTENTGROUP</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#07111F;color:#fff;padding:20px 12px}
.wrap{max-width:760px;margin:0 auto;background:#0B1F3A;border-radius:16px;overflow:hidden;border:1px solid rgba(245,130,32,0.15);box-shadow:0 16px 48px rgba(0,0,0,0.6)}
.hd{background:linear-gradient(135deg,#07111F 0%,#0B1F3A 60%,#0f2340 100%);padding:40px 32px 32px;border-bottom:1px solid rgba(245,130,32,0.12)}
.brand{font-size:10px;font-weight:800;color:#F58220;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px}
.hd-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.hd h1{font-size:26px;font-weight:800;color:#fff;letter-spacing:-.5px;line-height:1.2}
.hd .sub{font-size:12px;color:rgba(255,255,255,0.45);margin-top:6px}
.hbadge{padding:8px 16px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;border:1px solid;white-space:nowrap;background:${h.bg};color:${h.color};border-color:${h.border}}
.body{padding:28px 32px}
.sec{margin-bottom:28px}
.sh{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,0.35);padding-bottom:8px;border-bottom:1px solid rgba(245,130,32,0.12);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.sh-bar{width:3px;height:12px;border-radius:2px;display:inline-block;flex-shrink:0}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 12px;text-align:center}
.cv{font-size:24px;font-weight:800;color:#F58220;line-height:1;margin-bottom:4px}
.cl{font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:.06em}
.cv.ok{color:#22C55E}.cv.warn{color:#FACC15}.cv.err{color:#EF4444}.cv.info{color:#38BDF8}
.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px}
.row:last-child{border-bottom:none}
.rl{color:rgba(255,255,255,0.45)}.rv{color:#fff;font-weight:600}
.rv.ok{color:#22C55E}.rv.warn{color:#FACC15}.rv.err{color:#EF4444}
.rbox{border-left:3px solid;padding:12px 14px;border-radius:0 8px 8px 0;margin:8px 0;background:rgba(255,255,255,0.03)}
.rbox.critical{border-color:#EF4444;background:rgba(239,68,68,0.07)}
.rbox.high{border-color:#FACC15;background:rgba(250,204,21,0.06)}
.rbox .rt{font-weight:700;font-size:12px;color:#fff;margin-bottom:4px}
.rbox .rd{font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px}
.rbox .ra{font-size:10px;color:#F58220;font-style:italic}
.bullet{font-size:12px;margin:7px 0;padding-left:16px;position:relative;color:rgba(255,255,255,0.8)}
.bullet:before{content:'▸';position:absolute;left:0;color:#F58220;font-size:10px;top:1px}
.score-wrap{display:flex;align-items:center;gap:24px;background:rgba(245,130,32,0.06);border:1px solid rgba(245,130,32,0.15);border-radius:12px;padding:20px 24px}
.score-num{font-size:56px;font-weight:900;line-height:1;color:${hsColor}}
.score-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.4);margin-bottom:4px}
.score-bar-wrap{flex:1}
.bd-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px}
.bd-item{display:flex;flex-direction:column;font-size:10px}
.bd-name{color:rgba(255,255,255,0.4);margin-bottom:2px;text-transform:uppercase;letter-spacing:.05em}
.bd-val{color:#fff;font-weight:700;font-size:11px}
.summ{font-size:13px;line-height:1.85;color:rgba(255,255,255,0.75)}
.ft{background:rgba(0,0,0,0.3);padding:20px 32px;text-align:center;border-top:1px solid rgba(245,130,32,0.08)}
.ft p{font-size:10px;color:rgba(255,255,255,0.3);line-height:1.7}
.ft a{color:#F58220;text-decoration:none}
.ft-brand{font-weight:800;color:#F58220;font-size:11px;margin-bottom:6px}
</style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="hd">
    <div class="brand">XTENTGROUP · CS Cockpit</div>
    <div class="hd-row">
      <div>
        <h1>Executive Daily Report</h1>
        <p class="sub">${date} · ${timeStr}</p>
      </div>
      <div class="hbadge">${h.label}</div>
    </div>
  </div>

  <div class="body">

    <!-- Health Score -->
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#F58220"></span>Health Score Operacional</div>
      <div class="score-wrap">
        <div>
          <div class="score-label">Score</div>
          <div class="score-num">${healthScore}</div>
          <div style="font-size:11px;color:${hsColor};margin-top:4px;font-weight:700">${healthScore >= 80 ? 'EXCELENTE' : healthScore >= 60 ? 'REGULAR' : 'CRÍTICO'}</div>
        </div>
        <div class="score-bar-wrap">
          <div style="background:rgba(255,255,255,0.06);border-radius:8px;height:10px;overflow:hidden;margin-bottom:16px">
            <div style="width:${healthScore}%;height:100%;background:linear-gradient(90deg,${hsColor},${hsColor}99);border-radius:8px;transition:width 0.3s"></div>
          </div>
          ${report.healthScoreBreakdown ? `<div class="bd-grid">
            ${Object.entries(report.healthScoreBreakdown).map(([k, v]) => `
            <div class="bd-item">
              <span class="bd-name">${k}</span>
              <span class="bd-val">${v}/${k==='sla'?25:k==='disponibilidade'?20:k==='backup'||k==='dr'?15:k==='storage'||k==='chamados'?10:5}</span>
              ${scoreBar(v as number, k==='sla'?25:k==='disponibilidade'?20:k==='backup'||k==='dr'?15:k==='storage'||k==='chamados'?10:5, '#F58220')}
            </div>`).join('')}
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#38BDF8"></span>Executive Summary</div>
      <p class="summ">${report.executiveSummary || 'Análise executiva não disponível.'}</p>
    </div>

    <!-- KPIs -->
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#8b5cf6"></span>Principais Indicadores</div>
      <div class="g4">
        <div class="card"><div class="cv ${(metrics.totalOpen||0)>20?'warn':''}">${metrics.totalOpen||0}</div><div class="cl">Abertos</div></div>
        <div class="card"><div class="cv ok">${metrics.totalResolved||0}</div><div class="cl">Resolvidos</div></div>
        <div class="card"><div class="cv ${(metrics.totalCritical||0)>5?'err':'warn'}">${metrics.totalCritical||0}</div><div class="cl">Críticos</div></div>
        <div class="card"><div class="cv info">${metrics.zabbixAvailability??0}%</div><div class="cl">Disponibilidade</div></div>
      </div>
    </div>

    <!-- Zabbix -->
    ${zabbix ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#EF4444"></span>Zabbix — Infraestrutura</div>
      <div class="g4" style="margin-bottom:12px">
        <div class="card"><div class="cv ${zabbix.totalProblems>0?'err':'ok'}">${zabbix.totalProblems}</div><div class="cl">Problemas</div></div>
        <div class="card"><div class="cv ${zabbix.critical>0?'err':'ok'}">${zabbix.critical}</div><div class="cl">Críticos</div></div>
        <div class="card"><div class="cv ${zabbix.hostsDown>0?'err':'ok'}">${zabbix.hostsUp}/${zabbix.hostsTotal}</div><div class="cl">Hosts Online</div></div>
        <div class="card"><div class="cv ${(zabbix.availability??100)<95?'warn':'ok'}">${zabbix.availability??0}%</div><div class="cl">Disponibilidade</div></div>
      </div>
      <div class="row"><span class="rl">Disaster</span><span class="rv ${zabbix.disaster>0?'err':''}">${zabbix.disaster}</span></div>
      <div class="row"><span class="rl">High</span><span class="rv ${zabbix.high>0?'warn':''}">${zabbix.high}</span></div>
      <div class="row"><span class="rl">Não Reconhecidos</span><span class="rv ${zabbix.unacknowledged>0?'warn':''}">${zabbix.unacknowledged}</span></div>
      ${(zabbix.criticalProblems??[]).map((p:any)=>`<div class="row"><span class="rl" style="color:#EF4444">${p.severityLabel??'High'}</span><span class="rv" style="font-size:11px">${p.host?p.host+' — ':''}${p.name}</span></div>`).join('')}
    </div>` : ''}

    <!-- Datadog -->
    ${datadog ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#8b5cf6"></span>Datadog — Observabilidade</div>
      <div class="g4" style="margin-bottom:12px">
        <div class="card"><div class="cv">${datadog.totalMonitors}</div><div class="cl">Monitors</div></div>
        <div class="card"><div class="cv ok">${datadog.ok}</div><div class="cl">OK</div></div>
        <div class="card"><div class="cv ${datadog.alert>0?'err':'ok'}">${datadog.alert}</div><div class="cl">Em Alerta</div></div>
        <div class="card"><div class="cv ${datadog.warn>0?'warn':'ok'}">${datadog.warn}</div><div class="cl">Warning</div></div>
      </div>
      <div class="row"><span class="rl">Hosts Online</span><span class="rv">${datadog.hostsUp} / ${datadog.hostsTotal}</span></div>
      ${(datadog.alertMonitors??[]).map((m:any)=>`<div class="row"><span class="rl" style="color:#EF4444">🔴 Alert</span><span class="rv" style="font-size:11px">${m.name}</span></div>`).join('')}
      ${(datadog.warnMonitors??[]).map((m:any)=>`<div class="row"><span class="rl" style="color:#FACC15">🟡 Warn</span><span class="rv" style="font-size:11px">${m.name}</span></div>`).join('')}
    </div>` : ''}

    <!-- Jira -->
    ${jira.total>0 ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#3b82f6"></span>Jira — Delivery</div>
      <div class="g2" style="margin-bottom:10px">
        <div class="card"><div class="cv ${jira.overdue>0?'err':''}">${jira.overdue}</div><div class="cl">Vencidas</div></div>
        <div class="card"><div class="cv ${jira.critical>3?'err':'warn'}">${jira.critical}</div><div class="cl">Críticas</div></div>
      </div>
      <div class="row"><span class="rl">Total Issues</span><span class="rv">${jira.total}</span></div>
      <div class="row"><span class="rl">Em Aberto</span><span class="rv">${jira.open}</span></div>
      <div class="row"><span class="rl">Sem Responsável</span><span class="rv ${jira.unassigned>5?'warn':''}">${jira.unassigned}</span></div>
    </div>` : ''}

    <!-- GLPI -->
    ${glpi.total>0 ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#a78bfa"></span>GLPI — Suporte</div>
      <div class="g2" style="margin-bottom:10px">
        <div class="card"><div class="cv ${glpi.critical>0?'err':''}">${glpi.critical}</div><div class="cl">Críticos</div></div>
        <div class="card"><div class="cv ${glpi.unattended>5?'err':'ok'}">${glpi.unattended}</div><div class="cl">Sem Atend.</div></div>
      </div>
      <div class="row"><span class="rl">Total Chamados</span><span class="rv">${glpi.total}</span></div>
      <div class="row"><span class="rl">Abertos</span><span class="rv">${glpi.open}</span></div>
      <div class="row"><span class="rl">Resolvidos</span><span class="rv ok">${glpi.resolved}</span></div>
    </div>` : ''}

    <!-- Risks -->
    ${risks.length>0 ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#EF4444"></span>Executive Risks</div>
      ${risks.map((r:any)=>`<div class="rbox ${r.severity}"><div class="rt">${r.title}</div><div class="rd">${r.description}</div><div class="ra">💡 ${r.action}</div></div>`).join('')}
    </div>` : ''}

    <!-- Recommendations -->
    ${recommendations.length>0 ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#F58220"></span>Executive Recommendations</div>
      ${recommendations.map((r:any)=>`<div class="bullet">${r}</div>`).join('')}
    </div>` : ''}

  </div>

  <div class="ft">
    <div class="ft-brand">XTENTGROUP · CS Cockpit</div>
    <p>Executive Daily Report · Gerado automaticamente às ${timeStr}</p>
    <p>Health Score: <strong style="color:${hsColor}">${healthScore}/100</strong> · Status: <strong style="color:${h.color}">${h.label}</strong></p>
    <p style="margin-top:8px"><a href="${appUrl}">Acessar CS Cockpit →</a></p>
  </div>

</div>
</body>
</html>`
}

// ── Send Email com Retentativa ────────────────────────────────────────────
async function sendEmail(html: string, maxRetries = 3): Promise<any> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP não configurado')
    return { ok: false, reason: 'SMTP not configured' }
  }

  let lastError: any = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
      const date = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })

      const info = await transporter.sendMail({
        from: `"CS Cockpit" <${process.env.SMTP_USER}>`,
        to: toList,
        subject: `[Relatório Executivo Diário] Operações e Projetos — ${date}`,
        html,
      })

      console.log(`✅ Executive Daily Report enviado na tentativa ${attempt}:`, emailList.join('; '))
      return { ok: true, to: emailList, count: emailList.length, messageId: info.messageId, attempt }
    } catch (error) {
      lastError = error
      console.warn(`⚠️  Tentativa ${attempt}/${maxRetries} falhou:`, String(error))

      // Aguardar antes de retentativa (backoff exponencial)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error('❌ Erro ao enviar email após ', maxRetries, ' tentativas:', lastError)
  return { ok: false, error: String(lastError), attempts: maxRetries }
}

// ── Main Handler ───────────────────────────────────────────────────────────
export async function GET() {
  const sb = await createClient()
  const startTime = Date.now()
  const executedAt = new Date().toISOString()

  try {
    console.log('🚀 [', executedAt, '] Iniciando envio de Executive Daily Report...')

    // Get report
    const report = await getExecutiveReport()
    if (!report) {
      throw new Error('Falha ao gerar relatório executivo')
    }

    // Generate HTML
    const html = generateReportHTML(report)

    // Send email with retries
    const emailResult = await sendEmail(html)

    // Calculate metrics
    const deliveryTime = Date.now() - startTime
    const status = emailResult.ok ? 'success' : 'failed'
    const attempts = emailResult.attempt || emailResult.attempts || 1

    // Log to database
    try {
      await sb.from('audit_log').insert({
        action: 'executive_daily_report_sent',
        module: 'reports',
        description: `Executive Daily Report enviado — ${report.health} (${report.metrics?.totalOpen || 0} abertos, ${attempts} tentativa(s))`,
        error_message: emailResult.ok ? null : emailResult.error,
        metadata: {
          health: report.health,
          status,
          recipients: emailResult.to || [],
          deliveryTime,
          attempts,
          messageId: emailResult.messageId,
          metrics: {
            totalOpen: report.metrics?.totalOpen,
            totalCritical: report.metrics?.totalCritical,
            jiraOverdue: report.metrics?.jiraOverdue,
            glpiUnattended: report.metrics?.glpiUnattended,
          },
        },
        level: !emailResult.ok ? 'error' : report.health === 'critical' ? 'warning' : 'info',
      })
    } catch (logError) {
      console.warn('⚠️  Erro ao registrar log:', logError)
    }

    console.log(`✅ Executive Daily Report finalizado em ${deliveryTime}ms (status: ${status}, tentativas: ${attempts})`)

    return NextResponse.json({
      ok: emailResult.ok,
      status,
      report: report.health,
      email: emailResult,
      deliveryTime,
      attempts,
      executedAt,
    })
  } catch (error) {
    const deliveryTime = Date.now() - startTime
    const errorMsg = String(error)

    console.error(`❌ [${executedAt}] Falha ao enviar Daily Report após ${deliveryTime}ms:`, errorMsg)

    // Log error to database
    try {
      await sb.from('audit_log').insert({
        action: 'executive_daily_report_failed',
        module: 'reports',
        description: `Falha ao enviar Executive Daily Report: ${errorMsg}`,
        error_message: errorMsg,
        metadata: {
          deliveryTime,
          executedAt,
        },
        level: 'error',
      })
    } catch (logError) {
      console.warn('⚠️  Erro ao registrar log de falha:', logError)
    }

    return NextResponse.json({
      ok: false,
      status: 'failed',
      error: errorMsg,
      deliveryTime,
      executedAt,
    }, { status: 500 })
  }
}
