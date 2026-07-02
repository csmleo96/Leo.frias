import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/sender'

export const dynamic = 'force-dynamic'

const BASE = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Brand ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#07111F', cont: '#0B1F3A', card: '#112447', border: '#1E3A5F',
  orange: '#F58220', green: '#22C55E', yellow: '#FACC15', red: '#EF4444',
  blue: '#38BDF8', purple: '#A78BFA', muted: '#8BA6C1', text: '#E2EBF5',
  white: '#FFFFFF', deep: '#0D1A2F',
}

const FL = {
  verde:    { color: C.green,  emoji: '🟢', label: 'Verde'    },
  amarelo:  { color: C.yellow, emoji: '🟡', label: 'Amarelo'  },
  vermelho: { color: C.red,    emoji: '🔴', label: 'Vermelho' },
}

// ── Farol 360° criteria (spec-compliant) ──────────────────────────────────
function computeFarol360(cr: any): 'vermelho' | 'amarelo' | 'verde' {
  const avail   = cr.zabbix?.availability ?? 100
  const score   = cr.healthScore ?? 0
  const disaster = cr.zabbix?.disaster ?? 0
  const high    = cr.zabbix?.high ?? 0
  const critGLPI = cr.glpi?.critical ?? 0
  const critJira = cr.jira?.critical ?? 0
  const overdue  = cr.jira?.overdue ?? 0
  const unattended = cr.glpi?.unattended ?? 0
  const probs: any[] = cr.zabbix?.criticalProblems ?? []

  const hasCpuHigh     = probs.some(p => /cpu/i.test(p.name ?? '') && (p.severity ?? 0) >= 4)
  const hasMemHigh     = probs.some(p => /memor|ram/i.test(p.name ?? '') && (p.severity ?? 0) >= 4)
  const hasStorageCrit = probs.some(p => /disk|storage|vol|filesystem|space|lun/i.test(p.name ?? '') && (p.severity ?? 0) >= 5)
  const hasVpnDown     = probs.some(p => /vpn|tunnel|ipsec|wan|link|mpls/i.test(p.name ?? '') && (p.severity ?? 0) >= 4)
  const hasSqlIssue    = probs.some(p => /sql|mssql|database|deadlock/i.test(p.name ?? '') && (p.severity ?? 0) >= 4)

  // VERMELHO — qualquer item crítico
  if (
    disaster > 0 || avail < 99.0 || score < 70 ||
    hasStorageCrit || hasVpnDown || hasSqlIssue ||
    (critGLPI > 5) || (overdue > 10)
  ) return 'vermelho'

  // AMARELO — indicadores de atenção
  if (
    high > 2 || avail < 99.5 || score < 90 ||
    hasCpuHigh || hasMemHigh ||
    unattended > 5 || critJira > 0 || overdue > 3
  ) return 'amarelo'

  return 'verde'
}

function farolReason360(cr: any, farol: string): string {
  const disaster = cr.zabbix?.disaster ?? 0
  const avail    = cr.zabbix?.availability ?? 100
  const score    = cr.healthScore ?? 0
  const critGLPI = cr.glpi?.critical ?? 0
  const overdue  = cr.jira?.overdue ?? 0
  const high     = cr.zabbix?.high ?? 0
  const unatt    = cr.glpi?.unattended ?? 0
  const critJ    = cr.jira?.critical ?? 0

  if (farol === 'vermelho') {
    if (disaster > 0)   return `${disaster} problema(s) Disaster ativo(s) na infraestrutura — impacto direto ao negócio`
    if (avail < 99.0)   return `Disponibilidade abaixo de 99% (${avail}%) — SLA comprometido`
    if (critGLPI > 5)   return `${critGLPI} chamados críticos sem resolução no GLPI`
    if (overdue > 10)   return `${overdue} atividades vencidas no Jira — risco de SLA`
    return `Health Score crítico (${score}/100) — ação imediata necessária`
  }
  if (farol === 'amarelo') {
    if (avail < 99.5)   return `Disponibilidade ${avail}% — abaixo do target de 99,5%`
    if (high > 2)       return `${high} alertas HIGH ativos no Zabbix — monitoramento intensificado`
    if (unatt > 5)      return `${unatt} chamados sem primeiro atendimento — risco de SLA`
    if (critJ > 0)      return `${critJ} issue(s) críticas no Jira sem resolução`
    if (overdue > 3)    return `${overdue} atividades vencidas no Jira — atenção requerida`
    return `Health Score moderado (${score}/100) — acompanhamento preventivo`
  }
  return `Ambiente totalmente saudável — Score ${score}/100, disponibilidade ${avail}%, sem alertas críticos`
}

// ── HTML helpers ───────────────────────────────────────────────────────────
const pill = (t: string, c: string) =>
  `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;background:${c}22;color:${c};border:1px solid ${c}44">${t}</span>`

const bar = (pct: number, c: string, h = 6) =>
  `<div style="height:${h}px;background:#0A1629;border-radius:3px;overflow:hidden;margin-top:5px">
    <div style="width:${Math.min(pct, 100)}%;height:100%;background:${c};border-radius:3px"></div>
  </div>`

const nd = (reason = 'Dado não disponível na fonte consultada.') =>
  `<div style="padding:8px 12px;background:${C.deep};border-radius:6px;border-left:3px solid ${C.border};color:${C.muted};font-size:11px;font-style:italic">⚠️ ${reason}</div>`

