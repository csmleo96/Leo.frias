import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Helpers ────────────────────────────────────────────────────────────────
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

function daysAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

function hoursAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 3600000)
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

function daysUntilDue(dueDate: string | null): number {
  if (!dueDate) return Infinity
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000)
}

// ── Analysis Engine ────────────────────────────────────────────────────────
const DONE_STATUSES = new Set(['done', 'closed', 'concluído', 'concluido', 'close', 'resolved'])
const INPROGRESS_STATUSES = new Set(['em andamento', 'in progress', 'in-progress', 'on going', 'doing', 'desenvolvimento'])
const BLOCKED_STATUSES = new Set(['blocked', 'bloqueado', 'impedimento', 'impediment', 'impedido'])
const REVIEW_STATUSES = new Set(['code review', 'in review', 'review', 'testing', 'qa', 'em revisão', 'em revisao', 'homologação'])

function jiraStatusGroup(status: string): 'todo' | 'inProgress' | 'blocked' | 'review' | 'done' {
  const s = status.toLowerCase().trim()
  if (DONE_STATUSES.has(s)) return 'done'
  if (INPROGRESS_STATUSES.has(s)) return 'inProgress'
  if (BLOCKED_STATUSES.has(s)) return 'blocked'
  if (REVIEW_STATUSES.has(s)) return 'review'
  return 'todo'
}

async function analyzeJira() {
  try {
    const r = await fetch('http://localhost:3000/api/jira', { cache: 'no-store' })
    const data = await r.json()
    const issues = data?.issues || []

    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0)
    const threeDaysAgo = Date.now() - 3 * 86400000

    const mapIssue = (i: any) => {
      const group = jiraStatusGroup(i.status)
      const isDone = group === 'done'
      const isOverdueFlag = !isDone && !!i.dueDate && isOverdue(i.dueDate)
      const dueSoonFlag = !isDone && !isOverdueFlag && !!i.dueDate && daysUntilDue(i.dueDate) >= 0 && daysUntilDue(i.dueDate) <= 3
      const isStale = !isDone && new Date(i.updated).getTime() < threeDaysAgo
      const doneTodayFlag = isDone && new Date(i.updated) >= todayStart
      return {
        key: i.key,
        summary: i.summary,
        status: i.status,
        statusGroup: group,
        priority: i.priority,
        assignee: i.assignee ?? null,
        project: i.project?.key ?? 'OTHER',
        projectName: i.project?.name ?? 'Outros',
        sprint: i.sprint ?? null,
        dueDate: i.dueDate ?? null,
        daysRemaining: i.daysRemaining ?? null,
        created: i.created,
        updated: i.updated,
        url: i.url,
        isDone,
        isOverdue: isOverdueFlag,
        isDueSoon: dueSoonFlag,
        isDoneToday: doneTodayFlag,
        isStale,
      }
    }

    const mapped = issues.map(mapIssue)
    const open = mapped.filter((i: any) => !i.isDone)
    const completed = mapped.filter((i: any) => i.isDone)
    const doneToday = mapped.filter((i: any) => i.isDoneToday)
    const critical = open.filter((i: any) => ['Highest', 'High'].includes(i.priority))
    const overdueList = open.filter((i: any) => i.isOverdue)
    const dueSoon = open.filter((i: any) => i.isDueSoon)
    const unassigned = open.filter((i: any) => !i.assignee)
    const stale = open.filter((i: any) => i.isStale)

    const groups = {
      todo: open.filter((i: any) => i.statusGroup === 'todo' && !i.isOverdue),
      inProgress: open.filter((i: any) => i.statusGroup === 'inProgress' && !i.isOverdue),
      blocked: open.filter((i: any) => i.statusGroup === 'blocked'),
      review: open.filter((i: any) => i.statusGroup === 'review'),
      doneToday,
      overdue: overdueList,
    }

    // Agrupar por projeto
    const projectMap: Record<string, any> = {}
    mapped.forEach((i: any) => {
      if (!projectMap[i.project]) {
        projectMap[i.project] = { key: i.project, name: i.projectName, total: 0, open: 0, completed: 0, inProgress: 0, critical: 0, overdue: 0, dueSoon: 0, unassigned: 0, tickets: [] }
      }
      const p = projectMap[i.project]
      p.total++
      if (i.isDone) p.completed++; else p.open++
      if (i.statusGroup === 'inProgress') p.inProgress++
      if (!i.isDone && ['Highest', 'High'].includes(i.priority)) p.critical++
      if (i.isOverdue) p.overdue++
      if (i.isDueSoon) p.dueSoon++
      if (!i.isDone && !i.assignee) p.unassigned++
      p.tickets.push(i)
    })

    const criticalItems: any[] = []
    Object.values(projectMap).forEach((proj: any) => {
      proj.tickets.forEach((t: any) => {
        if (t.isOverdue || t.isDueSoon || ['Highest', 'High'].includes(t.priority) || !t.assignee) {
          criticalItems.push({ key: t.key, summary: t.summary, project: proj.name, priority: t.priority, assignee: t.assignee, status: t.status, dueDate: t.dueDate, daysRemaining: t.daysRemaining, isOverdue: t.isOverdue, isDueSoon: t.isDueSoon, url: t.url })
        }
      })
    })

    return {
      total: issues.length, open: open.length, completed: completed.length,
      completedToday: doneToday.length, critical: critical.length,
      overdue: overdueList.length, dueSoon: dueSoon.length,
      unassigned: unassigned.length, stale: stale.length,
      noDueDate: open.filter((i: any) => !i.dueDate).length,
      groups, projectsData: projectMap,
      allTickets: mapped,
      criticalItems: criticalItems.slice(0, 20),
      completedDetails: doneToday.slice(0, 10),
      overdueDetails: overdueList.slice(0, 20),
      criticalDetails: critical.slice(0, 10),
      staleDetails: stale.slice(0, 10),
    }
  } catch (error) {
    console.error('Erro ao analisar Jira:', error)
    return null
  }
}

