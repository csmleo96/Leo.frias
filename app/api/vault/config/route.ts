import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, getConfig, updateConfig, vaultLog } from '@/lib/vault'

export const GET = withRBAC('config.read', async (_req) => {
  const config = getConfig()
  return NextResponse.json({ ok: true, config })
})

export const PUT = withRBAC('config.write', async (req) => {
  const body = await req.json()
  const updated = updateConfig(body)

  await vaultLog({
    action:   'config.update',
    resource: 'vault:config',
    result:   'success',
    origin:   'api:vault/config',
    metadata: { keys: Object.keys(body) },
  })

  return NextResponse.json({ ok: true, config: updated })
})
