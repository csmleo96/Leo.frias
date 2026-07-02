import { NextResponse } from 'next/server'
import { withRBAC, getAuditLogs, vaultLog } from '@/lib/vault'
import type { AuditAction } from '@/types/vault'

export const GET = withRBAC('audit.read', async (req) => {
  const { searchParams } = new URL(req.url)

  const logs = await getAuditLogs({
    limit:    parseInt(searchParams.get('limit')  ?? '50'),
    offset:   parseInt(searchParams.get('offset') ?? '0'),
    action:   searchParams.get('action') as AuditAction | undefined ?? undefined,
    resource: searchParams.get('resource') ?? undefined,
    userId:   searchParams.get('userId')   ?? undefined,
    from:     searchParams.get('from')     ?? undefined,
    to:       searchParams.get('to')       ?? undefined,
  })

  await vaultLog({
    action:   'report.view',
    resource: 'vault:audit',
    result:   'success',
    origin:   'api:vault/audit',
    metadata: { count: logs.length },
  })

  return NextResponse.json({ ok: true, logs, count: logs.length })
})