async function analyzeGLPI() {
  try {
    const r = await fetch('http://localhost:3000/api/glpi', { cache: 'no-store' })
    const data = await r.json()
    const stats = data?.stats || {}
    const tickets: any[] = data?.tickets || []

    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0)
    const threeDaysAgo = Date.now() - 3 * 86400000

    const openTickets = tickets.filter((t: any) => ![5, 6].includes(t.status))
    const resolved = tickets.filter((t: any) => [5, 6].includes(t.status))

    const groups = {
      open: tickets.filter((t: any) => t.status === 1),
      inProgress: tickets.filter((t: any) => [2, 3].includes(t.status)),
      pending: tickets.filter((t: any) => t.status === 4),
      resolvedToday: resolved.filter((t: any) => {
        const d = t.dateMod ? new Date(String(t.dateMod)) : null
        return d && d >= todayStart
      }),
      overdue: openTickets.filter((t: any) => {
        const modMs = t.dateMod ? new Date(String(t.dateMod)).getTime() : 0
        return modMs > 0 && modMs < threeDaysAgo
      }),
    }

    const critical = openTickets.filter((t: any) => t.priority >= 5)
    const unattended = openTickets.filter((t: any) => !t.assignee || hoursAgo(t.dateCreation || '') > 24)

    return {
      total: stats.total || tickets.length,
      open: openTickets.length,
      resolved: resolved.length,
      resolvedToday: groups.resolvedToday.length,
      critical: critical.length,
      pending: groups.pending.length,
      unattended: unattended.length,
      overdue: groups.overdue.length,
      groups,
      allTickets: tickets,
      unattendedDetails: unattended.slice(0, 10),
      criticalDetails: critical.slice(0, 10),
    }
  } catch (error) {
    console.error('Erro ao analisar GLPI:', error)
    return null
  }
}

