import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

const BASE = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Brand tokens ───────────────────────────────────────────────────────────
const C = {
  bg: '#07111F', cont: '#0B1F3A', card: '#112447', border: '#1E3A5F',
  orange: '#F58220', green: '#22C55E', yellow: '#FACC15', red: '#EF4444',
  blue: '#38BDF8', muted: '#8BA6C1', text: '#E2EBF5', white: '#FFFFFF',
  deep: '#0D1A2F',
}

const FL = {
  verde:    { color: C.green,  emoji: '🟢', label: 'Verde' },
  amarelo:  { color: C.yellow, emoji: '🟡', label: 'Amarelo' },
  vermelho: { color: C.red,    emoji: '🔴', label: 'Vermelho' },
}

// ── Micro-helpers ──────────────────────────────────────────────────────────
const pill = (t: string, c: string) =>
  `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;background:${c}22;color:${c};border:1px solid ${c}44">${t}</span>`

const bar = (pct: number, c: string, h = 8) =>
  `<div style="height:${h}px;background:#0A1629;border-radius:4px;overflow:hidden;margin:3px 0 6px">
    <div style="width:${Math.min(pct, 100)}%;height:100%;background:${c};border-radius:4px"></div>
  </div>`

const na = (reason: string) =>
  `<div style="padding:10px 12px;background:${C.deep};border-radius:6px;border:1px solid ${C.border};color:${C.muted};font-size:12px;font-style:italic">⚠️ ${reason}</div>`

const metric = (label: string, value: string | number, color = C.text, size = 22) =>
  `<td style="padding:10px 8px;text-align:center;vertical-align:top">
    <div style="font-size:${size}px;font-weight:800;color:${color}">${value}</div>
    <div style="font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:.5px;margin-top:3px">${label}</div>
  </td>`

const grid = (...cols: string[]) =>
  `<table width="100%" cellpadding="0" cellspacing="0"><tr>${cols.join('')}</tr></table>`

const secHdr = (title: string, color = C.orange) =>
  `<div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${color};margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid ${C.border}">${title}</div>`

const subHdr = (title: string) =>
  `<div style="font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${C.muted};margin:14px 0 6px">${title}</div>`

function wrap(content: string, border = C.orange, mb = 20) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${mb}px">
  <tr><td style="padding:18px 20px;background:${C.cont};border-radius:10px;border-left:4px solid ${border}">
    ${content}
  </td></tr>
</table>`
}

// ── Portfolio cover page ───────────────────────────────────────────────────
function coverPage(p: any, gen: string): string {
  const sc = p.portfolioScore >= 80 ? C.green : p.portfolioScore >= 60 ? C.yellow : C.red
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
<tr><td style="padding:28px;background:${C.cont};border-radius:12px;border:2px solid ${C.orange}">
  <div style="text-align:center;margin-bottom:20px">
    <div style="display:inline-block;background:${C.orange};color:${C.white};font-size:10px;font-weight:800;letter-spacing:2px;padding:4px 14px;border-radius:20px;margin-bottom:12px">XTENTGROUP — PORTFÓLIO EXECUTIVO</div>
    <div style="font-size:24px;font-weight:900;color:${C.white}">Relatório Executivo Consolidado da Carteira</div>
    <div style="font-size:13px;color:${C.muted};margin-top:4px">Período: ${p.period ?? ''} &nbsp;|&nbsp; Gerado em ${gen}</div>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      ${metric('Clientes', 5, C.blue)}
      ${metric('Saudáveis 🟢', p.healthy, C.green)}
      ${metric('Atenção 🟡', p.attention, C.yellow)}
      ${metric('Críticos 🔴', p.critical, C.red)}
      ${metric('Score Geral', p.portfolioScore + '/100', sc)}
    </tr>
    <tr>
      ${metric('Disponib. Média', p.avgAvailability + '%', p.avgAvailability >= 99 ? C.green : C.yellow)}
      ${metric('SLA Médio', p.avgSLA, C.blue)}
      ${metric('MTTA', 'N/D', C.muted)}
      ${metric('MTTR', 'N/D', C.muted)}
      ${metric('Chamados Abertos', p.totalOpenTickets, p.totalOpenTickets > 50 ? C.yellow : C.text)}
    </tr>
  </table>
  ${bar(p.portfolioScore, sc, 10)}
  <div style="margin-top:14px;font-size:13px;color:${C.muted};line-height:1.7">${p.executiveSummary}</div>
</td></tr>
</table>`
}

