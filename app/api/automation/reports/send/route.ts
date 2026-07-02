import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { sendEmail } from '@/lib/email/sender'

export const dynamic = 'force-dynamic'

const DATA_PATH = path.join(process.cwd(), '.data', 'recipients.json')

async function getConfiguredRecipients(): Promise<string[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8')
    return JSON.parse(raw).recipients ?? []
  } catch {
    return []
  }
}

async function safeGet(url: string) {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

async function collectAllData() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const [glpiRes, jiraRes, hubspotRes, zabbixRes, datadogRes] = await Promise.all([
    safeGet(`${base}/api/glpi`),
    safeGet(`${base}/api/jira`),
    safeGet(`${base}/api/hubspot/contacts?limit=500`),
    safeGet(`${base}/api/zabbix`),
    safeGet(`${base}/api/datadog`),
  ])

  const glpiTickets: any[] = glpiRes?.tickets ?? []
  const glpiStats = glpiRes?.stats ?? {}
  const glpi = {
    total:      glpiStats.total ?? glpiTickets.length,
    abertos:    glpiTickets.filter(t => t.status <= 2).length,
    criticos:   glpiTickets.filter(t => t.priority >= 4 && t.status <= 4).length,
    pendentes:  glpiTickets.filter(t => t.status === 4).length,
    resolvidos: (glpiStats.solved ?? 0) + (glpiStats.closed ?? 0),
    novosHoje:  glpiTickets.filter(t => t.daysOpen === 0).length,
  }

  const jiraIssues: any[] = jiraRes?.issues ?? []
  const jira = {
    total:      jiraIssues.length,
    ativos:     jiraIssues.filter(i => i.statusCategory !== 'done').length,
    risco:      jiraIssues.filter(i => i.daysRemaining !== null && i.daysRemaining < 0).length,
    semana:     jiraIssues.filter(i => i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 7).length,
    concluidos: jiraIssues.filter(i => i.statusCategory === 'done').length,
    criticos:   jiraIssues.filter(i => ['Highest', 'High'].includes(i.priority)).length,
    projetos:   [...new Set(jiraIssues.map((i: any) => i.project?.name).filter(Boolean))] as string[],
  }

  const contacts: any[] = hubspotRes?.contacts ?? []
  const now = Date.now()
  const day7  = 7  * 86400000
  const day30 = 30 * 86400000
  const crm = {
    total:         contacts.length,
    leads:         contacts.filter(c => c.lifecycleStage === 'lead' || c.lifecycleStage === 'subscriber').length,
    novosUltimos7: contacts.filter(c => c.createdAt && now - new Date(c.createdAt).getTime() <= day7).length,
    oportunidades: contacts.filter(c => c.lifecycleStage === 'opportunity').length,
    clientes:      contacts.filter(c => c.lifecycleStage === 'customer').length,
    semInteracao:  contacts.filter(c => c.updatedAt && now - new Date(c.updatedAt).getTime() > day30).length,
  }

  const positivos: string[] = []
  const atencao:   string[] = []
  const riscos:    string[] = []

  if (crm.clientes > 0)           positivos.push(`${crm.clientes} cliente(s) ativo(s) no CRM`)
  if (crm.novosUltimos7 > 0)      positivos.push(`${crm.novosUltimos7} novo(s) lead(s) nos últimos 7 dias`)
  if (glpi.resolvidos > 0)        positivos.push(`${glpi.resolvidos} ticket(s) resolvidos no GLPI`)
  if (jira.concluidos > 0)        positivos.push(`${jira.concluidos} issue(s) concluída(s) no Jira`)

  if (crm.semInteracao > 5)       atencao.push(`${crm.semInteracao} contatos sem interação há +30 dias`)
  if (glpi.pendentes > 2)         atencao.push(`${glpi.pendentes} ticket(s) pendentes no GLPI`)
  if (jira.semana > 0)            atencao.push(`${jira.semana} entrega(s) Jira com prazo esta semana`)
  if (crm.oportunidades > 0)      atencao.push(`${crm.oportunidades} oportunidade(s) em pipeline`)

  if (glpi.criticos > 0)          riscos.push(`${glpi.criticos} ticket(s) crítico(s) no GLPI sem resolução`)
  if (jira.risco > 0)             riscos.push(`${jira.risco} projeto(s) com prazo vencido no Jira`)

  // Zabbix
  const zabbixStats = zabbixRes?.stats ?? {}
  const zabbixProblems: any[] = zabbixRes?.problems ?? []
  const zabbix = {
    configured:     !zabbixRes?.error && !!zabbixRes,
    totalProblems:  zabbixStats.totalProblems ?? 0,
    critical:       (zabbixStats.disaster ?? 0) + (zabbixStats.high ?? 0),
    disaster:       zabbixStats.disaster ?? 0,
    high:           zabbixStats.high ?? 0,
    unacknowledged: zabbixStats.unacknowledged ?? 0,
    hostsTotal:     zabbixStats.hostsTotal ?? 0,
    hostsUp:        zabbixStats.hostsUp ?? 0,
    hostsDown:      zabbixStats.hostsDown ?? 0,
    availability:   zabbixStats.availability ?? 0,
    criticalProblems: zabbixProblems.filter((p: any) => !p.resolved && p.severity >= 4).slice(0, 3),
  }

  // Datadog
  const ddSummary = datadogRes?.summary ?? {}
  const datadog = {
    configured:    datadogRes?.configured === true && !datadogRes?.error,
    totalMonitors: ddSummary.total ?? 0,
    ok:            ddSummary.ok ?? 0,
    warn:          ddSummary.warn ?? 0,
    alert:         ddSummary.alert ?? 0,
    hostsTotal:    datadogRes?.hosts?.total ?? 0,
    hostsUp:       datadogRes?.hosts?.up ?? 0,
    hostsDown:     datadogRes?.hosts?.down ?? 0,
    alertMonitors: (datadogRes?.monitors ?? []).filter((m: any) => m.status === 'Alert').slice(0, 3),
  }

  if (zabbix.configured && zabbix.hostsTotal > 0)
    positivos.push(`${zabbix.hostsUp}/${zabbix.hostsTotal} hosts Zabbix online (${zabbix.availability}% disponibilidade)`)
  if (datadog.configured && datadog.ok > 0)
    positivos.push(`${datadog.ok} monitors Datadog em estado OK`)

  if (zabbix.disaster > 0)   riscos.push(`${zabbix.disaster} problema(s) nível Disaster no Zabbix`)
  if (zabbix.hostsDown > 0)  riscos.push(`${zabbix.hostsDown} host(s) offline no Zabbix`)
  if (zabbix.high > 0)       atencao.push(`${zabbix.high} alerta(s) de alta severidade no Zabbix`)
  if (datadog.alert > 0)     atencao.push(`${datadog.alert} monitor(es) Datadog em estado de alerta`)

  if (positivos.length === 0) positivos.push('Nenhum indicador positivo computado — verificar integrações')

  const statusGeral =
    riscos.length > 0    ? 'crítico'
    : atencao.length > 0 ? 'atenção'
    : 'estável'

  return { glpi, jira, crm, zabbix, datadog, statusGeral, positivos, atencao, riscos }
}

