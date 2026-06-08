import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

export async function GET() {
  const sb = await createClient()

  // Parallel fetch all data
  const [glpiRes, jiraRes, zabbixRes, operacoesSyncRes] = await Promise.all([
    fetch('http://localhost:3000/api/glpi', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
    fetch('http://localhost:3000/api/jira', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
    fetch('http://localhost:3000/api/zabbix', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
    fetch('http://localhost:3000/api/operacoes', { cache: 'no-store' }).then(r => r.json()).catch(() => []),
  ])

  const glpiData = glpiRes || {}
  const jiraData = jiraRes || {}
  const zabbixData = zabbixRes || {}
  const operacoesData = operacoesSyncRes || []

  // Extract stats
  const glpiStats = glpiData.stats || {}
  const jiraIssues = jiraData.issues || []
  const zabbixStats = zabbixData.stats || {}
  const zabbixProblems = zabbixData.problems || []

  // Get Supabase ticket data
  const glpiTickets = await sb.from('glpi_tickets').select('*').order('updated_at', { ascending: false })
  const jiraTickets = await sb.from('jira_tickets').select('*').order('updated_at', { ascending: false })

  const glpiTicketList = glpiTickets.data || []
  const jiraTicketList = jiraTickets.data || []

  const allTickets = [...glpiTicketList, ...jiraTicketList]

  // Compute aggregated metrics
  const glpiTotal = glpiTicketList.length
  const jiraTotal = jiraTicketList.length
  const totalTickets = glpiTotal + jiraTotal

  const glpiCritical = glpiTicketList.filter(t => t.priority === 5).length
  const jiraCritical = jiraTicketList.filter(t => t.priority_num >= 5).length
  const totalCritical = glpiCritical + jiraCritical

  const glpiBreached = glpiTicketList.filter(t => t.sla_status === 'breached').length
  const jiraBreached = jiraTicketList.filter(t => t.sla_status === 'breached').length
  const totalBreached = glpiBreached + jiraBreached

  const glpiAtRisk = glpiTicketList.filter(t => t.sla_status === 'at_risk').length
  const jiraAtRisk = jiraTicketList.filter(t => t.sla_status === 'at_risk').length
  const totalAtRisk = glpiAtRisk + jiraAtRisk

  const glpiResolved = glpiTicketList.filter(t => t.sla_status === 'resolved').length
  const jiraResolved = jiraTicketList.filter(t => t.sla_status === 'resolved').length
  const totalResolved = glpiResolved + jiraResolved

  const openTickets = totalTickets - totalResolved
  const breachPct = pct(totalBreached, totalTickets)
  const atRiskPct = pct(totalAtRisk, totalTickets)
  const resolutionRate = pct(totalResolved, totalTickets)

  // Infraestructure health
  const infraHealth = {
    hostsTotal: zabbixStats.hostsTotal || 0,
    hostsUp: zabbixStats.hostsUp || 0,
    hostsDown: zabbixStats.hostsDown || 0,
    availability: zabbixStats.availability || 100,
    criticalProblems: zabbixStats.disaster || 0,
    highProblems: zabbixStats.high || 0,
  }

  // Priority actions (top 5 critical items)
  const priorityActions = []

  if (totalBreached > 0) {
    priorityActions.push({
      level: 'critical',
      title: `${totalBreached} SLA Vencido`,
      description: `${breachPct}% do portfólio com violação SLA ativa`,
      action: 'Ver detalhes',
      href: '/operacoes',
    })
  }

  if (totalAtRisk > 5) {
    priorityActions.push({
      level: 'warning',
      title: `${totalAtRisk} Tickets em Risco`,
      description: `${atRiskPct}% próximos do vencimento SLA`,
      action: 'Priorizar',
      href: '/operacoes',
    })
  }

  if (totalCritical > 3) {
    priorityActions.push({
      level: 'critical',
      title: `${totalCritical} Issues Críticas`,
      description: `${glpiCritical} GLPI + ${jiraCritical} Jira de alta prioridade`,
      action: 'Escalar',
      href: '/operacoes',
    })
  }

  if (infraHealth.hostsDown > 0) {
    priorityActions.push({
      level: 'critical',
      title: `${infraHealth.hostsDown} Host(s) Down`,
      description: `Indisponibilidade crítica na infraestrutura`,
      action: 'Ver Zabbix',
      href: '/zabbix',
    })
  }

  if (infraHealth.criticalProblems > 0) {
    priorityActions.push({
      level: 'critical',
      title: `${infraHealth.criticalProblems} Desastres`,
      description: `Problemas de severidade DESASTRE detectados`,
      action: 'Investigar',
      href: '/zabbix',
    })
  }

  // Operational health score
  const resScore = (resolutionRate / 100) * 40
  const slaScore = (1 - Math.min(breachPct / 100, 1)) * 30
  const infraScore = (infraHealth.availability / 100) * 30
  const healthScore = Math.round(resScore + slaScore + infraScore)

  // Recent activity
  const recentActivity = allTickets
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    .slice(0, 15)
    .map(t => ({
      id: (t as any).id || (t as any).key,
      source: (t as any).id ? 'GLPI' : 'Jira',
      title: (t as any).title || (t as any).summary,
      status: (t as any).status || (t as any).status_category,
      priority: (t as any).priority || (t as any).priority_num,
      timestamp: (t as any).updated_at,
    }))

  // Today's metrics
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()

  const resolvedToday = allTickets.filter(t => {
    const updated = new Date(t.updated_at || '')
    return updated >= today && t.sla_status === 'resolved'
  }).length

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    health: {
      score: healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'attention' : 'critical',
    },
    metrics: {
      glpiTotal,
      jiraTotal,
      totalTickets,
      openTickets,
      totalCritical,
      totalBreached,
      totalAtRisk,
      totalResolved,
      breachPct,
      atRiskPct,
      resolutionRate,
      resolvedToday,
    },
    infrastructure: infraHealth,
    priorityActions: priorityActions.slice(0, 5),
    recentActivity,
    sources: {
      glpi: {
        total: glpiTotal,
        critical: glpiCritical,
        breached: glpiBreached,
        atRisk: glpiAtRisk,
        resolved: glpiResolved,
      },
      jira: {
        total: jiraTotal,
        critical: jiraCritical,
        breached: jiraBreached,
        atRisk: jiraAtRisk,
        resolved: jiraResolved,
      },
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