const secTitle = (n: string, title: string, color = C.orange) =>
  `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid ${C.border}">
    <div style="background:${color}22;border:1px solid ${color}44;color:${color};font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;min-width:28px;text-align:center">${n}</div>
    <div style="font-size:13px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:${C.white}">${title}</div>
  </div>`

const wrap = (content: string, borderColor = C.orange, mb = 16) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${mb}px">
  <tr><td style="padding:16px 18px;background:${C.cont};border-radius:10px;border-left:4px solid ${borderColor}">
    ${content}
  </td></tr></table>`

const metric = (label: string, value: any, color = C.text, size = 20) =>
  `<td style="padding:8px;text-align:center;vertical-align:top">
    <div style="font-size:${size}px;font-weight:800;color:${color};line-height:1">${value}</div>
    <div style="font-size:9px;color:${C.muted};text-transform:uppercase;letter-spacing:.4px;margin-top:3px">${label}</div>
  </td>`

const row4 = (...cells: string[]) =>
  `<table width="100%" cellpadding="0" cellspacing="0"><tr>${cells.join('')}</tr></table>`

// ── Section 1: Resumo Executivo ────────────────────────────────────────────
function sec1_resumo(p: any, clients: any[]): string {
  const critical = clients.filter(c => c.farol === 'vermelho')
  const attention = clients.filter(c => c.farol === 'amarelo')
  const healthy = clients.filter(c => c.farol === 'verde')
  const totalProbs = clients.reduce((s, c) => s + (c.zabbix?.totalProblems ?? 0), 0)
  const totalTickets = clients.reduce((s, c) => s + (c.glpi?.open ?? 0) + (c.jira?.open ?? 0), 0)

  let summary = `A carteira XTENTGROUP opera com <strong style="color:${C.white}">${clients.length} clientes ativos</strong>, registrando score médio de portfólio de <strong style="color:${p.portfolioScore >= 80 ? C.green : p.portfolioScore >= 60 ? C.yellow : C.red}">${p.portfolioScore}/100</strong> e disponibilidade média de <strong style="color:${C.blue}">${p.avgAvailability}%</strong> no período. `

  if (critical.length > 0) {
    summary += `<strong style="color:${C.red}">Atenção crítica:</strong> ${critical.map(c => c.name).join(', ')} requer(em) atuação imediata da engenharia — incidentes P1 ou SLA comprometido. `
  } else {
    summary += `Nenhum cliente em estado crítico no período analisado — sinal positivo de estabilidade operacional. `
  }

  if (attention.length > 0) {
    summary += `${attention.map(c => c.name).join(', ')} apresenta(m) indicadores em atenção — acompanhamento preventivo recomendado. `
  }

  summary += `O ambiente concentra <strong style="color:${C.white}">${totalProbs} problema(s) ativos</strong> no Zabbix e <strong style="color:${C.white}">${totalTickets} chamado(s) abertos</strong> entre GLPI e Jira. `
  summary += `A tendência operacional é <strong style="color:${healthy.length >= 3 ? C.green : C.yellow}">${healthy.length >= 3 ? 'estável com perspectiva positiva' : 'requer atenção gerencial'}</strong>. Integrações de Backup, DR, Kubernetes e SQL Server direto estão pendentes — prioridade técnica para elevar a cobertura de observabilidade.`

  return wrap(`
    ${secTitle('01', 'Resumo Executivo')}
    <div style="font-size:13px;color:${C.muted};line-height:1.8">${summary}</div>
  `)
}

// ── Section 2: Farol Executivo ─────────────────────────────────────────────
function sec2_farol(clients: any[]): string {
  const rows = clients.map(cl => {
    const f = FL[cl.farol as keyof typeof FL] ?? FL.amarelo
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:13px;font-weight:700;color:${C.white};white-space:nowrap">${cl.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border}">${pill(f.emoji + ' ' + f.label, f.color)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.muted}">${cl.farolReason ?? cl.farolReason360 ?? '—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:12px;font-weight:700;color:${cl.healthScore >= 90 ? C.green : cl.healthScore >= 70 ? C.yellow : C.red};text-align:right;white-space:nowrap">${cl.healthScore}/100</td>
    </tr>`
  }).join('')

  return wrap(`
    ${secTitle('02', 'Farol Executivo')}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr style="background:#0A1629">
        ${['Cliente','Status','Justificativa','Score'].map(h =>
          `<th style="padding:8px 12px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">${h}</th>`
        ).join('')}
      </tr>
      ${rows}
    </table>
  `)
}

