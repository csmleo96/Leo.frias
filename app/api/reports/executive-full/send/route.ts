import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

const BASE = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Colour tokens (XTENTGROUP brand) ───────────────────────────────────────
const C = {
  bg:       '#07111F',
  container:'#0B1F3A',
  card:     '#112447',
  border:   '#1E3A5F',
  orange:   '#F58220',
  green:    '#22C55E',
  yellow:   '#FACC15',
  red:      '#EF4444',
  blue:     '#38BDF8',
  muted:    '#8BA6C1',
  text:     '#E2EBF5',
  white:    '#FFFFFF',
}

const FAROL_MAP = {
  verde:   { color: C.green,  label: 'VERDE — Operação Normal', emoji: '🟢' },
  amarelo: { color: C.yellow, label: 'AMARELO — Atenção Necessária', emoji: '🟡' },
  vermelho:{ color: C.red,    label: 'VERMELHO — Estado Crítico', emoji: '🔴' },
}

const PRIORITY_MAP: Record<string, string> = {
  alta:  C.red,
  média: C.yellow,
  baixa: C.green,
}

// ── HTML helpers ───────────────────────────────────────────────────────────
function sec(title: string, content: string, border = C.orange) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
  <tr><td style="padding:20px;background:${C.container};border-radius:10px;border-left:4px solid ${border}">
    <div style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${border};margin-bottom:14px">${title}</div>
    ${content}
  </td></tr>
</table>`
}

function unavailableBlock(reason: string) {
  return `<div style="padding:12px 14px;background:#0D1A2F;border-radius:6px;border:1px solid ${C.border};color:${C.muted};font-size:13px;font-style:italic">⚠️ ${reason}</div>`
}

function grid4(items: Array<{ label: string; value: string | number; color?: string }>) {
  const cells = items.map(i => `
    <td width="25%" style="padding:10px 6px;text-align:center;vertical-align:top">
      <div style="font-size:24px;font-weight:800;color:${i.color ?? C.text}">${i.value}</div>
      <div style="font-size:11px;color:${C.muted};margin-top:3px;text-transform:uppercase;letter-spacing:.5px">${i.label}</div>
    </td>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`
}

function grid2(items: Array<{ label: string; value: string | number; color?: string }>) {
  const cells = items.map(i => `
    <td width="50%" style="padding:10px 6px;text-align:center;vertical-align:top">
      <div style="font-size:20px;font-weight:700;color:${i.color ?? C.text}">${i.value}</div>
      <div style="font-size:11px;color:${C.muted};margin-top:3px;text-transform:uppercase;letter-spacing:.5px">${i.label}</div>
    </td>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`
}

function pill(text: string, color: string) {
  return `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;background:${color}22;color:${color};border:1px solid ${color}44">${text}</span>`
}

function problemRow(p: any) {
  const sev = p.severity >= 5 ? C.red : p.severity >= 4 ? '#F97316' : C.yellow
  const label = p.severity >= 5 ? 'DISASTER' : p.severity >= 4 ? 'HIGH' : 'AVG'
  return `<div style="padding:8px 10px;margin-bottom:6px;background:#0D1A2F;border-radius:6px;border-left:3px solid ${sev};display:flex;justify-content:space-between">
    <span style="color:${C.text};font-size:13px">${p.name ?? p.description ?? 'Problema desconhecido'} <span style="color:${C.muted}">(${p.host ?? ''})</span></span>
    ${pill(label, sev)}
  </div>`
}

function scoreBar(pct: number, color: string) {
  return `
<div style="height:10px;background:#0D1A2F;border-radius:5px;overflow:hidden;margin:4px 0 8px">
  <div style="width:${pct}%;height:100%;background:${color};border-radius:5px"></div>
</div>`
}

function insightCard(ins: any) {
  const color = ins.priority === 'critical' ? C.red : ins.priority === 'high' ? '#F97316' : ins.priority === 'medium' ? C.yellow : C.green
  return `
<div style="margin-bottom:12px;padding:14px;background:#0D1A2F;border-radius:8px;border-left:3px solid ${color}">
  <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">${ins.area}</div>
  <div style="font-size:13px;color:${C.text};margin-bottom:6px"><strong>Análise:</strong> ${ins.analysis}</div>
  <div style="font-size:13px;color:${C.muted};margin-bottom:6px"><strong style="color:${C.text}">Impacto:</strong> ${ins.impact}</div>
  <div style="font-size:13px;color:${C.blue}"><strong style="color:${C.text}">Recomendação:</strong> ${ins.recommendation}</div>
</div>`
}

