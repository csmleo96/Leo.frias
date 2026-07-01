import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccount, getValidToken } from '@/lib/hubspot/client'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const account = await getAccount()
    if (!account) return NextResponse.json({ ok: true, message: 'Nenhuma conta conectada' })

    // Revoke token at HubSpot (best-effort)
    try {
      const token = await getValidToken()
      if (token) {
        await fetch(`https://api.hubapi.com/oauth/v1/refresh-tokens/${token}`, { method: 'DELETE' })
      }
    } catch {}

    // Delete from Supabase
    const sb = await createClient()
    await sb.from('hubspot_accounts').update({ is_active: false }).eq('portal_id', account.portal_id)

    await sb.from('audit_log').insert({
      action: 'hubspot_disconnected',
      module: 'hubspot',
      description: `HubSpot CRM desconectado — portal ${account.portal_id}`,
      level: 'warning',
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