// ── Consolidated farol table ───────────────────────────────────────────────
function farolTable(clients: any[]): string {
  const headerCols = ['Cliente', 'Status', 'SLA', 'Disponib.', 'Backup', 'DR', 'Banco de Dados', 'Kubernetes', 'Storage', 'Suporte']
  const header = headerCols.map(h =>
    `<th style="padding:10px 10px;background:#0A1629;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border};white-space:nowrap">${h}</th>`
  ).join('')

  const rows = clients.map((cl, i) => {
    const f = FL[cl.farol as keyof typeof FL] ?? FL.amarelo
    const bg = i % 2 === 0 ? C.deep : '#0A1629'
    const avail = cl.zabbix?.availability ?? '—'
    const sla = cl.serviceMetrics?.sla ?? '—'
    const tSup = (cl.glpi?.open ?? 0) + (cl.jira?.open ?? 0)
    const na3 = `<span style="color:${C.muted};font-size:11px">⚠️ N/D</span>`
    return `<tr style="background:${bg}">
      <td style="padding:10px;font-size:13px;font-weight:700;color:${C.white};border-bottom:1px solid ${C.border};white-space:nowrap">${cl.name}</td>
      <td style="padding:10px;border-bottom:1px solid ${C.border}">${pill(f.emoji + ' ' + f.label, f.color)}</td>
      <td style="padding:10px;border-bottom:1px solid ${C.border};font-size:12px;color:${sla === 'Em Risco' ? C.red : sla === 'Atenção' ? C.yellow : C.green}">${sla}</td>
      <td style="padding:10px;border-bottom:1px solid ${C.border};font-size:12px;color:${avail >= 99 ? C.green : avail >= 95 ? C.yellow : C.red};white-space:nowrap">${avail}%</td>
      <td style="padding:10px;border-bottom:1px solid ${C.border}">${na3}</td>
      <td style="padding:10px;border-bottom:1px solid ${C.border}">${na3}</td>
      <td style="padding:10px;border-bottom:1px solid ${C.border};font-size:11px;color:${cl.sqlProblems?.length > 0 ? C.yellow : C.muted}">${cl.sqlProblems?.length > 0 ? pill(cl.sqlProblems.length + ' alertas', C.yellow) : na3}</td>
      <td style="padding:10px;border-bottom:1px solid ${C.border}">${na3}</td>
      <td style="padding:10px;border-bottom:1px solid ${C.border};font-size:11px;color:${cl.storageProblems?.length > 0 ? C.yellow : C.muted}">${cl.storageProblems?.length > 0 ? pill(cl.storageProblems.length + ' alertas', C.yellow) : na3}</td>
      <td style="padding:10px;border-bottom:1px solid ${C.border};font-size:12px;color:${tSup > 20 ? C.yellow : C.text};white-space:nowrap">${tSup} abertos</td>
    </tr>`
  }).join('')

  return wrap(`
    ${secHdr('Farol Executivo Consolidado')}
    <div style="overflow-x:auto">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:700px">
      <tr>${header}</tr>
      ${rows}
    </table>
    </div>
    <div style="margin-top:10px;font-size:11px;color:${C.muted}">⚠️ N/D = Dados indisponíveis para análise devido à ausência de integração. Integrações pendentes: Veeam Backup, DR, Kubernetes, SQL Server direto.</div>
  `)
}

