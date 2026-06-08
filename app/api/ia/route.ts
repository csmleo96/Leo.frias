import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Helpers ────────────────────────────────────────────────────────────────
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

function groupByDay(rows: any[], field: string, days = 14) {
  const counts = new Array(days).fill(0)
  const now = Date.now()
  rows.forEach(r => {
    if (!r[field]) return
    const diff = Math.floor((now - new Date(r[field]).getTime()) / 86400000)
    if (diff >= 0 && diff < days) counts[days - 1 - diff]++
  })
  return counts
}

function linReg(ys: number[]) {
  const n = ys.length; if (n < 2) return { slope: 0, last: ys[n - 1] ?? 0 }
  const xs = ys.map((_, i) => i)
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  return { slope: den ? num / den : 0, last: ys[n - 1] ?? 0 }
}

// ── Insight detection ──────────────────────────────────────────────────────
function detectInsights(glpi: any[], jira: any[]) {
  const insights: any[] = []
  const all = [...glpi, ...jira]
  const open = all.filter(t => t.sla_status !== 'resolved')
  const total = Math.max(all.length, 1)

  const breached = all.filter(t => t.sla_status === 'breached').length
  const breachRate = pct(breached, total)
  if (breachRate > 35) insights.push({ id: 'sla-crit', type: 'risk', severity: 'critical', source: 'combined', title: 'Taxa de SLA Vencido Crítica', description: `${breachRate}% dos chamados (${breached}/${total}) com SLA vencido — acima do limiar crítico.`, recommendation: 'Escalonamento imediato. Alocar equipe N2/N3 para triagem urgente.', value: breachRate, unit: '%', trend: 'up' })
  else if (breachRate > 15) insights.push({ id: 'sla-high', type: 'risk', severity: 'high', source: 'combined', title: 'SLA em Deterioração', description: `${breachRate}% dos chamados com SLA vencido — acima do limiar de alerta.`, recommendation: 'Revisar processos de atendimento e priorizar fila de pendentes.', value: breachRate, unit: '%', trend: 'up' })

  const noOwner = open.filter(t => !t.assignee).length
  if (noOwner > 0) insights.push({ id: 'no-owner', type: 'bottleneck', severity: noOwner > 8 ? 'high' : 'medium', source: 'combined', title: `${noOwner} Chamado${noOwner > 1 ? 's' : ''} Sem Responsável`, description: `${noOwner} ticket${noOwner > 1 ? 's' : ''} ativo${noOwner > 1 ? 's' : ''} sem responsável atribuído.`, recommendation: 'Atribuir responsáveis imediatamente via triagem automática.', value: noOwner })

  const loads: Record<string, number> = {}
  open.filter(t => t.assignee).forEach(t => { loads[t.assignee] = (loads[t.assignee] ?? 0) + 1 })
  const vals = Object.values(loads); const avg = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1)
  const over = Object.entries(loads).filter(([, n]) => n > avg * 2)
  if (over.length > 0) insights.push({ id: 'overload', type: 'bottleneck', severity: 'medium', source: 'combined', title: 'Desequilíbrio de Carga', description: `${over.map(([n]) => n).join(', ')} com carga acima da média (${Math.round(avg)} tickets/pessoa).`, recommendation: 'Redistribuir chamados para nivelar a carga.', value: Math.round(avg) })

  const jiraCrit = jira.filter(t => t.priority_num >= 5 && !t.assignee)
  if (jiraCrit.length > 0) insights.push({ id: 'jira-crit', type: 'alert', severity: 'high', source: 'jira', title: `${jiraCrit.length} Issue${jiraCrit.length > 1 ? 's' : ''} Crítica${jiraCrit.length > 1 ? 's' : ''} Sem Owner no Jira`, description: `Issues alta prioridade sem responsável: ${jiraCrit.slice(0, 3).map(i => i.key).join(', ')}${jiraCrit.length > 3 ? '...' : ''}`, recommendation: 'Atribuir owner e iniciar tratativa N2 imediatamente.', value: jiraCrit.length })

  const atRisk = all.filter(t => t.sla_status === 'at_risk').length
  if (atRisk > 3) insights.push({ id: 'at-risk', type: 'trend', severity: 'medium', source: 'combined', title: `${atRisk} Chamados em Risco de SLA`, description: `${atRisk} tickets com mais de 80% do tempo de SLA consumido.`, recommendation: 'Priorizar atendimento nas próximas horas para evitar violações.', value: atRisk, trend: 'up' })

  const resolved = all.filter(t => t.sla_status === 'resolved').length
  if (pct(resolved, total) > 65) insights.push({ id: 'good-res', type: 'opportunity', severity: 'info', source: 'combined', title: 'Alta Taxa de Resolução', description: `${pct(resolved, total)}% dos chamados resolvidos. Desempenho acima da média.`, recommendation: 'Documentar boas práticas e compartilhar com a equipe.', value: pct(resolved, total), unit: '%', trend: 'down' })

  const glpiPending = glpi.filter(t => t.status === 4).length
  if (glpiPending > 5) insights.push({ id: 'glpi-pend', type: 'risk', severity: 'medium', source: 'glpi', title: `${glpiPending} Chamados Pendentes GLPI`, description: `${glpiPending} chamados aguardando ação — risco crescente de violação.`, recommendation: 'Contatar clientes/fornecedores para destravar pendências.', value: glpiPending, trend: 'up' })

  return insights
}

