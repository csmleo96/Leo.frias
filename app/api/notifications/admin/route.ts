import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const sb = await createClient()
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? 50)

  try {
    const { data, error } = await sb
      .from('notification_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Calculate statistics
    const stats = {
      total: data?.length || 0,
      success: data?.filter(d => d.status === 'success').length || 0,
      failed: data?.filter(d => d.status === 'failed').length || 0,
      partial: data?.filter(d => d.status === 'partial').length || 0,
      avgDeliveryTime: data && data.length > 0
        ? Math.round(data.reduce((sum, d) => sum + (d.delivery_time || 0), 0) / data.length)
        : 0,
    }

    // Last execution
    const lastExecution = data && data.length > 0 ? data[0] : null

    return NextResponse.json({
      ok: true,
      stats,
      lastExecution,
      logs: data || [],
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Erro ao buscar logs:', error)
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const sb = await createClient()
  const body = await request.json()

  // Resend action
  if (body.action === 'resend') {
    const { logId } = body

    try {
      // Get the original log
      const { data: log, error: logError } = await sb
        .from('notification_logs')
        .select('*')
        .eq('id', logId)
        .single()

      if (logError) throw logError
      if (!log) return NextResponse.json({ ok: false, error: 'Log not found' }, { status: 404 })

      // Resend the notification
      const resendResult = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/daily`, {
        method: 'POST',
        cache: 'no-store',
      })

      const resendData = await resendResult.json()

      return NextResponse.json({
        ok: resendResult.ok,
        resendData,
        originalLog: log,
      })
    } catch (error) {
      console.error('Erro ao reenviar notificação:', error)
      return NextResponse.json(
        { ok: false, error: String(error) },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 })
}