async function analyzeZabbix() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const r = await fetch(`${base}/api/zabbix`, { cache: 'no-store' })
    if (!r.ok) return null
    const data = await r.json()
    if (data.error) return null
    const stats = data.stats ?? {}
    const problems: any[] = data.problems ?? []
    const active = problems.filter((p: any) => !p.resolved)
    return {
      totalProblems:  stats.totalProblems ?? 0,
      critical:       (stats.disaster ?? 0) + (stats.high ?? 0),
      disaster:       stats.disaster ?? 0,
      high:           stats.high ?? 0,
      average:        stats.average ?? 0,
      warning:        stats.warning ?? 0,
      unacknowledged: stats.unacknowledged ?? 0,
      hostsTotal:     stats.hostsTotal ?? 0,
      hostsUp:        stats.hostsUp ?? 0,
      hostsDown:      stats.hostsDown ?? 0,
      availability:   stats.availability ?? 0,
      criticalProblems: active.filter((p: any) => p.severity >= 4).slice(0, 5),
    }
  } catch (error) {
    console.error('Erro ao analisar Zabbix:', error)
    return null
  }
}

async function analyzeDatadog() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const r = await fetch(`${base}/api/datadog`, { cache: 'no-store' })
    if (!r.ok) return null
    const data = await r.json()
    if (!data.configured || data.error) return null
    const summary = data.summary ?? {}
    const hosts = data.hosts ?? {}
    const monitors: any[] = data.monitors ?? []
    return {
      totalMonitors: summary.total ?? 0,
      ok:    summary.ok    ?? 0,
      warn:  summary.warn  ?? 0,
      alert: summary.alert ?? 0,
      noData: summary.noData ?? 0,
      hostsTotal: hosts.total ?? 0,
      hostsUp:    hosts.up   ?? 0,
      hostsDown:  hosts.down ?? 0,
      alertMonitors: monitors.filter((m: any) => m.status === 'Alert').slice(0, 5),
      warnMonitors:  monitors.filter((m: any) => m.status === 'Warn').slice(0, 5),
    }
  } catch (error) {
    console.error('Erro ao analisar Datadog:', error)
    return null
  }
}

function groupBy(arr: any[], key: string): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'Unknown'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})
}

function determineHealth(jira: any, glpi: any, zabbix: any, datadog: any): string {
  const issues: string[] = []

  if (jira) {
    if (jira.overdue > 5) issues.push('overdue-jira')
    if (jira.critical > 3) issues.push('critical-jira')
    if (jira.unassigned > 5) issues.push('unassigned-jira')
  }

  if (glpi) {
    if (glpi.overdue > 0) issues.push('overdue-glpi')
    if (glpi.critical > 5) issues.push('critical-glpi')
    if (glpi.unattended > 10) issues.push('unattended-glpi')
    if (glpi.pending > 10) issues.push('pending-glpi')
  }

  if (zabbix) {
    if (zabbix.disaster > 0) issues.push('disaster-zabbix')
    if (zabbix.high > 2) issues.push('high-zabbix')
    if (zabbix.hostsDown > 0) issues.push('hosts-down-zabbix')
    if (zabbix.availability < 95) issues.push('availability-zabbix')
  }

  if (datadog) {
    if (datadog.alert > 5) issues.push('alert-datadog')
    if (datadog.hostsDown > 0) issues.push('hosts-down-datadog')
  }

  if (issues.length >= 3) return 'critical'
  if (issues.length >= 2) return 'attention'
  return 'healthy'
}

