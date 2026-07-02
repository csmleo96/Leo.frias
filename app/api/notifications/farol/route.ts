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
}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--near-w);font-family:'Inter','Space Grotesk',system-ui,sans-serif;line-height:1.6;font-size:14px;}
.sg{font-family:'Space Grotesk','Inter',system-ui,sans-serif;}

nav{position:sticky;top:0;z-index:100;background:var(--bg2);border-bottom:2px solid var(--accent);padding:0 1.5rem;display:flex;align-items:center;gap:1rem;height:52px;overflow-x:auto;white-space:nowrap;}
.nb{display:flex;align-items:center;gap:.6rem;color:var(--accent);font-weight:700;font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;margin-right:.5rem;flex-shrink:0;font-family:'Space Grotesk',system-ui,sans-serif;}
nav a{color:var(--light);text-decoration:none;font-size:.73rem;font-weight:500;flex-shrink:0;transition:color .15s;}
nav a:hover{color:var(--accent);}

.hero{background:linear-gradient(135deg,var(--bg) 0%,var(--bg2) 55%,var(--bg3) 100%);padding:3.5rem 2rem 3rem;text-align:center;position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 50% -10%,rgba(110,162,168,.18) 0%,transparent 65%);pointer-events:none;}
.hl{color:var(--accent);font-size:.67rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:.6rem;}
.hero h1{color:var(--near-w);font-family:'Space Grotesk',system-ui,sans-serif;font-size:clamp(1.4rem,4vw,2.2rem);font-weight:700;line-height:1.2;margin-bottom:.4rem;}
.hs{color:var(--light);font-size:.85rem;margin-bottom:2rem;}
.kpi-row{display:flex;flex-wrap:wrap;justify-content:center;gap:1rem;}
.kpi{background:rgba(110,162,168,.08);border:1px solid rgba(110,162,168,.22);border-radius:10px;padding:.9rem 1.2rem;min-width:110px;text-align:center;}
.kpi .v{color:var(--accent);font-size:1.8rem;font-weight:700;line-height:1;font-family:'Space Grotesk',system-ui,sans-serif;}
.kpi .l{color:var(--light);font-size:.65rem;text-transform:uppercase;letter-spacing:.06em;margin-top:.3rem;}
.fps{display:flex;flex-wrap:wrap;justify-content:center;gap:.75rem;margin-top:1.5rem;}
.fp{background:rgba(110,162,168,.08);border:1px solid rgba(110,162,168,.18);border-radius:100px;padding:.35rem .9rem;font-size:.78rem;color:var(--near-w);display:flex;align-items:center;gap:.4rem;}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block;}
.dr{background:#F87171;box-shadow:0 0 6px rgba(248,113,113,.6);}
.dy{background:#FBBF24;box-shadow:0 0 6px rgba(251,191,36,.6);}
.dg{background:#34D399;box-shadow:0 0 6px rgba(52,211,153,.6);}

.sec{max-width:1100px;margin:0 auto;padding:2.5rem 1.5rem;}
.ey{color:var(--accent);font-size:.67rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin-bottom:.35rem;}
.st{color:var(--near-w);font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.4rem;font-weight:700;margin-bottom:.4rem;}
.sd{color:var(--light);font-size:.84rem;margin-bottom:1.5rem;}
.bw{background:var(--bg2);}
.bg{background:var(--bg);}
.div{height:1px;background:linear-gradient(90deg,var(--accent),transparent);opacity:.35;max-width:1100px;margin:0 auto;}

.ft{width:100%;border-collapse:collapse;font-size:.8rem;}
.ft thead tr{background:var(--bg3);color:var(--near-w);}
.ft th{padding:.65rem .9rem;font-size:.69rem;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;border-bottom:2px solid var(--accent);}
.ft tbody tr{border-bottom:1px solid var(--bg3);background:var(--bg2);}
.ft tbody tr:hover{background:var(--bg3);}
.ft td{padding:.65rem .9rem;vertical-align:middle;}
.cn{font-weight:700;color:var(--near-w);} .cs{font-size:.7rem;color:var(--light);}

.badge{display:inline-flex;align-items:center;gap:.3rem;padding:.22rem .65rem;border-radius:100px;font-size:.72rem;font-weight:700;}
.br{background:var(--rl);color:var(--red);border:1px solid var(--rm);}
.by{background:var(--yl);color:var(--yel);border:1px solid var(--ym);}
.bgg{background:var(--gl);color:var(--grn);border:1px solid var(--gm);}
.bnd{background:rgba(110,162,168,.1);color:var(--light);border:1px solid rgba(110,162,168,.3);}

.card{background:var(--bg2);border-radius:14px;border:1px solid var(--bg3);margin-bottom:2rem;overflow:hidden;}
.ch{padding:1.25rem 1.75rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
.ch.r{border-left:6px solid var(--red);background:rgba(248,113,113,.05);}
.ch.y{border-left:6px solid var(--yel);background:rgba(251,191,36,.05);}
.ch.g{border-left:6px solid var(--grn);background:rgba(52,211,153,.05);}
.ch.n{border-left:6px solid var(--teal);background:rgba(77,129,136,.05);}
.cn2{font-size:1.1rem;font-weight:700;color:var(--near-w);font-family:'Space Grotesk',system-ui,sans-serif;}
.csg{font-size:.75rem;color:var(--light);margin-top:.2rem;}
.minis{display:flex;gap:.75rem;flex-wrap:wrap;}
.mini{text-align:center;padding:.45rem .7rem;background:rgba(110,162,168,.07);border:1px solid rgba(110,162,168,.15);border-radius:7px;min-width:65px;}
.mini .mv{font-size:1rem;font-weight:700;color:var(--near-w);font-family:'Space Grotesk',system-ui,sans-serif;}
.mini .ml{font-size:.62rem;text-transform:uppercase;letter-spacing:.05em;color:var(--light);}
.cb{padding:1.25rem 1.75rem;}

.sst{font-size:.76rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.6rem;margin-top:1.2rem;display:flex;align-items:center;gap:.4rem;}
.sst:first-child{margin-top:0;}
.sst::before{content:'';display:block;width:3px;height:12px;background:var(--accent);border-radius:2px;}

.it{width:100%;border-collapse:collapse;font-size:.78rem;margin-bottom:.5rem;}
.it th{background:var(--bg3);color:var(--light);font-size:.69rem;text-transform:uppercase;letter-spacing:.05em;padding:.45rem .7rem;text-align:left;border-bottom:2px solid var(--bg4);}
.it td{padding:.55rem .7rem;border-bottom:1px solid var(--bg3);vertical-align:top;color:var(--near-w);}
.it td:first-child{color:var(--light);}
.it tr:last-child td{border-bottom:none;}
.tu{color:var(--grn);font-weight:700;} .td{color:var(--red);font-weight:700;} .tf{color:var(--teal);font-weight:700;}

.rr{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem;}
.rt{padding:.25rem .7rem;border-radius:5px;font-size:.72rem;font-weight:600;}
.rh{background:var(--rl);color:var(--red);border:1px solid var(--rm);}
.rm2{background:var(--yl);color:var(--yel);border:1px solid var(--ym);}
.rl2{background:var(--gl);color:var(--grn);border:1px solid var(--gm);}

.apt{width:100%;border-collapse:collapse;font-size:.78rem;}
.apt thead tr{background:var(--bg3);color:var(--near-w);}
.apt th{padding:.55rem .8rem;font-size:.69rem;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid var(--bg4);}
.apt tbody tr{border-bottom:1px solid var(--bg3);background:var(--bg2);}
.apt td{padding:.55rem .8rem;vertical-align:top;color:var(--near-w);}
.ap1{background:var(--rl);color:var(--red);padding:.15rem .5rem;border-radius:4px;font-size:.69rem;font-weight:700;}
.ap2{background:var(--yl);color:var(--yel);padding:.15rem .5rem;border-radius:4px;font-size:.69rem;font-weight:700;}
.ap3{background:var(--gl);color:var(--grn);padding:.15rem .5rem;border-radius:4px;font-size:.69rem;font-weight:700;}

.g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.25rem;}
.g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;}

.nd-box{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.25);border-radius:8px;padding:.9rem 1.1rem;font-size:.78rem;color:var(--near-w);line-height:1.7;}
.nd-box-gray{background:rgba(110,162,168,.06);border:1px solid rgba(110,162,168,.2);border-radius:8px;padding:.9rem 1.1rem;font-size:.78rem;color:var(--light);line-height:1.7;}
.nd-title{font-size:.72rem;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;}
.nd-title-gray{font-size:.72rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;}
.ind-list{padding-left:1rem;margin:0;}
.ind-list li{font-size:.75rem;color:var(--light);margin-bottom:.15rem;}

.farol-crit{border-radius:8px;padding:.75rem 1rem;font-size:.75rem;line-height:1.7;color:var(--near-w);}
.fc-g{background:var(--gl);border-left:4px solid var(--grn);}
.fc-y{background:var(--yl);border-left:4px solid var(--yel);}
.fc-r{background:var(--rl);border-left:4px solid var(--red);}
.fc-title{font-weight:700;margin-bottom:.3rem;}

.xcmg-wrap{background:rgba(110,162,168,.06);border:1px solid rgba(110,162,168,.2);border-radius:12px;padding:1.1rem 1.3rem;margin-top:.5rem;}
.xcmg-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.9rem;padding-bottom:.75rem;border-bottom:1px solid rgba(110,162,168,.2);}
.xcmg-title{font-size:.9rem;font-weight:700;color:var(--near-w);font-family:'Space Grotesk',system-ui,sans-serif;}

