import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL = process.env.ZABBIX_API_URL
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
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`)

  const json = await res.json()
  if (json.error) throw new Error(json.error.data ?? json.error.message ?? 'Zabbix API error')
  return json.result
}

async function login(): Promise<string> {
  // Zabbix 5.4+ usa 'username'; versões antigas usam 'user'
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

    const [problems, hosts, triggers] = await Promise.all([
      zbxRequest('problem.get', {
        output: ['eventid', 'objectid', 'name', 'severity', 'clock', 'acknowledged', 'r_eventid'],
        recent: true,
        suppressed: false,
        sortfield: 'eventid',
        sortorder: 'DESC',
        limit: 100,
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
        limit: 100,
      }, auth),
    ])

    await logout(auth)

    // trigger → host name map
    const trigHostMap: Record<string, string> = {}
    ;(triggers as any[]).forEach(t => {
      if (t.hosts?.length) trigHostMap[t.triggerid] = t.hosts[0].name
    })

    const formatted = (problems as any[]).map(p => ({
      id: p.eventid,
      triggerId: p.objectid,
      name: p.name,
      severity: Number(p.severity),
      severityLabel: SEV_LABEL[Number(p.severity)] ?? '—',
      severityColor: SEV_COLOR[Number(p.severity)] ?? '#94a3b8',
      clock: p.clock,
      age: formatAge(Number(p.clock)),
      acknowledged: p.acknowledged === '1',
      resolved: !!p.r_eventid,
      host: trigHostMap[p.objectid] ?? '—',
    }))

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
    // Zabbix 6+ deprecated 'available' on host; check both number and string forms
    const hostsUp      = hostsArr.filter(h => h.available === '1' || h.available === 1).length
    const hostsDown    = hostsArr.filter(h => h.available === '2' || h.available === 2).length
    const hostsUnknown = hostsArr.filter(h => !h.available || h.available === '0' || h.available === 0).length
    // If all unknown (Zabbix 6+ without agent interface), mark all as up
    const effectiveUp  = hostsUp === 0 && hostsDown === 0 ? hostsTotal : hostsUp
    const availability = hostsTotal > 0 ? Math.round((effectiveUp / hostsTotal) * 100) : 0

    return NextResponse.json({
      problems: formatted,
      stats: {
        totalProblems: active.length,
        critical: bySeverity.disaster + bySeverity.high,
        unacknowledged: active.filter(p => !p.acknowledged).length,
        hostsTotal, hostsUp: effectiveUp, hostsDown, hostsUnknown, availability,
        ...bySeverity,
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
  if (d < 60) return `${d}s`
  if (d < 3600) return `${Math.floor(d / 60)}min`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}