function opportunityCard(op: any) {
  const color = PRIORITY_MAP[op.estimatedPriority] ?? C.blue
  return `
<div style="margin-bottom:12px;padding:14px;background:#0D1A2F;border-radius:8px;border:1px solid ${C.border}">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
    <div style="font-size:14px;font-weight:700;color:${C.white}">${op.title}</div>
    ${pill('Prioridade ' + op.estimatedPriority, color)}
  </div>
  <div style="font-size:13px;color:${C.muted};margin-bottom:6px">${op.justification}</div>
  <div style="font-size:13px;color:${C.blue}">💡 ${op.operationalImpact}</div>
</div>`
}

function actionRow(a: any, i: number) {
  const pcolor = a.priority.includes('P1') ? C.red : a.priority.includes('P2') ? '#F97316' : a.priority.includes('P3') ? C.yellow : C.muted
  const bg = i % 2 === 0 ? '#0D1A2F' : '#0A1629'
  return `
<tr style="background:${bg}">
  <td style="padding:10px 12px;border-bottom:1px solid ${C.border};color:${C.text};font-size:13px">${a.action}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${C.border};color:${C.muted};font-size:12px;white-space:nowrap">${a.owner}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:11px;white-space:nowrap">${pill(a.priority, pcolor)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${C.border};color:${C.muted};font-size:12px;white-space:nowrap">${a.deadline}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${C.border};color:${C.muted};font-size:12px">${a.status}</td>
</tr>`
}

