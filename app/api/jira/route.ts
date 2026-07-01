import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PROJECTS = 'HV, IDB, MSPINFRA, MSPPRO, NMA'

export async function GET(request: NextRequest) {
  const BASE = process.env.JIRA_BASE_URL
  const EMAIL = process.env.JIRA_EMAIL
  const TOKEN = process.env.JIRA_API_TOKEN

  if (!BASE || !EMAIL || !TOKEN) {
    return NextResponse.json({ error: 'JIRA_EMAIL e JIRA_API_TOKEN não configurados no .env.local' }, { status: 500 })
  }

  const auth = 'Basic ' + Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')

  const { searchParams } = new URL(request.url)
  const project = searchParams.get('project') ?? 'todos'
  const status = searchParams.get('status') ?? 'todos'
  const search = searchParams.get('search') ?? ''

  let jql = `project in (${PROJECTS})`
  if (project !== 'todos') jql += ` AND project = ${project}`
  if (status !== 'todos') jql += ` AND status = "${status}"`
  if (search) jql += ` AND summary ~ "${search}"`
  jql += ' ORDER BY updated DESC'

  try {
    const res = await fetch(`${BASE}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql, maxResults: 100, fields: ['summary', 'status', 'issuetype', 'priority', 'assignee', 'project', 'updated', 'created', 'duedate', 'customfield_10014'] }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const data = await res.json()
    const now = Date.now()
    const issues = (data.issues ?? []).map((i: any) => {
      const sprintArr = i.fields.customfield_10014
      const activeSprint = Array.isArray(sprintArr)
        ? (sprintArr.find((s: any) => s.state === 'active') ?? sprintArr[sprintArr.length - 1] ?? null)
        : null
      const dueDate = i.fields.duedate ?? null
      const daysRemaining = dueDate
        ? Math.ceil((new Date(dueDate).getTime() - now) / 86400000)
        : null
      return {
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
        dueDate,
        daysRemaining,
        sprint: activeSprint?.name ?? null,
        url: `${BASE}/browse/${i.key}`,
      }
    })

    return NextResponse.json({ total: data.total, issues }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
