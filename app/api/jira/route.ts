import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PROJECTS = 'HV, IDB, MSPINFRA, MSPPRO, NMA'
const JIRA_FIELDS = [
  'summary', 'status', 'issuetype', 'priority', 'assignee',
  'project', 'updated', 'created', 'duedate', 'resolutiondate',
  'customfield_10014',  // sprint
  'customfield_10016',  // story points
]
const MAX_RESULTS  = 100  // Jira Cloud hard limit per page
const MAX_PAGES    = 3    // Fetch up to 300 issues total

// POST /rest/api/3/search/jql uses cursor-based pagination (nextPageToken).
// GET  /rest/api/3/search   uses offset-based (startAt) — still available as fallback.
// POST /rest/api/3/search   is 410 Gone in recent Jira Cloud.

function normalizeIssue(i: any, BASE: string, now: number) {
  const sprintArr    = i.fields.customfield_10014
  const activeSprint = Array.isArray(sprintArr)
    ? (sprintArr.find((s: any) => s.state === 'active') ?? sprintArr[sprintArr.length - 1] ?? null)
    : null

  const dueDate      = i.fields.duedate ?? null
  const resolvedDate = i.fields.resolutiondate ?? null
  const createdDate  = i.fields.created ?? null

  const daysRemaining = dueDate
    ? Math.ceil((new Date(dueDate).getTime() - now) / 86_400_000)
    : null

  // MTTR: resolution date minus creation date in days
  const resolutionDays = resolvedDate && createdDate
    ? Math.ceil((new Date(resolvedDate).getTime() - new Date(createdDate).getTime()) / 86_400_000)
    : null

  const statusCategory = i.fields.status?.statusCategory?.key ?? 'undefined'
  // Jira statusCategory keys: 'new' (To Do), 'indeterminate' (In Progress), 'done'
  const isInProgress = statusCategory === 'indeterminate'
  const isDone       = statusCategory === 'done'
  const isNew        = statusCategory === 'new' || statusCategory === 'undefined'

  return {
    key:            i.key,
    summary:        i.fields.summary,
    status:         i.fields.status?.name ?? '—',
    statusCategory,
    inProgress:     isInProgress,
    done:           isDone,
    isNew,
    type:           i.fields.issuetype?.name ?? '—',
    priority:       i.fields.priority?.name ?? '—',
    assignee:       i.fields.assignee?.displayName ?? null,
    project:        { key: i.fields.project?.key, name: i.fields.project?.name },
    updated:        i.fields.updated,
    created:        createdDate,
    dueDate,
    resolvedDate,
    resolutionDays,
    daysRemaining,
    sprint:         activeSprint?.name ?? null,
    url:            `${BASE}/browse/${i.key}`,
  }
}

export async function GET(request: NextRequest) {
  const BASE  = process.env.JIRA_BASE_URL
  const EMAIL = process.env.JIRA_EMAIL
  const TOKEN = process.env.JIRA_API_TOKEN

  if (!BASE || !EMAIL || !TOKEN) {
    return NextResponse.json(
      { error: 'JIRA_EMAIL e JIRA_API_TOKEN não configurados no .env.local' },
      { status: 500 }
    )
  }

  const auth = 'Basic ' + Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')

  const { searchParams } = new URL(request.url)
  const project = searchParams.get('project') ?? 'todos'
  const status  = searchParams.get('status')  ?? 'todos'
  const search  = searchParams.get('search')  ?? ''

  let jql = `project in (${PROJECTS})`
  if (project !== 'todos') jql += ` AND project = ${project}`
  if (status  !== 'todos') jql += ` AND status = "${status}"`
  if (search)              jql += ` AND summary ~ "${search}"`
  jql += ' ORDER BY updated DESC'

  try {
    const now = Date.now()
    const allIssues: ReturnType<typeof normalizeIssue>[] = []
    let jiraTotal = 0

    // POST /rest/api/3/search/jql — cursor-based (nextPageToken), replaces deprecated endpoints
    let nextPageToken: string | undefined = undefined
    for (let page = 0; page < MAX_PAGES; page++) {
      const body: Record<string, unknown> = {
        jql,
        maxResults: MAX_RESULTS,
        fields: JIRA_FIELDS,
        ...(nextPageToken ? { nextPageToken } : {}),
      }

      const res = await fetch(`${BASE}/rest/api/3/search/jql`, {
        method: 'POST',
        headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })

      if (!res.ok) {
        const err = await res.text()
        if (page === 0) return NextResponse.json({ error: err }, { status: res.status })
        break // partial data — stop pagination but return what we have
      }

      const data = await res.json()
      // /search/jql does not return `total`; accumulate from fetched pages
      const pageIssues = (data.issues ?? []).map((i: any) => normalizeIssue(i, BASE, now))
      allIssues.push(...pageIssues)

      // Stop when there is no cursor for the next page (last page)
      nextPageToken = data.nextPageToken ?? undefined
      if (!nextPageToken) break
      if (allIssues.length >= jiraTotal) break
    }

    // Aggregated metrics
    const open       = allIssues.filter(i => !i.done)
    const done       = allIssues.filter(i => i.done)
    const inProgress = allIssues.filter(i => i.inProgress)
    const backlog    = allIssues.filter(i => i.isNew)
    const overdue    = open.filter(i => i.daysRemaining !== null && i.daysRemaining < 0)
    const dueSoon    = open.filter(i => i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 7)
    const critical   = open.filter(i => ['Highest', 'High'].includes(i.priority ?? ''))
    const unassigned = open.filter(i => !i.assignee)

    // MTTR: average resolution time for done issues with resolutionDays
    const resolvedWithTime = done.filter(i => i.resolutionDays !== null && i.resolutionDays >= 0)
    const avgResolutionDays = resolvedWithTime.length > 0
      ? Math.round(resolvedWithTime.reduce((s, i) => s + (i.resolutionDays ?? 0), 0) / resolvedWithTime.length)
      : null

    // SLA compliance: issues with due date that were resolved before deadline
    const withDue      = done.filter(i => i.dueDate && i.resolvedDate)
    const resolvedOnTime = withDue.filter(i =>
      new Date(i.resolvedDate!).getTime() <= new Date(i.dueDate!).getTime()
    )
    const slaCompliance = withDue.length > 0
      ? Math.round((resolvedOnTime.length / withDue.length) * 100)
      : null

    jiraTotal = allIssues.length
    return NextResponse.json({
      total:          jiraTotal,
      fetched:        allIssues.length,
      truncated:      !!nextPageToken, // true if there are more pages not fetched
      issues:         allIssues,
      summary: {
        open:           open.length,
        done:           done.length,
        inProgress:     inProgress.length,
        backlog:        backlog.length,
        overdue:        overdue.length,
        dueSoon:        dueSoon.length,
        critical:       critical.length,
        unassigned:     unassigned.length,
        avgResolutionDays,
        slaCompliance,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
