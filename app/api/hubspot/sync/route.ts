import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccount, syncObject } from '@/lib/hubspot/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const objectType = (searchParams.get('type') ?? 'all') as 'contacts' | 'companies' | 'deals' | 'tickets' | 'all'

  try {
    const account = await getAccount()
    if (!account) return NextResponse.json({ error: 'HubSpot não conectado' }, { status: 401 })

    const sb = await createClient()
    const portalId = account.portal_id
    const startedAt = new Date().toISOString()

    const { data: logRow } = await sb.from('hubspot_sync_log').insert({
      portal_id: portalId,
      sync_type: 'full',
      object_type: objectType,
      status: 'running',
      started_at: startedAt,
    }).select().single()

    const logId = logRow?.id

    const types: Array<'contacts' | 'companies' | 'deals' | 'tickets'> =
      objectType === 'all' ? ['contacts', 'companies', 'deals', 'tickets'] : [objectType]

    let totalSynced = 0
    const results: Record<string, { synced: number; errors: number }> = {}

    for (const type of types) {
      try {
        const r = await syncObject(type, portalId)
        results[type] = r
        totalSynced += r.synced
      } catch (err: any) {
        results[type] = { synced: 0, errors: 1 }
        console.error(`Sync error for ${type}:`, err.message)
      }
    }

    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - new Date(startedAt).getTime()

    // Update sync log
    if (logId) {
      await sb.from('hubspot_sync_log').update({
        status: 'success',
        records_synced: totalSynced,
        finished_at: finishedAt.toISOString(),
        duration_ms: durationMs,
      }).eq('id', logId)
    }

    // Update account last_sync_at
    await sb.from('hubspot_accounts').update({ last_sync_at: finishedAt.toISOString() }).eq('portal_id', portalId)

    return NextResponse.json({
      ok: true,
      totalSynced,
      durationMs,
      results,
      syncedAt: finishedAt.toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const sb = await createClient()
    const { data } = await sb.from('hubspot_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)
    return NextResponse.json({ logs: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
