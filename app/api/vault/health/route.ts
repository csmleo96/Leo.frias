import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, getSystemHealth, vaultLog } from '@/lib/vault'

export const GET = withRBAC('monitoring.read', async (req, { role }) => {
  const health = await getSystemHealth()

  await vaultLog({
    action:   'customer.view',
    resource: 'vault:health',
    result:   'success',
    origin:   'api:vault/health',
  })

  return NextResponse.json({ ok: true, role, health })
})
