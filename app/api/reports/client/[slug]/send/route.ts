import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/reports/clients'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

// ── Fetch per-client report ────────────────────────────────────────────────
async function getClientReport(slug: string) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const r = await fetch(`${base}/api/reports/client/${slug}`, { cache: 'no-store' })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

// ── HTML Template ──────────────────────────────────────────────────────────
function generateClientHTML(report: any): string {
  const accent = report.client?.accentColor ?? '#F58220'
  const clientName: string = report.client?.name ?? 'Cliente'
  const score: number = report.healthScore ?? 0
  const hsColor = score >= 80 ? '#22C55E' : score >= 60 ? '#FACC15' : '#EF4444'
  const hcMap: Record<string, { label: string; color: string; bg: string }> = {
    healthy:   { label: 'ESTÁVEL',  color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
    attention: { label: 'ATENÇÃO',  color: '#FACC15', bg: 'rgba(250,204,21,0.12)' },
    critical:  { label: 'CRÍTICO',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  }
  const hc = hcMap[report.health ?? 'healthy'] ?? hcMap.healthy
  const date = new Date(report.generatedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = new Date(report.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const glpi = report.glpi || {}
  const jira = report.jira || {}
  const zabbix = report.zabbix || null
  const datadog = report.datadog || null
  const risks: any[] = report.risks || []
  const breakdown = report.healthScoreBreakdown || {}
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const row = (label: string, value: string | number, colorClass = '') =>
    `<div class="row"><span class="rl">${label}</span><span class="rv${colorClass ? ' ' + colorClass : ''}">${value}</span></div>`

  const riskColor = (s: string) => s === 'critical' ? '#EF4444' : s === 'high' ? '#FACC15' : '#94A3B8'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Relatório Executivo ${clientName} — XTENTGROUP</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#07111F;color:#fff;padding:20px 12px}
.wrap{max-width:720px;margin:0 auto;background:#0B1F3A;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);box-shadow:0 16px 48px rgba(0,0,0,0.6)}
.hd{padding:36px 32px 28px;border-bottom:1px solid rgba(255,255,255,0.07)}
.hd-bg{background:linear-gradient(135deg,#07111F 0%,${accent}18 100%)}
.brand{font-size:10px;font-weight:800;color:${accent};letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px}
.hd-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.hd h1{font-size:22px;font-weight:800;color:#fff;line-height:1.2}
.hd .client-name{font-size:16px;font-weight:700;color:${accent};margin-bottom:4px}
.hd .sub{font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px}
.badge{padding:6px 14px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:${hc.bg};color:${hc.color};border:1px solid ${hc.color}44;white-space:nowrap}
.body{padding:24px 32px}
.sec{margin-bottom:24px}
.sh{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,0.3);padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.sh-bar{width:3px;height:11px;border-radius:2px;flex-shrink:0}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:12px 10px;text-align:center}
.cv{font-size:22px;font-weight:800;color:${accent};line-height:1;margin-bottom:3px}
.cl{font-size:9px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:.05em}
.cv.ok{color:#22C55E}.cv.warn{color:#FACC15}.cv.err{color:#EF4444}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px}
.row:last-child{border-bottom:none}
.rl{color:rgba(255,255,255,0.4)}.rv{color:#fff;font-weight:600}
.rv.ok{color:#22C55E}.rv.warn{color:#FACC15}.rv.err{color:#EF4444}
.score-row{display:flex;align-items:center;gap:20px;background:${accent}0f;border:1px solid ${accent}22;border-radius:10px;padding:18px 20px}
.score-num{font-size:52px;font-weight:900;color:${hsColor};line-height:1;min-width:80px}
.score-meta{flex:1}
.score-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.35);margin-bottom:3px}
.score-status{font-size:13px;font-weight:700;color:${hsColor};margin-bottom:10px}
.bd{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.bd-item{font-size:10px}
.bd-n{color:rgba(255,255,255,0.35);text-transform:uppercase;font-size:9px;letter-spacing:.04em;margin-bottom:2px}
.bd-v{color:#fff;font-weight:700}
.bar{background:rgba(255,255,255,0.06);border-radius:3px;height:4px;margin-top:3px;overflow:hidden}
.bar-f{height:100%;border-radius:3px}
.summ{font-size:12px;line-height:1.85;color:rgba(255,255,255,0.72)}
.rbox{border-left:3px solid;padding:10px 12px;border-radius:0 6px 6px 0;margin:6px 0}
.rbox .rt{font-weight:700;font-size:11px;color:#fff;margin-bottom:3px}
.rbox .ra{font-size:10px;font-style:italic;margin-top:3px}
.ft{background:rgba(0,0,0,0.3);padding:18px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.05)}
.ft p{font-size:10px;color:rgba(255,255,255,0.3);line-height:1.7}
.ft a{color:${accent};text-decoration:none}
.ft-brand{font-weight:800;color:${accent};font-size:11px;margin-bottom:5px}
.divider{height:1px;background:rgba(255,255,255,0.06);margin:4px 0}
</style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="hd hd-bg">
    <div class="brand">XTENTGROUP · CS Cockpit · Relatório Executivo</div>
    <div class="hd-row">
      <div>
        <div class="client-name">${clientName}</div>
        <h1>Executive Report</h1>
        <p class="sub">${date} · ${timeStr}</p>
      </div>
      <div class="badge">${hc.label}</div>
    </div>
  </div>

  <div class="body">

    <!-- Health Score -->
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:${accent}"></span>Health Score</div>
      <div class="score-row">
        <div class="score-num">${score}</div>
        <div class="score-meta">
          <div class="score-lbl">Score / 100</div>
          <div class="score-status">${score >= 80 ? 'EXCELENTE' : score >= 60 ? 'REGULAR' : 'CRÍTICO'}</div>
          <div class="bar" style="margin-bottom:12px">
            <div class="bar-f" style="width:${score}%;background:linear-gradient(90deg,${hsColor},${hsColor}99)"></div>
          </div>
          ${Object.keys(breakdown).length > 0 ? `<div class="bd">
            ${Object.entries(breakdown).map(([k, v]) => {
              const max = k === 'sla' ? 25 : k === 'disponibilidade' ? 20 : k === 'chamados' ? 20 : k === 'observabilidade' ? 15 : 20
              return `<div class="bd-item"><div class="bd-n">${k}</div><div class="bd-v">${v}/${max}</div><div class="bar"><div class="bar-f" style="width:${max > 0 ? Math.round((v as number)/max*100) : 0}%;background:${accent}"></div></div></div>`
            }).join('')}
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#38BDF8"></span>Sumário Executivo</div>
      <p class="summ">${report.executiveSummary || 'Análise executiva não disponível.'}</p>
    </div>

    <!-- KPIs -->
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:${accent}"></span>Indicadores do Período</div>
      <div class="g4">
        <div class="card">
          <div class="cv ${(glpi.open ?? 0) > 5 ? 'warn' : ''}">${glpi.open ?? '—'}</div>
          <div class="cl">GLPI Abertos</div>
        </div>
        <div class="card">
          <div class="cv ${(glpi.critical ?? 0) > 0 ? 'err' : 'ok'}">${glpi.critical ?? '—'}</div>
          <div class="cl">GLPI Críticos</div>
        </div>
        <div class="card">
          <div class="cv ${(jira.overdue ?? 0) > 0 ? 'err' : ''}">${jira.open ?? '—'}</div>
          <div class="cl">Jira Ativos</div>
        </div>
        <div class="card">
          <div class="cv ${(zabbix?.availability ?? 100) < 99 ? 'warn' : 'ok'}">${zabbix?.availability ?? '—'}%</div>
          <div class="cl">Disponibilidade</div>
        </div>
      </div>
    </div>

    <!-- GLPI -->
    ${glpi.total > 0 ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#a78bfa"></span>GLPI — Gestão de Chamados</div>
      ${row('Total de Chamados', glpi.total)}
      ${row('Em Aberto', glpi.open, glpi.open > 5 ? 'warn' : '')}
      ${row('Resolvidos', glpi.resolved, 'ok')}
      ${row('Críticos', glpi.critical, glpi.critical > 0 ? 'err' : 'ok')}
      ${row('Sem Atendimento Inicial', glpi.unattended, glpi.unattended > 2 ? 'warn' : '')}
    </div>` : ''}

    <!-- Jira -->
    ${jira.total > 0 ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#3B82F6"></span>Jira — Gestão de Projetos</div>
      ${jira.projects?.length > 0 ? row('Projetos', jira.projects.join(', ')) : ''}
      ${row('Total Issues', jira.total)}
      ${row('Em Andamento', jira.open)}
      ${row('Concluídos', jira.done, 'ok')}
      ${row('Vencidos', jira.overdue, jira.overdue > 0 ? 'err' : 'ok')}
      ${row('Alta Prioridade', jira.critical, jira.critical > 2 ? 'warn' : '')}
    </div>` : ''}

    <!-- Zabbix -->
    ${zabbix ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#EF4444"></span>Zabbix — Infraestrutura</div>
      <div class="g2" style="margin-bottom:10px">
        <div class="card">
          <div class="cv ${zabbix.totalProblems > 0 ? 'err' : 'ok'}">${zabbix.totalProblems}</div>
          <div class="cl">Problemas Ativos</div>
        </div>
        <div class="card">
          <div class="cv ${(zabbix.availability ?? 100) < 99 ? 'warn' : 'ok'}">${zabbix.availability}%</div>
          <div class="cl">Disponibilidade</div>
        </div>
      </div>
      ${row('Hosts Online', `${zabbix.hostsUp} / ${zabbix.hostsTotal}`, zabbix.hostsDown > 0 ? 'err' : 'ok')}
      ${row('Disaster', zabbix.disaster, zabbix.disaster > 0 ? 'err' : '')}
      ${row('High', zabbix.critical - zabbix.disaster, (zabbix.critical - zabbix.disaster) > 0 ? 'warn' : '')}
      ${(zabbix.criticalProblems ?? []).map((p: any) =>
        `<div class="row"><span class="rl" style="color:#EF4444">${p.severityLabel ?? 'High'}</span><span class="rv" style="font-size:11px">${p.host ? p.host + ' — ' : ''}${p.name}</span></div>`
      ).join('')}
    </div>` : ''}

    <!-- Datadog -->
    ${datadog ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#8B5CF6"></span>Datadog — Observabilidade</div>
      ${row('Total Monitors', datadog.totalMonitors)}
      ${row('OK', datadog.ok, 'ok')}
      ${row('Em Alerta', datadog.alert, datadog.alert > 0 ? 'err' : 'ok')}
      ${row('Warning', datadog.warn, datadog.warn > 0 ? 'warn' : '')}
      ${(datadog.alertMonitors ?? []).map((m: any) =>
        `<div class="row"><span class="rl" style="color:#EF4444">🔴 ${m.name}</span><span class="rv" style="color:#EF4444;font-size:10px">ALERT</span></div>`
      ).join('')}
    </div>` : ''}

    <!-- Risks -->
    ${risks.length > 0 ? `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#EF4444"></span>Riscos Identificados</div>
      ${risks.map(r => `
        <div class="rbox" style="border-color:${riskColor(r.severity)};background:${riskColor(r.severity)}0d">
          <div class="rt">${r.title}</div>
          <div class="ra" style="color:${accent}">💡 ${r.action}</div>
        </div>
      `).join('')}
    </div>` : `
    <div class="sec">
      <div class="sh"><span class="sh-bar" style="background:#22C55E"></span>Status</div>
      <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:14px 16px;font-size:12px;color:rgba(255,255,255,0.7)">
        Nenhum risco crítico identificado no período. O ambiente está operando dentro dos parâmetros esperados.
      </div>
    </div>`}

  </div>

  <div class="ft">
    <div class="ft-brand">XTENTGROUP · CS Cockpit</div>
    <p>Relatório Executivo ${clientName} · ${date} às ${timeStr}</p>
    <p>Health Score: <strong style="color:${hsColor}">${score}/100</strong> · Status: <strong style="color:${hc.color}">${hc.label}</strong></p>
    <p style="margin-top:6px"><a href="${appUrl}/vault/customers/${report.client?.slug}">Ver no CS Cockpit →</a></p>
    <p style="margin-top:8px;font-size:9px;opacity:.5">Relatório gerado automaticamente · XTENTGROUP Customer Success</p>
  </div>

</div>
</body>
</html>`
}

// ── Email Send ─────────────────────────────────────────────────────────────
async function sendMail(to: string[], subject: string, html: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { ok: false, reason: 'SMTP não configurado' }
  }
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    const info = await transport.sendMail({
      from: `"CS Cockpit · XTENTGROUP" <${process.env.SMTP_USER}>`,
      to: to.join(', '),
      subject,
      html,
    })
    return { ok: true, messageId: info.messageId }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ── Main Handler ───────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const client = getClient(slug)
  if (!client) {
    return NextResponse.json({ error: `Cliente '${slug}' não encontrado` }, { status: 404 })
  }

  const report = await getClientReport(slug)
  if (!report || report.error) {
    return NextResponse.json({ error: 'Falha ao gerar relatório do cliente' }, { status: 500 })
  }

  const html = generateClientHTML(report)

  // Resolve recipients: config > env fallback
  const to = client.contacts.length > 0
    ? client.contacts
    : [process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? ''].filter(Boolean)

  if (to.length === 0) {
    return NextResponse.json({ error: `Nenhum destinatário configurado para ${client.name}. Adicione contacts em lib/reports/clients.ts` }, { status: 400 })
  }

  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const subject = `[Relatório Executivo] ${client.name} — ${date}`

  const result = await sendMail(to, subject, html)

  return NextResponse.json({
    ok: result.ok,
    client: client.name,
    slug: client.slug,
    healthScore: report.healthScore,
    health: report.health,
    to,
    ...(result.ok ? { messageId: (result as any).messageId } : { error: (result as any).error ?? (result as any).reason }),
    sentAt: new Date().toISOString(),
  })
}

// Preview — GET /api/reports/client/[slug]/send?preview=1 returns HTML directly
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { preview } = await req.json().catch(() => ({ preview: false }))
  const client = getClient(slug)
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  const report = await getClientReport(slug)
  if (!report) return NextResponse.json({ error: 'Falha ao gerar relatório' }, { status: 500 })

  const html = generateClientHTML(report)

  if (preview) {
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  return NextResponse.json({ ok: true, htmlLength: html.length })
}
