import { NextResponse } from 'next/server'
import { getAccount } from '@/lib/hubspot/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const account = await getAccount()
    if (!account) return NextResponse.json({ connected: false })

    return NextResponse.json({
      connected: true,
      portalId: account.portal_id,
      hubDomain: account.hub_domain,
      hubName: account.hub_name,
      connectedAt: account.connected_at,
      lastSyncAt: account.last_sync_at,
      tokenExpiresAt: account.token_expires_at,
      scope: account.scope,
    })
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message })
  }
}
