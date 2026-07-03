import { NextResponse } from 'next/server'
import { CLIENTS } from '@/lib/reports/clients'

export const dynamic = 'force-dynamic'

// Single source of truth: lib/reports/clients.ts
// To add a new client, register it there — no code changes needed here.
const SLUGS = Object.keys(CLIENTS)

async function safeGet(url: string) {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

// ── Farol logic ────────────────────────────────────────────────────────────
function computeFarol(cr: any): 'vermelho' | 'amarelo' | 'verde' {
  const z = cr.zabbix
  const score = cr.healthScore ?? 0
  if (
    score < 55 ||
    (z?.disaster ?? 0) > 0 ||
    (cr.glpi?.critical ?? 0) > 5 ||
    (cr.jira?.overdue ?? 0) > 10
  ) return 'vermelho'
  if (
    score < 78 ||
    (z?.high ?? 0) > 2 ||
    (cr.glpi?.unattended ?? 0) > 5 ||
    (cr.datadog?.alert ?? 0) > 3 ||
    (cr.jira?.overdue ?? 0) > 3
  ) return 'amarelo'
  return 'verde'
}

function farolReason(cr: any, farol: string): string {
  if (farol === 'vermelho') {
    if ((cr.zabbix?.disaster ?? 0) > 0) return `${cr.zabbix.disaster} problema(s) Disaster na infraestrutura`
    if ((cr.glpi?.critical ?? 0) > 5) return `${cr.glpi.critical} chamados críticos sem resolução`
    return `Health Score crítico (${cr.healthScore}/100)`
  }
  if (farol === 'amarelo') {
    if ((cr.zabbix?.high ?? 0) > 2) return `${cr.zabbix.high} alertas de alta severidade ativos`
    if ((cr.glpi?.unattended ?? 0) > 5) return `${cr.glpi.unattended} chamados sem primeiro atendimento`
    if ((cr.datadog?.alert ?? 0) > 3) return `${cr.datadog.alert} monitores Datadog em alerta`
    return `Health Score moderado (${cr.healthScore}/100)`
  }
  return `Operação normal — Score ${cr.healthScore}/100`
}

// ── Per-client text generators ─────────────────────────────────────────────
function generateRecommendation(name: string, cr: any, farol: string): string {
  const score = cr.healthScore ?? 0
  if (farol === 'vermelho') {
    return `A XTENTGROUP recomenda atenção imediata para ${name}: acionar o protocolo P1 de resposta a incidentes, revisar os SLAs vigentes e escalar para a Diretoria de Operações. A continuidade de negócios do cliente pode estar em risco — priorizar estabilização do ambiente antes de qualquer nova implementação.`
  }
  if (farol === 'amarelo') {
    return `Para ${name}, recomendamos um plano de estabilização nas próximas 2 semanas: resolver alertas pendentes, fortalecer monitoramento proativo e revisar capacidade de storage e suporte. Uma reunião executiva de alinhamento com o cliente é recomendada para demonstrar transparência e comprometimento.`
  }
  return `${name} está em excelente forma operacional (score ${score}/100). Aproveitar o momento para avançar o roadmap de evolução: implementar integrações de observabilidade avançada, expandir cobertura de backup e apresentar proposta de evolução para o próximo trimestre.`
}

function generateClientOpportunities(name: string, cr: any) {
  const ops: any[] = []
  const z = cr.zabbix
  const dd = cr.datadog

  if (!dd || (dd.totalMonitors ?? 0) === 0) {
    ops.push({ title: 'Observabilidade APM com Datadog', priority: 'alta', justification: `${name} não possui cobertura de APM. Monitores de aplicação e tracing distribuído estão ausentes.`, impact: 'Redução de MTTR em até 60%. Detecção proativa de anomalias.', revenue: 'Expansão de MRR com serviço de observabilidade gerenciada.' })
  }
  if ((z?.totalProblems ?? 0) > 3) {
    ops.push({ title: 'NOC 24x7 Dedicado', priority: 'alta', justification: `${name} apresenta ${z?.totalProblems ?? 0} problemas ativos recorrentes. O NOC 24x7 previne recorrência fora do horário comercial.`, impact: 'SLA de disponibilidade elevado para 99,9%. Redução de impactos noturnos.', revenue: 'Serviço gerenciado NOC — receita recorrente mensal.' })
  }
  ops.push({ title: 'Backup Gerenciado Veeam', priority: 'alta', justification: `Dados de backup não estão integrados ao relatório. Impossível garantir conformidade sem visibilidade centralizada.`, impact: 'RPO/RTO garantidos. Compliance auditável.', revenue: 'Serviço de BaaS com margem elevada.' })
  ops.push({ title: 'Disaster Recovery Ativo', priority: 'alta', justification: `Não há integração de DR para ${name}. Em caso de desastre, o tempo de recuperação real pode exceder o contratado.`, impact: 'Continuidade de negócios. Conformidade regulatória.', revenue: 'Expansão contratual com DR Gerenciado.' })
  if ((cr.glpi?.open ?? 0) > 20) {
    ops.push({ title: 'Automação de Triagem via IA', priority: 'média', justification: `Volume elevado de chamados abertos (${cr.glpi.open}). Triagem manual gera atrasos no atendimento.`, impact: 'Redução de MTTA em 40%. Eliminação de chamados sem responsável.', revenue: 'Upsell de módulo de automação inteligente.' })
  }
  ops.push({ title: 'Kubernetes/RKE Gerenciado', priority: 'média', justification: `Ambiente containerizado não monitorado. Visibilidade de pods, nodes e namespaces está ausente.`, impact: 'Detecção precoce de CrashLoopBackOff e problemas de scheduling.', revenue: 'Serviço de K8s Management com MRR fixo.' })

  return ops
}

function generateActionPlan(cr: any, farol: string) {
  const now = new Date()
  const d = (days: number) => new Date(now.getTime() + days * 86400000).toLocaleDateString('pt-BR')

  const actions: any[] = []
  if (farol === 'vermelho') {
    actions.push({ action: 'Acionar protocolo P1 e abrir bridge de incidente', owner: 'NOC / CS Manager', deadline: d(0), status: 'Urgente' })
    actions.push({ action: 'Comunicar cliente proativamente sobre status do ambiente', owner: 'CS Manager', deadline: d(0), status: 'Urgente' })
  }
  if ((cr.zabbix?.hostsDown ?? 0) > 0)
    actions.push({ action: `Investigar ${cr.zabbix.hostsDown} host(s) offline e restaurar serviço`, owner: 'Infra', deadline: d(1), status: 'Pendente' })
  if ((cr.glpi?.critical ?? 0) > 0)
    actions.push({ action: `Escalar ${cr.glpi.critical} chamado(s) críticos para N2/N3`, owner: 'Suporte N2', deadline: d(1), status: 'Pendente' })
  if ((cr.jira?.overdue ?? 0) > 0)
    actions.push({ action: `Replanejar ${cr.jira.overdue} atividade(s) vencidas no Jira`, owner: 'Tech Lead', deadline: d(3), status: 'Pendente' })
  actions.push({ action: 'Integrar Veeam Backup ao painel de monitoramento', owner: 'Engenharia', deadline: d(30), status: 'Backlog' })
  actions.push({ action: 'Validar e documentar plano de DR e RPO/RTO', owner: 'Engenharia', deadline: d(45), status: 'Backlog' })
  actions.push({ action: 'Habilitar monitoramento Kubernetes/RKE', owner: 'Engenharia', deadline: d(30), status: 'Backlog' })

  return actions.slice(0, 6)
}

// ── Portfolio summary text ─────────────────────────────────────────────────
function buildPortfolioSummary(clients: any[], agg: any): string {
  const critical = clients.filter(c => c.farol === 'vermelho')
  const attention = clients.filter(c => c.farol === 'amarelo')
  const healthy = clients.filter(c => c.farol === 'verde')

  let txt = `A carteira XTENTGROUP apresenta score médio de ${agg.portfolioScore}/100, com ${healthy.length} cliente(s) saudável(is), ${attention.length} em atenção e ${critical.length} em estado crítico. `

  if (critical.length > 0)
    txt += `Atenção imediata é necessária para: ${critical.map(c => c.name).join(', ')}. `
  if (attention.length > 0)
    txt += `Acompanhamento próximo recomendado para: ${attention.map(c => c.name).join(', ')}. `

  txt += `A disponibilidade média da carteira é de ${agg.avgAvailability}%, com ${agg.totalOpenTickets} chamados abertos e ${agg.totalResolvedTickets} resolvidos no período. `

  const mainRisk = clients.find(c => (c.zabbix?.disaster ?? 0) > 0)
  if (mainRisk) txt += `Principal risco: ${mainRisk.name} apresenta falha de nível Disaster na infraestrutura — ação imediata requerida. `

  txt += `As principais oportunidades identificadas são a integração de Backup Gerenciado (Veeam), Disaster Recovery e observabilidade APM em todos os clientes. Recomenda-se priorizar a estabilização dos ambientes críticos antes de avançar novos projetos.`
  return txt
}

// ── Rankings ───────────────────────────────────────────────────────────────
function buildRankings(clients: any[]) {
  const bySupport = [...clients].sort((a, b) => ((b.glpi?.open ?? 0) + (b.jira?.open ?? 0)) - ((a.glpi?.open ?? 0) + (a.jira?.open ?? 0)))
  const byCritical = [...clients].sort((a, b) => ((b.glpi?.critical ?? 0) + (b.jira?.critical ?? 0)) - ((a.glpi?.critical ?? 0) + (a.jira?.critical ?? 0)))
  const bySLA = [...clients].sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0))

  return { bySupport, byCritical, bySLA }
}