function generateExecutiveSummary(jira: any, glpi: any, health: string, zabbix: any, datadog: any): string {
  const date = new Date().toLocaleDateString('pt-BR')
  const jiraCompleted = jira?.completedToday || 0
  const jiraOverdue = jira?.overdue || 0
  const glpiUnattended = glpi?.unattended || 0
  const totalOpen = (jira?.open || 0) + (glpi?.open || 0)

  const lines = [`Período: ${date}.`]

  if (health === 'healthy') {
    lines.push('A operação manteve estabilidade geral, com indicadores dentro dos parâmetros esperados.')
  } else if (health === 'attention') {
    lines.push('A operação apresenta sinais de atenção que requerem acompanhamento executivo.')
  } else {
    lines.push('A operação identifica múltiplas áreas com risco que exigem ação imediata da liderança.')
  }

  lines.push(`Foram concluídas ${jiraCompleted} atividades estratégicas, permanecendo ${totalOpen} pendências em aberto.`)

  if (jiraOverdue > 0 || glpiUnattended > 0) {
    const issues = []
    if (jiraOverdue > 0) issues.push(`${jiraOverdue} atividades vencidas no Jira`)
    if (glpiUnattended > 0) issues.push(`${glpiUnattended} chamados sem atendimento no GLPI`)
    lines.push(`Identificamos ${issues.join(' e ')}, que exigem acompanhamento imediato.`)
  }

  lines.push(`O backlog consolidado está em ${totalOpen} itens, com ${(jira?.critical || 0) + (glpi?.critical || 0)} demandas críticas requerendo priorização.`)

  if (zabbix && zabbix.totalProblems > 0) {
    lines.push(`Infraestrutura Zabbix: ${zabbix.totalProblems} problema(s) ativo(s) em ${zabbix.hostsTotal} hosts monitorados — disponibilidade ${zabbix.availability}%.`)
  } else if (zabbix && zabbix.hostsTotal > 0) {
    lines.push(`Infraestrutura Zabbix: ${zabbix.hostsUp}/${zabbix.hostsTotal} hosts online (${zabbix.availability}% disponibilidade).`)
  }

  if (datadog && datadog.alert > 0) {
    lines.push(`Observabilidade Datadog: ${datadog.alert} monitor(es) em alerta de um total de ${datadog.totalMonitors}.`)
  } else if (datadog && datadog.totalMonitors > 0) {
    lines.push(`Observabilidade Datadog: ${datadog.ok}/${datadog.totalMonitors} monitors OK.`)
  }

  return lines.join(' ')
}

function generateRisks(jira: any, glpi: any, zabbix: any, datadog: any): any[] {
  const risks = []

  if (jira?.overdue > 5) {
    risks.push({
      type: 'schedule-risk',
      severity: 'critical',
      title: `${jira.overdue} Atividades Vencidas no Jira`,
      description: `Existem ${jira.overdue} tarefas que ultrapassaram o prazo previsto, impactando cronogramas e confiabilidade dos projetos.`,
      impact: 'Atraso em entregas e deterioração da confiança dos stakeholders',
      action: 'Priorizar resolução imediata e reavaliar prazos',
    })
  }

  if (jira?.unassigned > 5) {
    risks.push({
      type: 'capacity-risk',
      severity: 'high',
      title: `${jira.unassigned} Atividades Sem Responsável`,
      description: `${jira.unassigned} demandas permanecem sem atribuição de responsável, criando gaps de accountability.`,
      impact: 'Atraso na execução e duplicação de esforços',
      action: 'Atribuir responsáveis e alinhar com equipes',
    })
  }

  if (glpi?.unattended > 10) {
    risks.push({
      type: 'operational-risk',
      severity: 'critical',
      title: `${glpi.unattended} Chamados Sem Atendimento Inicial`,
      description: `${glpi.unattended} chamados aguardam primeira atribuição há mais de 24 horas.`,
      impact: 'Deterioração da satisfação do cliente e impacto operacional',
      action: 'Reforçar triagem e SLA de primeira resposta',
    })
  }

  if ((jira?.critical || 0) > 3) {
    risks.push({
      type: 'priority-risk',
      severity: 'high',
      title: `${jira.critical} Atividades Críticas em Aberto`,
      description: `Identificadas ${jira.critical} demandas de alta prioridade com potencial impacto significativo.`,
      impact: 'Risco de impacto no produto ou serviço',
      action: 'Revisar priorização e alocar recursos N1/N2',
    })
  }

  if (zabbix?.disaster > 0) {
    risks.push({
      type: 'infrastructure-risk',
      severity: 'critical',
      title: `${zabbix.disaster} Problema(s) Nível Disaster no Zabbix`,
      description: `Existem ${zabbix.disaster} alerta(s) de nível máximo na infraestrutura monitorada pelo Zabbix.`,
      impact: 'Risco de indisponibilidade de serviços críticos e violação de SLA',
      action: 'Acionar equipe de infraestrutura imediatamente',
    })
  }

  if (zabbix?.hostsDown > 0) {
    risks.push({
      type: 'infrastructure-risk',
      severity: 'high',
      title: `${zabbix.hostsDown} Host(s) Offline no Zabbix`,
      description: `${zabbix.hostsDown} host(s) monitorado(s) não estão respondendo (${zabbix.hostsUp}/${zabbix.hostsTotal} online).`,
      impact: 'Impacto direto em disponibilidade e SLA dos clientes',
      action: 'Verificar conectividade e status dos servidores afetados',
    })
  }

  if (datadog?.alert > 5) {
    risks.push({
      type: 'observability-risk',
      severity: 'high',
      title: `${datadog.alert} Monitors Datadog em Alerta`,
      description: `${datadog.alert} monitores de observabilidade reportam estado de alerta, indicando anomalias nos serviços.`,
      impact: 'Degradação de performance ou disponibilidade de serviços',
      action: 'Revisar dashboards Datadog e acionar times responsáveis',
    })
  }

  return risks
}

