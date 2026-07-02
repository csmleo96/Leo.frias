import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/sender'

export const dynamic = 'force-dynamic'

const BASE = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Brand tokens ───────────────────────────────────────────────────────────
const C = {
  bg: '#07111F', cont: '#0B1F3A', card: '#112447', border: '#1E3A5F',
  orange: '#F58220', green: '#22C55E', yellow: '#FACC15', red: '#EF4444',
  blue: '#38BDF8', muted: '#8BA6C1', text: '#E2EBF5', white: '#FFFFFF',
  deep: '#0D1A2F',
}

const FL = {
  verde:    { color: C.green,  emoji: '🟢', label: 'Verde'    },
  amarelo:  { color: C.yellow, emoji: '🟡', label: 'Amarelo'  },
  vermelho: { color: C.red,    emoji: '🔴', label: 'Vermelho' },
}

// ── Helpers ────────────────────────────────────────────────────────────────
const pill = (t: string, c: string) =>
  `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${c}22;color:${c};border:1px solid ${c}44">${t}</span>`

const bar = (pct: number, c: string) =>
  `<div style="height:6px;background:#0A1629;border-radius:3px;overflow:hidden;margin-top:6px">
    <div style="width:${Math.min(pct, 100)}%;height:100%;background:${c};border-radius:3px"></div>
  </div>`

// ── Client card ────────────────────────────────────────────────────────────
function clientCard(cl: any): string {
  const f = FL[cl.farol as keyof typeof FL] ?? FL.amarelo
  const score = cl.healthScore ?? 0
  const sc = score >= 80 ? C.green : score >= 60 ? C.yellow : C.red
  const openTickets = (cl.glpi?.open ?? 0) + (cl.jira?.open ?? 0)
  const zDisaster = cl.zabbix?.disaster ?? 0
  const zHigh = cl.zabbix?.high ?? 0
  const avail = cl.zabbix?.availability ?? '—'

  const alertLine = zDisaster > 0
    ? `<div style="margin-top:8px;font-size:11px;color:${C.red}">⚠ ${zDisaster} Disaster ativo</div>`
    : zHigh > 2
    ? `<div style="margin-top:8px;font-size:11px;color:${C.yellow}">⚑ ${zHigh} alertas HIGH</div>`
    : `<div style="margin-top:8px;font-size:11px;color:${C.muted}">Sem alertas críticos</div>`

  return `
<td width="50%" style="padding:6px;vertical-align:top">
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:14px 16px;background:${C.cont};border-radius:10px;border:1px solid ${f.color}44;border-left:4px solid ${f.color}">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div>
        <div style="font-size:15px;font-weight:800;color:${C.white}">${cl.name}</div>
        <div style="margin-top:3px">${pill(f.emoji + ' ' + f.label, f.color)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:900;color:${sc};line-height:1">${score}</div>
        <div style="font-size:9px;color:${C.muted};letter-spacing:.5px;text-transform:uppercase">Score</div>
      </div>
    </div>
    ${bar(score, sc)}
    <div style="margin-top:10px;display:flex;gap:12px;font-size:11px;color:${C.muted}">
      <span>Dispon. <strong style="color:${avail >= 99 ? C.green : C.yellow}">${avail}%</strong></span>
      <span>Tickets <strong style="color:${openTickets > 20 ? C.yellow : C.text}">${openTickets}</strong></span>
      <span>SLA <strong style="color:${cl.serviceMetrics?.sla === 'Em Risco' ? C.red : cl.serviceMetrics?.sla === 'Atenção' ? C.yellow : C.green}">${cl.serviceMetrics?.sla ?? 'N/D'}</strong></span>
    </div>
    ${alertLine}
    <div style="margin-top:6px;font-size:11px;color:${C.muted};font-style:italic;line-height:1.4">${cl.farolReason}</div>
  </td></tr>
  </table>
</td>`
}

// ── Critical alerts section ────────────────────────────────────────────────
function criticalSection(clients: any[]): string {
  const critical = clients.filter(c => c.farol === 'vermelho')
  if (critical.length === 0) return ''

  const items = critical.map(c => {
    const topRisk = (c.risks ?? [])[0]
    return `
<tr>
  <td style="padding:10px 14px;border-bottom:1px solid ${C.border}">
    <div style="font-size:13px;font-weight:700;color:${C.white}">${c.name}</div>
    <div style="font-size:12px;color:${C.muted};margin-top:2px">${topRisk?.title ?? c.farolReason}</div>
    <div style="margin-top:4px">${pill('🔴 Vermelho · Ação Imediata', C.red)}</div>
  </td>
</tr>`
  }).join('')

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
<tr><td style="padding:16px 18px;background:${C.red}0D;border-radius:10px;border:1px solid ${C.red}33">
  <div style="font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${C.red};margin-bottom:12px">🚨 Clientes em Estado Crítico — Ação Imediata</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    ${items}
  </table>
</td></tr>
</table>`
}

// ── Portfolio summary banner ────────────────────────────────────────────────
function summaryBanner(p: any, gen: string): string {
  const sc = p.portfolioScore >= 80 ? C.green : p.portfolioScore >= 60 ? C.yellow : C.red

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
<tr><td style="padding:22px 24px;background:${C.cont};border-radius:12px;border:2px solid ${C.orange}">
  <div style="text-align:center;margin-bottom:16px">
    <div style="display:inline-block;background:${C.orange};color:${C.white};font-size:10px;font-weight:800;letter-spacing:2px;padding:4px 14px;border-radius:20px;margin-bottom:10px">XTENTGROUP — FAROL EXECUTIVO DIÁRIO</div>
    <div style="font-size:20px;font-weight:900;color:${C.white}">Resumo de Saúde da Carteira</div>
    <div style="font-size:12px;color:${C.muted};margin-top:4px">${gen}</div>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:10px;text-align:center">
        <div style="font-size:32px;font-weight:900;color:${sc}">${p.portfolioScore}<span style="font-size:14px;color:${C.muted}">/100</span></div>
        <div style="font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:.5px">Score Geral</div>
      </td>
      <td style="padding:10px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${C.green}">${p.healthy}</div>
        <div style="font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:.5px">🟢 Saudáveis</div>
      </td>
      <td style="padding:10px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${C.yellow}">${p.attention}</div>
        <div style="font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:.5px">🟡 Atenção</div>
      </td>
      <td style="padding:10px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${C.red}">${p.critical}</div>
        <div style="font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:.5px">🔴 Críticos</div>
      </td>
      <td style="padding:10px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${p.avgAvailability >= 99 ? C.green : C.yellow}">${p.avgAvailability}%</div>
        <div style="font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:.5px">Disponib. Média</div>
      </td>
      <td style="padding:10px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${p.totalOpenTickets > 50 ? C.yellow : C.text}">${p.totalOpenTickets}</div>
        <div style="font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:.5px">Tickets Abertos</div>
      </td>
    </tr>
  </table>
  <div style="height:8px;background:#0A1629;border-radius:4px;overflow:hidden;margin-top:12px">
    <div style="width:${Math.min(p.portfolioScore, 100)}%;height:100%;background:${sc};border-radius:4px"></div>
  </div>
  <div style="margin-top:12px;font-size:12px;color:${C.muted};line-height:1.6;text-align:center">${p.executiveSummary}</div>
</td></tr>
</table>`
}