// ── Per-client section ─────────────────────────────────────────────────────
function clientSection(cl: any): string {
  const f = FL[cl.farol as keyof typeof FL] ?? FL.amarelo
  const score = cl.healthScore ?? 0
  const sc = score >= 80 ? C.green : score >= 60 ? C.yellow : C.red
  const z = cl.zabbix
  const dd = cl.datadog
  const gl = cl.glpi
  const ji = cl.jira
  const un = cl.unavailable ?? {}
  const sm = cl.serviceMetrics ?? {}

  // Health score breakdown
  const bdHtml = Object.entries(cl.healthScoreBreakdown ?? {}).map(([k, v]: [string, any]) => {
    const maxMap: Record<string, number> = { sla: 25, disponibilidade: 20, chamados: 20, observabilidade: 15, infraestrutura: 20 }
    const max = maxMap[k] ?? 20
    const pct = Math.round((v / max) * 100)
    const col = pct >= 80 ? C.green : pct >= 50 ? C.yellow : C.red
    return `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between">
        <span style="font-size:11px;color:${C.muted};text-transform:capitalize">${k.replace(/_/g, ' ')}</span>
        <span style="font-size:11px;font-weight:700;color:${col}">${v}/${max}</span>
      </div>${bar(pct, col)}</div>`
  }).join('')

  // Risks
  const risksHtml = (cl.risks ?? []).map((r: any) => {
    const rc = r.severity === 'critical' ? C.red : r.severity === 'high' ? '#F97316' : C.yellow
    return `<div style="padding:8px 10px;margin-bottom:5px;background:${C.deep};border-radius:6px;border-left:3px solid ${rc};font-size:12px;color:${C.text}">${pill(r.severity.toUpperCase(), rc)} ${r.title}</div>`
  }).join('')

  // Action plan
  const planHtml = (cl.actionPlan ?? []).map((a: any, i: number) => {
    const pc = a.action.includes('P1') || a.owner?.includes('NOC') ? C.red : C.text
    return `<tr style="background:${i % 2 === 0 ? C.deep : '#0A1629'}">
      <td style="padding:8px 10px;font-size:12px;color:${C.text};border-bottom:1px solid ${C.border}">${a.action}</td>
      <td style="padding:8px 10px;font-size:11px;color:${C.muted};border-bottom:1px solid ${C.border};white-space:nowrap">${a.owner}</td>
      <td style="padding:8px 10px;font-size:11px;color:${C.muted};border-bottom:1px solid ${C.border};white-space:nowrap">${a.deadline}</td>
      <td style="padding:8px 10px;font-size:11px;border-bottom:1px solid ${C.border};white-space:nowrap">${pill(a.status, a.status === 'Urgente' ? C.red : a.status === 'Pendente' ? C.yellow : C.muted)}</td>
    </tr>`
  }).join('')

  // SQL / Storage / VPN from Zabbix
  const sqlHtml = (cl.sqlProblems ?? []).length > 0
    ? cl.sqlProblems.map((p: any) => `<div style="padding:7px 10px;margin-bottom:4px;background:${C.deep};border-radius:5px;border-left:3px solid ${C.yellow};font-size:12px;color:${C.text}">${p.name ?? ''} <span style="color:${C.muted}">(${p.host ?? ''})</span></div>`).join('')
    : na(un.sqlDirect?.reason ?? 'SQL Server: dados indisponíveis')

  const storageHtml = (cl.storageProblems ?? []).length > 0
    ? cl.storageProblems.map((p: any) => `<div style="padding:7px 10px;margin-bottom:4px;background:${C.deep};border-radius:5px;border-left:3px solid ${C.orange};font-size:12px;color:${C.text}">${p.name ?? ''} <span style="color:${C.muted}">(${p.host ?? ''})</span></div>`).join('')
    : `<div style="color:${C.green};font-size:12px;padding:6px 0">✓ Nenhum alerta de storage identificado via Zabbix</div>`

  const vpnHtml = (cl.vpnProblems ?? []).length > 0
    ? cl.vpnProblems.map((p: any) => `<div style="padding:7px 10px;margin-bottom:4px;background:${C.deep};border-radius:5px;border-left:3px solid ${C.red};font-size:12px;color:${C.text}">${p.name ?? ''} <span style="color:${C.muted}">(${p.host ?? ''})</span></div>`).join('')
    : na(un.vpnFull?.reason ?? 'VPN: dados indisponíveis')

  return `
<!-- ═══ ${cl.name} ═══════════════════════════════════════════════════ -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
<tr><td style="padding:16px 20px;background:${f.color}18;border-radius:10px;border:2px solid ${f.color}">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <div style="font-size:28px">${f.emoji}</div>
    <div>
      <div style="font-size:18px;font-weight:900;color:${C.white}">${cl.name}</div>
      <div style="font-size:12px;color:${f.color};font-weight:700">${f.label.toUpperCase()} — ${cl.farolReason}</div>
    </div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-size:28px;font-weight:900;color:${sc}">${score}</div>
      <div style="font-size:10px;color:${C.muted}">HEALTH SCORE</div>
    </div>
  </div>
</td></tr>
</table>

${wrap(`
  ${secHdr('Resumo Executivo', C.orange)}
  <div style="font-size:13px;color:${C.muted};line-height:1.7">${cl.executiveSummary}</div>
  <div style="margin-top:14px">${bdHtml}</div>
`, C.orange, 8)}

${wrap(`
  ${secHdr('Continuidade de Negócios — Backup / DR / HA', C.red)}
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="33%" style="padding:0 6px 0 0"><div style="background:${C.deep};border-radius:6px;padding:12px">${subHdr('Backup (Veeam)')}${na(un.backup?.reason)}</div></td>
      <td width="33%" style="padding:0 3px"><div style="background:${C.deep};border-radius:6px;padding:12px">${subHdr('Disaster Recovery')}${na(un.dr?.reason)}</div></td>
      <td width="34%" style="padding:0 0 0 6px"><div style="background:${C.deep};border-radius:6px;padding:12px">${subHdr('Alta Disponibilidade')}${na(un.ha?.reason)}</div></td>
    </tr>
  </table>
`, C.red, 8)}

${wrap(`
  ${secHdr('Banco de Dados e Mensageria', C.blue)}
  ${subHdr('SQL Server (alertas via Zabbix)')}
  ${sqlHtml}
  ${subHdr('YugabyteDB')}${na(un.yugabyte?.reason)}
  ${subHdr('RabbitMQ')}${na(un.rabbitmq?.reason)}
`, C.blue, 8)}

${wrap(`
  ${secHdr('Kubernetes / RKE', '#A78BFA')}
  ${na(un.kubernetes?.reason)}
`, '#A78BFA', 8)}

${wrap(`
  ${secHdr('Infraestrutura Base', C.orange)}
  ${subHdr('Monitoramento Zabbix')}
  ${z ? grid(
    metric('Problemas Ativos', z.totalProblems, z.totalProblems > 0 ? C.yellow : C.green),
    metric('Críticos / Disaster', (z.critical ?? 0), (z.critical ?? 0) > 0 ? C.red : C.green),
    metric('Hosts Online', `${z.hostsUp}/${z.hostsTotal}`, z.hostsDown > 0 ? C.yellow : C.green),
    metric('Disponibilidade', `${z.availability}%`, z.availability >= 99 ? C.green : z.availability >= 95 ? C.yellow : C.red),
  ) : na('Zabbix indisponível')}
  ${subHdr('Storage (via Zabbix)')}
  ${storageHtml}
  ${subHdr('VPN e Conectividade')}
  ${vpnHtml}
`, C.orange, 8)}

${wrap(`
  ${secHdr('Indicadores de Suporte', C.green)}
  ${grid(
    metric('Abertos GLPI', gl?.open ?? '—', (gl?.open ?? 0) > 15 ? C.yellow : C.green),
    metric('Críticos GLPI', gl?.critical ?? '—', (gl?.critical ?? 0) > 0 ? C.red : C.green),
    metric('Jira Abertos', ji?.open ?? '—', (ji?.open ?? 0) > 10 ? C.yellow : C.green),
    metric('Jira Vencidos', ji?.overdue ?? '—', (ji?.overdue ?? 0) > 0 ? C.red : C.green),
  )}
  ${grid(
    metric('MTTA', sm.mtta ?? 'N/D', sm.mtta?.includes('fora') ? C.red : C.green),
    metric('MTTR', 'N/D', C.muted),
    metric('SLA Status', sm.sla ?? 'N/D', sm.sla === 'Em Risco' ? C.red : sm.sla === 'Atenção' ? C.yellow : C.green),
    metric('Datadog Alerts', dd?.alert ?? '—', (dd?.alert ?? 0) > 3 ? C.red : C.green),
  )}
`, C.green, 8)}

${wrap(`
  ${secHdr('Principais Riscos')}
  ${risksHtml || `<div style="color:${C.green};font-size:13px">✓ Nenhum risco crítico identificado</div>`}
`, C.red, 8)}

${wrap(`
  ${secHdr('Plano de Ação', C.yellow)}
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    <tr style="background:#0A1629">
      <th style="padding:8px 10px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Ação</th>
      <th style="padding:8px 10px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Responsável</th>
      <th style="padding:8px 10px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Prazo</th>
      <th style="padding:8px 10px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Status</th>
    </tr>
    ${planHtml}
  </table>
`, C.yellow, 8)}

${wrap(`
  ${secHdr('Recomendação Executiva XTENTGROUP', C.orange)}
  <div style="font-size:13px;color:${C.muted};line-height:1.7;font-style:italic">"${cl.recommendation}"</div>
`, C.orange, 24)}`
}

