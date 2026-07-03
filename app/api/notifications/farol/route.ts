import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/sender'

export const dynamic = 'force-dynamic'

const BASE = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Farol 360° criteria ────────────────────────────────────────────────────
function computeFarol360(cr: any): 'vermelho' | 'amarelo' | 'verde' {
  const avail    = cr.zabbix?.availability ?? 100
  const score    = cr.healthScore ?? 0
  const disaster = cr.zabbix?.disaster ?? 0
  const high     = cr.zabbix?.high ?? 0
  const critGLPI = cr.glpi?.critical ?? 0
  const overdue  = cr.jira?.overdue ?? 0
  const unatt    = cr.glpi?.unattended ?? 0
  const critJira = cr.jira?.critical ?? 0
  const probs: any[] = cr.zabbix?.criticalProblems ?? []

  const hasCpuHigh     = probs.some(p => /cpu/i.test(p.name ?? '') && (p.severity ?? 0) >= 4)
  const hasMemHigh     = probs.some(p => /memor|ram/i.test(p.name ?? '') && (p.severity ?? 0) >= 4)
  const hasStorageCrit = probs.some(p => /disk|storage|vol|filesystem|space|lun/i.test(p.name ?? '') && (p.severity ?? 0) >= 5)
  const hasVpnDown     = probs.some(p => /vpn|tunnel|ipsec|wan|link|mpls/i.test(p.name ?? '') && (p.severity ?? 0) >= 4)
  const hasSqlIssue    = probs.some(p => /sql|mssql|database|deadlock/i.test(p.name ?? '') && (p.severity ?? 0) >= 4)

  if (disaster > 0 || avail < 99.0 || score < 70 || hasStorageCrit || hasVpnDown || hasSqlIssue || critGLPI > 5 || overdue > 10) return 'vermelho'
  if (high > 2 || avail < 99.5 || score < 90 || hasCpuHigh || hasMemHigh || unatt > 5 || critJira > 0 || overdue > 3) return 'amarelo'
  return 'verde'
}

function farolReason360(cr: any, farol: string): string {
  const avail    = cr.zabbix?.availability ?? 100
  const score    = cr.healthScore ?? 0
  const disaster = cr.zabbix?.disaster ?? 0
  const high     = cr.zabbix?.high ?? 0
  const critGLPI = cr.glpi?.critical ?? 0
  const overdue  = cr.jira?.overdue ?? 0
  const unatt    = cr.glpi?.unattended ?? 0
  if (farol === 'vermelho') {
    if (disaster > 0)   return `${disaster} problema(s) Disaster ativo(s) — impacto direto ao negócio`
    if (avail < 99.0)   return `Disponibilidade ${avail}% — SLA comprometido`
    if (critGLPI > 5)   return `${critGLPI} chamados críticos sem resolução`
    return `Health Score crítico (${score}/100) — ação imediata`
  }
  if (farol === 'amarelo') {
    if (avail < 99.5)   return `Disponibilidade ${avail}% — abaixo de 99,5%`
    if (high > 2)       return `${high} alertas HIGH ativos no Zabbix`
    if (unatt > 5)      return `${unatt} chamados sem atendimento — risco de SLA`
    if (overdue > 3)    return `${overdue} atividades vencidas no Jira`
    return `Health Score ${score}/100 — acompanhamento preventivo`
  }
  return `Score ${score}/100 · Disponib. ${avail}% · Sem alertas críticos`
}

// ── XTENTGROUP Brand CSS ───────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
:root{
  --bg:#0A1316; --bg2:#101D22; --bg3:#26393E; --bg4:#2A4348; --bg5:#325258;
  --teal-d:#3B666D; --teal:#4D8188; --accent:#6EA2A8; --light:#8FBFC2; --pale:#B9DBDC; --near-w:#F3FAFA;
  --w:#FFFFFF;
  --red:#F87171; --rl:rgba(248,113,113,.13); --rm:rgba(248,113,113,.45);
  --yel:#FBBF24; --yl:rgba(251,191,36,.13); --ym:rgba(251,191,36,.45);
  --grn:#34D399; --gl:rgba(52,211,153,.12); --gm:rgba(52,211,153,.4);
  --glow-sm:0 0 20px rgba(110,162,168,.12);
  --glow-md:0 0 40px rgba(110,162,168,.18);
  --glow-lg:0 0 60px rgba(110,162,168,.25);
  --glass:rgba(16,29,34,.75);
  --radius-card:20px; --radius-inner:12px; --radius-sm:8px;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--near-w);font-family:'Inter','Space Grotesk',system-ui,sans-serif;line-height:1.6;font-size:14px;}
.sg{font-family:'Space Grotesk','Inter',system-ui,sans-serif;}

/* ── Nav ── */
nav{position:sticky;top:0;z-index:100;background:rgba(10,19,22,.88);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(110,162,168,.25);padding:0 1.75rem;display:flex;align-items:center;gap:1rem;height:56px;overflow-x:auto;white-space:nowrap;box-shadow:0 4px 24px rgba(0,0,0,.4);}
.nb{display:flex;align-items:center;gap:.65rem;color:var(--near-w);font-weight:700;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;margin-right:.75rem;flex-shrink:0;font-family:'Space Grotesk',system-ui,sans-serif;}
.nb-sep{width:1px;height:20px;background:rgba(110,162,168,.3);flex-shrink:0;}
nav a{color:var(--light);text-decoration:none;font-size:.73rem;font-weight:500;flex-shrink:0;transition:color .2s;opacity:.8;}
nav a:hover{color:var(--accent);opacity:1;}

