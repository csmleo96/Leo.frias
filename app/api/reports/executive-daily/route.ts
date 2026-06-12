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
async function analyzeJira() {
  try {
    const r = await fetch('http://localhost:3000/api/jira', { cache: 'no-store' })
    const data = await r.json()
    const issues = data?.issues || []

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const completed = issues.filter((i: any) => {
      if (!['Done', 'Closed'].includes(i.status)) return false
      const updated = new Date(i.updated)
      updated.setHours(0, 0, 0, 0)
      return updated >= today
    })

    const open = issues.filter((i: any) => !['Done', 'Closed'].includes(i.status))
    const critical = open.filter((i: any) => ['Highest', 'High'].includes(i.priority))
    const overdue = open.filter((i: any) => i.dueDate && isOverdue(i.dueDate))
    const dueSoon = open.filter((i: any) => i.dueDate && daysUntilDue(i.dueDate) > 0 && daysUntilDue(i.dueDate) <= 3)
    const unassigned = open.filter((i: any) => !i.assignee)
    const noDueDate = open.filter((i: any) => !i.dueDate)

    // Agrupar por projeto com detalhes completos
    const projectMap: Record<string, any> = {}

    issues.forEach((i: any) => {
      const projKey = i.project?.key || 'OTHER'
      const projName = i.project?.name || 'Outros Projetos'

      if (!projectMap[projKey]) {
        projectMap[projKey] = {
          key: projKey,
          name: projName,
          total: 0,
          open: 0,
          completed: 0,
          inProgress: 0,
          critical: 0,
          overdue: 0,
          dueSoon: 0,
          unassigned: 0,
          tickets: [],
        }
      }

      const isCompleted = ['Done', 'Closed'].includes(i.status)
      const isOpen = !isCompleted
      const isInProgress = ['Em Andamento', 'In Progress', 'em andamento'].includes(i.status)

      projectMap[projKey].total += 1
      if (isCompleted) projectMap[projKey].completed += 1
      if (isOpen) projectMap[projKey].open += 1
      if (isInProgress) projectMap[projKey].inProgress += 1
      if (isOpen && ['Highest', 'High'].includes(i.priority)) projectMap[projKey].critical += 1
      if (isOpen && i.dueDate && isOverdue(i.dueDate)) projectMap[projKey].overdue += 1
      if (isOpen && i.dueDate && daysUntilDue(i.dueDate) > 0 && daysUntilDue(i.dueDate) <= 3) projectMap[projKey].dueSoon += 1
      if (isOpen && !i.assignee) projectMap[projKey].unassigned += 1

      projectMap[projKey].tickets.push({
        key: i.key,
        summary: i.summary,
        status: i.status,
        priority: i.priority,
        assignee: i.assignee?.displayName || 'Não atribuído',
        dueDate: i.dueDate || null,
        url: i.url,
        isCompleted,
        isOverdue: isOpen && i.dueDate ? isOverdue(i.dueDate) : false,
        isDueSoon: isOpen && i.dueDate ? (daysUntilDue(i.dueDate) > 0 && daysUntilDue(i.dueDate) <= 3) : false,
        daysUntilDue: i.dueDate ? daysUntilDue(i.dueDate) : null,
      })
    })

    // Ordenar tickets em cada projeto
    Object.keys(projectMap).forEach(projKey => {
      const tickets = projectMap[projKey].tickets
      tickets.sort((a: any, b: any) => {
        // Atrasados primeiro
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        // Vencendo em breve
        if (a.isDueSoon && !b.isDueSoon) return -1
        if (!a.isDueSoon && b.isDueSoon) return 1
        // Em andamento
        if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1
        // Não iniciados
        if (a.status === 'Não Iniciado' && b.status !== 'Não Iniciado') return 1
        // Concluídos por último
        if (a.isCompleted && !b.isCompleted) return 1
        if (!a.isCompleted && b.isCompleted) return -1
        return 0
      })
    })

    // Itens críticos (para seção especial)
    const criticalItems = []
    Object.values(projectMap).forEach((proj: any) => {
      proj.tickets.forEach((t: any) => {
        if (t.isOverdue || (t.priority && ['Highest', 'High'].includes(t.priority)) ||
            !t.assignee || (t.isDueSoon)) {
          criticalItems.push({
            key: t.key,
            summary: t.summary,
            project: proj.name,
            priority: t.priority,
            assignee: t.assignee,
            issue: t.isOverdue ? '🔴 Atrasado' : t.isDueSoon ? '🟠 Vence em breve' : t.priority && ['Highest', 'High'].includes(t.priority) ? '⚠️ Crítico' : '👤 Sem responsável',
          })
        }
      })
    })

    return {
      total: issues.length,
      open: open.length,
      completed: completed.length,
      completedToday: completed.length,
      critical: critical.length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      unassigned: unassigned.length,
      noDueDate: noDueDate.length,
      projectsData: projectMap,
      criticalItems: criticalItems.slice(0, 15),
      completedDetails: completed.slice(0, 5).map((i: any) => ({
        key: i.key,
        summary: i.summary,
        assignee: i.assignee?.displayName || 'Não atribuído',
        project: i.project?.name || i.projectKey,
        updated: i.updated,
      })),
      overdueDetails: overdue.slice(0, 10).map((i: any) => ({
        key: i.key,
        summary: i.summary,
        assignee: i.assignee?.displayName || 'Não atribuído',
        dueDate: i.dueDate,
        daysOverdue: -daysUntilDue(i.dueDate),
        priority: i.priority,
        project: i.project?.name || i.projectKey,
      })),
      criticalDetails: critical.slice(0, 10).map((i: any) => ({
        key: i.key,
        summary: i.summary,
        assignee: i.assignee?.displayName || 'Não atribuído',
        dueDate: i.dueDate,
        daysUntilDue: daysUntilDue(i.dueDate),
        priority: i.priority,
        project: i.project?.name || i.projectKey,
      })),
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
    const tickets = data?.tickets || []

    const open = tickets.filter((t: any) => ![5, 6].includes(t.status))
    const unattended = tickets.filter((t: any) => {
      if ([5, 6].includes(t.status)) return false // Resolved
      return !t.assignee || hoursAgo(t.dateCreation || '') > 24
    })

    const critical = open.filter((t: any) => t.priority >= 5)
    const overDueTickets = open.filter((t: any) => {
      if (!t.slaDeadline) return false
      return new Date(t.slaDeadline) < new Date()
    })

    return {
      total: stats.total || 0,
      open: open.length,
      resolved: (stats.solved ?? 0) + (stats.closed ?? 0),
      critical: critical.length,
      pending: stats.pending || 0,
      unattended: unattended.length,
      overdue: overDueTickets.length,
      unattendedDetails: unattended.slice(0, 10).map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        category: t.typeName || 'General',
        dateCreation: t.dateCreation,
        hoursWaiting: hoursAgo(t.dateCreation || ''),
      })),
      criticalDetails: critical.slice(0, 10).map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        assignee: t.assignee || 'Unassigned',
        dateCreation: t.dateCreation,
      })),
    }
  } catch (error) {
    console.error('Erro ao analisar GLPI:', error)
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

function determineHealth(jira: any, glpi: any): string {
  const issues: string[] = []

  // Check Jira
  if (jira) {
    if (jira.overdue > 5) issues.push('overdue-jira')
    if (jira.critical > 3) issues.push('critical-jira')
    if (jira.unassigned > 5) issues.push('unassigned-jira')
  }

  // Check GLPI
  if (glpi) {
    if (glpi.overdue > 0) issues.push('overdue-glpi')
    if (glpi.critical > 5) issues.push('critical-glpi')
    if (glpi.unattended > 10) issues.push('unattended-glpi')
    if (glpi.pending > 10) issues.push('pending-glpi')
  }

  if (issues.length >= 3) return 'critical'
  if (issues.length >= 2) return 'attention'
  return 'healthy'
}

function generateExecutiveSummary(jira: any, glpi: any, health: string): string {
  const date = new Date().toLocaleDateString('pt-BR')
  const jiraCompleted = jira?.completedToday || 0
  const jiraOverdue = jira?.overdue || 0
  const glpiUnattended = glpi?.unattended || 0
  const totalOpen = (jira?.open || 0) + (glpi?.open || 0)

  const lines = [
    `Período: ${date}`,
    '',
    'Durante o período analisado, a operação ',
  ]

  if (health === 'healthy') {
    lines.push('manteve estabilidade geral, com indicadores dentro dos parâmetros esperados.')
  } else if (health === 'attention') {
    lines.push('apresenta sinais de atenção que requerem acompanhamento executivo.')
  } else {
    lines.push('identifica múltiplas áreas com risco que exigem ação imediata da liderança.')
  }

  lines.push(`Foram concluídas ${jiraCompleted} atividades estratégicas, permanecendo ${totalOpen} pendências em aberto.`)

  if (jiraOverdue > 0 || glpiUnattended > 0) {
    const issues = []
    if (jiraOverdue > 0) issues.push(`${jiraOverdue} atividades vencidas no Jira`)
    if (glpiUnattended > 0) issues.push(`${glpiUnattended} chamados sem atendimento no GLPI`)
    lines.push(`Identificamos ${issues.join(' e ')}, que exigem acompanhamento imediato.`)
  }

  lines.push(
    `O backlog consolidado está em ${totalOpen} itens, com ${(jira?.critical || 0) + (glpi?.critical || 0)} demandas críticas requerendo priorização.`
  )

  return lines.join(' ')
}

function generateRisks(jira: any, glpi: any): any[] {
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

  return risks
}

function generateRecommendations(jira: any, glpi: any, health: string): string[] {
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

  if (health !== 'healthy') {
    recs.push(`Avaliar alocação de recursos e redistribuir carga de trabalho entre equipes`)
  }

  if (recs.length === 0) {
    recs.push(`Manter monitoramento dos indicadores atuais`)
    recs.push(`Acompanhar tendências de backlog para próximos 7 dias`)
  }

  return recs.slice(0, 5)
}

// ── Main Handler ───────────────────────────────────────────────────────────
export async function GET() {
  const sb = await createClient()

  try {
    console.log('🚀 Gerando Executive Daily Report...')

    const [jiraData, glpiData] = await Promise.all([analyzeJira(), analyzeGLPI()])

    if (!jiraData && !glpiData) {
      throw new Error('Falha ao coletar dados de Jira e GLPI')
    }

    const health = determineHealth(jiraData, glpiData)
    const executiveSummary = generateExecutiveSummary(jiraData, glpiData, health)
    const risks = generateRisks(jiraData, glpiData)
    const recommendations = generateRecommendations(jiraData, glpiData, health)

    const totalOpen = (jiraData?.open || 0) + (glpiData?.open || 0)
    const totalResolved = (jiraData?.completed || 0) + (glpiData?.resolved || 0)
    const totalCritical = (jiraData?.critical || 0) + (glpiData?.critical || 0)

    const report = {
      generatedAt: new Date().toISOString(),
      executiveSummary,
      health,
      metrics: {
        totalOpen,
        totalResolved,
        totalCritical,
        jiraCompleted: jiraData?.completedToday || 0,
        jiraOverdue: jiraData?.overdue || 0,
        jiraUnassigned: jiraData?.unassigned || 0,
        glpiUnattended: glpiData?.unattended || 0,
        glpiPending: glpiData?.pending || 0,
      },
      jira: {
        total: jiraData?.total || 0,
        open: jiraData?.open || 0,
        completed: jiraData?.completed || 0,
        critical: jiraData?.critical || 0,
        overdue: jiraData?.overdue || 0,
        dueSoon: jiraData?.dueSoon || 0,
        unassigned: jiraData?.unassigned || 0,
        projectsData: jiraData?.projectsData || {},
        criticalItems: jiraData?.criticalItems || [],
        completedDetails: jiraData?.completedDetails || [],
        overdueDetails: jiraData?.overdueDetails || [],
        criticalDetails: jiraData?.criticalDetails || [],
      },
      glpi: {
        total: glpiData?.total || 0,
        open: glpiData?.open || 0,
        resolved: glpiData?.resolved || 0,
        critical: glpiData?.critical || 0,
        pending: glpiData?.pending || 0,
        unattended: glpiData?.unattended || 0,
        unattendedDetails: glpiData?.unattendedDetails || [],
        criticalDetails: glpiData?.criticalDetails || [],
      },
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