function generateRecommendations(jira: any, glpi: any, health: string, zabbix: any, datadog: any): string[] {
  const recs = []

  if (jira?.overdueDetails && jira.overdueDetails.length > 0) {
    recs.push(`Priorizar resolução das ${jira.overdue} atividades vencidas no Jira para recuperação do cronograma`)
  }

  if (glpi?.unattended > 5) {
    recs.push(`Reforçar time de triagem do GLPI para atender ${glpi.unattended} chamados sem atendimento inicial`)
  }

  if (jira?.unassigned > 3) {
    recs.push(`Atribuir responsáveis para ${jira.unassigned} atividades abertas no Jira para evitar gaps de accountability`)
  }

  if ((jira?.critical || 0) + (glpi?.critical || 0) > 5) {
    recs.push(`Acompanhamento executivo das ${(jira?.critical || 0) + (glpi?.critical || 0)} demandas críticas nos próximos 7 dias`)
  }

  if (zabbix?.disaster > 0 || zabbix?.hostsDown > 0) {
    recs.push(`Ação imediata de infraestrutura: ${zabbix?.disaster ?? 0} disaster(s) e ${zabbix?.hostsDown ?? 0} host(s) offline no Zabbix`)
  } else if (zabbix?.high > 0) {
    recs.push(`Monitorar e resolver ${zabbix.high} alerta(s) de alta severidade no Zabbix nas próximas 4 horas`)
  }

  if (datadog?.alert > 0) {
    recs.push(`Investigar ${datadog.alert} monitor(es) Datadog em alerta e identificar causa raiz`)
  }

  if (health !== 'healthy') {
    recs.push(`Avaliar alocação de recursos e redistribuir carga de trabalho entre equipes`)
  }

  if (recs.length === 0) {
    recs.push(`Manter monitoramento dos indicadores atuais`)
    recs.push(`Acompanhar tendências de backlog para próximos 7 dias`)
  }

  return recs.slice(0, 6)
}

// ── Health Score (0–100) ───────────────────────────────────────────────────
// Pesos: SLA=25, Disponibilidade=20, Backup=15, DR=15, Storage=10, Chamados=10, Segurança=5
function calculateHealthScore(jira: any, glpi: any, zabbix: any, datadog: any): { score: number; breakdown: Record<string, number> } {
  // SLA — baseado em disponibilidade Zabbix
  let sla = 25
  if (zabbix?.availability != null) {
    const av = zabbix.availability
    if (av >= 99.9) sla = 25
    else if (av >= 99.5) sla = 23
    else if (av >= 99)   sla = 20
    else if (av >= 98)   sla = 15
    else if (av >= 95)   sla = 8
    else                 sla = 3
  }

  // Disponibilidade — hosts online
  let disponibilidade = 20
  if (zabbix?.hostsTotal > 0) {
    const ratio = zabbix.hostsTotal > 0 ? zabbix.hostsUp / zabbix.hostsTotal : 1
    disponibilidade = Math.round(20 * ratio)
    if (zabbix.disaster > 0) disponibilidade = Math.max(0, disponibilidade - 8)
  }

  // Datadog penaliza se houver alertas críticos
  if (datadog?.alert > 5) disponibilidade = Math.max(0, disponibilidade - 5)

  // Backup — sem integração ainda: assumir ok
  const backup = 15

  // DR — sem integração ainda: assumir ok
  const dr = 15

  // Storage — sem integração ainda: assumir ok
  const storage = 10

  // Chamados
  let chamados = 10
  const totalCritical = (jira?.critical || 0) + (glpi?.critical || 0)
  const glpiUnattended = glpi?.unattended || 0
  if (totalCritical > 10)    chamados -= 6
  else if (totalCritical > 5) chamados -= 3
  else if (totalCritical > 0) chamados -= 1
  if (glpiUnattended > 10)   chamados = Math.max(0, chamados - 3)
  if (jira?.overdue > 5)     chamados = Math.max(0, chamados - 2)

  // Segurança — sem integração ainda: assumir ok
  const seguranca = 5

  const score = Math.max(0, Math.min(100, sla + disponibilidade + backup + dr + storage + chamados + seguranca))

  return {
    score,
    breakdown: { sla, disponibilidade, backup, dr, storage, chamados, seguranca },
  }
}