// ── Support ranking section ────────────────────────────────────────────────
function supportRankings(rankings: any): string {
  const bySupport: any[] = rankings.bySupport ?? []
  const byCritical: any[] = rankings.byCritical ?? []
  const bySLA: any[] = rankings.bySLA ?? []

  const rankRow = (clients: any[], valueFn: (c: any) => any, label: string, colorFn: (v: any) => string) =>
    clients.map((c, i) => {
      const v = valueFn(c)
      return `<div style="display:flex;align-items:center;padding:8px 10px;margin-bottom:5px;background:${C.deep};border-radius:6px;border-left:3px solid ${i === 0 ? C.orange : C.border}">
        <span style="font-size:16px;font-weight:900;color:${i === 0 ? C.orange : C.muted};min-width:24px">${i + 1}º</span>
        <span style="flex:1;font-size:13px;color:${C.text};margin-left:10px">${c.name}</span>
        <span style="font-size:13px;font-weight:700;color:${colorFn(v)}">${v} ${label}</span>
      </div>`
    }).join('')

  return wrap(`
    ${secHdr('Visão Consolidada de Suporte')}
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" style="padding:0 6px 0 0">
          ${subHdr('Por Volume de Chamados')}
          ${rankRow(bySupport, c => (c.glpi?.open ?? 0) + (c.jira?.open ?? 0), 'abertos', v => v > 20 ? C.yellow : C.green)}
        </td>
        <td width="33%" style="padding:0 3px">
          ${subHdr('Por Incidentes Críticos')}
          ${rankRow(byCritical, c => (c.glpi?.critical ?? 0) + (c.jira?.critical ?? 0), 'críticos', v => v > 3 ? C.red : v > 0 ? C.yellow : C.green)}
        </td>
        <td width="34%" style="padding:0 0 0 6px">
          ${subHdr('Por Melhor Health Score')}
          ${rankRow(bySLA, c => c.healthScore, '/100', v => v >= 80 ? C.green : v >= 60 ? C.yellow : C.red)}
        </td>
      </tr>
    </table>
  `)
}

