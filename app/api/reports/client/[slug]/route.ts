import { NextRequest, NextResponse } from 'next/server'
import { getClient, matchesClient, CLIENTS, type ClientConfig } from '@/lib/reports/clients'

export const dynamic = 'force-dynamic'

// ── Helpers ────────────────────────────────────────────────────────────────
async function safeGet(url: string) {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) {
      console.error(`[safeGet] ${url} → HTTP ${r.status} ${r.statusText}`)
      return null
    }
    const json = await r.json()
    if (json?.error) {
      console.error(`[safeGet] ${url} → API error: ${json.error}`)
      return null
    }
    return json
  } catch (e: any) {
    console.error(`[safeGet] ${url} → ${e.message}`)
    return null
  }
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

  const tickets  = allTickets.filter(filter)
  const open     = tickets.filter(t => t.status < 5)
  const resolved = tickets.filter(t => t.status >= 5)
  const critical = open.filter(t => t.priority >= 5)

  // FIX: unattended = no assigned technician (field assignedTo, not assignee=requester)
  const unattended = open.filter(t => !t.assignedTo)

  // SLA breached: tickets where slaBreached flag is set (populated by glpi route)
  const slaBreached = open.filter(t => t.slaBreached)

  // Avg resolution time from resolved tickets that have resolveTimeDays
  const resolvedWithTime = resolved.filter(t => t.resolveTimeDays != null)
  const avgResolutionDays = resolvedWithTime.length > 0
    ? Math.round(resolvedWithTime.reduce((s: number, t: any) => s + (t.resolveTimeDays ?? 0), 0) / resolvedWithTime.length)
    : null

  // Open tickets, most urgent first (priority desc, then longest-open) — used by
  // the Farol report to list real open chamados per client, not just a count.
  const openDetails = [...open]
    .sort((a: any, b: any) => (b.priority - a.priority) || (b.daysOpen - a.daysOpen))
    .slice(0, 8)

  return {
    total:           tickets.length,
    open:            open.length,
    resolved:        resolved.length,
    critical:        critical.length,
    unattended:      unattended.length,
    slaBreached:     slaBreached.length,
    avgResolutionDays,
    criticalDetails: critical.slice(0, 5),
    openDetails,
    recentTickets:   tickets
      .sort((a: any, b: any) => new Date(b.dateCreation ?? 0).getTime() - new Date(a.dateCreation ?? 0).getTime())
      .slice(0, 5),
  }
}

