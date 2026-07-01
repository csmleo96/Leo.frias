import { NextResponse } from 'next/server'
import { withRBAC, getStorageUsage } from '@/lib/vault'

export const GET = withRBAC('monitoring.read', async () => {
  const usage = getStorageUsage()
  return NextResponse.json({ ok: true, usage })
})
