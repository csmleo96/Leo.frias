import { execSync } from 'child_process'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SystemHealth, HealthStatus, IntegrationSlug } from '@/types/vault'
import { getIntegrationStatus } from './secrets'

// ── System Health ─────────────────────────────────────────────────────────────

function statusFromPercent(pct: number): HealthStatus {
  if (pct >= 90) return 'critical'
  if (pct >= 75) return 'degraded'
  return 'healthy'
}

function getDiskUsage(): SystemHealth['disk'] {
  try {
    // Windows: use wmic
    const raw = execSync('wmic logicaldisk get size,freespace,caption', { timeout: 3000 })
      .toString().trim()
    const lines = raw.split('\n').filter(l => l.includes('C:'))
    if (lines.length > 0) {
      const parts = lines[0].trim().split(/\s+/)
      const free  = parseInt(parts[1] ?? '0')
      const total = parseInt(parts[2] ?? '1')
      const used  = total - free
      const pct   = Math.round((used / total) * 100)
      const GB    = 1024 ** 3
      return {
        totalGb:     parseFloat((total / GB).toFixed(1)),
        usedGb:      parseFloat((used / GB).toFixed(1)),
        percentUsed: pct,
        status:      statusFromPercent(pct),
      }
    }
  } catch { /* fall through */ }
  return { totalGb: 0, usedGb: 0, percentUsed: 0, status: 'unknown' }
}

function getMemoryUsage(): SystemHealth['memory'] {
  try {
    const mem = process.memoryUsage()
    // Node process memory — useful proxy
    const usedMb  = Math.round(mem.rss / 1024 / 1024)
    const totalMb = 8192 // fallback; wmic would give real value
    const pct     = Math.round((usedMb / totalMb) * 100)
    return {
      totalMb,
      usedMb,
      percentUsed: pct,
      status: statusFromPercent(pct),
    }
  } catch {
    return { totalMb: 0, usedMb: 0, percentUsed: 0, status: 'unknown' }
  }
}

async function getDatabaseStatus(): Promise<SystemHealth['database']> {
  const start = Date.now()
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { error } = await supabase.from('audit_log').select('id').limit(1)
    if (error) return { status: 'degraded', message: error.message }
    return { status: 'healthy', latencyMs: Date.now() - start }
  } catch (err) {
    return { status: 'critical', message: String(err) }
  }
}

const INTEGRATION_SLUGS: IntegrationSlug[] = [
  'zabbix', 'glpi', 'jira', 'datadog', 'grafana', 'vmware', 'veeam', 'sql', 'rabbitmq', 'kubernetes'
]

export async function getSystemHealth(): Promise<SystemHealth> {
  const [db] = await Promise.all([getDatabaseStatus()])

  const integrations = INTEGRATION_SLUGS.map(slug => ({
    slug,
    status: (getIntegrationStatus(slug) === 'configured' ? 'connected' : 'disconnected') as SystemHealth['integrations'][0]['status'],
    lastSync: undefined,
  }))

  const overallStatus: HealthStatus =
    db.status === 'critical' ? 'critical' :
    integrations.some(i => i.status === 'disconnected') ? 'degraded' :
    'healthy'

  return {
    status: overallStatus,
    checkedAt: new Date().toISOString(),
    disk: getDiskUsage(),
    memory: getMemoryUsage(),
    database: db,
    integrations,
    backups: { status: 'healthy' },
    ai: {
      status: process.env.OPENAI_API_KEY ? 'healthy' : 'unknown',
      totalGenerations: 0,
    },
  }
}
