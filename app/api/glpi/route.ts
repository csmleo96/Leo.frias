import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<number, string> = {
  1: 'Novo', 2: 'Em Atendimento', 3: 'Planejado',
  4: 'Pendente', 5: 'Resolvido', 6: 'Fechado',
}
const PRIORITY_LABEL: Record<number, string> = {
  1: 'Muito Baixa', 2: 'Baixa', 3: 'Média',
  4: 'Alta', 5: 'Muito Alta', 6: 'Crítica',
}
const TYPE_LABEL: Record<number, string> = { 1: 'Incidente', 2: 'Requisição' }

async function initSession(base: string, appToken: string, userToken: string): Promise<string> {
  const res = await fetch(`${base}/initSession`, {
    method: 'GET',
    headers: {
      'Authorization':  `user_token ${userToken}`,
      'App-Token':      appToken,
      'Content-Type':   'application/json',
      'Accept':         'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Autenticação GLPI falhou (${res.status}): ${body}`)
  }
  const data = await res.json()
  if (!data.session_token) throw new Error('Session token não retornado pelo GLPI')
  return data.session_token
}

async function killSession(base: string, appToken: string, sessionToken: string) {
  await fetch(`${base}/killSession`, {
    headers: { 'Session-Token': sessionToken, 'App-Token': appToken },
    cache: 'no-store',
  }).catch(() => {})
}

// Fetch one page of tickets from GLPI search API
async function fetchPage(
  base: string,
  headers: Record<string, string>,
  extraParams: URLSearchParams,
  rangeStart: number,
  pageSize: number,
): Promise<{ items: any[]; totalcount: number }> {
  const params = new URLSearchParams(extraParams)
  params.set('range', `${rangeStart}-${rangeStart + pageSize - 1}`)

  const res = await fetch(`${base}/search/Ticket?${params}`, {
    headers: { ...headers, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Erro ao buscar chamados GLPI: ${res.status} ${await res.text()}`)
  }
  const raw = JSON.parse(await res.text())
  return { items: raw.data ?? [], totalcount: raw.totalcount ?? 0 }
}

export async function GET(request: NextRequest) {
  const BASE       = process.env.GLPI_URL?.replace(/\/$/, '')
  const APP_TOKEN  = process.env.GLPI_APP_TOKEN
  const USER_TOKEN = process.env.GLPI_USER_TOKEN

  if (!BASE || !APP_TOKEN || !USER_TOKEN) {
    return NextResponse.json({
      error: 'Configure GLPI_URL, GLPI_APP_TOKEN e GLPI_USER_TOKEN no .env.local'
    }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const statusFilter   = searchParams.get('status')   ?? 'all'
  const priorityFilter = searchParams.get('priority') ?? 'all'
  const search         = searchParams.get('search')   ?? ''

  let sessionToken: string
  try {
    sessionToken = await initSession(BASE, APP_TOKEN, USER_TOKEN)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  try {
    const headers = {
      'Session-Token': sessionToken,
      'App-Token':     APP_TOKEN,
      'Accept':        'application/json',
    }

    // Base query params — forcedisplay field IDs match GLPI's search field numbering
    const baseParams = new URLSearchParams({
      'sort':                 '15',   // date_mod DESC
      'order':                'DESC',
      'is_deleted':           '0',
      'forcedisplay[0]':      '2',    // ticket id
      'forcedisplay[1]':      '1',    // title
      'forcedisplay[2]':      '12',   // status
      'forcedisplay[3]':      '3',    // priority
      'forcedisplay[4]':      '14',   // type (incident / request)
      'forcedisplay[5]':      '15',   // date_mod
      'forcedisplay[6]':      '4',    // _users_id_assign (TECHNICIAN — was wrongly 5)
      'forcedisplay[7]':      '5',    // users_id_recipient (REQUESTER)
      'forcedisplay[8]':      '19',   // date_creation
      'forcedisplay[9]':      '7',    // itilcategories_id
      'forcedisplay[10]':     '80',   // groups_id
      'forcedisplay[11]':     '17',   // solvedate
      'forcedisplay[12]':     '18',   // closedate
      'forcedisplay[13]':     '21',   // time_to_resolve (SLA deadline)
    })

    // Apply optional filters
    let criteriaIdx = 0
    if (statusFilter !== 'all') {
      baseParams.set(`criteria[${criteriaIdx}][field]`,      '12')
      baseParams.set(`criteria[${criteriaIdx}][searchtype]`, 'equals')
      baseParams.set(`criteria[${criteriaIdx}][value]`,      statusFilter)
      criteriaIdx++
    }
    if (priorityFilter !== 'all') {
      baseParams.set(`criteria[${criteriaIdx}][field]`,      '3')
      baseParams.set(`criteria[${criteriaIdx}][searchtype]`, 'equals')
      baseParams.set(`criteria[${criteriaIdx}][value]`,      priorityFilter)
      criteriaIdx++
    }
    if (search) {
      baseParams.set(`criteria[${criteriaIdx}][field]`,      '1')
      baseParams.set(`criteria[${criteriaIdx}][searchtype]`, 'contains')
      baseParams.set(`criteria[${criteriaIdx}][value]`,      search)
    }

    // Fetch first page (200 tickets)
    const PAGE_SIZE = 200
    const first = await fetchPage(BASE, headers, baseParams, 0, PAGE_SIZE)
    let items: any[] = first.items
    const totalcount = first.totalcount

    // Paginate one more page if GLPI has > 200 tickets (cover up to 400)
    if (totalcount > PAGE_SIZE && items.length === PAGE_SIZE) {
      try {
        const second = await fetchPage(BASE, headers, baseParams, PAGE_SIZE, PAGE_SIZE)
        items = items.concat(second.items)
      } catch { /* non-critical — use first page only */ }
    }

    const nowMs = Date.now()

    const tickets = items.map((t: any) => {
      const assignedToId = t[4] ? Number(t[4]) : null    // technician (field 4)
      const requesterId  = t[5] ? Number(t[5]) : null    // requester  (field 5)
      const categoryId   = Number(t[7])  || 0
      const groupId      = Number(t[80]) || 0

      const createdMs    = t[19] ? new Date(String(t[19])).getTime() : nowMs
      const modMs        = t[15] ? new Date(String(t[15])).getTime() : nowMs
      const solvedMs     = t[17] ? new Date(String(t[17])).getTime() : null
      const closedMs     = t[18] ? new Date(String(t[18])).getTime() : null
      const slaDeadlineMs= t[21] ? new Date(String(t[21])).getTime() : null

      const daysOpen     = Math.floor((nowMs - createdMs) / 86_400_000)
      const resolveTime  = solvedMs ? Math.floor((solvedMs - createdMs) / 86_400_000) : null

      // SLA: overdue if past deadline and still open
      const status       = Number(t[12]) || 1
      const isOpen       = status < 5
      const slaBreached  = isOpen && slaDeadlineMs !== null && slaDeadlineMs < nowMs

      return {
        id:           t[2] ?? '?',
        title:        t[1] ?? '(sem título)',
        status,
        statusLabel:  STATUS_LABEL[status] ?? 'Desconhecido',
        priority:     Number(t[3]) || 3,
        priorityLabel: PRIORITY_LABEL[Number(t[3])] ?? 'Média',
        type:         Number(t[14]) || 1,
        typeLabel:    TYPE_LABEL[Number(t[14])] ?? 'Incidente',
        dateMod:      t[15] ?? null,
        dateCreation: t[19] ?? null,
        solveDate:    t[17] ?? null,
        closeDate:    t[18] ?? null,
        slaDeadline:  t[21] ?? null,
        slaBreached,
        daysOpen,
        daysSinceUpdate: Math.floor((nowMs - modMs) / 86_400_000),
        resolveTimeDays: resolveTime,
        // FIX: technician = field 4, requester = field 5
        assignedTo:   assignedToId,
        requester:    requesterId,
        // Legacy alias kept for backward compat with any consumers
        assignee:     assignedToId,
        categoryId,
        groupId,
      }
    })

    const open        = tickets.filter(t => t.status < 5)
    const resolved    = tickets.filter(t => t.status >= 5)
    const critical    = open.filter(t => t.priority >= 5)
    // FIXED: unattended = no assigned technician (not "open > 1 day")
    const unattended  = open.filter(t => !t.assignedTo)
    const slaBreached = open.filter(t => t.slaBreached)

    // Avg resolution time (only resolved tickets with computed resolveTimeDays)
    const resolvedWithTime = resolved.filter(t => t.resolveTimeDays !== null)
    const avgResolutionDays = resolvedWithTime.length > 0
      ? Math.round(resolvedWithTime.reduce((s, t) => s + (t.resolveTimeDays ?? 0), 0) / resolvedWithTime.length)
      : null

    // Stats computed from fetched items (which covers up to 400 tickets)
    // `total` reflects the real GLPI count via totalcount
    const stats = {
      total:        totalcount,
      fetched:      items.length,
      truncated:    items.length < totalcount,
      new:          tickets.filter(t => t.status === 1).length,
      inProgress:   tickets.filter(t => [2, 3].includes(t.status)).length,
      pending:      tickets.filter(t => t.status === 4).length,
      solved:       tickets.filter(t => t.status === 5).length,
      closed:       tickets.filter(t => t.status === 6).length,
      open:         open.length,
      resolved:     resolved.length,
      critical:     critical.length,
      unattended:   unattended.length,
      slaBreached:  slaBreached.length,
      slaCompliance: open.length > 0
        ? Math.round(((open.length - slaBreached.length) / open.length) * 100)
        : 100,
      avgResolutionDays,
    }

    await killSession(BASE, APP_TOKEN, sessionToken)
    return NextResponse.json({ tickets, stats }, { headers: { 'Cache-Control': 'no-store' } })

  } catch (e: any) {
    await killSession(BASE, APP_TOKEN, sessionToken)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
