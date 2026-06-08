import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const JIRA_PRIORITY_NUM: Record<string, number> = { Highest: 6, High: 5, Medium: 3, Low: 2, Lowest: 1 }

export async function GET() {
  const sb = await createClient()

  const [glpiRes, jiraRes, syncRes] = await Promise.all([
    sb.from('glpi_tickets').select('*').order('updated_at', { ascending: false }),
    sb.from('jira_tickets').select('*').order('updated_at', { ascending: false }),
    sb.from('sync_log').select('synced_at, glpi_synced, jira_synced, error').order('synced_at', { ascending: false }).limit(1),
  ])

  const glpi = (glpiRes.data ?? []).map((t: any) => ({
    id: `glpi-${t.id}`,
    rawId: t.id,
    source: 'glpi' as const,
    title: t.title ?? '(sem título)',
    status: t.status_label ?? '—',
    statusNum: t.status ?? 0,
    priority: t.priority_label ?? '—',
    priorityNum: t.priority ?? 3,
    assignee: t.assignee ?? null,
    project: 'GLPI',
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    slaHours: t.sla_hours ?? 24,
    slaDeadline: t.sla_deadline,
    slaStatus: t.sla_status ?? 'unknown',
    url: null as null,
  }))

  const jira = (jiraRes.data ?? []).map((t: any) => ({
    id: `jira-${t.key}`,
    rawId: t.key,
    source: 'jira' as const,
    title: t.summary ?? '(sem título)',
    status: t.status ?? '—',
    statusNum: 0,
    statusCategory: t.status_category ?? '',
    priority: t.priority ?? '—',
    priorityNum: t.priority_num ?? JIRA_PRIORITY_NUM[t.priority] ?? 3,
    assignee: t.assignee ?? null,
    project: t.project_key ?? 'Jira',
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    slaHours: t.sla_hours ?? 24,
    slaDeadline: t.sla_deadline,
    slaStatus: t.sla_status ?? 'unknown',
    url: t.url ?? null,
  }))

  const tickets = [...glpi, ...jira].sort((a, b) =>
    (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
  )

  const lastSync = syncRes.data?.[0] ?? null

  return NextResponse.json(
    { tickets, lastSync },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