// ── Roadmap ────────────────────────────────────────────────────────────────
function buildRoadmap(_clients: any[]) {
  const now = new Date()
  const d30 = new Date(now.getTime() + 30 * 86400000).toLocaleDateString('pt-BR')
  const d60 = new Date(now.getTime() + 60 * 86400000).toLocaleDateString('pt-BR')
  const d90 = new Date(now.getTime() + 90 * 86400000).toLocaleDateString('pt-BR')

  return {
    thirtyDays: [
      'Integrar Veeam Backup API ao Leonardo CS Cockpit para todos os clientes',
      'Implementar monitoramento Kubernetes/RKE no Zabbix/Datadog',
      'Resolver todos os chamados críticos abertos da carteira',
      'Revisar e atualizar configurações de Datadog App Key (chave atual inválida)',
      'Mapear hostnames Zabbix por cliente para filtragem precisa por ambiente',
      `Prazo: até ${d30}`,
    ],
    sixtyDays: [
      'Integrar SQL Server / YugabyteDB ao painel de observabilidade',
      'Documentar e validar RTO/RPO de DR para todos os clientes',
      'Implementar alertas proativos de capacidade de storage',
      'Criar dashboards executivos no Datadog por cliente',
      'Realizar QBR com todos os clientes da carteira',
      `Prazo: até ${d60}`,
    ],
    ninetyDays: [
      'Lançar NOC 24x7 gerenciado para clientes críticos',
      'Implementar automação de triagem de chamados com IA',
      'Completar integração de observabilidade full-stack (APM + infra + logs)',
      'Apresentar proposta de evolução contratual com base nas oportunidades identificadas',
      'Revisar SLAs contratuais com base nos dados históricos coletados',
      `Prazo: até ${d90}`,
    ],
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
export async function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const rawClients = await Promise.all(
    SLUGS.map(s => safeGet(`${base}/api/reports/client/${s}`))
  )

  const clients = rawClients.map((cr, i) => {
    const slug = SLUGS[i]
    const name = CLIENTS[slug]?.name ?? slug

    if (!cr) {
      return {
        slug, name, farol: 'amarelo' as const,
        farolReason: 'Dados indisponíveis para este cliente',
        healthScore: 0, healthScoreBreakdown: {},
        executiveSummary: 'Dados indisponíveis para análise.',
        glpi: null, jira: null, zabbix: null, datadog: null,
        risks: [], opportunities: [], actionPlan: [],
        recommendation: `Verificar conectividade com as APIs de monitoramento de ${name}.`,
        serviceMetrics: { mtta: 'N/D', mttr: 'N/D', sla: 'N/D' },
      }
    }

    const farol = computeFarol(cr)
    const reason = farolReason(cr, farol)
    const ops = generateClientOpportunities(name, cr)
    const plan = generateActionPlan(cr, farol)
    const recommendation = generateRecommendation(name, cr, farol)

    // MTTA / MTTR heuristic
    const unattended = cr.glpi?.unattended ?? 0
    const mtta = unattended > 5 ? '> 24h (fora SLA)' : unattended > 0 ? '4–24h' : '< 4h'
    const slaStatus = cr.health === 'critical' ? 'Em Risco' : cr.health === 'attention' ? 'Atenção' : 'Dentro do SLA'

    // SQL/Storage/VPN from Zabbix keyword filter
    const critProbs: any[] = cr.zabbix?.criticalProblems ?? []
    const sqlProblems = critProbs.filter((p: any) => /sql|mssql|database|deadlock/i.test(p.name ?? ''))
    const storageProblems = critProbs.filter((p: any) => /disk|storage|vol|filesystem|space|lun/i.test(p.name ?? ''))
    const vpnProblems = critProbs.filter((p: any) => /vpn|tunnel|ipsec|wan|link|mpls/i.test(p.name ?? ''))

    const risks: any[] = []
    if ((cr.zabbix?.disaster ?? 0) > 0)
      risks.push({ severity: 'critical', title: `${cr.zabbix.disaster} problema(s) Disaster ativos` })
    if ((cr.zabbix?.hostsDown ?? 0) > 0)
      risks.push({ severity: 'high', title: `${cr.zabbix.hostsDown} host(s) offline — disponibilidade comprometida` })
    if ((cr.glpi?.critical ?? 0) > 0)
      risks.push({ severity: 'high', title: `${cr.glpi.critical} chamado(s) crítico(s) sem resolução` })
    if ((cr.jira?.overdue ?? 0) > 0)
      risks.push({ severity: 'high', title: `${cr.jira.overdue} atividade(s) com prazo vencido` })
    if ((cr.datadog?.alert ?? 0) > 3)
      risks.push({ severity: 'medium', title: `${cr.datadog.alert} monitores Datadog em alerta` })
    risks.push({ severity: 'medium', title: 'Backup não integrado — conformidade não verificável' })

    return {
      slug, name, farol, farolReason: reason,
      healthScore: cr.healthScore ?? 0,
      healthScoreBreakdown: cr.healthScoreBreakdown ?? {},
      executiveSummary: cr.executiveSummary ?? '',
      glpi: cr.glpi,
      jira: cr.jira,
      zabbix: cr.zabbix,
      datadog: cr.datadog,
      sqlProblems,
      storageProblems,
      vpnProblems,
      risks: risks.slice(0, 5),
      opportunities: ops,
      actionPlan: plan,
      recommendation,
      serviceMetrics: { mtta, mttr: 'N/D — integração pendente', sla: slaStatus },
      unavailable: {
        backup:     { available: false, reason: 'Integração Veeam Backup não configurada' },
        dr:         { available: false, reason: 'Integração DR/Replicação não configurada' },
        ha:         { available: false, reason: 'Integração HA não configurada' },
        sqlDirect:  { available: false, reason: 'Integração direta SQL Server não configurada — alertas parciais via Zabbix' },
        yugabyte:   { available: false, reason: 'Integração YugabyteDB não configurada' },
        rabbitmq:   { available: false, reason: 'Integração RabbitMQ não configurada' },
        kubernetes: { available: false, reason: 'Integração Kubernetes/RKE não configurada' },
        vpnFull:    { available: false, reason: 'Integração VPN não configurada — alertas parciais via Zabbix' },
      },
    }
  })

  // Sort: red > yellow > green
  const order = { vermelho: 0, amarelo: 1, verde: 2 }
  clients.sort((a, b) => order[a.farol] - order[b.farol])

  // Portfolio aggregates
  const scored = clients.filter(c => c.healthScore > 0)
  const portfolioScore = scored.length > 0 ? Math.round(scored.reduce((s, c) => s + c.healthScore, 0) / scored.length) : 0
  const avails = clients.map(c => c.zabbix?.availability ?? 100)
  const avgAvailability = Math.round(avails.reduce((s, v) => s + v, 0) / avails.length)
  const totalOpenTickets = clients.reduce((s, c) => s + (c.glpi?.open ?? 0) + (c.jira?.open ?? 0), 0)
  const totalResolvedTickets = clients.reduce((s, c) => s + (c.glpi?.resolved ?? 0) + (c.jira?.done ?? 0), 0)

  const agg = {
    portfolioScore,
    avgAvailability,
    avgSLA: portfolioScore >= 80 ? '99,5%' : portfolioScore >= 60 ? '97%' : '< 95%',
    avgMTTA: 'N/D — integração pendente',
    avgMTTR: 'N/D — integração pendente',
    totalOpenTickets,
    totalResolvedTickets,
    healthy: clients.filter(c => c.farol === 'verde').length,
    attention: clients.filter(c => c.farol === 'amarelo').length,
    critical: clients.filter(c => c.farol === 'vermelho').length,
    executiveSummary: '',
  }
  agg.executiveSummary = buildPortfolioSummary(clients, agg)

  const rankings = buildRankings(clients)
  const roadmap = buildRoadmap(clients)

  // Consolidated opportunities across clients
  const allOpportunities = clients.flatMap(c =>
    (c.opportunities ?? []).map((op: any) => ({ ...op, client: c.name }))
  )

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    period: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    portfolio: agg,
    clients,
    rankings,
    roadmap,
    allOpportunities,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
