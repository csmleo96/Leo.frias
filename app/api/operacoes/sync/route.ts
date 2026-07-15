import { NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

const GLPI_SLA: Record<number, number> = { 6: 2, 5: 4, 4: 8, 3: 24, 2: 72, 1: 168 }
const JIRA_SLA: Record<string, number> = { Highest: 2, High: 4, Medium: 24, Low: 72, Lowest: 168 }
const JIRA_PRIORITY_NUM: Record<string, number> = { Highest: 6, High: 5, Medium: 3, Low: 2, Lowest: 1 }
const GLPI_STATUS_LABEL: Record<number, string> = { 1: 'Novo', 2: 'Em Atendimento', 3: 'Planejado', 4: 'Pendente', 5: 'Resolvido', 6: 'Fechado' }
const GLPI_PRIORITY_LABEL: Record<number, string> = { 1: 'Muito Baixa', 2: 'Baixa', 3: 'Média', 4: 'Alta', 5: 'Muito Alta', 6: 'Crítica' }
const GLPI_TYPE_LABEL: Record<number, string> = { 1: 'Incidente', 2: 'Requisição' }

function computeSla(createdAt: string | null, slaHours: number, isResolved: boolean) {
  if (isResolved) return { deadline: null, status: 'resolved' as const }
  if (!createdAt) return { deadline: null, status: 'unknown' as const }
  const created = new Date(createdAt).getTime()
  const deadline = new Date(created + slaHours * 3_600_000)
  const pct = (Date.now() - created) / (slaHours * 3_600_000)
  const status = pct > 1 ? 'breached' : pct > 0.8 ? 'at_risk' : 'ok'
  return { deadline: deadline.toISOString(), status: status as 'ok' | 'at_risk' | 'breached' }
}

function getSb() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

// ── Fetch GLPI directly ────────────────────────────────────────────────────
async function fetchGlpiTickets() {
  const base = process.env.GLPI_URL?.replace(/\/$/, '')
  const appToken = process.env.GLPI_APP_TOKEN
  const userToken = process.env.GLPI_USER_TOKEN
  if (!base || !appToken || !userToken) throw new Error('GLPI env vars missing')

  // Init session
  const sessRes = await fetch(`${base}/initSession`, {
    headers: { Authorization: `user_token ${userToken}`, 'App-Token': appToken, 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!sessRes.ok) throw new Error(`GLPI initSession: ${sessRes.status}`)
  const { session_token } = await sessRes.json()

  const headers = { 'Session-Token': session_token, 'App-Token': appToken, Accept: 'application/json' }

  // Fetch tickets (up to 200)
  // Field IDs verified against GLPI's own /listSearchOptions/Ticket: 15 = date de
  // abertura (creation), 19 = última atualização (date_mod) — opposite of what field
  // numbers might suggest.
  const params = new URLSearchParams({
    range: '0-199', sort: '19', order: 'DESC', is_deleted: '0',
    'forcedisplay[0]': '2', 'forcedisplay[1]': '1', 'forcedisplay[2]': '12',
    'forcedisplay[3]': '3', 'forcedisplay[4]': '14', 'forcedisplay[5]': '15',
    'forcedisplay[6]': '5', 'forcedisplay[7]': '4', 'forcedisplay[8]': '19',
  })

  const searchRes = await fetch(`${base}/search/Ticket?${params}`, { headers, cache: 'no-store' })
  const raw = JSON.parse(await searchRes.text())
  const items: any[] = raw.data ?? []

  // Kill session
  fetch(`${base}/killSession`, { headers, cache: 'no-store' }).catch(() => {})

  return items.map((t: any) => ({
    id: t[2], title: t[1] ?? '(sem título)',
    status: Number(t[12]) || 1, statusLabel: GLPI_STATUS_LABEL[Number(t[12])] ?? 'Desconhecido',
    priority: Number(t[3]) || 3, priorityLabel: GLPI_PRIORITY_LABEL[Number(t[3])] ?? 'Média',
    type: Number(t[14]) || 1, typeLabel: GLPI_TYPE_LABEL[Number(t[14])] ?? 'Incidente',
    dateMod: t[19] ?? null, dateCreation: t[15] ?? null,
    assignee: t[5] ? String(t[5]) : null,
  }))
}

// ── Fetch Jira directly ────────────────────────────────────────────────────
async function fetchJiraIssues() {
  const base = process.env.JIRA_BASE_URL
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN
  if (!base || !email || !token) throw new Error('Jira env vars missing')

  const auth = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64')
  const jql = 'project in (HV, IDB, MSPINFRA, MSPPRO, NMA) ORDER BY updated DESC'
  const fields = ['summary', 'status', 'issuetype', 'priority', 'assignee', 'project', 'updated', 'created']

  // Jira Cloud caps each page at 100 regardless of maxResults — paginate via
  // nextPageToken to cover the full backlog (matches /api/jira/route.ts).
  const MAX_PAGES = 3
  const issues: any[] = []
  let nextPageToken: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(`${base}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql, maxResults: 100, fields, ...(nextPageToken ? { nextPageToken } : {}) }),
      cache: 'no-store',
    })
    if (!res.ok) {
      if (page === 0) throw new Error(`Jira API: ${res.status} ${await res.text()}`)
      break
    }
    const data = await res.json()
    issues.push(...(data.issues ?? []))
    nextPageToken = data.nextPageToken ?? undefined
    if (!nextPageToken) break
  }

  return issues.map((i: any) => ({
    key: i.key,
    summary: i.fields.summary,
    status: i.fields.status?.name ?? '—',
    statusCategory: i.fields.status?.statusCategory?.key ?? 'undefined',
    type: i.fields.issuetype?.name ?? '—',
    priority: i.fields.priority?.name ?? '—',
    assignee: i.fields.assignee?.displayName ?? null,
    project: { key: i.fields.project?.key, name: i.fields.project?.name },
    updated: i.fields.updated,
    created: i.fields.created ?? null,
    url: `${base}/browse/${i.key}`,
  }))
}

// ── POST /api/operacoes/sync ───────────────────────────────────────────────
export async function POST() {
  const sb = getSb()
  let glpiSynced = 0, jiraSynced = 0
  const errors: string[] = []

  // ── GLPI ────────────────────────────────────────────────────────────
  try {
    const tickets = await fetchGlpiTickets()
    const rows = tickets.map(t => {
      const slaHours = GLPI_SLA[t.priority] ?? 24
      const isResolved = [5, 6].includes(t.status)
      const sla = computeSla(t.dateCreation, slaHours, isResolved)
      return {
        id: t.id, title: t.title, status: t.status, status_label: t.statusLabel,
        priority: t.priority, priority_label: t.priorityLabel,
        type_id: t.type, type_label: t.typeLabel, assignee: t.assignee,
        created_at: t.dateCreation ?? null, updated_at: t.dateMod ?? null,
        sla_hours: slaHours, sla_deadline: sla.deadline, sla_status: sla.status,
        synced_at: new Date().toISOString(),
      }
    })
    if (rows.length) {
      const { error } = await sb.from('glpi_tickets').upsert(rows, { onConflict: 'id' })
      if (error) throw new Error(error.message)
      glpiSynced = rows.length
    }
  } catch (e: any) { errors.push(`GLPI: ${e.message}${e.cause ? ` (${e.cause.code ?? e.cause.message ?? e.cause})` : ''}`) }

  // ── Jira ────────────────────────────────────────────────────────────
  try {
    const issues = await fetchJiraIssues()
    const rows = issues.map((i: any) => {
      const slaHours = JIRA_SLA[i.priority] ?? 24
      const isResolved = ['done', 'resolved', 'closed'].includes((i.statusCategory ?? '').toLowerCase())
      const sla = computeSla(i.created, slaHours, isResolved)
      return {
        key: i.key, summary: i.summary, status: i.status,
        status_category: i.statusCategory, priority: i.priority,
        priority_num: JIRA_PRIORITY_NUM[i.priority] ?? 3,
        assignee: i.assignee, project_key: i.project?.key ?? null,
        project_name: i.project?.name ?? null, issue_type: i.type,
        created_at: i.created ?? null, updated_at: i.updated ?? null,
        url: i.url, sla_hours: slaHours, sla_deadline: sla.deadline,
        sla_status: sla.status, synced_at: new Date().toISOString(),
      }
    })
    if (rows.length) {
      const { error } = await sb.from('jira_tickets').upsert(rows, { onConflict: 'key' })
      if (error) throw new Error(error.message)
      jiraSynced = rows.length
    }
  } catch (e: any) { errors.push(`Jira: ${e.message}${e.cause ? ` (${e.cause.code ?? e.cause.message ?? e.cause})` : ''}`) }

  // ── Log ──────────────────────────────────────────────────────────────
  await sb.from('sync_log').insert({
    source: 'all', glpi_synced: glpiSynced, jira_synced: jiraSynced,
    error: errors.length ? errors.join(' | ') : null,
  })

  if (errors.length && !glpiSynced && !jiraSynced) {
    return NextResponse.json({ errors, total: 0 }, { status: 500 })
  }

  return NextResponse.json({
    glpi: glpiSynced, jira: jiraSynced,
    total: glpiSynced + jiraSynced,
    errors, syncedAt: new Date().toISOString(),
  })
}

// Vercel Cron Jobs invoke via GET — alias it to the same sync logic.
export const GET = POST