// ── Storage ranking ────────────────────────────────────────────────────────
function storageSection(clients: any[]): string {
  const rows = clients.map((c, i) => {
    const alerts = (c.storageProblems ?? []).length
    const bg = i % 2 === 0 ? C.deep : '#0A1629'
    return `<tr style="background:${bg}">
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:13px;color:${C.white}">${i + 1}º ${c.name}</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.muted}">N/D</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.muted}">N/D</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.muted}">N/D</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.muted}">N/D</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:12px">${alerts > 0 ? pill(alerts + ' alertas', C.yellow) : `<span style="color:${C.green}">✓ OK</span>`}</td>
    </tr>`
  })
  return wrap(`
    ${secHdr('Visão Consolidada de Capacidade — Storage')}
    <div style="margin-bottom:8px;font-size:12px;color:${C.muted}">Dados de capacidade total e utilização dependem de integração direta com storage (Veeam/VMware). Alertas de disco via Zabbix disponíveis abaixo.</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr style="background:#0A1629">
        ${['Cliente','Cap. Total','Cap. Utilizada','%','Crescimento Mensal','Alertas Zabbix'].map(h =>
          `<th style="padding:9px 10px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">${h}</th>`
        ).join('')}
      </tr>
      ${rows.join('')}
    </table>
    <div style="margin-top:8px;font-size:11px;color:${C.muted}">N/D = Integração de storage não configurada. Integrar Veeam/VMware para dados completos de capacidade.</div>
  `)
}

