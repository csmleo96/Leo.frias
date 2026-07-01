import { NextRequest, NextResponse } from 'next/server'
import { getClient, matchesClient } from '@/lib/reports/clients'

export const dynamic = 'force-dynamic'

// ── Helpers ────────────────────────────────────────────────────────────────
async function safeGet(url: string) {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

// ── Data Collectors ────────────────────────────────────────────────────────
async function collectGLPI(base: string, groupIds: number[], titleKeywords: string[]) {
  const raw = await safeGet(`${base}/api/glpi`)
  if (!raw) return null
  const allTickets: any[] = raw.tickets ?? []

  const filter = (t: any): boolean => {
    if (groupIds.length > 0 && groupIds.includes(t.groupId)) return true
    if (titleKeywords.length > 0 && matchesClient(t.title ?? '', titleKeywords)) return true
    return groupIds.length === 0 && titleKeywords.length === 0
  }

  const tickets = allTickets.filter(filter)
  const open = tickets.filter(t => t.status <= 4)
  const resolved = tickets.filter(t => t.status >= 5)
  const critical = open.filter(t => t.priority >= 5)
  const unattended = open.filter(t => !t.assignee || t.daysOpen > 1)

  return {
    total: tickets.length,
    open: open.length,
    resolved: resolved.length,
    critical: critical.length,
    unattended: unattended.length,
    criticalDetails: critical.slice(0, 5),
    recentTickets: tickets
      .sort((a, b) => new Date(b.dateCreation ?? 0).getTime() - new Date(a.dateCreation ?? 0).getTime())
      .slice(0, 5),
  }
}

async function collectJira(base: string, projectKeys: string[]) {
  const raw = await safeGet(`${base}/api/jira`)
  if (!raw) return null
  const allIssues: any[] = raw.issues ?? []

  const issues = projectKeys.length > 0
    ? allIssues.filter(i => projectKeys.includes(i.project?.key ?? ''))
    : allIssues

  const now = Date.now()
  const open = issues.filter(i => i.statusCategory !== 'done')
  const done = issues.filter(i => i.statusCategory === 'done')
  const overdue = open.filter(i => i.daysRemaining !== null && i.daysRemaining < 0)
  const dueSoon = open.filter(i => i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 7)
  const critical = open.filter(i => ['Highest', 'High'].includes(i.priority ?? ''))
  const unassigned = open.filter(i => !i.assignee)

  return {
    total: issues.length,
    open: open.length,
    done: done.length,
    overdue: overdue.length,
    dueSoon: dueSoon.length,
    critical: critical.length,
    unassigned: unassigned.length,
    projects: [...new Set(issues.map(i => i.project?.name).filter(Boolean))],
    overdueDetails: overdue.slice(0, 5),
    criticalDetails: critical.slice(0, 5),
  }
}

async function collectZabbix(base: string, hostKeywords: string[]) {
  const raw = await safeGet(`${base}/api/zabbix`)
  if (!raw || raw.error) return null

  const allProblems: any[] = raw.problems ?? []
  const stats = raw.stats ?? {}

  // Filter problems by client host keywords
  const filterProblem = (p: any): boolean => {
    if (hostKeywords.length === 0) return true
    return matchesClient(p.host ?? '', hostKeywords)
  }

  const problems = allProblems.filter(p => !p.resolved).filter(filterProblem)
  const critical = problems.filter(p => p.severity >= 4)
  const disaster = problems.filter(p => p.severity >= 5)

  // Unique hosts mentioned in filtered problems (proxy for client host count)
  const uniqueHosts = [...new Set(problems.map((p: any) => p.host).filter(Boolean))]

  // When keywords are set, use filtered problem hosts; otherwise use global stats
  const hostsTotal = hostKeywords.length > 0 ? uniqueHosts.length || (stats.hostsTotal ?? 0) : (stats.hostsTotal ?? 0)
  const hostsDown = hostKeywords.length === 0 ? (stats.hostsDown ?? 0) : disaster.length > 0 ? 1 : 0
  const hostsUp = hostsTotal - hostsDown
  const availability = hostsTotal > 0 ? Math.round((hostsUp / hostsTotal) * 100) : (stats.availability ?? 100)

  return {
    totalProblems: problems.length,
    critical: critical.length,
    disaster: disaster.length,
    hostsTotal,
    hostsUp,
    hostsDown,
    availability,
    criticalProblems: critical.slice(0, 5),
    // Note: host counts are approximate when filtered by keywords
    isFiltered: hostKeywords.length > 0,
  }
}

async function collectDatadog(base: string, tags: string[]) {
  const raw = await safeGet(`${base}/api/datadog`)
  if (!raw || !raw.configured || raw.error) return null

  const allMonitors: any[] = raw.monitors ?? []

  const filterMonitor = (m: any): boolean => {
    if (tags.length === 0) return true
    const mTags: string[] = m.tags ?? []
    return tags.some(t => mTags.includes(t))
  }

  const monitors = allMonitors.filter(filterMonitor)
  const ok = monitors.filter(m => m.status === 'OK').length
  const warn = monitors.filter(m => m.status === 'Warn').length
  const alert = monitors.filter(m => m.status === 'Alert').length

  return {
    totalMonitors: monitors.length,
    ok,
    warn,
    alert,
    alertMonitors: monitors.filter(m => m.status === 'Alert').slice(0, 5),
  }
}

// ── Health Score ───────────────────────────────────────────────────────────
function calcHealthScore(glpi: any, jira: any, zabbix: any, datadog: any) {
  // SLA (25) — baseado em disponibilidade infra
  let sla = 25
  if (zabbix) {
    const av = zabbix.availability ?? 100
    if (av >= 99.9) sla = 25
    else if (av >= 99.5) sla = 23
    else if (av >= 99)   sla = 20
    else if (av >= 98)   sla = 15
    else if (av >= 95)   sla = 8
    else                 sla = 3
  }

  // Disponibilidade (20) — hosts online
  let disp = 20
  if (zabbix?.hostsTotal > 0) {
    disp = Math.round(20 * (zabbix.hostsUp / zabbix.hostsTotal))
    if (zabbix.disaster > 0) disp = Math.max(0, disp - 8)
  }

  // Chamados (20) — GLPI + Jira juntos
  let chamados = 20
  const criticalTotal = (glpi?.critical ?? 0) + (jira?.critical ?? 0)
  const overdueTotal = (jira?.overdue ?? 0)
  if (criticalTotal > 5)      chamados -= 10
  else if (criticalTotal > 2) chamados -= 5
  else if (criticalTotal > 0) chamados -= 2
  if (overdueTotal > 3)       chamados = Math.max(0, chamados - 5)
  if (glpi?.unattended > 5)   chamados = Math.max(0, chamados - 5)

  // Observabilidade (15) — Datadog
  let obs = 15
  if (datadog) {
    if (datadog.alert > 3)      obs -= 8
    else if (datadog.alert > 0) obs -= 4
    if (datadog.warn > 5)       obs = Math.max(0, obs - 3)
  }

  // Backup/DR/Storage (20) — sem integração ainda: assumir ok
  const infra = 20

  const score = Math.max(0, Math.min(100, sla + disp + chamados + obs + infra))
  return { score, breakdown: { sla, disponibilidade: disp, chamados, observabilidade: obs, infraestrutura: infra } }
}

// ── Executive Summary ──────────────────────────────────────────────────────
function buildSummary(client: string, glpi: any, jira: any, zabbix: any, datadog: any, score: number): string {
  const parts: string[] = []
  const level = score >= 80 ? 'excelente' : score >= 60 ? 'estável com pontos de atenção' : 'crítico, exigindo ação imediata'
  parts.push(`O ambiente ${client} apresenta saúde operacional ${level} (score ${score}/100).`)

  if (glpi?.open > 0 || jira?.open > 0) {
    const total = (glpi?.open ?? 0) + (jira?.open ?? 0)
    parts.push(`Há ${total} demanda(s) abertas — ${glpi?.critical ?? 0} crítica(s) no suporte e ${jira?.critical ?? 0} alta(s) prioridade no Jira.`)
  }

  if (zabbix?.totalProblems > 0) {
    parts.push(`Infraestrutura: ${zabbix.totalProblems} problema(s) ativo(s) com disponibilidade de ${zabbix.availability}%.`)
  } else if (zabbix) {
    parts.push(`Infraestrutura estável — ${zabbix.hostsUp}/${zabbix.hostsTotal} hosts online (${zabbix.availability}% disponibilidade).`)
  }

  if (datadog?.alert > 0) {
    parts.push(`Observabilidade: ${datadog.alert} monitor(es) Datadog em estado de alerta.`)
  } else if (datadog?.totalMonitors > 0) {
    parts.push(`Observabilidade Datadog: ${datadog.ok}/${datadog.totalMonitors} monitors OK.`)
  }

  return parts.join(' ')
}

// ── Risks ──────────────────────────────────────────────────────────────────
function buildRisks(glpi: any, jira: any, zabbix: any, datadog: any) {
  const risks: any[] = []

  if (zabbix?.disaster > 0)
    risks.push({ severity: 'critical', title: `${zabbix.disaster} problema(s) Disaster na infraestrutura`, action: 'Acionar equipe de infraestrutura imediatamente' })
  if (zabbix?.hostsDown > 0)
    risks.push({ severity: 'high', title: `${zabbix.hostsDown} host(s) offline`, action: 'Verificar conectividade e status dos servidores' })
  if (glpi?.critical > 0)
    risks.push({ severity: 'high', title: `${glpi.critical} chamado(s) crítico(s) sem resolução`, action: 'Escalar para N2/N3 com urgência' })
  if (jira?.overdue > 0)
    risks.push({ severity: 'high', title: `${jira.overdue} atividade(s) com prazo vencido no Jira`, action: 'Replanejar entregas e comunicar ao cliente' })
  if (datadog?.alert > 3)
    risks.push({ severity: 'high', title: `${datadog.alert} monitors Datadog em alerta`, action: 'Investigar causa raiz e acionar times responsáveis' })
  if (glpi?.unattended > 3)
    risks.push({ severity: 'medium', title: `${glpi.unattended} chamado(s) sem atendimento inicial`, action: 'Reforçar triagem e SLA de primeira resposta' })

  return risks
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

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const [glpiData, jiraData, zabbixData, datadogData] = await Promise.all([
    collectGLPI(base, client.glpiGroupIds, client.glpiTitleKeywords),
    collectJira(base, client.jiraProjectKeys),
    collectZabbix(base, client.zabbixHostKeywords),
    collectDatadog(base, client.datadogTags),
  ])

  const { score, breakdown } = calcHealthScore(glpiData, jiraData, zabbixData, datadogData)
  const health = score >= 80 ? 'healthy' : score >= 60 ? 'attention' : 'critical'
  const summary = buildSummary(client.name, glpiData, jiraData, zabbixData, datadogData, score)
  const risks = buildRisks(glpiData, jiraData, zabbixData, datadogData)

  const report = {
    generatedAt: new Date().toISOString(),
    client: { slug: client.slug, name: client.name, accentColor: client.accentColor },
    health,
    healthScore: score,
    healthScoreBreakdown: breakdown,
    executiveSummary: summary,
    risks,
    glpi: glpiData,
    jira: jiraData,
    zabbix: zabbixData,
    datadog: datadogData,
    filterConfig: {
      glpiGroupIds: client.glpiGroupIds,
      glpiTitleKeywords: client.glpiTitleKeywords,
      jiraProjectKeys: client.jiraProjectKeys,
      zabbixHostKeywords: client.zabbixHostKeywords,
      datadogTags: client.datadogTags,
    },
  }

  return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } })
}