function li(items: string[], color: string) {
  if (items.length === 0) return '<li style="color:#94a3b8;font-size:12px">Nenhum item</li>'
  return items.map(i => `<li style="color:${color};font-size:12px;margin-bottom:4px">${i}</li>`).join('')
}

function buildEmailHTML(type: string, data: any): string {
  const { glpi, jira, crm, zabbix, datadog, statusGeral, positivos, atencao, riscos } = data
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const sc = statusGeral === 'estável' ? '#22c55e' : statusGeral === 'atenção' ? '#f59e0b' : '#ef4444'
  const se = statusGeral === 'estável' ? '🟢' : statusGeral === 'atenção' ? '🟡' : '🔴'
  const typeLabel = type === 'daily' ? 'Diário' : type === 'weekly' ? 'Semanal' : 'Mensal'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Relatório Executivo ${typeLabel} — XTENT</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f0f4f8}
.wrap{max-width:640px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hd{background:linear-gradient(135deg,#0a1316 0%,#0d2233 100%);padding:36px 32px 28px}
.hd-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
.brand{font-size:11px;font-weight:700;color:#8fbfc2;letter-spacing:.12em;text-transform:uppercase}
.hd h1{font-size:22px;font-weight:800;color:#f3fafa;margin:8px 0 4px}
.hd p{font-size:13px;color:rgba(243,250,250,.6)}
.badge{background:${sc}22;border:1px solid ${sc}44;color:${sc};padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap}
.body{padding:28px 32px}
.section{margin-bottom:28px}
.sh{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;display:flex;align-items:center;gap:8px}
.sh span{width:3px;height:14px;border-radius:2px;display:inline-block;flex-shrink:0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 12px;text-align:center}
.kv{font-size:26px;font-weight:800;color:#0f172a;line-height:1;margin-bottom:4px}
.kl{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
.kv.red{color:#ef4444}.kv.amber{color:#f59e0b}.kv.green{color:#22c55e}.kv.blue{color:#3b82f6}.kv.teal{color:#0891b2}
.row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
.row:last-child{border-bottom:none}
.rl{color:#475569}.rv{font-weight:700;color:#0f172a}
.rv.red{color:#ef4444}.rv.amber{color:#f59e0b}.rv.green{color:#22c55e}
.tag{display:inline-block;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600}
.tag-red{background:#fef2f2;color:#ef4444}.tag-amber{background:#fffbeb;color:#f59e0b}.tag-green{background:#f0fdf4;color:#22c55e}
.exec-box{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:28px}
.exec-row{padding:16px 20px;border-bottom:1px solid #f1f5f9}
.exec-row:last-child{border-bottom:none}
.exec-label{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
.exec-row ul{padding-left:18px}
.btn{display:inline-block;background:#0a1316;color:#8fbfc2;padding:12px 24px;border-radius:8px;font-weight:600;font-size:13px;text-decoration:none;margin-top:4px}
.ft{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
.ft p{font-size:11px;color:#94a3b8;line-height:1.6}
.ft strong{color:#475569}
</style>
</head>
<body>
<div class="wrap">
  <div class="hd">
    <div class="hd-top">
      <div>
        <div class="brand">XTENT GROUP · CS Cockpit</div>
        <h1>Relatório Executivo ${typeLabel}</h1>
        <p>${date} · ${time}</p>
      </div>
      <div class="badge">${se} ${statusGeral.toUpperCase()}</div>
    </div>
  </div>

  <div class="body">

    <!-- Resumo Executivo -->
    <div class="section">
      <div class="sh"><span style="background:${sc}"></span>Resumo Executivo</div>
      <div class="exec-box">
        <div class="exec-row" style="background:#f0fdf4">
          <div class="exec-label" style="color:#16a34a">🟢 Indicadores Positivos</div>
          <ul>${li(positivos, '#15803d')}</ul>
        </div>
        ${atencao.length > 0 ? `
        <div class="exec-row" style="background:#fffbeb">
          <div class="exec-label" style="color:#d97706">🟡 Pontos de Atenção</div>
          <ul>${li(atencao, '#b45309')}</ul>
        </div>` : ''}
        ${riscos.length > 0 ? `
        <div class="exec-row" style="background:#fef2f2">
          <div class="exec-label" style="color:#dc2626">🔴 Riscos Operacionais</div>
          <ul>${li(riscos, '#b91c1c')}</ul>
        </div>` : ''}
      </div>
    </div>

    <!-- CRM HubSpot -->
    <div class="section">
      <div class="sh"><span style="background:#60a5fa"></span>CRM HubSpot</div>
      <div class="grid4" style="margin-bottom:12px">
        <div class="kpi"><div class="kv blue">${crm.novosUltimos7}</div><div class="kl">Leads Novos (7d)</div></div>
        <div class="kpi"><div class="kv teal">${crm.clientes}</div><div class="kl">Clientes Ativos</div></div>
        <div class="kpi"><div class="kv amber">${crm.oportunidades}</div><div class="kl">Pipeline</div></div>
        <div class="kpi"><div class="kv">${crm.leads}</div><div class="kl">Oportunidades</div></div>
      </div>
      <div class="row"><span class="rl">Total de Contatos</span><span class="rv">${crm.total}</span></div>
      <div class="row"><span class="rl">Sem Interação (+30d)</span><span class="rv ${crm.semInteracao > 5 ? 'amber' : ''}">${crm.semInteracao}</span></div>
    </div>

    <!-- GLPI -->
    <div class="section">
      <div class="sh"><span style="background:#a78bfa"></span>GLPI — Gestão de Tickets</div>
      <div class="grid4" style="margin-bottom:12px">
        <div class="kpi"><div class="kv ${glpi.abertos > 10 ? 'amber' : ''}">${glpi.abertos}</div><div class="kl">Tickets Abertos</div></div>
        <div class="kpi"><div class="kv ${glpi.criticos > 0 ? 'red' : 'green'}">${glpi.criticos}</div><div class="kl">Tickets Críticos</div></div>
        <div class="kpi"><div class="kv green">${glpi.resolvidos}</div><div class="kl">Tickets Resolvidos</div></div>
        <div class="kpi"><div class="kv">${glpi.total}</div><div class="kl">Total</div></div>
      </div>
      <div class="row"><span class="rl">Novos Hoje</span><span class="rv">${glpi.novosHoje}</span></div>
      <div class="row"><span class="rl">Pendentes</span><span class="rv ${glpi.pendentes > 3 ? 'amber' : ''}">${glpi.pendentes}</span></div>
    </div>

    <!-- Jira -->
    <div class="section">
      <div class="sh"><span style="background:#3b82f6"></span>Jira — Gestão de Projetos</div>
      <div class="grid4" style="margin-bottom:12px">
        <div class="kpi"><div class="kv blue">${jira.projetos.length}</div><div class="kl">Projetos Ativos</div></div>
        <div class="kpi"><div class="kv ${jira.risco > 0 ? 'red' : 'green'}">${jira.risco}</div><div class="kl">Projetos em Risco</div></div>
        <div class="kpi"><div class="kv amber">${jira.semana}</div><div class="kl">Entregas Esta Semana</div></div>
        <div class="kpi"><div class="kv green">${jira.concluidos}</div><div class="kl">Concluídos</div></div>
      </div>
      ${jira.projetos.length > 0 ? `<div class="row"><span class="rl">Projetos em Andamento</span><span class="rv">${jira.projetos.slice(0,3).join(' · ')}${jira.projetos.length > 3 ? ` +${jira.projetos.length-3}` : ''}</span></div>` : ''}
      <div class="row"><span class="rl">Issues Críticas</span><span class="rv ${jira.criticos > 0 ? 'red' : ''}">${jira.criticos}</span></div>
    </div>

    <!-- Zabbix -->
    ${zabbix?.configured ? `
    <div class="section">
      <div class="sh"><span style="background:#ef4444"></span>Zabbix — Monitoramento de Infraestrutura</div>
      <div class="grid4" style="margin-bottom:12px">
        <div class="kpi"><div class="kv ${zabbix.totalProblems > 0 ? 'red' : 'green'}">${zabbix.totalProblems}</div><div class="kl">Problemas Ativos</div></div>
        <div class="kpi"><div class="kv ${zabbix.critical > 0 ? 'red' : 'green'}">${zabbix.critical}</div><div class="kl">Críticos</div></div>
        <div class="kpi"><div class="kv ${zabbix.hostsDown > 0 ? 'red' : 'green'}">${zabbix.hostsUp}/${zabbix.hostsTotal}</div><div class="kl">Hosts Online</div></div>
        <div class="kpi"><div class="kv ${zabbix.availability < 95 ? 'amber' : 'green'}">${zabbix.availability}%</div><div class="kl">Disponibilidade</div></div>
      </div>
      <div class="row"><span class="rl">Disaster</span><span class="rv ${zabbix.disaster > 0 ? 'red' : ''}">${zabbix.disaster}</span></div>
      <div class="row"><span class="rl">High</span><span class="rv ${zabbix.high > 0 ? 'amber' : ''}">${zabbix.high}</span></div>
      <div class="row"><span class="rl">Sem Reconhecimento</span><span class="rv ${zabbix.unacknowledged > 0 ? 'amber' : ''}">${zabbix.unacknowledged}</span></div>
    </div>` : ''}

    <!-- Datadog -->
    ${datadog?.configured ? `
    <div class="section">
      <div class="sh"><span style="background:#8b5cf6"></span>Datadog — Observabilidade</div>
      <div class="grid4" style="margin-bottom:12px">
        <div class="kpi"><div class="kv">${datadog.totalMonitors}</div><div class="kl">Total Monitors</div></div>
        <div class="kpi"><div class="kv green">${datadog.ok}</div><div class="kl">OK</div></div>
        <div class="kpi"><div class="kv ${datadog.alert > 0 ? 'red' : 'green'}">${datadog.alert}</div><div class="kl">Em Alerta</div></div>
        <div class="kpi"><div class="kv ${datadog.warn > 0 ? 'amber' : 'green'}">${datadog.warn}</div><div class="kl">Warning</div></div>
      </div>
      <div class="row"><span class="rl">Hosts Online</span><span class="rv">${datadog.hostsUp} / ${datadog.hostsTotal}</span></div>
      ${datadog.alertMonitors.map((m: any) => `<div class="row"><span class="rl" style="color:#ef4444">🔴 Alert</span><span class="rv" style="font-size:11px">${m.name}</span></div>`).join('')}
    </div>` : ''}

    <!-- GMUDs -->
    <div class="section">
      <div class="sh"><span style="background:#f59e0b"></span>GMUDs — Gestão de Mudanças</div>
      <div class="row"><span class="rl">Mudanças Planejadas</span><span class="rv">—</span></div>
      <div class="row"><span class="rl">Mudanças Executadas</span><span class="rv">—</span></div>
      <div class="row"><span class="rl">Mudanças Concluídas</span><span class="rv">—</span></div>
    </div>

    <!-- Agenda -->
    <div class="section">
      <div class="sh"><span style="background:#8fbfc2"></span>Agenda</div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;font-size:12px;color:#64748b;line-height:1.6">
        Acesse o CS Cockpit para visualizar os eventos do dia, reuniões agendadas e próximas entregas da semana.
      </div>
      <div class="row" style="margin-top:8px"><span class="rl">Portal</span><span class="rv"><a href="${appUrl}/operacoes" style="color:#3b82f6;text-decoration:none">Abrir Agenda →</a></span></div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:8px 0 4px">
      <a class="btn" href="${appUrl}">Acessar CS Cockpit</a>
    </div>

  </div>

  <div class="ft">
    <p><strong>CS Cockpit · XTENT Group</strong></p>
    <p>Relatório ${typeLabel} gerado automaticamente · ${date} às ${time}</p>
    <p style="margin-top:6px;font-size:10px;opacity:.7">Para gerenciar destinatários acesse Automações › Destinatários no portal</p>
  </div>
</div>
</body>
</html>`
}

async function logToSupabase(payload: {
  type: string
  recipients: string[]
  status: string
  method?: string
  error?: string
  duration: number
}) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notification_logs').insert({
      channel: 'email',
      status: payload.status,
      recipients: payload.recipients,
      metadata: { type: payload.type, method: payload.method, error: payload.error },
      executed_at: new Date().toISOString(),
      delivery_time: payload.duration,
    })
  } catch {
    // Supabase log is non-critical — ignore errors
  }
}

export async function POST(request: NextRequest) {
  const startMs = Date.now()
  try {
    const body = await request.json().catch(() => ({}))
    const type: string = body.type ?? 'daily'

    // Resolve recipients
    let recipients: string[] = body.recipients ?? []
    if (!Array.isArray(recipients) || recipients.length === 0) {
      recipients = await getConfiguredRecipients()
    }
    if (recipients.length === 0) {
      const fallback = process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? ''
      if (fallback) recipients = [fallback]
    }
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Nenhum destinatário configurado. Adicione em Automações › Destinatários.' }, { status: 400 })
    }

    const data = await collectAllData()
    const html = buildEmailHTML(type, data)
    const typeLabel = type === 'daily' ? 'Diário' : type === 'weekly' ? 'Semanal' : 'Mensal'

    const result = await sendEmail({
      to: recipients,
      subject: `📊 Relatório Executivo ${typeLabel} — XTENT ${new Date().toLocaleDateString('pt-BR')}`,
      html,
    })

    const duration = Date.now() - startMs

    await logToSupabase({
      type,
      recipients,
      status: result.ok ? 'success' : 'error',
      method: result.ok ? result.method : undefined,
      error: !result.ok ? result.error : undefined,
      duration,
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      method: result.method,
      to: recipients,
      type,
      status: data.statusGeral,
      sentAt: new Date().toISOString(),
      duration,
    })
  } catch (err: any) {
    console.error('Erro ao enviar relatório:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/automation/reports/send',
    method: 'POST',
    body: { type: 'daily|weekly|monthly', recipients: ['email@example.com'] },
  })
}