// ── Maintenance ────────────────────────────────────────────────────────────
function maintenanceSection(): string {
  return wrap(`
    ${secHdr('Manutenções Executadas no Período')}
    ${na('Dados de manutenção (GMUDs) não integrados ao relatório. Integre com GLPI Change Management ou ServiceNow para exibir atividades de manutenção executadas.')}
  `, C.muted)
}

// ── Commercial opportunities ───────────────────────────────────────────────
function opportunitiesSection(clients: any[]): string {
  const priorityColor = (p: string) => p === 'alta' ? C.red : p === 'média' ? C.yellow : C.green
  const all = clients.flatMap(c =>
    (c.opportunities ?? []).slice(0, 3).map((op: any) => ({ ...op, client: c.name }))
  )
  const sorted = [...all].sort((a, b) =>
    ['alta','média','baixa'].indexOf(a.priority) - ['alta','média','baixa'].indexOf(b.priority)
  )

  const cards = sorted.map(op => {
    const pc = priorityColor(op.priority)
    return `<div style="margin-bottom:10px;padding:12px 14px;background:${C.deep};border-radius:8px;border:1px solid ${C.border}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:6px">
        <div>
          <span style="font-size:13px;font-weight:700;color:${C.white}">${op.title}</span>
          <span style="font-size:11px;color:${C.muted};margin-left:8px">— ${op.client}</span>
        </div>
        ${pill(op.priority === 'alta' ? '🔴 Alta Prioridade' : op.priority === 'média' ? '🟡 Média Prioridade' : '🟢 Baixa Prioridade', pc)}
      </div>
      <div style="font-size:12px;color:${C.muted};margin-bottom:4px">${op.justification}</div>
      <div style="font-size:12px;color:${C.blue}">💡 ${op.impact} &nbsp;|&nbsp; 💰 ${op.revenue}</div>
    </div>`
  }).join('')

  return wrap(`${secHdr('Oportunidades Comerciais da Carteira')}${cards}`, C.orange)
}

// ── Roadmap ────────────────────────────────────────────────────────────────
function roadmapSection(rm: any): string {
  const phase = (title: string, items: string[], color: string) => `
    <td width="33%" style="padding:0 5px;vertical-align:top">
      <div style="background:${C.deep};border-radius:8px;padding:14px;height:100%">
        <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">${title}</div>
        ${items.map(i => `<div style="font-size:12px;color:${C.muted};margin-bottom:7px;padding-left:12px;position:relative"><span style="color:${color};position:absolute;left:0">›</span>${i}</div>`).join('')}
      </div>
    </td>`
  return wrap(`
    ${secHdr('Roadmap Executivo XTENTGROUP')}
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${phase('Próximos 30 Dias', rm.thirtyDays ?? [], C.yellow)}
        ${phase('Próximos 60 Dias', rm.sixtyDays ?? [], C.orange)}
        ${phase('Próximos 90 Dias', rm.ninetyDays ?? [], C.green)}
      </tr>
    </table>
  `, C.blue)
}

