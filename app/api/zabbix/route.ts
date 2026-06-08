import { NextResponse } from 'next/server'
import https from 'node:https'

export const dynamic = 'force-dynamic'

const API_URL = process.env.ZABBIX_API_URL
const TOKEN   = process.env.ZABBIX_TOKEN

const SEV_LABEL: Record<number, string> = {
  0: 'Não Classificado', 1: 'Informação', 2: 'Aviso',
  3: 'Médio', 4: 'Alto', 5: 'Desastre',
}
const SEV_COLOR: Record<number, string> = {
  0: '#94a3b8', 1: '#60a5fa', 2: '#fbbf24',
  3: '#fb923c', 4: '#f87171', 5: '#ef4444',
}

// Uses Node.js https module to bypass self-signed certificate
function zbxRequest(method: string, params: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL!)
    const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port ? Number(url.port) : 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json-rpc',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${TOKEN}`,
      },
      rejectUnauthorized: false,   // accept self-signed cert from internal server
      timeout: 10000,
    }

    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) reject(new Error(json.error.data ?? json.error.message ?? 'Zabbix API error'))
          else resolve(json.result)
        } catch {
          reject(new Error(`Resposta inválida do servidor (${data.slice(0, 100)})`))
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout — verifique a conectividade com 10.70.0.12 (VPN necessária)')) })
    req.write(body)
    req.end()
  })
}

export async function GET() {
  if (!API_URL || !TOKEN) {
    return NextResponse.json(
      { error: 'Configure ZABBIX_API_URL e ZABBIX_TOKEN no .env.local' },
      { status: 500 }
    )
  }

  try {
    const [problems, hosts, triggers] = await Promise.all([
      zbxRequest('problem.get', {
        output: ['eventid', 'objectid', 'name', 'severity', 'clock', 'acknowledged', 'r_eventid'],
        recent: true,
        suppressed: false,
        sortfield: ['severity', 'clock'],
        sortorder: ['DESC', 'DESC'],
        limit: 100,
      }),
      zbxRequest('host.get', {
        output: ['hostid', 'name', 'status', 'available'],
        monitored_hosts: true,
        limit: 500,
      }),
      zbxRequest('trigger.get', {
        output: ['triggerid', 'description', 'priority'],
        selectHosts: ['name'],
        only_true: true,
        filter: { value: 1 },
        limit: 100,
      }),
    ])

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

    const hostsArr    = hosts as any[]
    const hostsTotal  = hostsArr.length
    const hostsUp     = hostsArr.filter(h => h.available === '1').length
    const hostsDown   = hostsArr.filter(h => h.available === '2').length
    const hostsUnknown = hostsArr.filter(h => h.available === '0').length
    const availability = hostsTotal > 0 ? Math.round((hostsUp / hostsTotal) * 100) : 0

    return NextResponse.json({
      problems: formatted,
      stats: {
        totalProblems: active.length,
        critical: bySeverity.disaster + bySeverity.high,
        unacknowledged: active.filter(p => !p.acknowledged).length,
        hostsTotal, hostsUp, hostsDown, hostsUnknown, availability,
        ...bySeverity,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })

  } catch (e: any) {
    const isNetwork = e.message.includes('ECONNREFUSED') || e.message.includes('ETIMEDOUT') || e.message.includes('fetch failed') || e.message.includes('Timeout')
    const msg = isNetwork
      ? `Não foi possível conectar ao Zabbix (${API_URL}). Verifique se está na VPN/rede interna da Xtentgroup. Detalhe: ${e.message}`
      : e.message

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