async function collectJira(base: string, client: ClientConfig) {
  const raw = await safeGet(`${base}/api/jira`)
  if (!raw) return null
  const allIssues: any[] = raw.issues ?? []

  const { jiraProjectKeys: projectKeys, jiraTitleKeywords: titleKeywords, jiraBroadKeywords: broadKeywords } = client

  // Several clients share the same Jira project (e.g. MSPPRO/MSPINFRA hold work for more
  // than one account, including ConnectPSP's own "[Connect]"-tagged issues living inside
  // Hospital ABC's MSPINFRA). Specificity order, most to least confident:
  //   1. This client's own SPECIFIC tag — always wins outright.
  //   2. This client's own BROAD keyword (too generic to be exclusive on its own, e.g. bare
  //      "connect") — wins unless another client's SPECIFIC tag also matches (e.g. an XCMG
  //      issue mentioning "Direct Connect/Megaport" stays XCMG's).
  //   3. Plain project-key membership (weakest signal) — wins unless ANY other client's tag,
  //      specific or broad, also matches (an explicit tag always beats bare project membership).
  const others = Object.values(CLIENTS).filter(c => c.slug !== client.slug)
  const otherSpecificTags = others.flatMap(c => c.jiraTitleKeywords)
  const otherAllTags      = others.flatMap(c => [...c.jiraTitleKeywords, ...c.jiraBroadKeywords])

  const issues = allIssues.filter(i => {
    const summary = i.summary ?? ''
    if (titleKeywords.length > 0 && matchesClient(summary, titleKeywords)) return true
    if (broadKeywords.length > 0 && matchesClient(summary, broadKeywords)) {
      return !matchesClient(summary, otherSpecificTags)
    }
    if (projectKeys.length > 0 && projectKeys.includes(i.project?.key ?? '')) {
      return !matchesClient(summary, otherAllTags)
    }
    return false
  })

  const open       = issues.filter(i => i.statusCategory !== 'done')
  const done       = issues.filter(i => i.statusCategory === 'done')
  const inProgress = issues.filter(i => i.inProgress)
  const backlog    = issues.filter(i => i.isNew)
  const overdue    = open.filter(i => i.daysRemaining !== null && i.daysRemaining < 0)
  const dueSoon    = open.filter(i => i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 7)
  const critical   = open.filter(i => ['Highest', 'High'].includes(i.priority ?? ''))
  const unassigned = open.filter(i => !i.assignee)

  // Use pre-computed avgResolutionDays from the Jira route (MTTR)
  const avgResolutionDays = raw.summary?.avgResolutionDays ?? null
  const slaCompliance     = raw.summary?.slaCompliance     ?? null

  // Every open activity, most urgent first (overdue, then soonest due date, then
  // items with no deadline set at all) — used by the Farol report to list each
  // real open atividade per client, not just the ones that happen to have a prazo.
  const openDetails = [...open]
    .sort((a: any, b: any) => (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity))
    .slice(0, 10)

  return {
    total:           issues.length,
    open:            open.length,
    done:            done.length,
    inProgress:      inProgress.length,
    backlog:         backlog.length,
    overdue:         overdue.length,
    dueSoon:         dueSoon.length,
    critical:        critical.length,
    unassigned:      unassigned.length,
    avgResolutionDays,
    slaCompliance,
    projects:        [...new Set(issues.map(i => i.project?.name).filter(Boolean))],
    overdueDetails:  overdue.slice(0, 5),
    criticalDetails: critical.slice(0, 5),
    openDetails,
  }
}

async function collectZabbix(base: string, hostKeywords: string[]) {
  const raw = await safeGet(`${base}/api/zabbix`)
  if (!raw || raw.error) return null

  const allProblems: any[] = raw.problems ?? []
  const stats = raw.stats ?? {}

  const filterProblem = (p: any): boolean => {
    if (hostKeywords.length === 0) return true
    return matchesClient(p.host ?? '', hostKeywords)
  }

  const problems = allProblems.filter(p => !p.resolved).filter(filterProblem)

  // Explicit severity buckets — all used by farol computation
  const disaster  = problems.filter(p => p.severity >= 5)
  const critical  = problems.filter(p => p.severity >= 4)
  const highOnly  = problems.filter(p => p.severity === 4)
  const average   = problems.filter(p => p.severity === 3)
  const warning   = problems.filter(p => p.severity === 2)

  // Host counts: when filtering by client keyword, fall back to global stats
  // because the keyword filter only sees hosts WITH problems, not all client hosts.
  // hostsDown is approximated by disaster-level problems with identifiable hosts.
  const hostsTotal = stats.hostsTotal ?? 0
  const hostsDown  = hostKeywords.length === 0
    ? (stats.hostsDown ?? 0)
    : disaster.filter((p: any) => p.host && p.host !== '—').length
  const hostsUp    = Math.max(0, hostsTotal - hostsDown)
  const availability = hostsTotal > 0
    ? Number(((hostsUp / hostsTotal) * 100).toFixed(2))
    : (stats.availability ?? 100)

  return {
    totalProblems:   problems.length,
    critical:        critical.length,
    disaster:        disaster.length,
    // FIX: high and warning fields were missing — farol was always reading undefined
    high:            highOnly.length,
    average:         average.length,
    warning:         warning.length,
    hostsTotal,
    hostsUp,
    hostsDown,
    availability,
    criticalProblems: critical.slice(0, 10),
    // Trend data from zabbix route (pass-through for the report)
    events7d:        stats.events7d   ?? null,
    events30d:       stats.events30d  ?? null,
    stabilityScore:  stats.stabilityScore ?? null,
    isFiltered:      hostKeywords.length > 0,
  }
}