// ── Section 3: Disponibilidade ─────────────────────────────────────────────
function sec3_disponibilidade(clients: any[]): string {
  const rows = clients.map(cl => {
    const z = cl.zabbix
    const avail = z?.availability ?? '—'
    const availColor = typeof avail === 'number' ? (avail >= 99.5 ? C.green : avail >= 99 ? C.yellow : C.red) : C.muted
    const totalProbs = z?.totalProblems ?? '—'
    const disaster = z?.disaster ?? 0
    const high = z?.high ?? 0
    const hostsText = z ? `${z.hostsUp ?? '—'}/${z.hostsTotal ?? '—'}` : '—'
    return `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;font-weight:700;color:${C.white}">${cl.name}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;font-weight:700;color:${availColor}">${typeof avail === 'number' ? avail + '%' : '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.text}">${hostsText}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${disaster > 0 ? C.red : C.muted}">${disaster > 0 ? disaster + ' Disaster' : '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${high > 2 ? C.yellow : C.muted}">${high > 0 ? high + ' High' : '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.muted}">${typeof totalProbs === 'number' ? totalProbs + ' ativos' : '—'}</td>
    </tr>`
  }).join('')

  const totalDisaster = clients.reduce((s, c) => s + (c.zabbix?.disaster ?? 0), 0)
  const avgAvail = (() => {
    const vals = clients.map(c => c.zabbix?.availability).filter(v => v != null)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—'
  })()

  return wrap(`
    ${secTitle('03', 'Disponibilidade & SLA', C.blue)}
    ${row4(
      metric('Disponib. Média', avgAvail + '%', Number(avgAvail) >= 99.5 ? C.green : C.yellow),
      metric('Disaster Ativos', totalDisaster, totalDisaster > 0 ? C.red : C.green),
      metric('Clientes Verde', clients.filter(c => c.farol === 'verde').length, C.green),
      metric('Clientes Risco', clients.filter(c => c.farol !== 'verde').length, C.yellow),
    )}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px">
      <tr style="background:#0A1629">
        ${['Cliente','Disponib.','Hosts Up/Total','Disaster','High','Problemas'].map(h =>
          `<th style="padding:7px 12px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">${h}</th>`
        ).join('')}
      </tr>
      ${rows}
    </table>
  `, C.blue)
}

// ── Section 4: Continuidade (Backup / DR / HA) ─────────────────────────────
function sec4_continuidade(): string {
  return wrap(`
    ${secTitle('04', 'Continuidade de Negócio — Backup / DR / HA', C.red)}
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="33%" style="padding:0 6px 0 0;vertical-align:top">
        <div style="font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Backup (Veeam)</div>
        ${nd('Integração Veeam Backup não configurada. Dados de jobs, sucesso/falha e retenção indisponíveis. Recomenda-se integração prioritária para garantir conformidade e RPO.')}
      </td>
      <td width="33%" style="padding:0 3px;vertical-align:top">
        <div style="font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Disaster Recovery</div>
        ${nd('Integração DR não configurada. RPO, RTO, status de replicação e resultados de testes indisponíveis. Risco contratual e regulatório elevado sem visibilidade de DR.')}
      </td>
      <td width="34%" style="padding:0 0 0 6px;vertical-align:top">
        <div style="font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Alta Disponibilidade</div>
        ${nd('Integração HA/Cluster não configurada. Status de failover, integridade de cluster e replicação indisponíveis.')}
      </td>
    </tr></table>
  `, C.red)
}