// ── Main HTML builder ──────────────────────────────────────────────────────
function buildHTML(r: any): string {
  const farol = FAROL_MAP[r.farol as keyof typeof FAROL_MAP] ?? FAROL_MAP.amarelo
  const score = r.healthScore ?? 0
  const scoreColor = score >= 80 ? C.green : score >= 60 ? C.yellow : C.red
  const bd = r.healthScoreBreakdown ?? {}
  const z = r.zabbix
  const dd = r.datadog
  const gl = r.glpi
  const ji = r.jira
  const cr = r.crm
  const sm = r.serviceMetrics ?? {}
  const insights: any[] = r.insights ?? []
  const ops: any[] = r.opportunities ?? []
  const plan: any[] = r.actionPlan ?? []
  const un = r.unavailable ?? {}
  const sql: any[] = r.sqlProblems ?? []

  const generatedAt = new Date(r.generatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short' })

  // ── Section A — Backup / DR / HA ──────────────────────────────────────────
  const sectionA = sec('A. Backup, DR e Alta Disponibilidade', `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" style="padding:0 8px 0 0">
          <div style="background:#0D1A2F;border-radius:8px;padding:14px">
            <div style="font-size:12px;font-weight:700;color:${C.muted};margin-bottom:8px;text-transform:uppercase">Backup (Veeam)</div>
            ${unavailableBlock(un.backup?.reason)}
          </div>
        </td>
        <td width="33%" style="padding:0 4px">
          <div style="background:#0D1A2F;border-radius:8px;padding:14px">
            <div style="font-size:12px;font-weight:700;color:${C.muted};margin-bottom:8px;text-transform:uppercase">Disaster Recovery</div>
            ${unavailableBlock(un.dr?.reason)}
          </div>
        </td>
        <td width="34%" style="padding:0 0 0 8px">
          <div style="background:#0D1A2F;border-radius:8px;padding:14px">
            <div style="font-size:12px;font-weight:700;color:${C.muted};margin-bottom:8px;text-transform:uppercase">Alta Disponibilidade</div>
            ${unavailableBlock(un.ha?.reason)}
          </div>
        </td>
      </tr>
    </table>
  `, C.red)

  // ── Section B — Banco de Dados ────────────────────────────────────────────
  const sqlContent = sql.length > 0
    ? sql.map(problemRow).join('')
    : unavailableBlock(un.sqlServer?.reason)

  const sectionB = sec('B. Banco de Dados — SQL Server / YugabyteDB / RabbitMQ', `
    <div style="font-size:12px;font-weight:700;color:${C.muted};margin-bottom:8px;text-transform:uppercase">SQL Server (via Zabbix alerts)</div>
    ${sqlContent}
    <div style="margin-top:12px;font-size:12px;font-weight:700;color:${C.muted};margin-bottom:8px;text-transform:uppercase">YugabyteDB</div>
    ${unavailableBlock(un.yugabyte?.reason)}
    <div style="margin-top:12px;font-size:12px;font-weight:700;color:${C.muted};margin-bottom:8px;text-transform:uppercase">RabbitMQ</div>
    ${unavailableBlock(un.rabbitmq?.reason)}
  `, C.blue)

  // ── Section C — Kubernetes ─────────────────────────────────────────────────
  const sectionC = sec('C. Kubernetes / RKE', `
    ${unavailableBlock(un.kubernetes?.reason)}
  `, '#A78BFA')

  // ── Section D — Storage / VPN ──────────────────────────────────────────────
  const storageProblems = (z?.criticalProblems ?? []).filter((p: any) =>
    /storage|disk|vol|filesystem|space|lun/i.test(p.name ?? '')
  )
  const vpnProblems = (z?.criticalProblems ?? []).filter((p: any) =>
    /vpn|tunnel|ipsec|mpls|wan|link|connect/i.test(p.name ?? '')
  )

  const sectionD = sec('D. Storage e Conectividade VPN', `
    <div style="font-size:12px;font-weight:700;color:${C.muted};margin-bottom:8px;text-transform:uppercase">Storage (via Zabbix)</div>
    ${storageProblems.length > 0 ? storageProblems.map(problemRow).join('') : `<div style="color:${C.green};font-size:13px;padding:6px 0">✓ Nenhum alerta de storage identificado</div>`}
    <div style="margin-top:12px;font-size:12px;font-weight:700;color:${C.muted};margin-bottom:8px;text-transform:uppercase">Conectividade / VPN</div>
    ${vpnProblems.length > 0 ? vpnProblems.map(problemRow).join('') : unavailableBlock(un.vpn?.reason)}
  `, C.yellow)

  // ── Farol header ──────────────────────────────────────────────────────────
  const farolBlock = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
  <tr><td style="padding:20px 24px;background:${farol.color}18;border-radius:10px;border:2px solid ${farol.color};text-align:center">
    <div style="font-size:48px;margin-bottom:6px">${farol.emoji}</div>
    <div style="font-size:20px;font-weight:800;color:${farol.color};letter-spacing:1px">${farol.label}</div>
    <div style="font-size:13px;color:${C.muted};margin-top:8px;max-width:540px;margin-left:auto;margin-right:auto">${r.executiveSummary ?? ''}</div>
  </td></tr>
</table>`

  // ── Health Score ──────────────────────────────────────────────────────────
  const breakdown = Object.entries(bd).map(([k, v]: [string, any]) => {
    const maxMap: Record<string, number> = { sla: 25, disponibilidade: 20, chamados: 20, observabilidade: 15, infraestrutura: 20, backup: 15, seguranca: 5, storage: 10, dr: 15 }
    const max = maxMap[k] ?? 20
    const pct = Math.round((v / max) * 100)
    const col = pct >= 80 ? C.green : pct >= 50 ? C.yellow : C.red
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span style="font-size:12px;color:${C.muted};text-transform:capitalize">${k.replace(/_/g, ' ')}</span>
        <span style="font-size:12px;font-weight:700;color:${col}">${v}/${max}</span>
      </div>${scoreBar(pct, col)}</div>`
  }).join('')

  const healthBlock = sec('Health Score Executivo', `
<div style="text-align:center;margin-bottom:20px">
  <div style="font-size:56px;font-weight:900;color:${scoreColor};letter-spacing:-2px">${score}</div>
  <div style="font-size:15px;color:${C.muted}">/100 — ${score >= 80 ? 'Excelente' : score >= 60 ? 'Moderado' : 'Crítico'}</div>
  ${scoreBar(score, scoreColor)}
</div>
<div>${breakdown}</div>
  `)

  // ── Zabbix ────────────────────────────────────────────────────────────────
  let zabbixSection = ''
  if (z) {
    const critProbs: any[] = z.criticalProblems ?? []
    zabbixSection = sec('Infraestrutura — Zabbix Monitoring', `
${grid4([
  { label: 'Problemas Ativos', value: z.totalProblems, color: z.totalProblems > 0 ? C.yellow : C.green },
  { label: 'Críticos/Disaster', value: z.critical ?? 0, color: z.critical > 0 ? C.red : C.green },
  { label: 'Hosts Online', value: `${z.hostsUp}/${z.hostsTotal}`, color: z.hostsDown > 0 ? C.yellow : C.green },
  { label: 'Disponibilidade', value: `${z.availability}%`, color: z.availability >= 99 ? C.green : z.availability >= 95 ? C.yellow : C.red },
])}
${critProbs.length > 0 ? `<div style="margin-top:14px;font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;margin-bottom:8px">Problemas Críticos</div>${critProbs.map(problemRow).join('')}` : `<div style="margin-top:12px;color:${C.green};font-size:13px">✓ Nenhum problema crítico ativo</div>`}
    `, C.orange)
  }

  // ── Datadog ───────────────────────────────────────────────────────────────
  let datadogSection = ''
  if (dd) {
    const alertMons: any[] = dd.alertMonitors ?? []
    datadogSection = sec('Observabilidade — Datadog', `
${grid4([
  { label: 'Monitors OK', value: dd.ok, color: C.green },
  { label: 'Warning', value: dd.warn, color: C.yellow },
  { label: 'Alert', value: dd.alert, color: dd.alert > 0 ? C.red : C.green },
  { label: 'Total Monitors', value: dd.totalMonitors, color: C.blue },
])}
${alertMons.length > 0 ? `<div style="margin-top:14px;font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;margin-bottom:8px">Monitors em Alerta</div>${alertMons.map((m: any) => `<div style="padding:8px 10px;margin-bottom:5px;background:#0D1A2F;border-radius:6px;border-left:3px solid ${C.red};color:${C.text};font-size:13px">${m.name}</div>`).join('')}` : ''}
    `, C.blue)
  }

  // ── GLPI ──────────────────────────────────────────────────────────────────
  const glpiSection = gl ? sec('Suporte — GLPI Chamados', `
${grid4([
  { label: 'Total de Chamados', value: gl.total, color: C.text },
  { label: 'Em Aberto', value: gl.open, color: gl.open > 0 ? C.yellow : C.green },
  { label: 'Críticos', value: gl.critical, color: gl.critical > 0 ? C.red : C.green },
  { label: 'Sem Atendimento', value: gl.unattended, color: gl.unattended > 5 ? C.red : gl.unattended > 0 ? C.yellow : C.green },
])}`) : ''

  // ── Jira ──────────────────────────────────────────────────────────────────
  const jiraSection = ji ? sec('Projetos — Jira', `
${grid4([
  { label: 'Atividades Abertas', value: ji.open, color: C.text },
  { label: 'Vencidas', value: ji.overdue, color: ji.overdue > 0 ? C.red : C.green },
  { label: 'Concluídas', value: ji.done ?? ji.completed, color: C.green },
  { label: 'Sem Responsável', value: ji.unassigned, color: ji.unassigned > 3 ? C.yellow : C.green },
])}`) : ''

  // ── CRM ───────────────────────────────────────────────────────────────────
  const crmSection = cr ? sec('CRM — HubSpot', `
${grid4([
  { label: 'Total Contatos', value: cr.total, color: C.text },
  { label: 'Clientes Ativos', value: cr.clientes, color: C.green },
  { label: 'Oportunidades', value: cr.oportunidades, color: C.orange },
  { label: 'Novos (7 dias)', value: cr.novosUltimos7, color: C.blue },
])}`) : ''

  // ── Service Metrics ───────────────────────────────────────────────────────
  const metricsSection = sec('Métricas de Serviço (MTTA / MTTR / SLA)', `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:0 8px 0 0">
      <div style="background:#0D1A2F;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:11px;color:${C.muted};text-transform:uppercase;margin-bottom:6px">MTTA</div>
        <div style="font-size:16px;font-weight:700;color:${sm.mtta?.includes('fora') ? C.red : C.green}">${sm.mtta ?? 'N/D'}</div>
      </div>
    </td>
    <td style="padding:0 4px">
      <div style="background:#0D1A2F;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:11px;color:${C.muted};text-transform:uppercase;margin-bottom:6px">MTTR</div>
        <div style="font-size:16px;font-weight:700;color:${C.muted}">${sm.mttr ?? 'N/D'}</div>
      </div>
    </td>
    <td style="padding:0 0 0 8px">
      <div style="background:#0D1A2F;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:11px;color:${C.muted};text-transform:uppercase;margin-bottom:6px">SLA Status</div>
        <div style="font-size:16px;font-weight:700;color:${sm.slaStatus === 'Em risco' ? C.red : sm.slaStatus === 'Atenção' ? C.yellow : C.green}">${sm.slaStatus ?? 'N/D'}</div>
      </div>
    </td>
  </tr>
</table>
  `, C.blue)

  // ── AI Insights ───────────────────────────────────────────────────────────
  const insightsSection = insights.length > 0 ? sec('Análise de Inteligência Operacional (AI)', insights.map(insightCard).join(''), '#A78BFA') : ''

  // ── Opportunities ─────────────────────────────────────────────────────────
  const opsSection = ops.length > 0 ? sec('Oportunidades Comerciais Identificadas', ops.map(opportunityCard).join(''), C.orange) : ''

  // ── Action Plan ───────────────────────────────────────────────────────────
  const planSection = plan.length > 0 ? sec('Plano de Ação', `
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
  <tr style="background:#0A1629">
    <th style="padding:10px 12px;text-align:left;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Ação</th>
    <th style="padding:10px 12px;text-align:left;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Responsável</th>
    <th style="padding:10px 12px;text-align:left;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Prioridade</th>
    <th style="padding:10px 12px;text-align:left;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Prazo</th>
    <th style="padding:10px 12px;text-align:left;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Status</th>
  </tr>
  ${plan.map(actionRow).join('')}
</table>`) : ''

  // ── Closing ───────────────────────────────────────────────────────────────
  const closing = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
  <tr><td style="padding:20px;background:${C.container};border-radius:10px;text-align:center">
    <div style="font-size:14px;color:${C.muted}">Este relatório é gerado automaticamente pelo <strong style="color:${C.orange}">Leonardo CS Cockpit</strong>.<br>Dúvidas? Entre em contato com seu CSM XTENTGROUP.</div>
    <div style="margin-top:10px;font-size:12px;color:#4A6380">Gerado em: ${generatedAt} (Horário de Brasília)</div>
  </td></tr>