/* ── Hero ── */
.hero{background:radial-gradient(ellipse at 50% -20%,rgba(110,162,168,.22) 0%,transparent 60%),linear-gradient(180deg,var(--bg2) 0%,var(--bg) 100%);padding:5rem 2rem 4rem;text-align:center;position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236EA2A8' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");pointer-events:none;}
.hero::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.4;}
.hl{color:var(--accent);font-size:.67rem;font-weight:600;letter-spacing:.25em;text-transform:uppercase;margin-bottom:.75rem;opacity:.9;}
.hero h1{color:var(--near-w);font-family:'Space Grotesk',system-ui,sans-serif;font-size:clamp(1.6rem,4vw,2.5rem);font-weight:700;line-height:1.15;margin-bottom:.5rem;letter-spacing:-.02em;}
.hs{color:var(--light);font-size:.84rem;margin-bottom:2.5rem;opacity:.8;}
.kpi-row{display:flex;flex-wrap:wrap;justify-content:center;gap:1rem;margin-bottom:.5rem;}
.kpi{background:var(--glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(110,162,168,.2);border-radius:var(--radius-inner);padding:1.1rem 1.4rem;min-width:115px;text-align:center;transition:box-shadow .2s,border-color .2s;box-shadow:var(--glow-sm);}
.kpi:hover{border-color:rgba(110,162,168,.5);box-shadow:var(--glow-md);}
.kpi .v{color:var(--accent);font-size:2rem;font-weight:700;line-height:1;font-family:'Space Grotesk',system-ui,sans-serif;letter-spacing:-.02em;}
.kpi .l{color:var(--light);font-size:.63rem;text-transform:uppercase;letter-spacing:.08em;margin-top:.35rem;opacity:.8;}
.fps{display:flex;flex-wrap:wrap;justify-content:center;gap:.6rem;margin-top:1.75rem;}
.fp{background:rgba(110,162,168,.07);border:1px solid rgba(110,162,168,.18);border-radius:100px;padding:.4rem 1rem;font-size:.76rem;color:var(--near-w);display:flex;align-items:center;gap:.45rem;}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0;}
.dr{background:#F87171;box-shadow:0 0 8px rgba(248,113,113,.7);}
.dy{background:#FBBF24;box-shadow:0 0 8px rgba(251,191,36,.7);}
.dg{background:#34D399;box-shadow:0 0 8px rgba(52,211,153,.7);}

/* ── Layout ── */
.sec{max-width:1120px;margin:0 auto;padding:3rem 2rem;}
.section-wrap{padding:3rem 0;}
.ey{color:var(--accent);font-size:.65rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;margin-bottom:.5rem;}
.st{color:var(--near-w);font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.5rem;font-weight:700;margin-bottom:.5rem;letter-spacing:-.01em;}
.sd{color:var(--light);font-size:.83rem;margin-bottom:1.75rem;opacity:.8;}
.bw{background:var(--bg2);}
.bg{background:var(--bg);}
.div{height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.2;margin:0;}

/* ── Farol table ── */
.tbl-wrap{overflow-x:auto;border-radius:var(--radius-card);border:1px solid rgba(110,162,168,.15);box-shadow:var(--glow-sm);}
.ft{width:100%;border-collapse:collapse;font-size:.8rem;}
.ft thead tr{background:rgba(38,57,62,.9);}
.ft th{padding:.75rem 1rem;font-size:.67rem;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap;color:var(--accent);border-bottom:1px solid rgba(110,162,168,.2);}
.ft tbody tr{border-bottom:1px solid rgba(110,162,168,.07);transition:background .15s;}
.ft tbody tr:nth-child(even){background:rgba(110,162,168,.03);}
.ft tbody tr:hover{background:rgba(110,162,168,.08);}
.ft td{padding:.7rem 1rem;vertical-align:middle;color:var(--near-w);}
.cn{font-weight:600;color:var(--near-w);font-size:.82rem;} .cs{font-size:.69rem;color:var(--light);margin-top:2px;opacity:.8;}

/* ── Badges ── */
.badge{display:inline-flex;align-items:center;gap:.3rem;padding:.25rem .7rem;border-radius:100px;font-size:.71rem;font-weight:600;letter-spacing:.01em;}
.br{background:rgba(248,113,113,.15);color:#FCA5A5;border:1px solid rgba(248,113,113,.35);}
.by{background:rgba(251,191,36,.12);color:#FDE68A;border:1px solid rgba(251,191,36,.35);}
.bgg{background:rgba(52,211,153,.12);color:#6EE7B7;border:1px solid rgba(52,211,153,.35);}
.bnd{background:rgba(110,162,168,.1);color:var(--light);border:1px solid rgba(110,162,168,.28);}

/* ── Client cards ── */
.card{background:var(--glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:var(--radius-card);border:1px solid rgba(110,162,168,.15);margin-bottom:2rem;overflow:hidden;box-shadow:var(--glow-sm);transition:box-shadow .2s;}
.card:hover{box-shadow:var(--glow-md);}
.ch{padding:1.5rem 2rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;position:relative;}
.ch::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:rgba(110,162,168,.12);}
.ch.r{border-top:3px solid var(--red);background:linear-gradient(135deg,rgba(248,113,113,.06) 0%,transparent 60%);}
.ch.y{border-top:3px solid var(--yel);background:linear-gradient(135deg,rgba(251,191,36,.06) 0%,transparent 60%);}
.ch.g{border-top:3px solid var(--grn);background:linear-gradient(135deg,rgba(52,211,153,.06) 0%,transparent 60%);}
.ch.n{border-top:3px solid var(--teal);background:linear-gradient(135deg,rgba(77,129,136,.06) 0%,transparent 60%);}
.cn2{font-size:1.15rem;font-weight:700;color:var(--near-w);font-family:'Space Grotesk',system-ui,sans-serif;letter-spacing:-.01em;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;}
.csg{font-size:.74rem;color:var(--light);margin-top:.3rem;opacity:.85;}
.minis{display:flex;gap:.65rem;flex-wrap:wrap;}
.mini{text-align:center;padding:.55rem .85rem;background:rgba(110,162,168,.07);border:1px solid rgba(110,162,168,.15);border-radius:var(--radius-sm);min-width:68px;transition:border-color .15s;}
.mini:hover{border-color:rgba(110,162,168,.35);}
.mini .mv{font-size:1.05rem;font-weight:700;color:var(--near-w);font-family:'Space Grotesk',system-ui,sans-serif;}
.mini .ml{font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;color:var(--light);margin-top:.2rem;opacity:.8;}
.cb{padding:1.5rem 2rem;}

/* ── Section subheaders ── */
.sst{font-size:.7rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem;margin-top:1.5rem;display:flex;align-items:center;gap:.5rem;}
.sst:first-child{margin-top:0;}
.sst::before{content:'';display:block;width:3px;height:13px;background:linear-gradient(180deg,var(--accent),var(--teal));border-radius:2px;flex-shrink:0;}

/* ── Indicator table ── */
.it{width:100%;border-collapse:collapse;font-size:.79rem;margin-bottom:.5rem;border-radius:var(--radius-sm);overflow:hidden;}
.it th{background:rgba(38,57,62,.8);color:var(--accent);font-size:.67rem;text-transform:uppercase;letter-spacing:.07em;padding:.5rem .8rem;text-align:left;border-bottom:1px solid rgba(110,162,168,.15);font-weight:600;}
.it td{padding:.55rem .8rem;border-bottom:1px solid rgba(110,162,168,.07);vertical-align:top;color:var(--near-w);}
.it td:first-child{color:var(--light);font-size:.76rem;width:45%;opacity:.9;}
.it tr:last-child td{border-bottom:none;}
.it tbody tr:nth-child(even) td{background:rgba(110,162,168,.03);}
.tu{color:var(--grn);font-weight:600;} .td{color:var(--red);font-weight:600;} .tf{color:var(--teal);font-weight:600;}

/* ── Risk tags ── */
.rr{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem;}
.rt{padding:.3rem .75rem;border-radius:6px;font-size:.71rem;font-weight:600;}
.rh{background:rgba(248,113,113,.12);color:#FCA5A5;border:1px solid rgba(248,113,113,.3);}
.rm2{background:rgba(251,191,36,.1);color:#FDE68A;border:1px solid rgba(251,191,36,.3);}
.rl2{background:rgba(52,211,153,.1);color:#6EE7B7;border:1px solid rgba(52,211,153,.3);}

/* ── Action plan ── */
.apt{width:100%;border-collapse:collapse;font-size:.79rem;border-radius:var(--radius-sm);overflow:hidden;}
.apt thead tr{background:rgba(38,57,62,.9);}
.apt th{padding:.6rem .9rem;font-size:.67rem;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--accent);border-bottom:1px solid rgba(110,162,168,.15);}
.apt tbody tr{border-bottom:1px solid rgba(110,162,168,.07);transition:background .15s;}
.apt tbody tr:hover{background:rgba(110,162,168,.05);}
.apt td{padding:.6rem .9rem;vertical-align:top;color:var(--near-w);}
.ap1{background:rgba(248,113,113,.15);color:#FCA5A5;padding:.18rem .55rem;border-radius:4px;font-size:.68rem;font-weight:700;}
.ap2{background:rgba(251,191,36,.12);color:#FDE68A;padding:.18rem .55rem;border-radius:4px;font-size:.68rem;font-weight:700;}
.ap3{background:rgba(52,211,153,.1);color:#6EE7B7;padding:.18rem .55rem;border-radius:4px;font-size:.68rem;font-weight:700;}

/* ── Grids ── */
.g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.25rem;}
.g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;}

/* ── N/D boxes ── */
.nd-box{background:rgba(248,113,113,.07);border:1px solid rgba(248,113,113,.2);border-radius:var(--radius-sm);padding:1rem 1.2rem;font-size:.79rem;color:var(--near-w);line-height:1.7;}
.nd-box-gray{background:rgba(110,162,168,.05);border:1px solid rgba(110,162,168,.15);border-radius:var(--radius-sm);padding:1rem 1.2rem;font-size:.79rem;color:var(--light);line-height:1.7;}
.nd-title{font-size:.7rem;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.5rem;}
.nd-title-gray{font-size:.7rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.5rem;}
.ind-list{padding-left:1rem;margin:0;}
.ind-list li{font-size:.74rem;color:var(--light);margin-bottom:.2rem;opacity:.85;}

/* ── Farol criteria ── */
.farol-crit{border-radius:var(--radius-sm);padding:.85rem 1.1rem;font-size:.76rem;line-height:1.75;color:var(--near-w);}
.fc-g{background:rgba(52,211,153,.08);border-left:3px solid var(--grn);}
.fc-y{background:rgba(251,191,36,.08);border-left:3px solid var(--yel);}
.fc-r{background:rgba(248,113,113,.08);border-left:3px solid var(--red);}
.fc-title{font-weight:700;margin-bottom:.3rem;}

/* ── XCMG wrap ── */
.xcmg-wrap{background:rgba(110,162,168,.05);border:1px solid rgba(110,162,168,.18);border-radius:var(--radius-inner);padding:1.2rem 1.4rem;margin-top:.5rem;}
.xcmg-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem;padding-bottom:.85rem;border-bottom:1px solid rgba(110,162,168,.15);}
.xcmg-title{font-size:.92rem;font-weight:700;color:var(--near-w);font-family:'Space Grotesk',system-ui,sans-serif;}

/* ── Director box ── */
.db{background:radial-gradient(ellipse at top left,rgba(110,162,168,.12),transparent 60%),linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid rgba(110,162,168,.2);border-radius:var(--radius-card);padding:2.75rem;color:var(--near-w);box-shadow:var(--glow-md);}
.db h2{color:var(--accent);font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.35rem;font-weight:700;margin-bottom:1.5rem;letter-spacing:-.01em;}
.dg2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:2rem;}
.ds{background:rgba(110,162,168,.05);border:1px solid rgba(110,162,168,.12);border-radius:var(--radius-inner);padding:1.25rem 1.4rem;}
.ds h3{color:var(--accent);font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;margin-bottom:.75rem;font-weight:700;}
.ds p,.ds li{font-size:.82rem;color:var(--light);line-height:1.75;}
.ds ul{padding-left:1.1rem;} .ds li{margin-bottom:.3rem;}

/* ── Footer ── */
footer{background:var(--bg2);border-top:1px solid rgba(110,162,168,.12);padding:2rem;text-align:center;}
footer p{color:var(--teal);font-size:.73rem;}
footer span{color:var(--accent);}

/* ── Roadmap cards ── */
.road-card{background:var(--glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(110,162,168,.15);border-radius:var(--radius-card);overflow:hidden;box-shadow:var(--glow-sm);}
.road-head{padding:1rem 1.4rem;font-weight:700;font-size:.9rem;color:var(--bg);font-family:'Space Grotesk',system-ui,sans-serif;letter-spacing:.02em;}
.road-body{padding:1.25rem 1.4rem;}

@media(max-width:640px){.sec{padding:2rem 1rem;}.cb{padding:1rem 1.25rem;}.ch{padding:1.1rem 1.25rem;}.db{padding:1.5rem;}}
`

// ── XTENTGROUP SVG Symbol ─────────────────────────────────────────────────
const XTENT_LOGO_NAV = `<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" height="26" style="flex-shrink:0;display:block"><g stroke="#6EA2A8" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"><path d="M 100 155 L 205 260 L 310 175 Q 360 140 412 155"/><path d="M 100 365 L 205 260 L 310 340 Q 340 365 370 365 L 412 365"/></g></svg>`

const XTENT_LOGO_HERO = `<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" width="68" height="68" style="display:block;margin:0 auto .9rem"><rect width="512" height="512" rx="96" fill="#101D22"/><rect width="512" height="512" rx="96" fill="rgba(110,162,168,.07)"/><g stroke="#6EA2A8" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"><path d="M 100 155 L 205 260 L 310 175 Q 360 140 412 155"/><path d="M 100 365 L 205 260 L 310 340 Q 340 365 370 365 L 412 365"/></g></svg>`

// ── Helpers ────────────────────────────────────────────────────────────────
function farolBadge(f: string): string {
  if (f === 'vermelho') return '<span class="badge br"><span class="dot dr"></span>Crítico</span>'
  if (f === 'amarelo')  return '<span class="badge by"><span class="dot dy"></span>Atenção</span>'
  return '<span class="badge bgg"><span class="dot dg"></span>Saudável</span>'
}

function chClass(f: string): string {
  return f === 'vermelho' ? 'r' : f === 'amarelo' ? 'y' : 'g'
}

function slaClass(sla: string): string {
  if (sla === 'Em Risco') return 'class="td"'
  if (sla === 'Atenção')  return 'style="color:var(--yel);font-weight:700"'
  return 'class="tu"'
}

function scoreColor(s: number): string {
  return s >= 90 ? 'var(--grn)' : s >= 70 ? 'var(--yel)' : 'var(--red)'
}

function availColor(a: number): string {
  return a >= 99.5 ? 'var(--grn)' : a >= 99 ? 'var(--yel)' : 'var(--red)'
}


// ── Per-client section ─────────────────────────────────────────────────────
function clientSection(cl: any): string {
  const z     = cl.zabbix ?? {}
  const gl    = cl.glpi ?? {}
  const ji    = cl.jira ?? {}
  const dd    = cl.datadog ?? {}
  const bd    = cl.healthScoreBreakdown ?? {}
  const svc   = cl.serviceMetrics ?? {}
  const avail = z.availability ?? 100
  const score = cl.healthScore ?? 0
  const open  = (gl.open ?? 0) + (ji.open ?? 0)

  const farolLabel = cl.farol === 'vermelho' ? '🔴 Cliente Crítico' : cl.farol === 'amarelo' ? '🟡 Cliente em Atenção' : '🟢 Cliente Saudável'

  const sqlProbs: any[] = cl.sqlProblems ?? []
  const sqlStatus = sqlProbs.length > 0
    ? `<span class="td">${sqlProbs.length} alerta(s) Zabbix — ${sqlProbs.slice(0, 2).map((p: any) => p.name ?? '').join('; ')}</span>`
    : '<span class="tu">✅ Sem alertas detectados</span>'

  const cpuProbs  = (z.criticalProblems ?? []).filter((p: any) => /cpu/i.test(p.name ?? ''))
  const memProbs  = (z.criticalProblems ?? []).filter((p: any) => /memor|ram/i.test(p.name ?? ''))
  const storProbs = cl.storageProblems ?? []
  const vpnProbs  = cl.vpnProblems ?? []
  const ok = '<span class="tu">✅ Normal</span>'

  const dispRows: [string, any][] = [
    ['Disponibilidade', typeof avail === 'number' ? `<span style="color:${availColor(avail)};font-weight:700">${avail}%</span>` : '—'],
    ['Hosts Up / Total', z.hostsTotal != null ? `${z.hostsUp ?? '—'} / ${z.hostsTotal}` : '—'],
    ['Hosts Offline',    z.hostsDown > 0 ? `<span class="td">${z.hostsDown} offline</span>` : '<span class="tu">Nenhum</span>'],
    ['Disaster (P1)',    z.disaster > 0 ? `<span class="td">${z.disaster} ativo(s)</span>` : '<span class="tu">Nenhum</span>'],
    ['Alertas High (P2)', z.high > 2 ? `<span class="td">${z.high} alertas</span>` : z.high > 0 ? `<span style="color:var(--yel);font-weight:700">${z.high} alertas</span>` : '<span class="tu">Nenhum</span>'],
    ['Problemas totais', z.totalProblems != null ? `${z.totalProblems} ativos` : '—'],
    ['SLA Disponibilidade', svc.sla ?? 'N/D'],
  ]

  const infraRows: [string, any][] = [
    ['CPU', cpuProbs.length ? `<span class="td">${cpuProbs.length} alerta(s)</span>` : ok],
    ['Memória', memProbs.length ? `<span style="color:var(--yel);font-weight:700">${memProbs.length} alerta(s)</span>` : ok],
    ['Storage', storProbs.length ? `<span class="td">${storProbs.length} alerta(s)</span>` : ok],
    ['VPN / Links', vpnProbs.length ? `<span class="td">${vpnProbs.length} alerta(s)</span>` : ok],
    ['Datadog Monitors', dd.configured ? `${dd.summary?.ok ?? '—'} OK · ${dd.summary?.warn ?? '—'} Warn · ${dd.summary?.alert ?? '—'} Alert` : 'Não configurado'],
  ]

  const mtta    = svc.mtta ?? 'N/D'
  const slaText = svc.sla ?? 'N/D'
  const sdRows: [string, any][] = [
    ['Tickets GLPI abertos', gl.open ?? '—'],
    ['Tickets Jira abertos', ji.open ?? '—'],
    ['Críticos (GLPI)',      gl.critical > 0 ? `<span class="td">${gl.critical}</span>` : '<span class="tu">0</span>'],
    ['Críticos (Jira)',      ji.critical > 0 ? `<span class="td">${ji.critical}</span>` : '<span class="tu">0</span>'],
    ['Vencidos (Jira)',      ji.overdue > 0 ? `<span style="color:var(--yel);font-weight:700">${ji.overdue}</span>` : '<span class="tu">0</span>'],
    ['Sem 1º atendimento',  gl.unattended > 5 ? `<span class="td">${gl.unattended}</span>` : gl.unattended > 0 ? `<span style="color:var(--yel);font-weight:700">${gl.unattended}</span>` : '<span class="tu">0</span>'],
    ['Resolvidos (período)', (gl.resolved ?? 0) + (ji.done ?? 0)],
    ['MTTA', mtta],
    ['MTTR', svc.mttr ?? 'N/D'],
    ['SLA Chamados', `<span ${slaClass(slaText)}>${slaText}</span>`],
  ]

  const risks = (cl.risks ?? []).slice(0, 5)
  const riskRows = risks.map((r: any) => {
    const cls = r.severity === 'critical' ? 'rh' : r.severity === 'high' ? 'rm2' : 'rl2'
    const lbl = r.severity === 'critical' ? 'CRÍTICO' : r.severity === 'high' ? 'ALTO' : 'MÉDIO'
    return `<span class="rt ${cls}">${lbl} — ${r.title}</span>`
  }).join('')

  const plan = (cl.actionPlan ?? []).slice(0, 6)
  const planRows = plan.map((a: any) => {
    const st = a.status === 'Urgente' ? 'ap1' : a.status === 'Pendente' ? 'ap2' : 'ap3'
    return `<tr><td>${a.action}</td><td style="white-space:nowrap;color:var(--light)">${a.owner ?? '—'}</td><td style="white-space:nowrap;color:var(--light)">${a.deadline ?? '—'}</td><td><span class="${st}">${a.status ?? '—'}</span></td></tr>`
  }).join('')

  const itRows = (rows: [string, any][]) => rows.map(([k, v]) =>
    `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`).join('')

  const anchor = cl.slug ?? cl.name?.toLowerCase().replace(/\s/g, '-') ?? 'cl'

  return `
<!-- ═══ ${cl.name.toUpperCase()} ═══ -->
<div id="${anchor}" class="${cl.farol === 'vermelho' ? 'bg' : cl.farol === 'amarelo' ? 'bw' : 'bg'}">
<div class="sec">
  <div class="ey">${farolLabel}</div>
  <div class="st">${cl.name}</div>
  <div class="card">
    <div class="ch ${chClass(cl.farol)}">
      <div>
        <div class="cn2">${farolBadge(cl.farol)} ${cl.name}</div>
        <div class="csg">${cl.farolReason ?? '—'}</div>
      </div>
      <div class="minis">
        <div class="mini"><div class="mv" style="color:${scoreColor(score)}">${score}</div><div class="ml">Score</div></div>
        <div class="mini"><div class="mv" style="color:${availColor(avail)}">${avail}%</div><div class="ml">Disponib.</div></div>
        <div class="mini"><div class="mv" ${open > 10 ? 'style="color:var(--yel)"' : ''}>${open}</div><div class="ml">Tickets</div></div>
        <div class="mini"><div class="mv" ${ji.overdue > 0 ? 'style="color:var(--red)"' : ''}>${ji.overdue ?? 0}</div><div class="ml">Vencidos</div></div>
      </div>
    </div>
    <div class="cb">

      <div class="sst">Resumo Executivo</div>
      <p style="font-size:.82rem;color:var(--light);margin-bottom:1rem;line-height:1.75">${cl.executiveSummary ?? cl.recommendation ?? '—'}</p>

      <div class="sst">Disponibilidade &amp; SLA</div>
      <table class="it"><tbody>${itRows(dispRows)}</tbody></table>

      <div class="sst">Saúde Operacional — Score ${score}/100</div>
      <div style="background:rgba(110,162,168,.08);border-radius:8px;padding:.75rem 1rem;margin-bottom:.5rem">
        <div style="height:8px;background:rgba(255,255,255,.1);border-radius:4px;overflow:hidden;margin-bottom:.5rem">
          <div style="width:${score}%;height:100%;background:${scoreColor(score)};border-radius:4px;transition:width .3s"></div>
        </div>
        <div style="font-size:.75rem;color:var(--light)">
          SLA ${bd.sla ?? '—'}/25 &nbsp;·&nbsp; Disponib. ${bd.disponibilidade ?? '—'}/20 &nbsp;·&nbsp; Chamados ${bd.chamados ?? '—'}/20 &nbsp;·&nbsp; Observab. ${bd.observabilidade ?? '—'}/15 &nbsp;·&nbsp; Infra ${bd.infraestrutura ?? '—'}/20
        </div>
      </div>

      <div class="sst">Bancos de Dados</div>
      <table class="it" style="margin-bottom:.75rem">
        <thead><tr><th>Sistema</th><th>Status</th><th>Fonte</th></tr></thead>
        <tbody>
          <tr><td><strong>SQL Server</strong></td><td>${sqlStatus}</td><td style="color:var(--teal);font-size:.72rem">Zabbix (parcial)</td></tr>
          <tr><td><strong>YugabyteDB</strong></td><td class="tf">⚪ N/D</td><td style="color:var(--teal);font-size:.72rem">Integração pendente</td></tr>
          <tr><td><strong>RabbitMQ</strong></td><td class="tf">⚪ N/D</td><td style="color:var(--teal);font-size:.72rem">Integração pendente</td></tr>
        </tbody>
      </table>

      <div class="sst" style="margin-top:1.2rem">Infraestrutura</div>
      <table class="it"><tbody>${itRows(infraRows)}</tbody></table>

      <div class="sst">Kubernetes / RKE</div>
      <div class="nd-box-gray"><span class="nd-title-gray">N/D — </span>Integração K8s/RKE não configurada. Nodes, control plane, pods e CrashLoopBackOff indisponíveis.</div>

      <div class="sst">Backup &amp; Continuidade</div>
      <div class="g2" style="margin-top:.25rem">
        <div class="nd-box-gray"><div class="nd-title-gray">Backup (Veeam)</div>Jobs, sucesso/falha e retenção indisponíveis — integração pendente.</div>
        <div class="nd-box-gray"><div class="nd-title-gray">Disaster Recovery</div>RPO, RTO e status de replicação indisponíveis — integração pendente.</div>
      </div>

      <div class="sst">Service Desk — GLPI + Jira</div>
      <table class="it"><tbody>${itRows(sdRows)}</tbody></table>

      <div class="sst">Principais Riscos</div>
      <div class="rr">${riskRows || '<span class="rt rl2">BAIXO — Nenhum risco crítico identificado</span>'}</div>

      <div class="sst">Plano de Ação</div>
      <table class="apt">
        <thead><tr><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
        <tbody>${planRows}</tbody>
      </table>

      <div class="sst">Recomendação Executiva</div>
      <div style="background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);border-radius:8px;padding:.9rem 1.1rem;font-size:.81rem;color:var(--near-w);line-height:1.7">${cl.recommendation ?? '—'}</div>

    </div>
  </div>
</div>
</div>
<div class="div"></div>`
}


// ── Master HTML ────────────────────────────────────────────────────────────
function buildHTML360(portfolioData: any, hsData: any): string {
  const p = portfolioData.portfolio ?? {}

  const clients = (portfolioData.clients ?? []).map((cl: any) => {
    const farol = computeFarol360(cl)
    return { ...cl, farol, farolReason: farolReason360(cl, farol) }
  }).sort((a: any, b: any) => {
    const o: Record<string, number> = { vermelho: 0, amarelo: 1, verde: 2 }
    return o[a.farol] - o[b.farol]
  })

  p.healthy   = clients.filter((c: any) => c.farol === 'verde').length
  p.attention = clients.filter((c: any) => c.farol === 'amarelo').length
  p.critical  = clients.filter((c: any) => c.farol === 'vermelho').length

  const overallFarol = p.critical > 0 ? 'vermelho' : p.attention > 0 ? 'amarelo' : 'verde'
  const overallEmoji = overallFarol === 'vermelho' ? '🔴' : overallFarol === 'amarelo' ? '🟡' : '🟢'
  const overallLabel = overallFarol === 'vermelho' ? 'Crítico' : overallFarol === 'amarelo' ? 'Atenção' : 'Saudável'

  const gen = new Date(portfolioData.generatedAt).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
  const time = new Date(portfolioData.generatedAt).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
  })

  const totalOpen     = clients.reduce((s: number, c: any) => s + (c.glpi?.open ?? 0) + (c.jira?.open ?? 0), 0)
  const totalResolved = clients.reduce((s: number, c: any) => s + (c.glpi?.resolved ?? 0) + (c.jira?.done ?? 0), 0)
  const totalHosts    = clients.reduce((s: number, c: any) => s + (c.zabbix?.hostsTotal ?? 0), 0)
  const hostsUp       = clients.reduce((s: number, c: any) => s + (c.zabbix?.hostsUp ?? 0), 0)
  const hostsPct      = totalHosts > 0 ? Math.round((hostsUp / totalHosts) * 100) : 100

  const navLinks = clients.map((cl: any) => {
    const anchor = cl.slug ?? cl.name.toLowerCase().replace(/\s/g, '-')
    const em = cl.farol === 'vermelho' ? '🔴' : cl.farol === 'amarelo' ? '🟡' : '🟢'
    return `<a href="#${anchor}">${em} ${cl.name}</a>`
  }).join('')

  const farolTableRows = clients.map((cl: any) => {
    const avail = cl.zabbix?.availability
    const sla   = cl.serviceMetrics?.sla ?? 'N/D'
    const slaCl = sla === 'Em Risco' ? 'style="color:var(--red);font-weight:700"' : sla === 'Atenção' ? 'style="color:var(--yel);font-weight:700"' : 'style="color:var(--grn);font-weight:700"'
    const ac    = cl.slug ?? cl.name.toLowerCase().replace(/\s/g, '-')
    return `<tr>
      <td><div class="cn"><a href="#${ac}" style="color:var(--near-w);text-decoration:none">${cl.name}</a></div><div class="cs">${cl.farolReason}</div></td>
      <td>${farolBadge(cl.farol)}</td>
      <td ${slaCl}>${sla}</td>
      <td ${avail != null ? `style="color:${availColor(avail)};font-weight:700"` : ''}>${avail != null ? avail + '%' : '—'}</td>
      <td style="color:var(--teal)">N/D</td>
      <td style="color:var(--teal)">N/D</td>
      <td style="color:var(--teal)">⚪ N/D</td>
      <td style="color:var(--teal)">N/D</td>
      <td>${cl.zabbix?.totalProblems ?? '—'} ativos</td>
      <td>${(cl.glpi?.open ?? 0) + (cl.jira?.open ?? 0)} abertos</td>
    </tr>`
  }).join('')

  const ov  = hsData?.overview ?? {}
  const pipeline = ov.openPipeline ? 'R$ ' + ov.openPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : 'N/D'
  const winRate  = ov.winRate != null ? ov.winRate + '%' : '—'

  const roadmap = portfolioData.roadmap ?? {}
  const mkRoadItem = (bg: string, num: string, cat: string, text: string) =>
    `<div style="display:flex;gap:.65rem;margin-bottom:.8rem;align-items:flex-start">
      <div style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:700;flex-shrink:0;margin-top:2px;background:${bg};color:#0A1316">${num}</div>
      <div><div style="font-size:.7rem;color:var(--accent);font-weight:700;margin-bottom:.12rem">${cat}</div><div style="font-size:.79rem;color:var(--near-w)">${text}</div></div>
    </div>`

  const road30 = (roadmap.thirtyDays ?? []).slice(0, 5).map((t: string, i: number) => mkRoadItem('#6EA2A8', String(i + 1), '30 dias', t)).join('')
  const road60 = (roadmap.sixtyDays ?? []).slice(0, 5).map((t: string, i: number) => mkRoadItem('#8FBFC2', String(i + 1), '60 dias', t)).join('')
  const road90 = (roadmap.ninetyDays ?? []).slice(0, 5).map((t: string, i: number) => mkRoadItem('#B9DBDC', String(i + 1), '90 dias', t)).join('')

  const dash = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Farol Executivo 360° — XTENTGROUP</title>
<style>${CSS}</style></head>
<body>

<nav>
  <div class="nb">
    ${XTENT_LOGO_NAV}
    XTENTGROUP
  </div>
  <div class="nb-sep"></div>
  <a href="#capa">Capa</a>
  <a href="#resumo">Resumo</a>
  <a href="#farol">Farol</a>
  ${navLinks}
  <a href="#consol">Consolidado</a>
  <a href="#diretor">Diretoria</a>
</nav>

<!-- CAPA -->
<div id="capa" class="hero">
  ${XTENT_LOGO_HERO}
  <div class="hl">XTENTGROUP · Farol Executivo 360° · Gerado Automaticamente</div>
  <h1 class="sg">Status da Carteira de Clientes</h1>
  <div class="hs">Período: ${gen} · ${time} · Fontes: Zabbix · GLPI · Jira · Datadog · HubSpot</div>
  <div class="kpi-row">
    <div class="kpi"><div class="v">${clients.length}</div><div class="l">Clientes</div></div>
    <div class="kpi"><div class="v">${totalHosts}</div><div class="l">Hosts</div></div>
    <div class="kpi"><div class="v" style="color:${hostsPct >= 99 ? 'var(--grn)' : 'var(--yel)'}">${hostsPct}%</div><div class="l">Disponib.</div></div>
    <div class="kpi"><div class="v">${totalOpen}</div><div class="l">Tickets Abertos</div></div>
    <div class="kpi"><div class="v">${totalResolved}</div><div class="l">Resolvidos</div></div>
    <div class="kpi"><div class="v" style="color:${p.portfolioScore >= 80 ? 'var(--grn)' : 'var(--yel)'}">${p.portfolioScore}</div><div class="l">Score Carteira</div></div>
    <div class="kpi"><div class="v">${pipeline}</div><div class="l">Pipeline CRM</div></div>
    <div class="kpi"><div class="v">${winRate}</div><div class="l">Win Rate</div></div>
  </div>
  <div class="fps">
    <div class="fp"><span class="dot dr"></span>${p.critical} Crítico(s)</div>
    <div class="fp"><span class="dot dy"></span>${p.attention} Atenção</div>
    <div class="fp"><span class="dot dg"></span>${p.healthy} Saudável(is)</div>
    <div class="fp">${overallEmoji} Portfólio ${overallLabel}</div>
  </div>
</div>

<!-- RESUMO -->
<div id="resumo" class="bw"><div class="sec">
  <div class="ey">Resumo Executivo</div>
  <div class="st">Situação Geral da Carteira</div>
  <div style="background:rgba(110,162,168,.08);border-left:4px solid var(--accent);border-radius:8px;padding:1.25rem 1.5rem;font-size:.85rem;line-height:2;color:var(--near-w)">
    ${p.executiveSummary ?? '—'}
  </div>
</div></div>
<div class="div"></div>

<!-- FAROL -->
<div id="farol" class="bg"><div class="sec">
  <div class="ey">Farol Executivo</div>
  <div class="st">Visão Consolidada — Ordenado por Criticidade</div>
  <div class="sd">🔴 Críticos primeiro · 🟡 Atenção · 🟢 Saudáveis · ⚪ Integração pendente</div>
  <div class="tbl-wrap">
  <table class="ft">
    <thead><tr>
      <th>Cliente</th><th>Status</th><th>SLA</th><th>Disponib.</th>
      <th>Backup</th><th>DR</th><th>Banco XCMG</th><th>Kubernetes</th>
      <th>Zabbix</th><th>Suporte</th>
    </tr></thead>
    <tbody>${farolTableRows}</tbody>
  </table>
  </div>
</div></div>
<div class="div"></div>

${clients.map((cl: any) => clientSection(cl)).join('')}

<!-- CONSOLIDADO -->
<div id="consol" class="bw"><div class="sec">
  <div class="ey">Visão Consolidada</div>
  <div class="st">Roadmap &amp; Comercial</div>
  <div class="g2" style="margin-bottom:2rem">
    <div class="road-card">
      <div class="road-head" style="background:var(--accent)">→ 30 dias</div>
      <div class="road-body">${road30 || '<p style="color:var(--teal);font-size:.8rem">Sem itens</p>'}</div>
    </div>
    <div class="road-card">
      <div class="road-head" style="background:var(--teal-d);color:var(--near-w)">→ 60 dias</div>
      <div class="road-body">${road60 || '<p style="color:var(--teal);font-size:.8rem">Sem itens</p>'}</div>
    </div>
    <div class="road-card">
      <div class="road-head" style="background:var(--bg4);color:var(--light)">→ 90 dias</div>
      <div class="road-body">${road90 || '<p style="color:var(--teal);font-size:.8rem">Sem itens</p>'}</div>
    </div>
  </div>
</div></div>
<div class="div"></div>

<!-- DIRETOR -->
<div id="diretor" class="bg"><div class="sec">
<div class="db">
  <h2>Análise para Diretoria</h2>
  <div class="dg2">
    <div class="ds">
      <h3>Score da Carteira</h3>
      <p>Score médio: <strong style="color:var(--accent)">${p.portfolioScore}/100</strong> — ${p.portfolioScore >= 80 ? 'Carteira saudável com oportunidades de evolução' : 'Atenção requerida em clientes críticos antes de avançar novas frentes'}.</p>
      <div style="margin-top:.75rem">
        <div style="background:rgba(255,255,255,.1);border-radius:4px;height:8px;overflow:hidden">
          <div style="width:${p.portfolioScore}%;height:100%;background:var(--accent);border-radius:4px"></div>
        </div>
        <div style="font-size:.72rem;color:var(--light);margin-top:.4rem">${p.portfolioScore}/100</div>
      </div>
    </div>
    <div class="ds">
      <h3>Principais Riscos</h3>
      <ul>${clients.filter((c: any) => c.farol !== 'verde').slice(0, 3).map((c: any) =>
        `<li>${c.name}: ${c.farolReason}</li>`).join('')}
        <li>Backup Veeam — nenhum cliente integrado (risco regulatório)</li>
        <li>Banco XCMG — integração pendente em todos os clientes</li>
      </ul>
    </div>
    <div class="ds">
      <h3>Oportunidades</h3>
      <ul>
        <li>Backup Gerenciado Veeam (BaaS) — todos os clientes</li>
        <li>NOC 24x7 — clientes com score &lt;80</li>
        <li>Integração XCMG — módulo de banco para todos</li>
        <li>Kubernetes/RKE Gerenciado — observabilidade full-stack</li>
        <li>Pipeline HubSpot: ${pipeline} em aberto · Win rate ${winRate}</li>
      </ul>
    </div>
  </div>
</div>
</div></div>

<footer>
  <p>Farol Executivo 360° · <span>XTENTGROUP</span> · <a href="${dash}" style="color:var(--accent);text-decoration:none">Abrir Dashboard →</a></p>
</footer>

</body></html>`
}

// ── Retry wrapper ──────────────────────────────────────────────────────────
async function sendWithRetry(
  payload: Parameters<typeof sendEmail>[0],
  maxAttempts = 3,
  delayMs = 5_000,
): Promise<{ ok: boolean; method?: string; error?: string; attempts: number }> {
  let lastError = 'desconhecido'
  for (let i = 1; i <= maxAttempts; i++) {
    const r = await sendEmail(payload)
    if (r.ok) return { ok: true, method: r.method, attempts: i }
    lastError = r.error ?? lastError
    console.warn(`[farol] tentativa ${i}/${maxAttempts} falhou: ${lastError}`)
    if (i < maxAttempts) await new Promise(res => setTimeout(res, delayMs))
  }
  return { ok: false, error: lastError, attempts: maxAttempts }
}

// ── Handler ────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const url     = new URL(req.url)
  const preview = url.searchParams.get('preview') === 'true'

  // ── 1. Coletar dados — registrar status de cada integração ────────────────
  const integrations: Record<string, string> = {}

  const [portfolioRes, hsRes] = await Promise.allSettled([
    fetch(`${BASE()}/api/reports/executive-portfolio`, { cache: 'no-store' }),
    fetch(`${BASE()}/api/hubspot/dashboard`, { cache: 'no-store' }),
  ])

  integrations.portfolio = portfolioRes.status === 'fulfilled' && portfolioRes.value.ok ? 'ok' : 'error'
  integrations.hubspot   = hsRes.status === 'fulfilled' && (hsRes.value as Response).ok   ? 'ok' : 'indisponível'

  // Portfólio é fonte primária — bloqueia envio se falhar
  if (integrations.portfolio === 'error') {
    const errMsg = portfolioRes.status === 'rejected'
      ? (portfolioRes.reason?.message ?? 'network error')
      : `HTTP ${portfolioRes.value.status}`
    console.error('[farol] portfólio indisponível:', errMsg)

    const notifTo = (process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? '')
      .split(',').map((e: string) => e.trim()).filter(Boolean)
    if (notifTo.length) {
      const dateStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
      await sendEmail({
        to: notifTo,
        subject: `🔴 FALHA — Relatório Executivo não enviado — ${dateStr}`,
        html: `<p style="font-family:sans-serif">Fonte primária (portfólio) indisponível: <strong>${errMsg}</strong>.<br>O relatório automático do dia <strong>${dateStr}</strong> não foi gerado.</p>`,
      }).catch(() => {})
    }
    return NextResponse.json({ error: 'Portfólio indisponível', detail: errMsg, integrations }, { status: 500 })
  }

  const portfolioData = await (portfolioRes as PromiseFulfilledResult<Response>).value.json()
  const hsData = integrations.hubspot === 'ok'
    ? await (hsRes as PromiseFulfilledResult<Response>).value.json().catch(() => null)
    : null

  // Registrar integrações secundárias que vieram via portfólio (Zabbix, GLPI, Jira)
  const firstClient = portfolioData.clients?.[0] ?? {}
  integrations.zabbix = firstClient.zabbix != null ? 'ok' : 'indisponível'
  integrations.glpi   = firstClient.glpi   != null ? 'ok' : 'indisponível'
  integrations.jira   = firstClient.jira   != null ? 'ok' : 'indisponível'
  console.log('[farol] integrações:', integrations)

  const html = buildHTML360(portfolioData, hsData)

  if (preview) {
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // ── 2. Destinatários ──────────────────────────────────────────────────────
  const boardEmails = (process.env.BOARD_EMAIL_TO ?? '')
    .split(',').map((e: string) => e.trim()).filter(Boolean)
  const notifEmails = (process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? '')
    .split(',').map((e: string) => e.trim()).filter(Boolean)

  // Union sem duplicatas — board recebe, CSM recebe sempre
  const to = [...new Set([...boardEmails, ...notifEmails])]

  if (to.length === 0) {
    return NextResponse.json({ error: 'Nenhum destinatário configurado (BOARD_EMAIL_TO / NOTIFICATION_EMAIL_TO)' }, { status: 500 })
  }

  // ── 3. Assunto executivo formal ───────────────────────────────────────────
  const p        = portfolioData.portfolio ?? {}
  const clients  = (portfolioData.clients ?? []).map((cl: any) => ({ ...cl, farol: computeFarol360(cl) }))
  const dateStr  = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
  const subject  = `Relatório Executivo Diário | Saúde Operacional | ${dateStr}`

  // ── 4. Envio com retry (3 × 5 s) ─────────────────────────────────────────
  const result = await sendWithRetry({ to, subject, html }, 3, 5_000)

  // ── 5. Notificação de falha persistente ───────────────────────────────────
  if (!result.ok) {
    console.error('[farol] todas as tentativas falharam:', result.error)
    if (notifEmails.length) {
      await sendEmail({
        to: notifEmails,
        subject: `🔴 FALHA PERSISTENTE — Relatório não enviado — ${dateStr}`,
        html: `<p style="font-family:sans-serif">O Relatório Executivo Diário não pôde ser enviado após <strong>${result.attempts} tentativas</strong>.<br>Erro: <code>${result.error}</code><br>Data: ${dateStr}</p>`,
      }).catch(() => {})
    }
    return NextResponse.json({ error: result.error, attempts: result.attempts, integrations }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    method:          result.method,
    attempts:        result.attempts,
    sentTo:          to,
    subject,
    integrations,
    portfolioScore:  p.portfolioScore,
    farol:           { verde: p.healthy, amarelo: p.attention, vermelho: p.critical },
    clients:         clients.map((c: any) => ({ name: c.name, farol: c.farol, score: c.healthScore })),
    generatedAt:     portfolioData.generatedAt,
  })
}
