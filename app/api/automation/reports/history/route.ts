import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sb = await createClient()
    const { data, error } = await sb
      .from('notification_logs')
      .select('id, executed_at, status, channel, delivery_time, recipients, kpis, error_message, metadata')
      .order('executed_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ logs: data ?? [] })
  } catch (err: any) {
    // notification_logs table may not exist — return empty
    return NextResponse.json({ logs: [] })
  }
}