</table>`

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório Executivo Completo — XTENTGROUP</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;margin:0 auto;padding:20px">
  <!-- Header -->
  <tr><td style="padding:28px 0 20px;text-align:center">
    <div style="display:inline-block;background:${C.orange};color:${C.white};font-size:11px;font-weight:800;letter-spacing:2px;padding:4px 14px;border-radius:20px;margin-bottom:12px">XTENTGROUP CSM INTEL</div>
    <div style="font-size:26px;font-weight:900;color:${C.white}">Relatório Executivo Completo</div>
    <div style="font-size:14px;color:${C.muted};margin-top:4px">Portfolio Overview — Todos os Clientes</div>
    <div style="font-size:12px;color:#4A6380;margin-top:6px">${generatedAt}</div>
  </td></tr>
  <!-- Content -->
  <tr><td>
    ${farolBlock}
    ${healthBlock}
    ${metricsSection}
    ${zabbixSection}
    ${datadogSection}
    ${glpiSection}
    ${jiraSection}
    ${crmSection}
    ${sectionA}
    ${sectionB}
    ${sectionC}
    ${sectionD}
    ${insightsSection}
    ${opsSection}
    ${planSection}
    ${closing}
  </td></tr>
</table>
</body></html>`
}

// ── Email sender ───────────────────────────────────────────────────────────
async function sendEmail(html: string) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { ciphers: 'SSLv3' },
  })

  const to = process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? ''
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: `🔵 Relatório Executivo Completo XTENTGROUP — ${new Date().toLocaleDateString('pt-BR')}`,
    html,
  })
  return to
}

// ── Handler ────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const url = new URL(req.url)
  const preview = url.searchParams.get('preview') === 'true'

  const base = BASE()
  const res = await fetch(`${base}/api/reports/executive-full`, { cache: 'no-store' })
  if (!res.ok) return NextResponse.json({ error: 'Falha ao coletar dados do relatório' }, { status: 500 })
  const report = await res.json()

  const html = buildHTML(report)

  if (preview) {
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }

  try {
    const to = await sendEmail(html)
    return NextResponse.json({ ok: true, sentTo: to, farol: report.farol, healthScore: report.healthScore, generatedAt: report.generatedAt })
  } catch (err: any) {
    return NextResponse.json({ error: 'Falha ao enviar email', details: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (body.preview) {
    const base = BASE()
    const res = await fetch(`${base}/api/reports/executive-full`, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: 'Falha ao coletar dados' }, { status: 500 })
    const report = await res.json()
    const html = buildHTML(report)
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }
  return NextResponse.json({ error: 'Body inválido. Use { "preview": true }' }, { status: 400 })
}