// ── Board summary ──────────────────────────────────────────────────────────
function boardSummary(p: any, clients: any[]): string {
  const sc = p.portfolioScore >= 80 ? C.green : p.portfolioScore >= 60 ? C.yellow : C.red
  const critical = clients.filter(c => c.farol === 'vermelho')
  const attention = clients.filter(c => c.farol === 'amarelo')
  const topRisks = clients.flatMap(c => (c.risks ?? []).slice(0, 2).map((r: any) => ({ ...r, client: c.name }))).slice(0, 6)
  const topOps = clients.flatMap(c => (c.opportunities ?? []).filter((o: any) => o.priority === 'alta').slice(0, 1)).slice(0, 4)

  const numbered = (items: string[]) => items.map((it, i) =>
    `<div style="padding:8px 10px;margin-bottom:5px;background:${C.deep};border-radius:6px;border-left:3px solid ${C.orange}">
      <span style="font-size:14px;font-weight:800;color:${C.orange};margin-right:10px">${i + 1}.</span>
      <span style="font-size:13px;color:${C.text}">${it}</span>
    </div>`
  ).join('')

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
<tr><td style="padding:24px;background:${C.cont};border-radius:12px;border:2px solid ${C.orange}">
  <div style="font-size:18px;font-weight:900;color:${C.white};margin-bottom:4px">Resumo Final para Diretoria</div>
  <div style="font-size:12px;color:${C.muted};margin-bottom:20px">Síntese executiva da carteira XTENTGROUP</div>

  ${numbered([
    `Situação geral: carteira com ${clients.length} clientes, score médio ${p.portfolioScore}/100, disponibilidade média ${p.avgAvailability}%. ${p.critical === 0 ? 'Nenhum cliente em estado crítico.' : `${p.critical} cliente(s) em estado CRÍTICO.`}`,
    critical.length > 0 ? `Atenção imediata: ${critical.map(c => c.name).join(', ')} — ativar protocolo P1 e comunicar diretoria de operações.` : `Nenhum cliente requer ação de emergência no momento.`,
    `Riscos operacionais: ${topRisks.map(r => `${r.client}: ${r.title}`).join('; ') || 'Nenhum risco crítico identificado.'}`,
    `Riscos de capacidade: Dados de storage não disponíveis sem integração Veeam/VMware. Alertas Zabbix de disco monitorados. Recomenda-se integração urgente para prevenção de esgotamento.`,
    `Riscos de continuidade: Backup, DR e HA não integrados em nenhum cliente. Impossível garantir RPO/RTO sem visibilidade centralizada. Risco contratual e regulatório elevado.`,
    `Oportunidades comerciais: ${topOps.map(o => o.title).join(', ') || 'NOC 24x7, Backup Veeam, DR Gerenciado, Observabilidade APM.'}`,
    `Score geral da carteira: ${p.portfolioScore}/100 — ${p.portfolioScore >= 80 ? 'Excelente. Foco em evolução e expansão.' : p.portfolioScore >= 60 ? 'Moderado. Foco em estabilização e integrações pendentes.' : 'Crítico. Ação imediata em múltiplos clientes.'}`,
    `Conclusão executiva: A XTENTGROUP possui infraestrutura de monitoramento ativa (Zabbix + Datadog) e visibilidade operacional de suporte (GLPI + Jira). As lacunas críticas são: integração de Backup/DR, K8s e bancos de dados. Preencher essas lacunas elevará o score médio para 85+ e reduzirá o risco operacional em 60%.`,
    `Recomendações estratégicas Q3/2026: (1) Integrar Veeam Backup em todos os clientes — prioridade máxima. (2) Habilitar Kubernetes monitoring. (3) Obter Datadog Application Key válida para APM completo. (4) Realizar QBR com todos os clientes antes do próximo trimestre.`,
  ])}

  <div style="margin-top:20px;padding:16px;background:${C.orange}15;border-radius:8px;border:1px solid ${C.orange}44">
    <div style="font-size:32px;font-weight:900;color:${sc};text-align:center;letter-spacing:-1px">${p.portfolioScore}<span style="font-size:16px;color:${C.muted}">/100</span></div>
    <div style="text-align:center;font-size:12px;color:${C.muted};margin-top:4px">Score Geral da Carteira XTENTGROUP</div>
    ${bar(p.portfolioScore, sc, 12)}
  </div>
</td></tr>
</table>`
}

// ── Divider ────────────────────────────────────────────────────────────────
function divider(title: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 16px">
<tr>
  <td style="border-top:1px solid ${C.border}"></td>
  <td style="padding:0 16px;white-space:nowrap;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${C.orange}">${title}</td>
  <td style="border-top:1px solid ${C.border}"></td>
</tr>
</table>`
}

