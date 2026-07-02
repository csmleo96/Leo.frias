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
      'Authorization': `user_token ${userToken}`,
      'App-Token': appToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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

export async function GET(request: NextRequest) {
  const BASE = process.env.GLPI_URL?.replace(/\/$/, '')
  const APP_TOKEN = process.env.GLPI_APP_TOKEN
  const USER_TOKEN = process.env.GLPI_USER_TOKEN

  if (!BASE || !APP_TOKEN || !USER_TOKEN) {
    return NextResponse.json({
      error: 'Configure GLPI_URL, GLPI_APP_TOKEN e GLPI_USER_TOKEN no .env.local'
    }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status') ?? 'all'
  const priorityFilter = searchParams.get('priority') ?? 'all'
  const search = searchParams.get('search') ?? ''

  let sessionToken: string
  try {
    sessionToken = await initSession(BASE, APP_TOKEN, USER_TOKEN)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  try {
    const headers = {
      'Session-Token': sessionToken,
      'App-Token': APP_TOKEN,
      Accept: 'application/json',
    }

    const params = new URLSearchParams({
      'range': '0-99',
      'sort': '15',
      'order': 'DESC',
      'is_deleted': '0',
      'forcedisplay[0]': '2',    // id
      'forcedisplay[1]': '1',    // name/title
      'forcedisplay[2]': '12',   // status
      'forcedisplay[3]': '3',    // priority
      'forcedisplay[4]': '14',   // type
      'forcedisplay[5]': '15',   // date_mod
      'forcedisplay[6]': '5',    // users_id_recipient
      'forcedisplay[7]': '4',    // _users_id_assign
      'forcedisplay[8]': '19',   // date (creation)
      'forcedisplay[9]': '7',    // itilcategories_id (categoria)
      'forcedisplay[10]': '80',  // groups_id (grupo responsável)
      'forcedisplay[11]': '50',  // requesttypes_id (tipo de requisição)
      'forcedisplay[12]': '71',  // entities_id (entidade/departamento)
      'forcedisplay[13]': '17',  // solvedate
    })

    if (statusFilter !== 'all') {
      params.set('criteria[0][field]', '12')
      params.set('criteria[0][searchtype]', 'equals')
      params.set('criteria[0][value]', statusFilter)
    }
    if (priorityFilter !== 'all') {
      const offset = statusFilter !== 'all' ? 1 : 0
      params.set(`criteria[${offset}][field]`, '3')
      params.set(`criteria[${offset}][searchtype]`, 'equals')
      params.set(`criteria[${offset}][value]`, priorityFilter)
    }
    if (search) {
      const offset = (statusFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0)
      params.set(`criteria[${offset}][field]`, '1')
      params.set(`criteria[${offset}][searchtype]`, 'contains')
      params.set(`criteria[${offset}][value]`, search)
    }

    const res = await fetch(`${BASE}/search/Ticket?${params}`, {
      headers: { ...headers, 'Accept': 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error(`Erro ao buscar chamados: ${res.status} ${await res.text()}`)
    }

    const text = await res.text()
    const raw = JSON.parse(text)
    const items: any[] = raw.data ?? []

    const tickets = items.map((t: any) => {
      // Classificar baseado em categoria, grupo e tipo de requisição
      const categoryId = Number(t[7]) || 0
      const groupId = Number(t[80]) || 0
      const _requestTypeId = Number(t[50]) || 0
      const _entityId = Number(t[71]) || 0

      // Determinar tipo de origem
      let origin = 'CLIENTE' // padrão
      let category = 'Solicitação'

      // Grupos de infraestrutura conhecidos (ajuste conforme seu GLPI)
      const infraGroups = [2, 3, 4, 5, 15, 16, 17] // IDs dos grupos de infra
      const dbGroups = [6, 7, 8] // IDs dos grupos de BD

      // Se o grupo está em infragrupos, é automático
      if (infraGroups.includes(groupId)) {
        origin = 'INFRAESTRUTURA'
        category = 'Infraestrutura'
      } else if (dbGroups.includes(groupId)) {
        origin = 'BANCO_DE_DADOS'
        category = 'Banco de Dados'
      }

      // Se o título contém palavras-chave de automático, marca como tal
      const title = String(t[1] ?? '').toLowerCase()
      if (title.includes('alerta') || title.includes('monitoring') || title.includes('zabbix') ||
          title.includes('banco') || title.includes('database') || title.includes('sql') ||
          title.includes('servidor') || title.includes('server') || title.includes('cpu') ||
          title.includes('memoria') || title.includes('memory') || title.includes('disco')) {
        origin = 'INFRAESTRUTURA'
        category = 'Infraestrutura'
        if (title.includes('banco') || title.includes('database') || title.includes('sql')) {
          origin = 'BANCO_DE_DADOS'
          category = 'Banco de Dados'
        }
      }

      const nowMs = Date.now()
      const createdMs = t[19] ? new Date(String(t[19])).getTime() : nowMs
      const modMs = t[15] ? new Date(String(t[15])).getTime() : nowMs
      return {
        id: t[2] ?? '?',
        title: t[1] ?? '(sem título)',
        status: Number(t[12]) || 1,
        statusLabel: STATUS_LABEL[Number(t[12])] ?? 'Desconhecido',
        priority: Number(t[3]) || 3,
        priorityLabel: PRIORITY_LABEL[Number(t[3])] ?? 'Média',
        type: Number(t[14]) || 1,
        typeLabel: TYPE_LABEL[Number(t[14])] ?? 'Incidente',
        dateMod: t[15] ?? null,
        dateCreation: t[19] ?? null,
        solveDate: t[17] ?? null,
        daysOpen: Math.floor((nowMs - createdMs) / 86400000),
        daysSinceUpdate: Math.floor((nowMs - modMs) / 86400000),
        assignee: t[5] ? String(t[5]) : null,
        origin,
        category,
        categoryId,
        groupId,
        isAutomated: origin !== 'CLIENTE',
      }
    })

    const stats = {
      total: raw.totalcount ?? items.length,
      new: items.filter((t: any) => Number(t[12]) === 1).length,
      inProgress: items.filter((t: any) => [2, 3].includes(Number(t[12]))).length,
      pending: items.filter((t: any) => Number(t[12]) === 4).length,
      solved: items.filter((t: any) => Number(t[12]) === 5).length,
      closed: items.filter((t: any) => Number(t[12]) === 6).length,
    }

    await killSession(BASE, APP_TOKEN, sessionToken)
    return NextResponse.json({ tickets, stats }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    await killSession(BASE, APP_TOKEN, sessionToken)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