.db{background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--bg4);border-radius:18px;padding:2.5rem;color:var(--near-w);}
.db h2{color:var(--accent);font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.3rem;margin-bottom:1.25rem;}
.dg2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.75rem;}
.ds h3{color:var(--accent);font-size:.73rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.65rem;}
.ds p,.ds li{font-size:.82rem;color:var(--light);line-height:1.7;}
.ds ul{padding-left:1.1rem;} .ds li{margin-bottom:.25rem;}

footer{background:var(--bg);border-top:1px solid var(--bg3);padding:1.5rem;text-align:center;}
footer p{color:var(--teal);font-size:.72rem;}
footer span{color:var(--accent);}
@media(max-width:640px){.sec{padding:1.75rem 1rem;}.cb{padding:1rem;}.ch{padding:1rem;}.db{padding:1.5rem;}}
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

// ── Banco XCMG — bloco N/D completo ───────────────────────────────────────
function xcmgBlock(): string {
  return `
<div class="xcmg-wrap">
  <div class="xcmg-header">
    <div>
      <div class="xcmg-title">Banco XCMG</div>
      <div style="font-size:.72rem;color:var(--light);margin-top:2px">Gestão de Dados — Saúde Operacional, Desempenho e Continuidade</div>
    </div>
    <span class="badge bnd">⚪ Indeterminado — integração não configurada</span>
  </div>

  <div class="g3" style="margin-bottom:1rem">
    <div>
      <div class="nd-title-gray">Disponibilidade</div>
      <ul class="ind-list">
        <li>Uptime da instância</li><li>Disponibilidade do banco (%)</li>
        <li>Status dos serviços e conexões</li><li>Indisponibilidades na semana</li>
        <li>Cumprimento do SLA de disponibilidade</li>
      </ul>
    </div>
    <div>
      <div class="nd-title-gray">Performance</div>
      <ul class="ind-list">
        <li>Tempo médio de resposta das queries</li><li>Latência de leitura e gravação</li>
        <li>CPU e Memória da instância</li><li>Utilização de disco e IOPS</li>
        <li>Queries lentas identificadas</li><li>Sessões ativas e bloqueadas</li>
        <li>Deadlocks registrados</li><li>Tendência de crescimento de carga</li>
      </ul>
    </div>
    <div>
      <div class="nd-title-gray">Integridade &amp; Saúde</div>
      <ul class="ind-list">
        <li>Status geral da instância</li><li>Consistência dos dados</li>
        <li>Integridade de tabelas e índices</li><li>Alertas críticos registrados</li>
        <li>Erros recorrentes identificados</li><li>Crescimento do banco (diário/semanal)</li>
        <li>Espaço utilizado vs capacidade</li><li>Previsão de esgotamento</li>
      </ul>
    </div>
    <div>
      <div class="nd-title-gray">Backup &amp; Recuperação</div>
      <ul class="ind-list">
        <li>Último backup executado</li><li>Taxa de sucesso dos backups</li>
        <li>Falhas e respectivas causas</li><li>Status das rotinas de restauração</li>
        <li>Validação das cópias de segurança</li><li>Consumo de retenção</li>
        <li>DR — RPO e RTO</li>
      </ul>
    </div>
    <div>
      <div class="nd-title-gray">Alta Disponibilidade</div>
      <ul class="ind-list">
        <li>Status da replicação</li><li>Integridade do cluster</li>
        <li>Failovers automáticos/manuais</li><li>Tempo de sincronização entre nós</li>
        <li>Estado geral da solução de HA</li>
      </ul>
    </div>
    <div>
      <div class="nd-title-gray">Correlação Operacional</div>
      <ul class="ind-list">
        <li>Zabbix: alertas de disponibilidade</li><li>Grafana: tendências de performance</li>
        <li>Jira: incidentes, MTTA e MTTR</li><li>GLPI: chamados vinculados ao banco</li>
        <li>HubSpot: Health Score e riscos</li>
      </ul>
    </div>
  </div>

  <div style="margin-bottom:.9rem">
    <div class="nd-title-gray" style="margin-bottom:.6rem">Critérios de Farol — Banco XCMG</div>
    <div class="g3">
      <div class="farol-crit fc-g">
        <div class="fc-title" style="color:var(--grn)">🟢 Verde — Saudável</div>
        Disponib. ≥ 99,5% · Sem P1 ou P2 · Performance nos parâmetros · Backup validado · Replicação íntegra · Storage &lt; 80%
      </div>
      <div class="farol-crit fc-y">
        <div class="fc-title" style="color:var(--yel)">🟡 Amarelo — Atenção</div>
        P2 resolvido no SLA · Storage &gt; 80% · Latência acima da média · Crescimento acelerado · Alertas sem impacto direto
      </div>
      <div class="farol-crit fc-r">
        <div class="fc-title" style="color:var(--red)">🔴 Vermelho — Crítico</div>
        Quebra de SLA · Indisponibilidade · Falha de backup · Replicação comprometida · Gargalos severos · Storage &gt; 90%
      </div>
    </div>
  </div>

  <div class="nd-box-gray">
    <div class="nd-title-gray">Resumo Executivo XCMG</div>
    Integração com o Banco XCMG não configurada. Todos os indicadores estão indisponíveis. Para ativar: configurar acesso à API ou agente de monitoramento e mapear métricas nas fontes Zabbix/Grafana.
  </div>
</div>`
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
      ${xcmgBlock()}

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

// ── Banco XCMG — card de cliente N/D ──────────────────────────────────────
function xcmgClientSection(): string {
  const cats = [
    ['Zabbix / Observabilidade', ['Hosts monitorados','Disponibilidade (%)','Alertas ativos','Problemas Disaster/High/Medium','CPU, Memória e Storage']],
    ['GLPI / Service Desk', ['Chamados abertos','Chamados críticos','Sem 1º atendimento','SLA de atendimento','Resolvidos no período']],
    ['Jira / Projetos', ['Tasks abertas','Tarefas vencidas','Críticos em aberto','MTTA / MTTR','Sprints ativos']],
    ['Backup (Veeam)', ['Jobs agendados','Taxa de sucesso','Falhas registradas','Retenção configurada','Teste de restauração']],
    ['Disaster Recovery', ['RPO configurado','RTO configurado','Status de replicação','Failover testado','Plano documentado']],
    ['Kubernetes / RKE', ['Nodes ativos','Control plane','Pods em CrashLoop','Workloads críticos','Uso de recursos']],
  ]

  const catBlocks = cats.map(([title, items]) => `
    <div>
      <div class="nd-title-gray" style="margin-bottom:.4rem">${title}</div>
      <ul class="ind-list">${(items as string[]).map(i => `<li>${i}</li>`).join('')}</ul>
    </div>`).join('')

  return `
<!-- ═══ BANCO XCMG ═══ -->
<div id="xcmg" class="bg">
<div class="sec">
  <div class="ey">⚪ Cliente — Integração Pendente</div>
  <div class="st">Banco XCMG</div>
  <div class="card">
    <div class="ch n">
      <div>
        <div class="cn2"><span class="badge bnd">⚪ Indeterminado</span> Banco XCMG</div>
        <div class="csg">Integração não configurada — todos os indicadores indisponíveis para classificação de farol</div>
      </div>
      <div class="minis">
        <div class="mini"><div class="mv" style="color:var(--teal)">N/D</div><div class="ml">Score</div></div>
        <div class="mini"><div class="mv" style="color:var(--teal)">N/D</div><div class="ml">Disponib.</div></div>
        <div class="mini"><div class="mv" style="color:var(--teal)">N/D</div><div class="ml">Tickets</div></div>
        <div class="mini"><div class="mv" style="color:var(--teal)">N/D</div><div class="ml">Vencidos</div></div>
      </div>
    </div>
    <div class="cb">

      <div class="sst">Resumo Executivo</div>
      <p style="font-size:.82rem;color:var(--light);margin-bottom:1rem;line-height:1.75">
        O Banco XCMG está cadastrado na carteira da XTENTGROUP, porém sem integração ativa com as fontes de monitoramento (Zabbix, GLPI, Jira, Veeam, Datadog). Todos os indicadores de saúde operacional, disponibilidade, service desk, backup e continuidade estão indisponíveis.
      </p>

      <div class="sst">Indicadores Indisponíveis por Fonte</div>
      <div class="g3" style="margin-bottom:1.25rem">${catBlocks}</div>

      <div class="sst">Banco de Dados — Banco XCMG</div>
      ${xcmgBlock()}

      <div class="sst" style="margin-top:1.25rem">Critérios de Farol — quando integrado</div>
      <div class="g3" style="margin-bottom:1rem">
        <div class="farol-crit fc-g"><div class="fc-title" style="color:var(--grn)">🟢 Verde — Saudável</div>Score ≥ 90 · Disponib. ≥ 99,5% · Sem Disaster/High · SLA OK · Backup validado · Storage &lt; 80%</div>
        <div class="farol-crit fc-y"><div class="fc-title" style="color:var(--yel)">🟡 Amarelo — Atenção</div>Score 70–89 · Disponib. 99–99,5% · Alertas HIGH &gt; 2 · Chamados sem atendimento &gt; 5 · Tarefas vencidas &gt; 3</div>
        <div class="farol-crit fc-r"><div class="fc-title" style="color:var(--red)">🔴 Vermelho — Crítico</div>Score &lt; 70 · Disponib. &lt; 99% · Disaster ativo · SLA comprometido · Backup com falha · Storage &gt; 90%</div>
      </div>

      <div class="sst">Próximos Passos para Ativação</div>
      <table class="apt">
        <thead><tr><th>Ação</th><th>Responsável</th><th>Prazo Estimado</th><th>Prioridade</th></tr></thead>
        <tbody>
          <tr><td>Instalar agente Zabbix nos servidores XCMG</td><td>N8 / Infra XTENTGROUP</td><td>7 dias</td><td><span class="ap1">ALTA</span></td></tr>
          <tr><td>Criar empresa e configurar GLPI para XCMG</td><td>Service Desk</td><td>3 dias</td><td><span class="ap1">ALTA</span></td></tr>
          <tr><td>Criar projeto XCMG no Jira e mapear SLA</td><td>CS / Projetos</td><td>5 dias</td><td><span class="ap2">MÉDIA</span></td></tr>
          <tr><td>Configurar jobs de backup Veeam</td><td>Infra XTENTGROUP</td><td>10 dias</td><td><span class="ap2">MÉDIA</span></td></tr>
          <tr><td>Documentar RPO/RTO e plano de DR</td><td>Arquitetura</td><td>15 dias</td><td><span class="ap3">NORMAL</span></td></tr>
          <tr><td>Ativar monitoramento Banco XCMG (módulo específico)</td><td>CS + Infra</td><td>20 dias</td><td><span class="ap2">MÉDIA</span></td></tr>
        </tbody>
      </table>

      <div class="sst">Recomendação Executiva</div>
      <div style="background:rgba(110,162,168,.08);border:1px solid rgba(110,162,168,.2);border-radius:8px;padding:.9rem 1.1rem;font-size:.81rem;color:var(--near-w);line-height:1.7">
        Priorizar a ativação da integração Zabbix + GLPI + Jira para o Banco XCMG nas próximas 2 semanas. Sem visibilidade operacional, riscos de indisponibilidade, falhas de backup e gargalos de performance não podem ser detectados ou prevenidos.
      </div>

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

  const navLinks = [
    ...clients.map((cl: any) => {
      const anchor = cl.slug ?? cl.name.toLowerCase().replace(/\s/g, '-')
      const em = cl.farol === 'vermelho' ? '🔴' : cl.farol === 'amarelo' ? '🟡' : '🟢'
      return `<a href="#${anchor}">${em} ${cl.name}</a>`
    }),
    `<a href="#xcmg">⚪ Banco XCMG</a>`,
  ].join('')

  const xcmgTableRow = `<tr style="background:rgba(110,162,168,.04)">
    <td><div class="cn"><a href="#xcmg" style="color:var(--near-w);text-decoration:none">Banco XCMG</a></div><div class="cs">Integração não configurada — indicadores indisponíveis</div></td>
    <td><span class="badge bnd">⚪ Indeterminado</span></td>
    <td style="color:var(--teal)">N/D</td><td style="color:var(--teal)">N/D</td>
    <td style="color:var(--teal)">N/D</td><td style="color:var(--teal)">N/D</td>
    <td style="color:var(--teal)">⚪ N/D</td><td style="color:var(--teal)">N/D</td>
    <td style="color:var(--teal)">N/D</td><td style="color:var(--teal)">N/D</td>
  </tr>`

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
    XTENTGROUP · Farol 360°
  </div>
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
    <div class="kpi"><div class="v">${clients.length + 1}</div><div class="l">Clientes</div></div>
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
  <div style="overflow-x:auto">
  <table class="ft">
    <thead><tr>
      <th>Cliente</th><th>Status</th><th>SLA</th><th>Disponib.</th>
      <th>Backup</th><th>DR</th><th>Banco XCMG</th><th>Kubernetes</th>
      <th>Zabbix</th><th>Suporte</th>
    </tr></thead>
    <tbody>${farolTableRows}${xcmgTableRow}</tbody>
  </table>
  </div>
</div></div>
<div class="div"></div>

${clients.map((cl: any) => clientSection(cl)).join('')}
${xcmgClientSection()}

<!-- CONSOLIDADO -->
<div id="consol" class="bw"><div class="sec">
  <div class="ey">Visão Consolidada</div>
  <div class="st">Roadmap &amp; Comercial</div>
  <div class="g2" style="margin-bottom:2rem">
    <div style="background:var(--bg2);border:1px solid var(--bg3);border-radius:13px;overflow:hidden">
      <div style="padding:.9rem 1.3rem;font-weight:700;font-size:.88rem;color:var(--bg);background:var(--accent);font-family:'Space Grotesk',system-ui,sans-serif">30 dias</div>
      <div style="padding:1.1rem 1.3rem">${road30}</div>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--bg3);border-radius:13px;overflow:hidden">
      <div style="padding:.9rem 1.3rem;font-weight:700;font-size:.88rem;color:var(--bg);background:var(--light);font-family:'Space Grotesk',system-ui,sans-serif">60 dias</div>
      <div style="padding:1.1rem 1.3rem">${road60}</div>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--bg3);border-radius:13px;overflow:hidden">
      <div style="padding:.9rem 1.3rem;font-weight:700;font-size:.88rem;color:var(--bg);background:var(--pale);font-family:'Space Grotesk',system-ui,sans-serif">90 dias</div>
      <div style="padding:1.1rem 1.3rem">${road90}</div>
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

// ── Handler ────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const url     = new URL(req.url)
  const preview = url.searchParams.get('preview') === 'true'

  const [portfolioRes, hsRes] = await Promise.allSettled([
    fetch(`${BASE()}/api/reports/executive-portfolio`, { cache: 'no-store' }),
    fetch(`${BASE()}/api/hubspot/dashboard`, { cache: 'no-store' }),
  ])

  if (portfolioRes.status === 'rejected' || !portfolioRes.value.ok) {
    return NextResponse.json({ error: 'Falha ao coletar dados do portfólio' }, { status: 500 })
  }

  const portfolioData = await portfolioRes.value.json()
  const hsData = hsRes.status === 'fulfilled' && hsRes.value.ok
    ? await hsRes.value.json().catch(() => null)
    : null

  const html = buildHTML360(portfolioData, hsData)

  if (preview) {
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  const to = (process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? '')
    .split(',').map((e: string) => e.trim()).filter(Boolean)

  if (to.length === 0) {
    return NextResponse.json({ error: 'NOTIFICATION_EMAIL_TO não configurado' }, { status: 500 })
  }

  const p       = portfolioData.portfolio ?? {}
  const clients = (portfolioData.clients ?? []).map((cl: any) => ({ ...cl, farol: computeFarol360(cl) }))
  const critical  = clients.filter((c: any) => c.farol === 'vermelho').length
  const attention = clients.filter((c: any) => c.farol === 'amarelo').length
  const statusLine = critical > 0 ? `🔴 ${critical} crítico(s)` : attention > 0 ? `🟡 ${attention} em atenção` : '🟢 Carteira saudável'
  const date = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit' })
  const subject = `${statusLine} — Farol 360° ${date} · Score ${p.portfolioScore}/100`

  const result = await sendEmail({ to, subject, html })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true, method: result.method, sentTo: to, subject,
    portfolioScore: p.portfolioScore,
    farol: { verde: p.healthy, amarelo: p.attention, vermelho: p.critical },
    sections: 16,
    clients: clients.map((c: any) => ({ name: c.name, farol: c.farol, score: c.healthScore })),
    generatedAt: portfolioData.generatedAt,
  })
}
