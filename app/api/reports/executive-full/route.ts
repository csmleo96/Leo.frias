import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

async function safeGet(path: string) {
  try {
    const r = await fetch(`${BASE()}${path}`, { cache: 'no-store' })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

// ── AI Analysis Engine (rule-based contextual CSM) ─────────────────────────
function generateInsights(jira: any, glpi: any, zabbix: any, datadog: any, score: number) {
  const insights: Array<{ area: string; analysis: string; impact: string; recommendation: string; priority: 'critical' | 'high' | 'medium' | 'low' }> = []

  // Infraestrutura crítica
  if (zabbix?.disaster > 0) {
    insights.push({
      area: 'Infraestrutura — Criticidade Máxima',
      analysis: `O ambiente apresenta ${zabbix.disaster} problema(s) de nível Disaster ativos no Zabbix, indicando falha severa em componentes críticos da infraestrutura.`,
      impact: 'Risco imediato de indisponibilidade de serviços ao cliente final, violação de SLA e potencial impacto financeiro direto.',
      recommendation: 'Acionar equipe de Infraestrutura com prioridade P1. Isolar componente afetado, acionar plano de contingência e comunicar cliente proativamente.',
      priority: 'critical',
    })
  }

  if (zabbix?.hostsDown > 0) {
    insights.push({
      area: 'Disponibilidade — Hosts Offline',
      analysis: `${zabbix.hostsDown} host(s) de ${zabbix.hostsTotal} monitorados estão offline (disponibilidade: ${zabbix.availability}%). ${zabbix.availability < 99 ? 'O SLA de disponibilidade pode estar comprometido.' : 'Impacto contido.'}`,
      impact: zabbix.availability < 99 ? 'Potencial violação de SLA de disponibilidade. Risco de SLA financeiro.' : 'Impacto limitado. Acompanhamento recomendado.',
      recommendation: `Investigar causa raiz dos hosts offline. ${zabbix.availability < 99 ? 'Registrar incidente de disponibilidade e notificar cliente dentro do SLA de comunicação.' : 'Monitorar recuperação.'}`,
      priority: zabbix.availability < 99 ? 'critical' : 'high',
    })
  }

  // Jira — entrega
  if (jira?.overdue > 5) {
    insights.push({
      area: 'Gestão de Projetos — Atrasos de Entrega',
      analysis: `${jira.overdue} atividades estão com prazo vencido no Jira. Considerando a média histórica do backlog atual, o risco de impacto no roadmap dos clientes é significativo.`,
      impact: 'Atrasos na entrega de valor ao cliente, erosão de confiança e risco de renovação. Potencial impacto contratual em projetos com prazo previsto em SLA.',
      recommendation: 'Realizar sessão de repriorização com tech leads. Redistribuir carga de trabalho e comunicar proativamente o cliente sobre ajuste de cronograma.',
      priority: 'high',
    })
  }

  if (jira?.unassigned > 5) {
    insights.push({
      area: 'Capacidade — Demandas Sem Responsável',
      analysis: `${jira.unassigned} atividades abertas no Jira não possuem responsável designado, criando blind spots operacionais e risco de esquecimento.`,
      impact: 'Demandas sem dono tendem a acumular-se e gerar crises pontuais. Deterioração da qualidade de entrega.',
      recommendation: 'Realizar reunião de alocação. Implementar regra de SLA de atribuição: nenhuma demanda deve ficar sem responsável por mais de 24h.',
      priority: 'medium',
    })
  }

  // GLPI — suporte
  if (glpi?.unattended > 5) {
    insights.push({
      area: 'Suporte — Chamados Sem Atendimento',
      analysis: `${glpi.unattended} chamados aguardam primeiro atendimento há mais de 24 horas. O tempo médio de resposta pode estar comprometido.`,
      impact: 'Insatisfação do cliente final. Risco de violação do SLA de primeira resposta. Possível escalada para gestão do cliente.',
      recommendation: 'Reforçar equipe de triagem. Implementar regra de alerta automático para chamados sem resposta após 4 horas. Revisar SLA de atendimento.',
      priority: 'high',
    })
  }

  // Datadog
  if (datadog?.alert > 3) {
    insights.push({
      area: 'Observabilidade — Monitores em Alerta',
      analysis: `${datadog.alert} monitores Datadog estão em estado de alerta. Monitores em alerta prolongado indicam falhas em serviços ou degradação de performance não endereçadas.`,
      impact: 'Degradação silenciosa de serviços pode resultar em experiência ruim para o usuário final sem que o time perceba.',
      recommendation: 'Revisar todos os monitores em alerta. Criar runbook de resposta para cada tipo de alerta. Garantir que alertas críticos disparem notificação imediata.',
      priority: 'high',
    })
  }

  // Score baixo
  if (score < 60) {
    insights.push({
      area: 'Saúde Geral — Ambiente em Estado Crítico',
      analysis: `O Health Score atual de ${score}/100 indica múltiplos problemas simultâneos no ambiente. Esta combinação de fatores representa risco operacional elevado.`,
      impact: 'Em ambientes com score abaixo de 60, a probabilidade de incidentes encadeados aumenta significativamente nas próximas 48 horas.',
      recommendation: 'Convocar war room com todas as equipes técnicas. Ativar plano de estabilização de ambiente. Comunicar gestão sobre o status crítico.',
      priority: 'critical',
    })
  } else if (score >= 85) {
    insights.push({
      area: 'Ambiente Saudável — Manutenção Preventiva',
      analysis: `Com score ${score}/100, o ambiente está operando de forma excelente. Este é o momento ideal para executar melhorias preventivas e preparar o ambiente para crescimento.`,
      impact: 'Ambientes com score elevado possuem menor TCO e maior satisfação dos usuários. Oportunidade de consolidar a percepção de valor da XTENTGROUP.',
      recommendation: 'Agendar manutenções preventivas, atualização de componentes e revisão de capacity planning para os próximos 90 dias.',
      priority: 'low',
    })
  }

  return insights
}

// ── Commercial Opportunities ───────────────────────────────────────────────
function detectOpportunities(jira: any, glpi: any, zabbix: any, datadog: any) {
  const ops: Array<{ title: string; justification: string; operationalImpact: string; estimatedPriority: 'alta' | 'média' | 'baixa' }> = []

  if (!datadog || datadog.totalMonitors === 0) {
    ops.push({
      title: 'Observabilidade Completa com Datadog APM',
      justification: 'O ambiente não possui observabilidade de aplicação configurada. Métricas de APM, tracing distribuído e logs centralizados estão ausentes.',
      operationalImpact: 'Redução de MTTR em até 60%. Detecção proativa de anomalias antes de impactar o usuário final.',
      estimatedPriority: 'alta',
    })
  }

  if (zabbix?.totalProblems > 5) {
    ops.push({
      title: 'NOC Gerenciado 24x7 com Resposta Automática',
      justification: `Com ${zabbix.totalProblems} problemas ativos e ${zabbix.hostsTotal} hosts monitorados, o ambiente requer atenção contínua além do horário comercial.`,
      operationalImpact: 'Cobertura 24x7, redução de impacto fora do horário comercial e SLA de disponibilidade elevado para 99,9%.',
      estimatedPriority: 'alta',
    })
  }

  if (jira?.unassigned > 3 || (glpi?.unattended ?? 0) > 5) {
    ops.push({
      title: 'Automação de Triagem e Atendimento',
      justification: 'O volume de chamados sem atribuição e atividades sem responsável indica oportunidade para automação de triagem com IA.',
      operationalImpact: 'Redução de até 40% no tempo de atribuição. Eliminação de chamados esquecidos. Melhoria do MTTA.',
      estimatedPriority: 'média',
    })
  }

  ops.push({
    title: 'Backup Gerenciado com Veeam — Integração e Monitoramento',
    justification: 'Dados de backup não estão integrados ao relatório executivo. Impossível garantir que os jobs de backup executam corretamente sem visibilidade centralizada.',
    operationalImpact: 'RPO e RTO garantidos. Compliance de backup auditável. Alertas proativos de falhas de backup.',
    estimatedPriority: 'alta',
  })

  ops.push({
    title: 'Disaster Recovery — Validação e Automação de Failover',
    justification: 'A ausência de integração de DR impede a validação do RTO/RPO real do ambiente. Em caso de desastre, o tempo de recuperação pode ser significativamente maior que o contratado.',
    operationalImpact: 'Garantia de continuidade de negócios. Conformidade com requisitos regulatórios. Proteção contra perda de dados.',
    estimatedPriority: 'alta',
  })

  return ops
}

// ── Action Plan Builder ────────────────────────────────────────────────────
function buildActionPlan(insights: any[], risks: any[]) {
  const actions: Array<{ action: string; owner: string; priority: string; deadline: string; status: string }> = []

  const now = new Date()
  const today = now.toLocaleDateString('pt-BR')
  const plus2days = new Date(now.getTime() + 2 * 86400000).toLocaleDateString('pt-BR')
  const plus7days = new Date(now.getTime() + 7 * 86400000).toLocaleDateString('pt-BR')
  const plus30days = new Date(now.getTime() + 30 * 86400000).toLocaleDateString('pt-BR')

  risks.forEach((r: any) => {
    if (r.severity === 'critical') {
      actions.push({ action: r.action || r.title, owner: 'Equipe Infra/NOC', priority: 'P1 — Crítico', deadline: today, status: 'Pendente' })
    } else if (r.severity === 'high') {
      actions.push({ action: r.action || r.title, owner: 'Equipe Técnica', priority: 'P2 — Alto', deadline: plus2days, status: 'Pendente' })
    }
  })

  insights.forEach((i: any) => {
    if (i.priority === 'critical' && actions.length < 8) {
      actions.push({ action: i.recommendation.slice(0, 80), owner: 'CS + Infra', priority: 'P1 — Crítico', deadline: today, status: 'Pendente' })
    }
  })

  actions.push({ action: 'Revisar configuração de Jira project keys por cliente em lib/reports/clients.ts', owner: 'CS Manager', priority: 'P3 — Médio', deadline: plus7days, status: 'Pendente' })
  actions.push({ action: 'Integrar Veeam Backup ao relatório executivo', owner: 'Engenharia', priority: 'P2 — Alto', deadline: plus30days, status: 'Backlog' })
  actions.push({ action: 'Integrar Kubernetes/RKE ao relatório executivo', owner: 'Engenharia', priority: 'P2 — Alto', deadline: plus30days, status: 'Backlog' })

  return actions.slice(0, 10)
}

// ── Main Handler ───────────────────────────────────────────────────────────
export async function GET() {
  const [dailyReport, hubspotRes] = await Promise.all([
    safeGet('/api/reports/executive-daily'),
    safeGet('/api/hubspot/contacts?limit=500'),
  ])

  const jira = dailyReport?.jira ?? null
  const glpi = dailyReport?.glpi ?? null
  const zabbix = dailyReport?.zabbix ?? null
  const datadog = dailyReport?.datadog ?? null
  const healthScore = dailyReport?.healthScore ?? 0
  const healthScoreBreakdown = dailyReport?.healthScoreBreakdown ?? {}
  const health = dailyReport?.health ?? 'attention'
  const risks = dailyReport?.risks ?? []
  const recommendations = dailyReport?.recommendations ?? []
  const metrics = dailyReport?.metrics ?? {}

  const contacts: any[] = hubspotRes?.contacts ?? []
  const crm = {
    total: contacts.length,
    clientes: contacts.filter((c: any) => c.lifecycleStage === 'customer').length,
    leads: contacts.filter((c: any) => ['lead', 'subscriber'].includes(c.lifecycleStage)).length,
    oportunidades: contacts.filter((c: any) => c.lifecycleStage === 'opportunity').length,
    novosUltimos7: contacts.filter((c: any) => c.createdAt && Date.now() - new Date(c.createdAt).getTime() <= 7 * 86400000).length,
  }

  const insights = generateInsights(jira, glpi, zabbix, datadog, healthScore)
  const opportunities = detectOpportunities(jira, glpi, zabbix, datadog)
  const actionPlan = buildActionPlan(insights, risks)

  // Farol — based on critical conditions
  const farol =
    (zabbix?.disaster > 0) || (health === 'critical') ? 'vermelho'
    : (zabbix?.high > 2) || (health === 'attention') || (glpi?.unattended > 10) ? 'amarelo'
    : 'verde'

  // GLPI MTTA/MTTR estimation from available data
  const serviceMetrics = {
    glpiTotal: glpi?.total ?? 0,
    glpiOpen: glpi?.open ?? 0,
    glpiResolved: glpi?.resolved ?? 0,
    glpiCritical: glpi?.critical ?? 0,
    glpiUnattended: glpi?.unattended ?? 0,
    jiraTotal: jira?.total ?? 0,
    jiraOpen: jira?.open ?? 0,
    jiraDone: jira?.completed ?? 0,
    jiraOverdue: jira?.overdue ?? 0,
    jiraCritical: jira?.critical ?? 0,
    mtta: glpi?.unattended > 0 ? '> 24h (fora do SLA)' : '< 4h (dentro do SLA)',
    mttr: glpi?.resolvedToday > 0 ? 'Dados parciais disponíveis' : 'N/D',
    slaStatus: health === 'critical' ? 'Em risco' : health === 'attention' ? 'Atenção' : 'Dentro do SLA',
  }

  // Stubs for unavailable integrations
  const unavailable = {
    backup:       { available: false, reason: 'Integração Veeam Backup não configurada' },
    dr:           { available: false, reason: 'Integração DR/Replicação não configurada' },
    ha:           { available: false, reason: 'Integração de cluster HA não configurada' },
    sqlServer:    { available: false, reason: 'Integração SQL Server (direto) não configurada — alertas via Zabbix parcialmente disponíveis' },
    yugabyte:     { available: false, reason: 'Integração YugabyteDB não configurada' },
    rabbitmq:     { available: false, reason: 'Integração RabbitMQ não configurada' },
    kubernetes:   { available: false, reason: 'Integração Kubernetes/RKE não configurada' },
    vmware:       { available: false, reason: 'Integração VMware não configurada' },
    vpn:          { available: false, reason: 'Integração VPN não configurada — conectividade parcialmente via Zabbix' },
  }

  // SQL Server partial data from Zabbix alerts
  const sqlProblems = (dailyReport?.zabbix?.criticalProblems ?? [])
    .filter((p: any) => /sql|database|db|deadlock|mssql/i.test(p.name ?? ''))

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    farol,
    health,
    healthScore,
    healthScoreBreakdown,
    executiveSummary: dailyReport?.executiveSummary ?? '',
    metrics,
    serviceMetrics,
    crm,
    jira,
    glpi,
    zabbix,
    datadog,
    sqlProblems,
    risks,
    recommendations,
    insights,
    opportunities,
    actionPlan,
    unavailable,
    sources: {
      zabbix: !!zabbix,
      datadog: !!datadog,
      glpi: !!glpi,
      jira: !!jira,
      hubspot: contacts.length > 0,
      veeam: false,
      kubernetes: false,
      sqlServerDirect: false,
      yugabyte: false,
      rabbitmq: false,
      vmware: false,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