// ── Section 5: Bancos de Dados ─────────────────────────────────────────────
function sec5_bancos(clients: any[]): string {
  const sqlRows = clients.map(cl => {
    const sqlProbs: any[] = cl.sqlProblems ?? []
    const count = sqlProbs.length
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid ${C.border};font-size:12px;font-weight:700;color:${C.white}">${cl.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid ${C.border};font-size:12px">${count > 0 ? pill(count + ' alerta(s) Zabbix', C.yellow) : `<span style="color:${C.green}">✓ Sem alertas detectados</span>`}</td>
      <td style="padding:8px 12px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted}">${sqlProbs.slice(0, 2).map(p => p.name ?? '').join('; ') || '—'}</td>
    </tr>`
  }).join('')

  return wrap(`
    ${secTitle('05', 'Bancos de Dados', C.blue)}
    <div style="font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">SQL Server — Alertas via Zabbix (parcial)</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px">
      <tr style="background:#0A1629">
        ${['Cliente','Status','Detalhes Zabbix'].map(h =>
          `<th style="padding:7px 12px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">${h}</th>`
        ).join('')}
      </tr>
      ${sqlRows}
    </table>
    <div style="font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">YugabyteDB · RabbitMQ · SQL Direto</div>
    ${nd('Integrações diretas de banco de dados não configuradas. Alertas parciais de SQL Server disponíveis somente via keywords no Zabbix. YugabyteDB (nodes, replicação, latência) e RabbitMQ (filas, consumers, throughput) indisponíveis.')}
  `, C.blue)
}

// ── Section 6: Kubernetes / RKE ────────────────────────────────────────────
function sec6_kubernetes(): string {
  return wrap(`
    ${secTitle('06', 'Kubernetes / RKE', C.purple)}
    ${nd('Integração Kubernetes/RKE não configurada. Dados de nodes, control plane, workers, pods, CrashLoopBackOff, evictions e utilização de recursos indisponíveis. Recomenda-se habilitar monitoramento via Datadog Agent ou Prometheus/Grafana.')}
  `, C.purple)
}

// ── Section 7: Infraestrutura ──────────────────────────────────────────────
function sec7_infra(clients: any[]): string {
  const rows = clients.map(cl => {
    const z = cl.zabbix
    if (!z) return `<tr><td colspan="6" style="padding:8px 12px;font-size:12px;color:${C.muted}">${cl.name} — Zabbix indisponível</td></tr>`
    const cpuProbs = (cl.zabbix?.criticalProblems ?? []).filter((p: any) => /cpu/i.test(p.name ?? ''))
    const memProbs = (cl.zabbix?.criticalProblems ?? []).filter((p: any) => /memor|ram/i.test(p.name ?? ''))
    const storProbs = cl.storageProblems ?? []
    const vpnProbs = cl.vpnProblems ?? []
    const cell = (count: number, label: string, warn: number, crit: number) =>
      count >= crit ? `<span style="color:${C.red};font-weight:700">${count} ${label}</span>` :
      count >= warn ? `<span style="color:${C.yellow};font-weight:700">${count} ${label}</span>` :
      `<span style="color:${C.green}">✓</span>`
    return `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;font-weight:700;color:${C.white}">${cl.name}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px">${cell(cpuProbs.length, 'alertas', 1, 3)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px">${cell(memProbs.length, 'alertas', 1, 3)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px">${cell(storProbs.length, 'alertas', 1, 3)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px">${cell(vpnProbs.length, 'alertas', 1, 2)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.muted}">${z.totalProblems ?? '—'} ativos · ${z.hostsDown ?? 0} hosts down</td>
    </tr>`
  }).join('')

  return wrap(`
    ${secTitle('07', 'Infraestrutura', C.orange)}
    <div style="font-size:11px;color:${C.muted};margin-bottom:10px">Dados extraídos do Zabbix via filtragem por keywords. CPU, Memória e Rede detalhados via Grafana — indisponível (integração pendente).</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr style="background:#0A1629">
        ${['Cliente','CPU','Memória','Storage','VPN/Links','Resumo Zabbix'].map(h =>
          `<th style="padding:7px 12px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">${h}</th>`
        ).join('')}
      </tr>
      ${rows}
    </table>
  `, C.orange)
}

// ── Section 8: Service Desk (GLPI + Jira) ─────────────────────────────────
function sec8_servicedesk(clients: any[]): string {
  const totalOpen   = clients.reduce((s, c) => s + (c.glpi?.open ?? 0) + (c.jira?.open ?? 0), 0)
  const totalCrit   = clients.reduce((s, c) => s + (c.glpi?.critical ?? 0) + (c.jira?.critical ?? 0), 0)
  const totalOverdue = clients.reduce((s, c) => s + (c.jira?.overdue ?? 0), 0)
  const totalResolved = clients.reduce((s, c) => s + (c.glpi?.resolved ?? 0) + (c.jira?.done ?? 0), 0)

  const rows = clients.map(cl => {
    const gl = cl.glpi
    const ji = cl.jira
    const glpiOpen = gl?.open ?? '—'
    const jiraOpen = ji?.open ?? '—'
    const critical = (gl?.critical ?? 0) + (ji?.critical ?? 0)
    const overdue  = ji?.overdue ?? '—'
    const unatt    = gl?.unattended ?? '—'
    const sla      = cl.serviceMetrics?.sla ?? 'N/D'
    const slaColor = sla === 'Em Risco' ? C.red : sla === 'Atenção' ? C.yellow : C.green
    return `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;font-weight:700;color:${C.white}">${cl.name}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.text};text-align:center">${glpiOpen}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.text};text-align:center">${jiraOpen}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${critical > 0 ? C.red : C.green};font-weight:700;text-align:center">${critical}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${Number(overdue) > 3 ? C.yellow : C.muted};text-align:center">${overdue}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${Number(unatt) > 5 ? C.yellow : C.muted};text-align:center">${unatt}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${slaColor};font-weight:700">${sla}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted}">MTTA: ${cl.serviceMetrics?.mtta ?? 'N/D'}</td>
    </tr>`
  }).join('')

  return wrap(`
    ${secTitle('08', 'Service Desk — GLPI + Jira', C.green)}
    ${row4(
      metric('Total Abertos', totalOpen, totalOpen > 50 ? C.yellow : C.text),
      metric('Críticos', totalCrit, totalCrit > 0 ? C.red : C.green),
      metric('Vencidos Jira', totalOverdue, totalOverdue > 0 ? C.yellow : C.green),
      metric('Resolvidos', totalResolved, C.green),
    )}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px">
      <tr style="background:#0A1629">
        ${['Cliente','GLPI Ab.','Jira Ab.','Críticos','Vencidos','Sem Atend.','SLA','MTTA'].map(h =>
          `<th style="padding:7px 12px;text-align:center;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border};white-space:nowrap">${h}</th>`
        ).join('')}
      </tr>
      ${rows}
    </table>
    <div style="margin-top:8px;font-size:11px;color:${C.muted}">MTTR: Dado não disponível — integração direta de tempo de resolução pendente.</div>
  `, C.green)
}

// ── Section 9: Customer Success ────────────────────────────────────────────
function sec9_cs(hsData: any): string {
  const contacts = hsData?.overview?.customers ?? '—'
  const leads = hsData?.overview?.leads ?? '—'
  const conv = hsData?.overview?.conversionRate != null
    ? hsData.overview.conversionRate.toFixed(1) + '%' : '—'

  return wrap(`
    ${secTitle('09', 'Customer Success', C.purple)}
    ${row4(
      metric('Clientes Ativos', contacts, C.green),
      metric('Leads HubSpot', leads, C.blue),
      metric('Taxa Conversão', conv, C.orange),
      metric('NPS/CSAT', 'N/D', C.muted),
    )}
    <div style="margin-top:12px;font-size:12px;color:${C.muted};line-height:1.6">
      Dados de NPS, CSAT, QBR, Health Score individual (HubSpot) e histórico de reuniões não estão configurados no HubSpot atual.
      Para ativar: criar propriedades customizadas no HubSpot (nps_score, csat_score, last_qbr_date, churn_risk) e mapear via API.
    </div>
    <div style="margin-top:8px">
      ${nd('Última reunião, próxima reunião, tempo sem contato e plano de ação — dados não disponíveis. Requer configuração de propriedades customizadas no HubSpot e integração com calendário (Microsoft 365 / Google Calendar).')}
    </div>
  `, C.purple)
}

// ── Section 10: Comercial ──────────────────────────────────────────────────
function sec10_comercial(hsData: any): string {
  const ov = hsData?.overview ?? {}
  const mrr = ov.totalRevenue ? 'R$ ' + ov.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : 'N/D'
  const pipeline = ov.openPipeline ? 'R$ ' + ov.openPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : 'N/D'
  const winRate = ov.winRate != null ? ov.winRate.toFixed(1) + '%' : '—'
  const openDeals = ov.openDeals ?? '—'
  const wonDeals = ov.wonDeals ?? '—'

  const stageRows = (hsData?.charts?.dealsByStage ?? []).slice(0, 6).map((s: any) =>
    `<tr>
      <td style="padding:7px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.text}">${s.label ?? s.id}</td>
      <td style="padding:7px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.blue};text-align:right">${s.count}</td>
      <td style="padding:7px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.green};text-align:right">${s.amount ? 'R$ ' + s.amount.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : '—'}</td>
    </tr>`
  ).join('')

  return wrap(`
    ${secTitle('10', 'Comercial — HubSpot CRM', C.orange)}
    ${row4(
      metric('Pipeline Aberto', pipeline, C.blue),
      metric('Negócios Abertos', openDeals, C.text),
      metric('Negócios Ganhos', wonDeals, C.green),
      metric('Taxa de Ganho', winRate, Number(ov.winRate) >= 50 ? C.green : C.yellow),
    )}
    ${stageRows ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px">
      <tr style="background:#0A1629">
        <th style="padding:7px 12px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Estágio</th>
        <th style="padding:7px 12px;text-align:right;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Negócios</th>
        <th style="padding:7px 12px;text-align:right;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Valor</th>
      </tr>
      ${stageRows}
    </table>` : nd('Pipeline por estágio não disponível')}
    <div style="margin-top:8px;font-size:11px;color:${C.muted}">MRR/ARR individuais por cliente, renovações e churn risk: ${nd('Propriedades de receita recorrente (mrr, arr, renewal_date) não configuradas no HubSpot. Recomenda-se mapear para gestão financeira completa.')}</div>
  `, C.orange)
}

// ── Section 11: Saúde Operacional ─────────────────────────────────────────
function sec11_saude(clients: any[]): string {
  const classify = (s: number) =>
    s >= 95 ? { label: 'Excelente', color: C.green } :
    s >= 85 ? { label: 'Muito Boa', color: C.green } :
    s >= 70 ? { label: 'Atenção',   color: C.yellow } :
    s >= 50 ? { label: 'Crítica',   color: C.red } :
              { label: 'Emergencial', color: C.red }

  const rows = clients.map(cl => {
    const s = cl.healthScore ?? 0
    const c = classify(s)
    const bd = cl.healthScoreBreakdown ?? {}
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:12px;font-weight:700;color:${C.white}">${cl.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border}">
        <div style="font-size:18px;font-weight:900;color:${c.color}">${s}</div>
        ${bar(s, c.color, 5)}
        <div style="font-size:10px;color:${c.color};margin-top:2px">${c.label}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted}">
        SLA ${bd.sla ?? '—'}/25 · Dispon. ${bd.disponibilidade ?? '—'}/20 · Chamados ${bd.chamados ?? '—'}/20 · Observ. ${bd.observabilidade ?? '—'}/15 · Infra ${bd.infraestrutura ?? '—'}/20
      </td>
    </tr>`
  }).join('')

  const avg = clients.length
    ? Math.round(clients.reduce((s, c) => s + (c.healthScore ?? 0), 0) / clients.length)
    : 0
  const avgC = classify(avg)

  return wrap(`
    ${secTitle('11', 'Saúde Operacional — Score 0 a 100', C.green)}
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:36px;font-weight:900;color:${avgC.color}">${avg}<span style="font-size:16px;color:${C.muted}">/100</span></div>
      <div style="font-size:11px;color:${C.muted}">${avgC.label} · Média da Carteira</div>
      ${bar(avg, avgC.color, 8)}
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr style="background:#0A1629">
        <th style="padding:7px 12px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Cliente</th>
        <th style="padding:7px 12px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Score</th>
        <th style="padding:7px 12px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Breakdown (SLA/Dispon./Chamados/Observ./Infra)</th>
      </tr>
      ${rows}
    </table>
    <div style="margin-top:8px;font-size:11px;color:${C.muted}">Pesos: SLA 25pts · Disponibilidade 20pts · Chamados 20pts · Observabilidade 15pts · Infraestrutura 20pts (fixo — integração pendente)</div>
  `, C.green)
}

// ── Section 12: Principais Riscos ─────────────────────────────────────────
function sec12_riscos(clients: any[]): string {
  const allRisks = clients.flatMap(c =>
    (c.risks ?? []).slice(0, 3).map((r: any) => ({ ...r, client: c.name }))
  ).sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 }
    return (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3)
  }).slice(0, 10)

  const rows = allRisks.map(r => {
    const sevColor = r.severity === 'critical' ? C.red : r.severity === 'high' ? '#F97316' : C.yellow
    return `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border}">${pill(r.severity?.toUpperCase() ?? 'MÉDIO', sevColor)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;font-weight:700;color:${C.white};white-space:nowrap">${r.client}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.text}">${r.title}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted}">${r.action ?? '—'}</td>
    </tr>`
  }).join('')

  return wrap(`
    ${secTitle('12', 'Principais Riscos', C.red)}
    ${allRisks.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr style="background:#0A1629">
        ${['Severidade','Cliente','Descrição','Ação Recomendada'].map(h =>
          `<th style="padding:7px 12px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">${h}</th>`
        ).join('')}
      </tr>
      ${rows}
    </table>` : `<div style="color:${C.green};font-size:13px">✓ Nenhum risco crítico identificado no período.</div>`}
  `, C.red)
}

// ── Section 13: Plano de Ação ──────────────────────────────────────────────
function sec13_plano(clients: any[]): string {
  const allActions = clients.flatMap(c =>
    (c.actionPlan ?? []).slice(0, 2).map((a: any) => ({ ...a, client: c.name }))
  ).slice(0, 12)

  const urgColor = (s: string) => s === 'Urgente' ? C.red : s === 'Pendente' ? C.yellow : C.muted

  const rows = allActions.map(a => `<tr>
    <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;font-weight:700;color:${C.white};white-space:nowrap">${a.client}</td>
    <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.text}">${a.action}</td>
    <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted};white-space:nowrap">${a.owner ?? '—'}</td>
    <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted};white-space:nowrap">${a.deadline ?? '—'}</td>
    <td style="padding:9px 12px;border-bottom:1px solid ${C.border}">${pill(a.status ?? 'Pendente', urgColor(a.status ?? ''))}</td>
  </tr>`).join('')

  return wrap(`
    ${secTitle('13', 'Plano de Ação', C.yellow)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr style="background:#0A1629">
        ${['Cliente','Ação','Responsável','Prazo','Status'].map(h =>
          `<th style="padding:7px 12px;text-align:left;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">${h}</th>`
        ).join('')}
      </tr>
      ${rows}
    </table>
  `, C.yellow)
}

// ── Section 14: Oportunidades Consultivas ─────────────────────────────────
function sec14_oportunidades(clients: any[]): string {
  const all = clients.flatMap(c =>
    (c.opportunities ?? []).slice(0, 2).map((o: any) => ({ ...o, client: c.name }))
  ).sort((a, b) => ['alta','média','baixa'].indexOf(a.priority ?? 'baixa') - ['alta','média','baixa'].indexOf(b.priority ?? 'baixa'))
  .slice(0, 8)

  const pColor = (p: string) => p === 'alta' ? C.red : p === 'média' ? C.yellow : C.green

  const cards = all.map(o => `
    <div style="margin-bottom:8px;padding:10px 14px;background:${C.deep};border-radius:8px;border:1px solid ${C.border}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div>
          <span style="font-size:12px;font-weight:700;color:${C.white}">${o.title}</span>
          <span style="font-size:11px;color:${C.muted}"> — ${o.client}</span>
        </div>
        ${pill(o.priority === 'alta' ? '🔴 Alta' : o.priority === 'média' ? '🟡 Média' : '🟢 Baixa', pColor(o.priority ?? 'baixa'))}
      </div>
      <div style="font-size:11px;color:${C.muted};margin-top:4px">${o.justification ?? ''}</div>
      <div style="font-size:11px;color:${C.blue};margin-top:3px">💡 ${o.impact ?? ''} &nbsp;|&nbsp; 💰 ${o.revenue ?? ''}</div>
    </div>`).join('')

  return wrap(`
    ${secTitle('14', 'Oportunidades Consultivas', C.orange)}
    ${cards || nd('Nenhuma oportunidade identificada com dados disponíveis.')}
  `, C.orange)
}

// ── Section 15: Correlação Inteligente ────────────────────────────────────
function sec15_correlacao(clients: any[]): string {
  const correlations: string[] = []

  for (const cl of clients) {
    const z = cl.zabbix
    const gl = cl.glpi
    const ji = cl.jira
    const dd = cl.datadog

    if ((z?.disaster ?? 0) > 0 && (gl?.open ?? 0) > 0) {
      correlations.push(`<strong style="color:${C.white}">${cl.name}:</strong> ${z.disaster} problema(s) Disaster no Zabbix correlacionam-se com ${gl.open} chamados abertos no GLPI. O impacto operacional da infraestrutura está se refletindo diretamente no volume de suporte. Recomenda-se abertura de bridge de incidente e comunicação proativa ao cliente.`)
    } else if ((z?.high ?? 0) > 2 && (ji?.overdue ?? 0) > 3) {
      correlations.push(`<strong style="color:${C.white}">${cl.name}:</strong> ${z.high} alertas HIGH no Zabbix combinados com ${ji.overdue} atividades vencidas no Jira indicam pressão simultânea sobre infraestrutura e entregas de projeto. Risco de escalada para P1 caso os alertas não sejam tratados.`)
    } else if ((gl?.critical ?? 0) > 0 && (dd?.alert ?? 0) > 0) {
      correlations.push(`<strong style="color:${C.white}">${cl.name}:</strong> ${gl.critical} chamado(s) crítico(s) no GLPI e ${dd.alert} monitor(es) em alerta no Datadog sugerem degradação de serviço correlacionada. O time de suporte deve validar se os alertas Datadog são a causa raiz dos chamados críticos.`)
    } else if ((ji?.overdue ?? 0) > 5) {
      correlations.push(`<strong style="color:${C.white}">${cl.name}:</strong> ${ji.overdue} atividades vencidas no Jira sem paralelismo de alertas críticos no Zabbix/Datadog indicam risco de entrega de projeto. Recomenda-se QBR para realinhar expectativas e replanejar o backlog.`)
    }
  }

  if (correlations.length === 0) {
    correlations.push(`Nenhuma correlação crítica identificada entre as plataformas no período atual. O ambiente opera sem padrões anômalos que cruzem múltiplas fontes de dados. Próxima análise de correlação na janela do dia seguinte.`)
  }

  const items = correlations.map(c =>
    `<div style="padding:10px 14px;margin-bottom:8px;background:${C.deep};border-radius:8px;border-left:3px solid ${C.orange};font-size:12px;color:${C.muted};line-height:1.6">${c}</div>`
  ).join('')

  return wrap(`
    ${secTitle('15', 'Correlação Inteligente — Zabbix × GLPI × Jira × Datadog × HubSpot', C.blue)}
    <div style="font-size:11px;color:${C.muted};margin-bottom:10px;font-style:italic">Análise cruzada de eventos entre plataformas. Grafana: integração pendente.</div>
    ${items}
  `, C.blue)
}

// ── Section 16: Dashboard do Portfólio ────────────────────────────────────
function sec16_dashboard(clients: any[], p: any): string {
  const rows = clients.map(cl => {
    const f = FL[cl.farol as keyof typeof FL] ?? FL.amarelo
    const z = cl.zabbix
    const gl = cl.glpi
    const ji = cl.jira
    const disaster = z?.disaster ?? 0
    const high = z?.high ?? 0
    const tickets = (gl?.open ?? 0) + (ji?.open ?? 0)
    const avail = z?.availability != null ? z.availability + '%' : '—'
    const sla = cl.serviceMetrics?.sla ?? 'N/D'
    const slaColor = sla === 'Em Risco' ? C.red : sla === 'Atenção' ? C.yellow : C.green
    const scoreColor = cl.healthScore >= 90 ? C.green : cl.healthScore >= 70 ? C.yellow : C.red
    const mtta = cl.serviceMetrics?.mtta ?? 'N/D'

    return `<tr>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;font-weight:700;color:${C.white};white-space:nowrap">${cl.name}</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};text-align:center">${pill(f.emoji, f.color)}</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;font-weight:700;color:${scoreColor};text-align:center">${cl.healthScore}</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;color:${slaColor};text-align:center">${sla}</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;color:${avail === '—' ? C.muted : Number(avail.replace('%','')) >= 99.5 ? C.green : C.yellow};text-align:center">${avail}</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;color:${disaster > 0 ? C.red : C.muted};text-align:center">${disaster || '—'}</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;color:${high > 2 ? C.yellow : C.muted};text-align:center">${high || '—'}</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;color:${tickets > 20 ? C.yellow : C.text};text-align:center">${tickets}</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted};text-align:center">${mtta}</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted};text-align:center">N/D</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted};text-align:center">N/D</td>
      <td style="padding:9px 10px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted};text-align:center">N/D</td>
    </tr>`
  }).join('')

  const totalP1 = clients.reduce((s, c) => s + (c.zabbix?.disaster ?? 0), 0)
  const totalP2 = clients.reduce((s, c) => s + (c.zabbix?.high ?? 0), 0)
  const totalTickets = clients.reduce((s, c) => s + (c.glpi?.open ?? 0) + (c.jira?.open ?? 0), 0)
  const avgScore = clients.length ? Math.round(clients.reduce((s, c) => s + (c.healthScore ?? 0), 0) / clients.length) : 0

  return wrap(`
    ${secTitle('16', 'Dashboard Executivo do Portfólio', C.orange)}
    <div style="overflow-x:auto">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:800px">
      <tr style="background:#0A1629">
        ${['Cliente','Farol','Score','SLA','Dispon.','P1','P2','Tickets','MTTA','Backup','DR','Renovação'].map(h =>
          `<th style="padding:7px 10px;text-align:center;font-size:10px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border};white-space:nowrap">${h}</th>`
        ).join('')}
      </tr>
      ${rows}
    </table>
    </div>
    <div style="margin-top:14px;padding:14px;background:${C.deep};border-radius:8px">
      <div style="font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:${C.orange};margin-bottom:10px">Consolidado do Portfólio</div>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${metric('Clientes', clients.length, C.blue)}
        ${metric('🟢 Verde', p.healthy, C.green)}
        ${metric('🟡 Amarelo', p.attention, C.yellow)}
        ${metric('🔴 Vermelho', p.critical, C.red)}
        ${metric('Score Médio', avgScore + '/100', avgScore >= 80 ? C.green : C.yellow)}
        ${metric('Dispon. Média', p.avgAvailability + '%', p.avgAvailability >= 99.5 ? C.green : C.yellow)}
        ${metric('P1 Ativos', totalP1, totalP1 > 0 ? C.red : C.green)}
        ${metric('P2 Ativos', totalP2, totalP2 > 0 ? C.yellow : C.green)}
        ${metric('Tickets', totalTickets, totalTickets > 50 ? C.yellow : C.text)}
      </tr></table>
      <div style="margin-top:10px;font-size:11px;color:${C.muted}">
        MRR/ARR total, renovações 30/60/90 dias e churn risk: dados não configurados no HubSpot (propriedades customizadas pendentes).
      </div>
    </div>
  `, C.orange)
}

// ── Master HTML ────────────────────────────────────────────────────────────
function buildHTML360(portfolioData: any, hsData: any): string {
  const p = portfolioData.portfolio ?? {}
  const rawClients: any[] = portfolioData.clients ?? []
  const dash = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const gen = new Date(portfolioData.generatedAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit',
    month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  // Re-compute farol with 360° criteria and attach
  const clients = rawClients.map(cl => {
    const farol = computeFarol360(cl)
    return { ...cl, farol, farolReason: farolReason360(cl, farol) }
  }).sort((a, b) => {
    const o = { vermelho: 0, amarelo: 1, verde: 2 }
    return o[a.farol as keyof typeof o] - o[b.farol as keyof typeof o]
  })

  // Recompute portfolio counts with new farol
  p.healthy  = clients.filter(c => c.farol === 'verde').length
  p.attention = clients.filter(c => c.farol === 'amarelo').length
  p.critical  = clients.filter(c => c.farol === 'vermelho').length

  const overallFarol = p.critical > 0 ? FL.vermelho : p.attention > 0 ? FL.amarelo : FL.verde

  const header = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
<tr><td style="padding:24px;background:${C.cont};border-radius:12px;border:2px solid ${C.orange}">
  <div style="text-align:center">
    <div style="display:inline-block;background:${C.orange};color:${C.white};font-size:10px;font-weight:800;letter-spacing:2px;padding:4px 16px;border-radius:20px;margin-bottom:10px">
      XTENTGROUP — FAROL EXECUTIVO 360°
    </div>
    <div style="font-size:22px;font-weight:900;color:${C.white};margin-bottom:4px">Relatório Executivo Integrado da Carteira</div>
    <div style="font-size:12px;color:${C.muted}">${gen} · Horário de Brasília</div>
    <div style="margin-top:16px;font-size:36px">${overallFarol.emoji}</div>
    <div style="font-size:16px;font-weight:800;color:${overallFarol.color};margin-top:4px">
      Portfólio ${overallFarol.label.toUpperCase()} — Score ${p.portfolioScore}/100
    </div>
    <div style="font-size:12px;color:${C.muted};margin-top:6px">
      ${clients.length} clientes · ${p.healthy} 🟢 · ${p.attention} 🟡 · ${p.critical} 🔴 · Disponib. ${p.avgAvailability}%
    </div>
    ${bar(p.portfolioScore, overallFarol.color, 8)}
  </div>
</td></tr>
</table>`

  const footer = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px">
<tr><td style="padding:16px 20px;background:${C.cont};border-radius:8px;text-align:center;border:1px solid ${C.border}">
  <a href="${dash}" style="display:inline-block;background:${C.orange};color:${C.white};font-size:13px;font-weight:700;padding:10px 28px;border-radius:8px;text-decoration:none">
    Abrir Dashboard Completo →
  </a>
  <div style="margin-top:8px;font-size:10px;color:#4A6380">
    Farol Executivo 360° · <strong style="color:${C.orange}">Leonardo CS Cockpit</strong> · XTENTGROUP · Gerado automaticamente às 09h00 BRT
  </div>
</td></tr>
</table>`

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Farol Executivo 360° — XTENTGROUP</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${C.text}">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;margin:0 auto">
<tr><td style="padding:20px">
  ${header}
  ${sec1_resumo(p, clients)}
  ${sec2_farol(clients)}
  ${sec3_disponibilidade(clients)}
  ${sec4_continuidade()}
  ${sec5_bancos(clients)}
  ${sec6_kubernetes()}
  ${sec7_infra(clients)}
  ${sec8_servicedesk(clients)}
  ${sec9_cs(hsData)}
  ${sec10_comercial(hsData)}
  ${sec11_saude(clients)}
  ${sec12_riscos(clients)}
  ${sec13_plano(clients)}
  ${sec14_oportunidades(clients)}
  ${sec15_correlacao(clients)}
  ${sec16_dashboard(clients, p)}
  ${footer}
</td></tr>
</table>
</td></tr></table>
</body></html>`
}

// ── Handler ────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const url = new URL(req.url)
  const preview = url.searchParams.get('preview') === 'true'

  const [portfolioRes, hsRes] = await Promise.allSettled([
    fetch(`${BASE()}/api/reports/executive-portfolio`, { cache: 'no-store' }),
    fetch(`${BASE()}/api/hubspot/dashboard`, { cache: 'no-store' }),
  ])

  if (portfolioRes.status === 'rejected' || !portfolioRes.value.ok) {
    return NextResponse.json({ error: 'Falha ao coletar dados do portfólio' }, { status: 500 })
  }

  const portfolioData = await portfolioRes.value.json()
  const hsData = hsRes.status === 'fulfilled' && hsRes.value.ok
    ? await hsRes.value.json().catch(() => null)
    : null

  const html = buildHTML360(portfolioData, hsData)

  if (preview) {
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  const to = (process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? '')
    .split(',').map(e => e.trim()).filter(Boolean)

  if (to.length === 0) {
    return NextResponse.json({ error: 'NOTIFICATION_EMAIL_TO não configurado' }, { status: 500 })
  }

  const p = portfolioData.portfolio ?? {}
  const clients: any[] = (portfolioData.clients ?? []).map((cl: any) => ({
    ...cl, farol: computeFarol360(cl),
  }))
  const critical = clients.filter(c => c.farol === 'vermelho').length
  const attention = clients.filter(c => c.farol === 'amarelo').length
  const statusLine = critical > 0 ? `🔴 ${critical} crítico(s)` : attention > 0 ? `🟡 ${attention} em atenção` : '🟢 Carteira saudável'
  const date = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit' })
  const subject = `${statusLine} — Farol 360° ${date} · Score ${p.portfolioScore}/100`

  const result = await sendEmail({ to, subject, html })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true, method: result.method, sentTo: to, subject,
    portfolioScore: p.portfolioScore,
    farol: { verde: p.healthy, amarelo: p.attention, vermelho: p.critical },
    sections: 16,
    clients: clients.map(c => ({ name: c.name, farol: c.farol, score: c.healthScore })),
    generatedAt: portfolioData.generatedAt,
  })
}
