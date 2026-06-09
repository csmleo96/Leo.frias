import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = await createClient()

  try {
    // Buscar logs de execução
    const { data: logs, error } = await sb
      .from('audit_log')
      .select('*')
      .eq('action', 'executive_daily_report_sent')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erro ao buscar logs:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    // Calcular próxima execução (09:00 AM São Paulo)
    const now = new Date()
    const nextExecution = new Date(now)
    nextExecution.setHours(9, 0, 0, 0)

    // Se já passou das 09:00 hoje, próxima execução é amanhã
    if (now.getHours() >= 9) {
      nextExecution.setDate(nextExecution.getDate() + 1)
    }

    // Converter para UTC para retornar
    const nextExecutionUTC = new Date(nextExecution.getTime() + 3 * 60 * 60 * 1000) // São Paulo é UTC-3

    // Última execução
    const lastLog = logs?.[0]
    const lastExecution = lastLog?.created_at || null

    // Mapear logs para formato esperado
    const formattedLogs = (logs || []).map((log: any) => ({
      id: log.id,
      executedAt: log.created_at,
      status: log.level === 'error' ? 'failed' : 'success',
      deliveryTime: log.metadata?.deliveryTime || 0,
      recipients: log.metadata?.recipients || [],
      errorMessage: log.error_message || undefined,
      metadata: log.metadata || {},
    }))

    return NextResponse.json({
      nextExecution: nextExecutionUTC.toISOString(),
      lastExecution: lastExecution ? new Date(lastExecution).toISOString() : null,
      timezone: 'America/Sao_Paulo',
      schedule: '09:00 AM diariamente',
      isActive: true,
      logs: formattedLogs,
    })
  } catch (error) {
    console.error('Erro ao obter status:', error)
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    )
  }
}