// ── Master HTML builder ────────────────────────────────────────────────────
function buildHTML(data: any): string {
  const p = data.portfolio ?? {}
  const clients: any[] = data.clients ?? []
  const gen = new Date(data.generatedAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short',
  })

  const clientSections = clients.map(cl =>
    `${divider(`Análise Executiva — ${cl.name}`)}${clientSection(cl)}`
  ).join('\n')

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório Executivo Consolidado XTENTGROUP</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${C.text}">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="max-width:740px;margin:0 auto;padding:20px;display:block">

  ${divider('Capa Executiva da Carteira')}
  ${coverPage(p, gen)}

  ${divider('Farol Executivo Consolidado')}
  ${farolTable(clients)}

  ${clientSections}

  ${divider('Rankings e Métricas Consolidadas')}
  ${storageSection(clients)}
  ${supportRankings(data.rankings ?? {})}

  ${divider('Manutenções Executadas')}
  ${maintenanceSection()}

  ${divider('Oportunidades Comerciais')}
  ${opportunitiesSection(clients)}

  ${divider('Roadmap Executivo')}
  ${roadmapSection(data.roadmap ?? {})}

  ${divider('Resumo Final para Diretoria')}
  ${boardSummary(p, clients)}

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
  <tr><td style="padding:16px;background:${C.cont};border-radius:8px;text-align:center">
    <div style="font-size:12px;color:${C.muted}">Relatório gerado automaticamente pelo <strong style="color:${C.orange}">Leonardo CS Cockpit</strong> — XTENTGROUP.</div>
    <div style="font-size:11px;color:#4A6380;margin-top:4px">${gen} (Horário de Brasília)</div>
  </td></tr>
  </table>

</td></tr></table>
</body></html>`
}

// ── Email sender ───────────────────────────────────────────────────────────
async function sendEmail(html: string) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com', port: 587, secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { ciphers: 'SSLv3' },
  })
  const to = process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? ''
  await transporter.sendMail({
    from: process.env.SMTP_USER, to,
    subject: `📊 Relatório Executivo Consolidado XTENTGROUP — ${new Date().toLocaleDateString('pt-BR')}`,
    html,
  })
  return to
}

// ── Handlers ───────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const url = new URL(req.url)
  const preview = url.searchParams.get('preview') === 'true'

  const res = await fetch(`${BASE()}/api/reports/executive-portfolio`, { cache: 'no-store' })
  if (!res.ok) return NextResponse.json({ error: 'Falha ao coletar dados do portfólio' }, { status: 500 })
  const data = await res.json()

  const html = buildHTML(data)

  if (preview) return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } })

  try {
    const to = await sendEmail(html)
    return NextResponse.json({
      ok: true, sentTo: to,
      portfolioScore: data.portfolio?.portfolioScore,
      farolSummary: data.clients?.map((c: any) => ({ name: c.name, farol: c.farol })),
      generatedAt: data.generatedAt,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Falha ao enviar email', details: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (body.preview) {
    const res = await fetch(`${BASE()}/api/reports/executive-portfolio`, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: 'Falha ao coletar dados' }, { status: 500 })
    const data = await res.json()
    return new NextResponse(buildHTML(data), { status: 200, headers: { 'Content-Type': 'text/html' } })
  }
  return NextResponse.json({ error: 'Use { "preview": true } no body' }, { status: 400 })
}
