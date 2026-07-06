/**
 * Dispatch orquestrador — envia Farol 360° + Relatório Executivo Completo
 * sincronizados com os mesmos dados de Zabbix, GLPI, Jira e Datadog.
 *
 * GET  /api/reports/dispatch          → envia ambos os emails
 * GET  /api/reports/dispatch?preview  → retorna JSON com status das fontes
 */
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/sender'
import { CLIENTS } from '@/lib/reports/clients'

export const dynamic = 'force-dynamic'

const BASE = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

async function safeGet(url: string) {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

// ── Cores XTENTGROUP ──────────────────────────────────────────────────────────
const C = {
  bg:       '#07111F',
  container:'#0B1F3A',
  card:     '#112447',
  border:   '#1E3A5F',
  orange:   '#F58220',
  green:    '#22C55E',
  yellow:   '#FACC15',
  red:      '#EF4444',
  blue:     '#38BDF8',
  muted:    '#8BA6C1',
  text:     '#E2EBF5',
  white:    '#FFFFFF',
}

function pill(text: string, color: string) {
  return `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;background:${color}22;color:${color};border:1px solid ${color}44">${text}</span>`
}

function grid4(items: Array<{ label: string; value: string | number; color?: string }>) {
  const cells = items.map(i => `
    <td width="25%" style="padding:10px 6px;text-align:center;vertical-align:top">
      <div style="font-size:24px;font-weight:800;color:${i.color ?? C.text}">${i.value}</div>
      <div style="font-size:11px;color:${C.muted};margin-top:3px;text-transform:uppercase;letter-spacing:.5px">${i.label}</div>
    </td>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`
}

function problemRow(p: any) {
  const sev = p.severity >= 5 ? C.red : p.severity >= 4 ? '#F97316' : C.yellow
  const lbl = p.severity >= 5 ? 'DISASTER' : p.severity >= 4 ? 'HIGH' : 'AVG'
  return `<div style="padding:8px 10px;margin-bottom:6px;background:#0D1A2F;border-radius:6px;border-left:3px solid ${sev}">
    <span style="color:${C.text};font-size:13px">${p.name ?? p.description ?? '—'} <span style="color:${C.muted}">${p.host ? '(' + p.host + ')' : ''}</span></span>
    ${pill(lbl, sev)}
  </div>`
}

function sec(title: string, content: string, border = C.orange) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
  <tr><td style="padding:20px;background:${C.container};border-radius:10px;border-left:4px solid ${border}">
    <div style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${border};margin-bottom:14px">${title}</div>
    ${content}
  </td></tr>
</table>`
}

// ── Farol HTML (portfolio-level) ──────────────────────────────────────────────
function buildFarolHTML(portfolio: any, hsData: any): string {
  const p        = portfolio.portfolio ?? {}
  const clients  = (portfolio.clients ?? []) as any[]
  const dateStr  = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr  = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

  const overallColor = p.portfolioScore >= 85 ? C.green : p.portfolioScore >= 65 ? C.yellow : C.red
  const overallLabel = p.portfolioScore >= 85 ? 'SAUDÁVEL' : p.portfolioScore >= 65 ? 'ATENÇÃO' : 'CRÍTICO'

  const clientRows = clients.map((cl: any) => {
    const farol = cl.farol === 'vermelho' ? '🔴' : cl.farol === 'amarelo' ? '🟡' : '🟢'
    const z     = cl.zabbix
    const avail = z?.availability ?? '—'
    const problems = z?.totalProblems ?? '—'
    const glpiOpen = cl.glpi?.open ?? '—'
    const jiraOpen = cl.jira?.open ?? '—'
    const score    = cl.healthScore ?? '—'
    const scolor   = typeof score === 'number' ? (score >= 80 ? C.green : score >= 60 ? C.yellow : C.red) : C.muted
    return `<tr style="border-bottom:1px solid ${C.border}">
      <td style="padding:10px 12px;color:${C.white};font-weight:600;font-size:13px">${farol} ${cl.name}</td>
      <td style="padding:10px 12px;color:${scolor};font-weight:700;font-size:13px;text-align:center">${score}</td>
      <td style="padding:10px 12px;color:${C.text};font-size:12px;text-align:center">${avail}%</td>
      <td style="padding:10px 12px;color:${(typeof problems === 'number' && problems > 0) ? C.yellow : C.green};font-size:12px;text-align:center">${problems}</td>
      <td style="padding:10px 12px;color:${(typeof glpiOpen === 'number' && glpiOpen > 5) ? C.yellow : C.text};font-size:12px;text-align:center">${glpiOpen}</td>
      <td style="padding:10px 12px;color:${(typeof jiraOpen === 'number' && jiraOpen > 0) ? C.blue : C.text};font-size:12px;text-align:center">${jiraOpen}</td>
    </tr>`
  }).join('')

  const hs = hsData ?? {}
  const pipeline = hs.pipeline != null ? `R$ ${Number(hs.pipeline).toLocaleString('pt-BR')}` : '—'
  const winRate  = hs.winRate  != null ? `${hs.winRate}%` : '—'

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Farol Executivo 360° — XTENTGROUP</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;margin:0 auto;padding:20px">

  <!-- Header -->
  <tr><td style="padding:28px 0 20px;text-align:center">
    <div style="display:inline-block;background:${C.orange};color:${C.white};font-size:11px;font-weight:800;letter-spacing:2px;padding:4px 14px;border-radius:20px;margin-bottom:12px">XTENTGROUP CSM INTEL</div>
    <div style="font-size:26px;font-weight:900;color:${C.white}">Farol Executivo 360°</div>
    <div style="font-size:13px;color:${C.muted};margin-top:6px">${dateStr} · ${timeStr} (Horário de Brasília)</div>
  </td></tr>

  <!-- KPIs -->
  <tr><td style="padding-bottom:20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.container};border-radius:10px;padding:20px">
      <tr>
        <td style="text-align:center;padding:10px">
          <div style="font-size:36px;font-weight:900;color:${overallColor}">${p.portfolioScore ?? '—'}</div>
          <div style="font-size:11px;color:${C.muted};text-transform:uppercase">Score Carteira</div>
        </td>
        <td style="text-align:center;padding:10px">
          <div style="font-size:36px;font-weight:900;color:${C.red}">${p.critical ?? 0}</div>
          <div style="font-size:11px;color:${C.muted};text-transform:uppercase">Críticos</div>
        </td>
        <td style="text-align:center;padding:10px">
          <div style="font-size:36px;font-weight:900;color:${C.yellow}">${p.attention ?? 0}</div>
          <div style="font-size:11px;color:${C.muted};text-transform:uppercase">Atenção</div>
        </td>
        <td style="text-align:center;padding:10px">
          <div style="font-size:36px;font-weight:900;color:${C.green}">${p.healthy ?? 0}</div>
          <div style="font-size:11px;color:${C.muted};text-transform:uppercase">Saudáveis</div>
        </td>
        <td style="text-align:center;padding:10px">
          <div style="font-size:36px;font-weight:900;color:${C.orange}">${pipeline}</div>
          <div style="font-size:11px;color:${C.muted};text-transform:uppercase">Pipeline CRM</div>
        </td>
        <td style="text-align:center;padding:10px">
          <div style="font-size:36px;font-weight:900;color:${C.blue}">${winRate}</div>
          <div style="font-size:11px;color:${C.muted};text-transform:uppercase">Win Rate</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Status badge -->
  <tr><td style="padding-bottom:20px;text-align:center">
    <div style="display:inline-block;padding:12px 32px;background:${overallColor}18;border:2px solid ${overallColor};border-radius:30px">
      <span style="font-size:16px;font-weight:800;color:${overallColor};letter-spacing:1px">${overallLabel}</span>
    </div>
  </td></tr>

  <!-- Executive summary -->
  ${p.executiveSummary ? `<tr><td style="padding-bottom:20px">
    ${sec('Resumo Executivo', `<div style="font-size:13px;color:${C.text};line-height:1.85;background:#0D1A2F;border-radius:6px;padding:14px;border-left:3px solid ${C.orange}">${p.executiveSummary}</div>`, C.orange)}
  </td></tr>` : ''}

  <!-- Client table -->
  <tr><td style="padding-bottom:20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.container};border-radius:10px;overflow:hidden">
      <tr style="background:#0A1629">
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Cliente</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Score</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Disponib.</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Zabbix</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">GLPI</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;color:${C.muted};text-transform:uppercase;border-bottom:1px solid ${C.border}">Jira</th>
      </tr>
      ${clientRows}
    </table>
  </td></tr>

  <!-- Per-client detail sections -->
  ${clients.map((cl: any) => {
    const z  = cl.zabbix
    const gl = cl.glpi
    const ji = cl.jira
    const dd = cl.datadog
    const farolColor = cl.farol === 'vermelho' ? C.red : cl.farol === 'amarelo' ? C.yellow : C.green
    const critProbs: any[] = z?.criticalProblems ?? []

    return `<tr><td style="padding-bottom:4px">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
        <tr><td style="padding:16px 20px;background:${farolColor}0f;border-radius:10px;border:1px solid ${farolColor}33">
          <div style="font-size:14px;font-weight:800;color:${farolColor};margin-bottom:12px">
            ${cl.farol === 'vermelho' ? '🔴' : cl.farol === 'amarelo' ? '🟡' : '🟢'} ${cl.name} — Score ${cl.healthScore ?? '—'}/100
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${z ? `<td style="padding:0 6px 0 0;vertical-align:top;width:25%">
                <div style="font-size:10px;color:${C.muted};text-transform:uppercase;margin-bottom:4px">Zabbix</div>
                <div style="font-size:12px;color:${C.text}">Problemas: <strong style="color:${(z.totalProblems??0)>0?C.yellow:C.green}">${z.totalProblems??0}</strong></div>
                <div style="font-size:12px;color:${C.text}">Disponib.: <strong style="color:${(z.availability??100)>=99?C.green:C.yellow}">${z.availability??'—'}%</strong></div>
                <div style="font-size:12px;color:${C.text}">Hosts: <strong>${z.hostsUp??'—'}/${z.hostsTotal??'—'}</strong></div>
              </td>` : ''}
              ${gl ? `<td style="padding:0 6px;vertical-align:top;width:25%">
                <div style="font-size:10px;color:${C.muted};text-transform:uppercase;margin-bottom:4px">GLPI</div>
                <div style="font-size:12px;color:${C.text}">Abertos: <strong style="color:${(gl.open??0)>5?C.yellow:C.text}">${gl.open??0}</strong></div>
                <div style="font-size:12px;color:${C.text}">Críticos: <strong style="color:${(gl.critical??0)>0?C.red:C.green}">${gl.critical??0}</strong></div>
                <div style="font-size:12px;color:${C.text}">Sem atend.: <strong style="color:${(gl.unattended??0)>0?C.yellow:C.green}">${gl.unattended??0}</strong></div>
              </td>` : ''}
              ${ji ? `<td style="padding:0 6px;vertical-align:top;width:25%">
                <div style="font-size:10px;color:${C.muted};text-transform:uppercase;margin-bottom:4px">Jira</div>
                <div style="font-size:12px;color:${C.text}">Ativos: <strong>${ji.open??0}</strong></div>
                <div style="font-size:12px;color:${C.text}">Vencidos: <strong style="color:${(ji.overdue??0)>0?C.red:C.green}">${ji.overdue??0}</strong></div>
                <div style="font-size:12px;color:${C.text}">Concluídos: <strong style="color:${C.green}">${ji.done??0}</strong></div>
              </td>` : ''}
              ${dd ? `<td style="padding:0 0 0 6px;vertical-align:top;width:25%">
                <div style="font-size:10px;color:${C.muted};text-transform:uppercase;margin-bottom:4px">Datadog</div>
                <div style="font-size:12px;color:${C.text}">Em alerta: <strong style="color:${(dd.alert??0)>0?C.red:C.green}">${dd.alert??0}</strong></div>
                <div style="font-size:12px;color:${C.text}">Warning: <strong style="color:${(dd.warn??0)>0?C.yellow:C.green}">${dd.warn??0}</strong></div>
                <div style="font-size:12px;color:${C.text}">OK: <strong style="color:${C.green}">${dd.ok??0}</strong></div>
              </td>` : ''}
            </tr>
          </table>
          ${critProbs.length > 0 ? `<div style="margin-top:12px;font-size:11px;font-weight:700;color:${C.red};text-transform:uppercase;margin-bottom:6px">Problemas Críticos</div>${critProbs.slice(0, 5).map(problemRow).join('')}` : ''}
          ${cl.executiveSummary ? `<div style="margin-top:12px;font-size:12px;color:${C.muted};line-height:1.7;font-style:italic">${cl.executiveSummary}</div>` : ''}
        </td></tr>
      </table>
    </td></tr>`
  }).join('')}

  <!-- Footer -->
  <tr><td style="padding:20px;text-align:center;border-top:1px solid ${C.border}">
    <div style="font-size:12px;color:${C.muted}">Farol Executivo 360° · XTENTGROUP Customer Success Management</div>
    <div style="font-size:11px;color:#4A6380;margin-top:4px">Gerado automaticamente · Dados: Zabbix · GLPI · Jira · Datadog · HubSpot</div>
  </td></tr>

</table>
</body></html>`
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const url     = new URL(req.url)
  const preview = url.searchParams.has('preview')
  const base    = BASE()
  const sentAt  = new Date().toISOString()
  const t0      = Date.now()

  // ── 1. Coleta dados em paralelo ─────────────────────────────────────────────
  const [portfolioRes, hsRes, fullRes] = await Promise.allSettled([
    fetch(`${base}/api/reports/executive-portfolio`, { cache: 'no-store' }),
    fetch(`${base}/api/hubspot/dashboard`,           { cache: 'no-store' }),
    fetch(`${base}/api/reports/executive-full`,      { cache: 'no-store' }),
  ])

  const portfolioOk = portfolioRes.status === 'fulfilled' && portfolioRes.value.ok
  const fullOk      = fullRes.status      === 'fulfilled' && fullRes.value.ok

  if (!portfolioOk) {
    return NextResponse.json({
      error: 'Portfólio indisponível — dispatch cancelado',
      detail: portfolioRes.status === 'rejected' ? portfolioRes.reason?.message : `HTTP ${(portfolioRes as any).value?.status}`,
    }, { status: 502 })
  }

  const portfolio = await (portfolioRes as PromiseFulfilledResult<Response>).value.json()
  const hsData    = hsRes.status === 'fulfilled' && hsRes.value.ok
    ? await hsRes.value.json().catch(() => null)
    : null
  const fullReport = fullOk
    ? await (fullRes as PromiseFulfilledResult<Response>).value.json().catch(() => null)
    : null

  // ── 2. Fontes de dados ──────────────────────────────────────────────────────
  const clients  = portfolio.clients ?? []
  const firstCl  = clients[0] ?? {}
  const sources  = {
    portfolio: 'ok',
    zabbix:    firstCl.zabbix  != null ? 'ok' : 'indisponível',
    glpi:      firstCl.glpi    != null ? 'ok' : 'indisponível',
    jira:      firstCl.jira    != null ? 'ok' : 'indisponível',
    datadog:   firstCl.datadog != null ? 'ok' : 'indisponível',
    hubspot:   hsData           != null ? 'ok' : 'indisponível',
    executiveFull: fullOk       ? 'ok' : 'indisponível',
  }

  if (preview) {
    return NextResponse.json({ sources, clients: clients.length, portfolioScore: portfolio.portfolio?.portfolioScore, sentAt })
  }

  // ── 3. Gera HTMLs ──────────────────────────────────────────────────────────
  const farolHtml = buildFarolHTML(portfolio, hsData)

  // Importar builder do executive-full/send seria circular — usa texto do full report diretamente
  // ou chama o send endpoint para o relatório completo separadamente
  const dateStr  = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const p        = portfolio.portfolio ?? {}
  const overallLabel = (p.portfolioScore ?? 0) >= 85 ? 'Saudável' : (p.portfolioScore ?? 0) >= 65 ? 'Atenção' : 'Crítico'

  // ── 4. Destinatários ────────────────────────────────────────────────────────
  const boardEmails = (process.env.BOARD_EMAIL_TO ?? '')
    .split(',').map((e: string) => e.trim()).filter(Boolean)
  const notifEmails = (process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? '')
    .split(',').map((e: string) => e.trim()).filter(Boolean)
  const to = [...new Set([...boardEmails, ...notifEmails])]

  if (to.length === 0) {
    return NextResponse.json({ error: 'Nenhum destinatário configurado (BOARD_EMAIL_TO / NOTIFICATION_EMAIL_TO)' }, { status: 500 })
  }

  // ── 5. Envia em paralelo ────────────────────────────────────────────────────
  const farolSubject = `Farol Executivo 360° | ${overallLabel} | Score ${p.portfolioScore ?? '—'}/100 | ${dateStr}`
  const fullSubject  = `Relatório Executivo | Saúde Operacional Completa | ${dateStr}`

  const [farolResult, fullResult] = await Promise.allSettled([
    sendEmail({ to, subject: farolSubject, html: farolHtml }),
    fullOk && fullReport
      ? fetch(`${base}/api/reports/executive-full/send`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({ ok: false, error: 'full/send falhou' }))
      : Promise.resolve({ ok: false, error: 'executive-full indisponível' }),
  ])

  const farol = farolResult.status === 'fulfilled' ? farolResult.value : { ok: false, error: String((farolResult as PromiseRejectedResult).reason) }
  const full  = fullResult.status  === 'fulfilled' ? fullResult.value  : { ok: false, error: String((fullResult  as PromiseRejectedResult).reason) }

  return NextResponse.json({
    ok:       (farol as any).ok,
    sentAt,
    duration: Date.now() - t0,
    to,
    sources,
    dispatch: {
      farol: {
        ok:        (farol as any).ok,
        subject:   farolSubject,
        method:    (farol as any).method,
        messageId: (farol as any).messageId,
        server:    (farol as any).server,
        error:     (farol as any).ok ? undefined : (farol as any).error,
      },
      executiveFull: {
        ok:    (full as any).ok,
        error: (full as any).ok ? undefined : (full as any).error,
      },
    },
    portfolio: {
      score:   p.portfolioScore,
      clients: clients.length,
      critical: p.critical,
      attention: p.attention,
      healthy:   p.healthy,
    },
  })
}