// ── Main Handler ───────────────────────────────────────────────────────────
export async function GET() {
  const sb = await createClient()

  try {
    console.log('🚀 Gerando Executive Daily Report...')

    const [jiraData, glpiData, zabbixData, datadogData] = await Promise.all([
      analyzeJira(), analyzeGLPI(), analyzeZabbix(), analyzeDatadog(),
    ])

    if (!jiraData && !glpiData) {
      throw new Error('Falha ao coletar dados de Jira e GLPI')
    }

    const health = determineHealth(jiraData, glpiData, zabbixData, datadogData)
    const healthScoreResult = calculateHealthScore(jiraData, glpiData, zabbixData, datadogData)
    const executiveSummary = generateExecutiveSummary(jiraData, glpiData, health, zabbixData, datadogData)
    const risks = generateRisks(jiraData, glpiData, zabbixData, datadogData)
    const recommendations = generateRecommendations(jiraData, glpiData, health, zabbixData, datadogData)

    const totalOpen = (jiraData?.open || 0) + (glpiData?.open || 0)
    const totalResolved = (jiraData?.completed || 0) + (glpiData?.resolved || 0)
    const totalCritical = (jiraData?.critical || 0) + (glpiData?.critical || 0)

    // Build upcoming deadlines (Jira only — GLPI has no standard due dates)
    const upcomingDeadlines: any[] = []
    const jiraAllTickets: any[] = jiraData?.allTickets || []
    jiraAllTickets.forEach((t: any) => {
      if (!t.isDone && t.dueDate && t.daysRemaining !== null && t.daysRemaining <= 7) {
        upcomingDeadlines.push({
          sistema: 'Jira',
          id: t.key,
          titulo: t.summary,
          responsavel: t.assignee ?? '—',
          projeto: t.projectName,
          prazo: t.dueDate,
          diasRestantes: t.daysRemaining,
          prioridade: t.priority,
          status: t.status,
          url: t.url,
        })
      }
    })
    upcomingDeadlines.sort((a, b) => a.diasRestantes - b.diasRestantes)

    const staleItems = [
      ...(jiraData?.staleDetails || []).map((t: any) => ({ sistema: 'Jira', id: t.key, titulo: t.summary, responsavel: t.assignee ?? '—', projeto: t.projectName, diasSemAtualizar: Math.floor((Date.now() - new Date(t.updated).getTime()) / 86400000) })),
      ...(glpiData?.groups?.overdue || []).map((t: any) => ({ sistema: 'GLPI', id: String(t.id), titulo: t.title, responsavel: t.assignee ?? '—', projeto: t.category, diasSemAtualizar: t.daysSinceUpdate ?? 0 })),
    ].sort((a, b) => b.diasSemAtualizar - a.diasSemAtualizar)

    const report = {
      generatedAt: new Date().toISOString(),
      executiveSummary,
      health,
      healthScore: healthScoreResult.score,
      healthScoreBreakdown: healthScoreResult.breakdown,
      metrics: {
        totalOpen,
        totalResolved,
        totalCritical,
        jiraCompleted: jiraData?.completedToday || 0,
        jiraOverdue: jiraData?.overdue || 0,
        jiraUnassigned: jiraData?.unassigned || 0,
        glpiUnattended: glpiData?.unattended || 0,
        glpiPending: glpiData?.pending || 0,
        glpiResolvedToday: glpiData?.resolvedToday || 0,
        upcomingDeadlines: upcomingDeadlines.length,
        staleItems: staleItems.length,
        zabbixProblems: zabbixData?.totalProblems ?? 0,
        zabbixCritical: zabbixData?.critical ?? 0,
        zabbixAvailability: zabbixData?.availability ?? 0,
        zabbixHostsDown: zabbixData?.hostsDown ?? 0,
        datadogAlerts: datadogData?.alert ?? 0,
        datadogMonitors: datadogData?.totalMonitors ?? 0,
      },
      jira: {
        total: jiraData?.total || 0,
        open: jiraData?.open || 0,
        completed: jiraData?.completed || 0,
        completedToday: jiraData?.completedToday || 0,
        critical: jiraData?.critical || 0,
        overdue: jiraData?.overdue || 0,
        dueSoon: jiraData?.dueSoon || 0,
        unassigned: jiraData?.unassigned || 0,
        stale: jiraData?.stale || 0,
        groups: jiraData?.groups || {},
        projectsData: jiraData?.projectsData || {},
        allTickets: jiraData?.allTickets || [],
        criticalItems: jiraData?.criticalItems || [],
        completedDetails: jiraData?.completedDetails || [],
        overdueDetails: jiraData?.overdueDetails || [],
        criticalDetails: jiraData?.criticalDetails || [],
      },
      glpi: {
        total: glpiData?.total || 0,
        open: glpiData?.open || 0,
        resolved: glpiData?.resolved || 0,
        resolvedToday: glpiData?.resolvedToday || 0,
        critical: glpiData?.critical || 0,
        pending: glpiData?.pending || 0,
        unattended: glpiData?.unattended || 0,
        overdue: glpiData?.overdue || 0,
        groups: glpiData?.groups || {},
        allTickets: glpiData?.allTickets || [],
        unattendedDetails: glpiData?.unattendedDetails || [],
        criticalDetails: glpiData?.criticalDetails || [],
      },
      zabbix: zabbixData ? {
        totalProblems:  zabbixData.totalProblems,
        critical:       zabbixData.critical,
        disaster:       zabbixData.disaster,
        high:           zabbixData.high,
        average:        zabbixData.average,
        warning:        zabbixData.warning,
        unacknowledged: zabbixData.unacknowledged,
        hostsTotal:     zabbixData.hostsTotal,
        hostsUp:        zabbixData.hostsUp,
        hostsDown:      zabbixData.hostsDown,
        availability:   zabbixData.availability,
        criticalProblems: zabbixData.criticalProblems,
      } : null,
      datadog: datadogData ? {
        totalMonitors: datadogData.totalMonitors,
        ok:            datadogData.ok,
        warn:          datadogData.warn,
        alert:         datadogData.alert,
        noData:        datadogData.noData,
        hostsTotal:    datadogData.hostsTotal,
        hostsUp:       datadogData.hostsUp,
        hostsDown:     datadogData.hostsDown,
        alertMonitors: datadogData.alertMonitors,
        warnMonitors:  datadogData.warnMonitors,
      } : null,
      upcomingDeadlines,
      staleItems,
      risks,
      recommendations,
    }

    // Log ao Supabase
    try {
      await sb.from('audit_log').insert({
        action: 'executive_daily_report_generated',
        module: 'reports',
        description: `Executive Daily Report gerado — ${health} (${totalOpen} abertos, ${totalCritical} críticos)`,
        metadata: { health, metrics: report.metrics },
        level: health === 'critical' ? 'warning' : 'info',
      })
    } catch (logError) {
      console.warn('⚠️  Erro ao registrar log:', logError)
    }

    console.log(`✅ Executive Daily Report gerado — Status: ${health}`)

    return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