async function collectDatadog(base: string, client: ClientConfig) {
  const { datadogTags: tags, datadogNameKeywords: nameKeywords } = client

  // Datadog is only registered/tagged for some clients (currently ConnectPSP) — clients
  // with no tags AND no name keywords configured simply don't have Datadog and should
  // show nothing, not the whole company's monitors.
  if (tags.length === 0 && nameKeywords.length === 0) return null

  const raw = await safeGet(`${base}/api/datadog`)
  if (!raw || !raw.configured || raw.error) return null

  const allMonitors: any[] = raw.monitors ?? []

  const filterMonitor = (m: any): boolean => {
    const mTags: string[] = m.tags ?? []
    if (tags.some(t => mTags.includes(t))) return true
    if (nameKeywords.length > 0 && matchesClient(m.name ?? '', nameKeywords)) return true
    return false
  }

  const monitors = allMonitors.filter(filterMonitor)
  const ok = monitors.filter(m => m.status === 'OK').length
  const warn = monitors.filter(m => m.status === 'Warn').length
  const alert = monitors.filter(m => m.status === 'Alert').length

  return {
    configured: true,
    totalMonitors: monitors.length,
    ok,
    warn,
    alert,
    alertMonitors: monitors.filter(m => m.status === 'Alert').slice(0, 5),
  }
}

// ── Health Score ───────────────────────────────────────────────────────────
function calcHealthScore(glpi: any, jira: any, zabbix: any, datadog: any) {
  // When NO integration has data, return score 0 — avoids silent perfect score
  const hasAnyData = glpi !== null || jira !== null || zabbix !== null || datadog !== null
  if (!hasAnyData) {
    return { score: 0, breakdown: { sla: 0, disponibilidade: 0, chamados: 0, observabilidade: 0, infraestrutura: 0 }, noData: true }
  }

  // SLA (25) — 0 when zabbix unavailable (can't measure uptime without it)
  let sla = zabbix ? 25 : 0
  if (zabbix) {
    const av = zabbix.availability ?? 100
    if (av >= 99.9) sla = 25
    else if (av >= 99.5) sla = 23
    else if (av >= 99)   sla = 20
    else if (av >= 98)   sla = 15
    else if (av >= 95)   sla = 8
    else                 sla = 3
  }

  // Disponibilidade (20) — 0 when zabbix unavailable
  let disp = zabbix ? 20 : 0
  if (zabbix?.hostsTotal > 0) {
    disp = Math.round(20 * (zabbix.hostsUp / zabbix.hostsTotal))
    if (zabbix.disaster > 0) disp = Math.max(0, disp - 8)
  }

  // Chamados (20) — 0 when no ticket source available
  let chamados = (glpi || jira) ? 20 : 0
  const criticalTotal = (glpi?.critical ?? 0) + (jira?.critical ?? 0)
  const overdueTotal = (jira?.overdue ?? 0)
  if (criticalTotal > 5)      chamados -= 10
  else if (criticalTotal > 2) chamados -= 5
  else if (criticalTotal > 0) chamados -= 2
  if (overdueTotal > 3)       chamados = Math.max(0, chamados - 5)
  if (glpi?.unattended > 5)   chamados = Math.max(0, chamados - 5)

  // Observabilidade (15) — 0 when datadog unavailable
  let obs = datadog ? 15 : 0
  if (datadog) {
    if (datadog.alert > 3)      obs -= 8
    else if (datadog.alert > 0) obs -= 4
    if (datadog.warn > 5)       obs = Math.max(0, obs - 3)
  }

  // Backup/DR/Storage (20) — não integrado, parcial fixo
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
    collectJira(base, client),
    collectZabbix(base, client.zabbixHostKeywords),
    collectDatadog(base, client),
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