function buildPredictions(glpiDaily: number[], jiraDaily: number[], all: any[]) {
  const combined = glpiDaily.map((g, i) => g + (jiraDaily[i] ?? 0))
  const { slope, last } = linReg(combined)
  const dir: 'up' | 'down' | 'stable' = slope > 0.3 ? 'up' : slope < -0.3 ? 'down' : 'stable'
  const open = all.filter(t => t.sla_status !== 'resolved')

  const loads: Record<string, number> = {}
  open.filter(t => t.assignee).forEach(t => { loads[t.assignee] = (loads[t.assignee] ?? 0) + 1 })
  const maxLoad = Math.max(...Object.values(loads), 0)
  const people = Object.keys(loads).length

  const breachRate = pct(all.filter(t => t.sla_status === 'breached').length, Math.max(all.length, 1))
  const atRiskRate = pct(all.filter(t => t.sla_status === 'at_risk').length, Math.max(all.length, 1))

  return [
    {
      metric: 'queue', label: 'Volume de Novos Tickets', current: Math.round(last),
      predicted7d: Math.max(0, Math.round(last + slope * 7)),
      predicted30d: Math.max(0, Math.round(last + slope * 30)),
      confidence: 72, direction: dir, unit: 'tickets/dia',
      risk: slope > 1 ? 'high' : slope > 0.3 ? 'medium' : 'low',
      reasoning: slope > 0.3 ? 'Tendência de crescimento identificada nos últimos 14 dias.' : slope < -0.3 ? 'Volume de chamados em declínio.' : 'Volume estável nos últimos 14 dias.',
    },
    {
      metric: 'sla', label: 'Risco de Violação SLA', current: breachRate,
      predicted7d: Math.min(100, breachRate + Math.round(atRiskRate * 0.5)),
      predicted30d: Math.min(100, breachRate + atRiskRate),
      confidence: 65, direction: atRiskRate > 15 ? 'up' : 'stable', unit: '%',
      risk: breachRate > 30 ? 'high' : breachRate > 15 ? 'medium' : 'low',
      reasoning: atRiskRate > 10 ? `${atRiskRate}% em zona de risco podem violar SLA em breve.` : 'SLA sob controle no horizonte de 7 dias.',
    },
    {
      metric: 'capacity', label: 'Carga por Responsável', current: maxLoad,
      predicted7d: Math.round(maxLoad + (slope * 7) / Math.max(people, 1)),
      predicted30d: Math.round(maxLoad + (slope * 30) / Math.max(people, 1)),
      confidence: 58, direction: slope > 0 && people > 0 ? 'up' : 'stable', unit: 'tickets/pessoa',
      risk: maxLoad > 15 ? 'high' : maxLoad > 8 ? 'medium' : 'low',
      reasoning: people > 0 ? `Maior carga: ${maxLoad} tickets. Média da equipe: ${Math.round(Object.values(loads).reduce((a, b) => a + b, 0) / people)}.` : 'Dados de responsável insuficientes.',
    },
  ]
}