// ── Action CTA ─────────────────────────────────────────────────────────────
function ctaFooter(dashUrl: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px">
<tr><td style="padding:16px 20px;background:${C.cont};border-radius:8px;text-align:center;border:1px solid ${C.border}">
  <a href="${dashUrl}" style="display:inline-block;background:${C.orange};color:${C.white};font-size:13px;font-weight:700;padding:10px 28px;border-radius:8px;text-decoration:none;letter-spacing:.3px">
    Abrir Dashboard Completo →
  </a>
  <div style="margin-top:10px;font-size:11px;color:${C.muted}">
    Relatório completo disponível em <a href="${dashUrl}/relatorios" style="color:${C.blue};text-decoration:none">${dashUrl}/relatorios</a>
  </div>
  <div style="margin-top:6px;font-size:10px;color:#4A6380">
    Enviado automaticamente pelo <strong style="color:${C.orange}">Leonardo CS Cockpit</strong> · XTENTGROUP · Todos os dias às 09h00
  </div>
</td></tr>
</table>`
}

// ── HTML builder ───────────────────────────────────────────────────────────
function buildHTML(data: any): string {
  const p = data.portfolio ?? {}
  const clients: any[] = data.clients ?? []
  const dash = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const gen = new Date(data.generatedAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  // Pair clients into rows of 2
  const rows: string[] = []
  for (let i = 0; i < clients.length; i += 2) {
    const left = clients[i]
    const right = clients[i + 1]
    rows.push(`
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px">
  <tr>
    ${clientCard(left)}
    ${right ? clientCard(right) : '<td width="50%" style="padding:6px"></td>'}
  </tr>
</table>`)
  }

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Farol Executivo Diário — XTENTGROUP</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${C.text}">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto">
  <tr><td style="padding:20px">

    ${summaryBanner(p, gen)}
    ${criticalSection(clients)}

    <div style="font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${C.orange};margin-bottom:12px">Status por Cliente</div>
    ${rows.join('')}
    ${ctaFooter(dash)}

  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

// ── Handler ────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const url = new URL(req.url)
  const preview = url.searchParams.get('preview') === 'true'
  const debug = url.searchParams.get('debug') === 'true'

  if (debug) {
    return NextResponse.json({
      SMTP_HOST:    !!process.env.SMTP_HOST,
      SMTP_PORT:    !!process.env.SMTP_PORT,
      SMTP_USER:    !!process.env.SMTP_USER,
      SMTP_PASS:    !!process.env.SMTP_PASS,
      NOTIFICATION_EMAIL_TO: !!process.env.NOTIFICATION_EMAIL_TO,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      MICROSOFT_CLIENT_ID: !!process.env.MICROSOFT_CLIENT_ID,
    })
  }

  const res = await fetch(`${BASE()}/api/reports/executive-portfolio`, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ error: 'Falha ao coletar dados do portfólio' }, { status: 500 })
  }
  const data = await res.json()
  const html = buildHTML(data)

  if (preview) {
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }

  const to = (process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (to.length === 0) {
    return NextResponse.json({ error: 'NOTIFICATION_EMAIL_TO não configurado' }, { status: 500 })
  }

  const date = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit' })
  const p = data.portfolio ?? {}
  const statusLine = p.critical > 0 ? `🔴 ${p.critical} crítico(s)` : p.attention > 0 ? `🟡 ${p.attention} em atenção` : '🟢 Carteira saudável'
  const subject = `${statusLine} — Farol Executivo ${date} · Score ${p.portfolioScore}/100`

  const result = await sendEmail({ to, subject, html })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    method: result.method,
    sentTo: to,
    subject,
    portfolioScore: p.portfolioScore,
    farol: {
      verde: p.healthy,
      amarelo: p.attention,
      vermelho: p.critical,
    },
    clients: (data.clients ?? []).map((c: any) => ({ name: c.name, farol: c.farol, score: c.healthScore })),
    generatedAt: data.generatedAt,
  })
}
