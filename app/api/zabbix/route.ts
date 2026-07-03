import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL  = process.env.ZABBIX_API_URL
const ZBX_USER = process.env.ZABBIX_USER
const ZBX_PASS = process.env.ZABBIX_PASS

const SEV_LABEL: Record<number, string> = {
  0: 'Não Classificado', 1: 'Informação', 2: 'Aviso',
  3: 'Médio', 4: 'Alto', 5: 'Desastre',
}
const SEV_COLOR: Record<number, string> = {
  0: '#94a3b8', 1: '#60a5fa', 2: '#fbbf24',
  3: '#fb923c', 4: '#f87171', 5: '#ef4444',
}

async function zbxRequest(method: string, params: Record<string, any>, auth?: string): Promise<any> {
  const body: Record<string, any> = { jsonrpc: '2.0', method, params, id: 1 }
  if (auth) body.auth = auth

  const headers: Record<string, string> = { 'Content-Type': 'application/json-rpc' }
  if (auth) headers['Authorization'] = `Bearer ${auth}`

  const res = await fetch(API_URL!, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`)

  const json = await res.json()
  if (json.error) throw new Error(json.error.data ?? json.error.message ?? 'Zabbix API error')
  return json.result
}

async function login(): Promise<string> {
  try {
    return await zbxRequest('user.login', { username: ZBX_USER, password: ZBX_PASS })
  } catch {
    return await zbxRequest('user.login', { user: ZBX_USER, password: ZBX_PASS })
  }
}

async function logout(auth: string) {
  await zbxRequest('user.logout', {}, auth).catch(() => {})
}

export async function GET() {
  if (!API_URL || !ZBX_USER || !ZBX_PASS) {
    return NextResponse.json(
      { error: 'Configure ZABBIX_API_URL, ZABBIX_USER e ZABBIX_PASS no .env.local' },
      { status: 500 }
    )
  }

  let auth: string | undefined
  try {
    auth = await login()

    const nowSec = Math.floor(Date.now() / 1000)
    const ts7d   = nowSec - 7  * 86400
    const ts30d  = nowSec - 30 * 86400

    // Phase 1 — critical data: problems, hosts, triggers
    // NOTE: omit `recent:true` so we get ALL active problems regardless of age.
    // r_eventid already identifies recovered problems; we filter those out below.
    const [problems, hosts, triggers] = await Promise.all([
      zbxRequest('problem.get', {
        output: ['eventid', 'objectid', 'name', 'severity', 'clock', 'acknowledged', 'r_eventid'],
        suppressed: false,
        sortfield: 'eventid',
        sortorder: 'DESC',
        limit: 200,
      }, auth),
      zbxRequest('host.get', {
        output: ['hostid', 'name', 'status', 'available'],
        monitored_hosts: true,
        limit: 500,
      }, auth),
      zbxRequest('trigger.get', {
        output: ['triggerid', 'description', 'priority'],
        selectHosts: 'extend',
        only_true: true,
        filter: { value: 1 },
        limit: 200,
      }, auth),
    ])

    // Phase 2 — trend data (best-effort; won't fail the request if unavailable)
    let trend7dCount  = 0
    let trend30dCount = 0
    try {
      const [ev7d, ev30d] = await Promise.all([
        zbxRequest('event.get', {
          output: ['eventid'],
          time_from: ts7d,
          time_to: nowSec,
          value: '1',        // problem events only
          countOutput: true, // returns just the integer count — efficient
        }, auth),
        zbxRequest('event.get', {
          output: ['eventid'],
          time_from: ts30d,
          time_to: nowSec,
          value: '1',
          countOutput: true,
        }, auth),
      ])
      trend7dCount  = Number(ev7d)  ?? 0
      trend30dCount = Number(ev30d) ?? 0
    } catch { /* non-critical */ }

    await logout(auth)

    // trigger → host name map
    const trigHostMap: Record<string, string> = {}
    ;(triggers as any[]).forEach(t => {
      if (t.hosts?.length) trigHostMap[t.triggerid] = t.hosts[0].name
    })

    const formatted = (problems as any[]).map(p => ({
      id:             p.eventid,
      triggerId:      p.objectid,
      name:           p.name,
      severity:       Number(p.severity),
      severityLabel:  SEV_LABEL[Number(p.severity)] ?? '—',
      severityColor:  SEV_COLOR[Number(p.severity)] ?? '#94a3b8',
      clock:          p.clock,
      age:            formatAge(Number(p.clock)),
      acknowledged:   p.acknowledged === '1',
      resolved:       !!p.r_eventid,
      host:           trigHostMap[p.objectid] ?? '—',
    }))

    // Active = not yet recovered (r_eventid absent)
    const active = formatted.filter(p => !p.resolved)

    const bySeverity = {
      disaster: active.filter(p => p.severity === 5).length,
      high:     active.filter(p => p.severity === 4).length,
      average:  active.filter(p => p.severity === 3).length,
      warning:  active.filter(p => p.severity === 2).length,
      info:     active.filter(p => p.severity <= 1).length,
    }

    const hostsArr     = hosts as any[]
    const hostsTotal   = hostsArr.length
    const hostsUp      = hostsArr.filter(h => h.available === '1' || h.available === 1).length
    const hostsDown    = hostsArr.filter(h => h.available === '2' || h.available === 2).length
    const hostsUnknown = hostsArr.filter(h => !h.available || h.available === '0' || h.available === 0).length
    // Zabbix 6+ deprecated per-host `available`; if all unknown, use total as up
    const effectiveUp  = hostsUp === 0 && hostsDown === 0 ? hostsTotal : hostsUp
    const availability = hostsTotal > 0
      ? Number(((effectiveUp / hostsTotal) * 100).toFixed(2))
      : 0

    // Stability: % of time without disaster/high in the last 30 days
    const stabilityScore = trend30dCount === 0
      ? 100
      : Math.max(0, Math.round(100 - (trend30dCount / 30)))

    // Top recurring problems by name
    const nameCounts: Record<string, number> = {}
    active.forEach(p => {
      nameCounts[p.name] = (nameCounts[p.name] ?? 0) + 1
    })
    const topRecurring = Object.entries(nameCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      problems: formatted,
      stats: {
        totalProblems: active.length,
        critical:       bySeverity.disaster + bySeverity.high,
        unacknowledged: active.filter(p => !p.acknowledged).length,
        hostsTotal,
        hostsUp:        effectiveUp,
        hostsDown,
        hostsUnknown,
        availability,
        // Explicit severity breakdown (used by farol and client routes)
        ...bySeverity,
        // Trend data
        events7d:        trend7dCount,
        events30d:       trend30dCount,
        stabilityScore,
        topRecurring,
        criticalProblems: active.filter(p => p.severity >= 4).slice(0, 10),
      },
    }, { headers: { 'Cache-Control': 'no-store' } })

  } catch (e: any) {
    if (auth) await logout(auth)

    const msg = e.message?.includes('TimeoutError') || e.message?.includes('timeout')
      ? `Timeout ao conectar ao Zabbix (${API_URL})`
      : e.message ?? 'Erro desconhecido'

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function formatAge(clock: number) {
  const d = Math.floor((Date.now() / 1000) - clock)
  if (d < 60)    return `${d}s`
  if (d < 3600)  return `${Math.floor(d / 60)}min`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}