function buildSummary(glpi: any[], jira: any[], insights: any[], predictions: any[]) {
  const all = [...glpi, ...jira]
  const open = all.filter(t => t.sla_status !== 'resolved').length
  const breached = all.filter(t => t.sla_status === 'breached').length
  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const glpiPend = glpi.filter(t => t.status === 4).length
  const glpiNew  = glpi.filter(t => t.status === 1).length
  const glpiInProg = glpi.filter(t => t.status === 2).length
  const jiraProjects = [...new Set(jira.map(t => t.project_key).filter(Boolean))]
  const jiraCrit = jira.filter(t => t.priority_num >= 5).length
  const mainRisk = insights.find(i => ['critical', 'high'].includes(i.severity))
  const mainPred = predictions.find(p => p.risk !== 'low')
  const slaBreachPct = pct(breached, all.length || 1)

  const lines = [
    `Em ${dateStr}, a Xtentgroup registra ${all.length} chamados consolidados — ${glpi.length} no GLPI e ${jira.length} no Jira —, dos quais ${open} permanecem ativos.`,
    breached > 0 ? `O SLA apresenta ${breached} violaç${breached > 1 ? 'ões' : 'ão'} ativa${breached > 1 ? 's' : ''} (${slaBreachPct}% do portfólio), exigindo ação imediata da equipe de suporte.` : 'O SLA operacional está dentro dos parâmetros normais, sem violações ativas no momento.',
    glpi.length > 0 ? `No GLPI, há ${glpiNew} novo${glpiNew !== 1 ? 's' : ''}, ${glpiInProg} em atendimento e ${glpiPend} pendente${glpiPend !== 1 ? 's' : ''}.` : null,
    jira.length > 0 ? `No Jira, ${jira.length} issue${jira.length !== 1 ? 's' : ''} em ${jiraProjects.length} projeto${jiraProjects.length !== 1 ? 's' : ''} (${jiraProjects.join(', ')})${jiraCrit > 0 ? `, sendo ${jiraCrit} de alta prioridade` : ''}.` : null,
    mainRisk ? `Principal risco: ${mainRisk.title}. ${mainRisk.recommendation}` : null,
    mainPred && mainPred.risk !== 'low' ? `Previsão: ${mainPred.label} deve ${mainPred.direction === 'up' ? 'crescer' : mainPred.direction === 'down' ? 'cair' : 'permanecer estável'} nos próximos 7 dias. ${mainPred.reasoning}` : null,
    insights.filter(i => ['critical', 'high'].includes(i.severity)).length === 0 ? 'Situação operacional estável. Nenhum risco crítico identificado.' : null,
  ].filter(Boolean) as string[]

  return lines
}

// ── GET /api/ia ─────────────────────────────────────────────────────────────
export async function GET() {
  const sb = await createClient()
  const ago14 = new Date(Date.now() - 14 * 86400000).toISOString()

  const [glpiRes, jiraRes, glpiHistRes, jiraHistRes, auditRes] = await Promise.all([
    sb.from('glpi_tickets').select('id,title,status,status_label,priority,priority_label,assignee,sla_status,sla_deadline,created_at,updated_at').order('updated_at', { ascending: false }),
    sb.from('jira_tickets').select('key,summary,status,status_category,priority,priority_num,assignee,project_key,project_name,sla_status,sla_deadline,created_at,updated_at,url').order('updated_at', { ascending: false }),
    sb.from('glpi_tickets').select('created_at').gte('created_at', ago14),
    sb.from('jira_tickets').select('created_at').gte('created_at', ago14),
    sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  const glpi  = glpiRes.data ?? []
  const jira  = jiraRes.data ?? []
  const glpiHist = glpiHistRes.data ?? []
  const jiraHist = jiraHistRes.data ?? []
  const auditLogs = auditRes.data ?? []

  const glpiDaily = groupByDay(glpiHist, 'created_at', 14)
  const jiraDaily = groupByDay(jiraHist, 'created_at', 14)

  const insights    = detectInsights(glpi, jira)
  const predictions = buildPredictions(glpiDaily, jiraDaily, [...glpi, ...jira])
  const summaryLines = buildSummary(glpi, jira, insights, predictions)

  // Log
  await sb.from('audit_log').insert({
    action: 'ia_summary_generated', module: 'ia',
    description: `Resumo gerado — ${insights.length} insights, ${predictions.length} previsões`,
    metadata: { glpiCount: glpi.length, jiraCount: jira.length, insightCount: insights.length },
    level: 'info',
  }).then(() => {}).catch(() => {})

  const all = [...glpi, ...jira]
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summaryLines,
    insights,
    predictions,
    metrics: {
      glpiTotal: glpi.length,
      jiraTotal: jira.length,
      breached: all.filter(t => t.sla_status === 'breached').length,
      atRisk: all.filter(t => t.sla_status === 'at_risk').length,
      resolved: all.filter(t => t.sla_status === 'resolved').length,
      noOwner: all.filter(t => !t.assignee && t.sla_status !== 'resolved').length,
      critical: insights.filter(i => i.severity === 'critical').length,
    },
    chartData: {
      glpiDaily, jiraDaily,
      dailyLabels: Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (13 - i))
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }),
    },
    auditLog: auditLogs,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
