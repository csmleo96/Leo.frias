'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Clock, CheckCircle2, AlertCircle, Play, History, Settings,
  Calendar, Mail, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const H = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }

interface ScheduleLog {
  id: string
  executedAt: string
  status: 'success' | 'failed' | 'partial'
  deliveryTime: number
  recipients: string[]
  errorMessage?: string
  metadata: Record<string, any>
}

interface ScheduleStatus {
  nextExecution: string
  lastExecution?: string
  timezone: string
  schedule: string
  isActive: boolean
  logs: ScheduleLog[]
}

export default function ScheduledReportsPage() {
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['schedule-status'],
    queryFn: () => fetch('/api/reports/schedule-status').then(r => r.json()),
    refetchInterval: 30000,
  })

  const handleExecuteNow = async () => {
    setIsExecuting(true)
    try {
      const res = await fetch('/api/reports/executive-daily-send', {
        method: 'GET',
      })
      const data = await res.json()

      if (data.ok) {
        toast.success('✅ Relatório executado com sucesso!')
        await refetch()
      } else {
        toast.error('❌ Erro ao executar relatório: ' + (data.error || 'Desconhecido'))
      }
    } catch (error) {
      toast.error('Erro: ' + String(error))
    } finally {
      setIsExecuting(false)
    }
  }

  const nextExec = status?.nextExecution ? new Date(status.nextExecution) : null
  const lastExec = status?.lastExecution ? new Date(status.lastExecution) : null
  const logs = status?.logs || []

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .log-row { animation: fadeIn 0.3s ease-out; }
      `}</style>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold" style={{ ...H, color: '#f3fafa' }}>
            Agendamento de Relatórios
          </h1>
          <p className="text-sm mt-2" style={{ color: MUTED }}>
            Gerenciamento e execução manual de relatórios executivos automáticos
          </p>
        </div>

        {/* Schedule Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Geral */}
          <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase" style={{ color: MUTED }}>Status</p>
              <Clock size={16} style={{ color: T }} />
            </div>
            <p className="text-2xl font-bold mb-2" style={{ color: status?.isActive ? '#7dd3a8' : '#f87171' }}>
              {status?.isActive ? '🟢 Ativo' : '🔴 Inativo'}
            </p>
            <p className="text-xs" style={{ color: MUTED }}>
              {status?.schedule || 'Não configurado'}
            </p>
          </div>

          {/* Próxima Execução */}
          <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase" style={{ color: MUTED }}>Próx. Execução</p>
              <Calendar size={16} style={{ color: T }} />
            </div>
            {nextExec ? (
              <>
                <p className="text-lg font-bold" style={{ color: T }}>
                  {nextExec.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>
                  {nextExec.toLocaleDateString('pt-BR')}
                </p>
              </>
            ) : (
              <p className="text-xs" style={{ color: MUTED }}>Não agendado</p>
            )}
          </div>

          {/* Última Execução */}
          <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase" style={{ color: MUTED }}>Última Execução</p>
              <CheckCircle2 size={16} style={{ color: '#7dd3a8' }} />
            </div>
            {lastExec ? (
              <>
                <p className="text-lg font-bold" style={{ color: T }}>
                  {lastExec.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>
                  {lastExec.toLocaleDateString('pt-BR')}
                </p>
              </>
            ) : (
              <p className="text-xs" style={{ color: MUTED }}>Sem execuções</p>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <button
            onClick={handleExecuteNow}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all"
            style={{
              background: T,
              color: '#0a1316',
              opacity: isExecuting ? 0.7 : 1,
              cursor: isExecuting ? 'not-allowed' : 'pointer',
            }}
          >
            {isExecuting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play size={16} />
                Executar Agora
              </>
            )}
          </button>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all"
            style={{
              background: 'rgba(0,0,0,0.3)',
              color: MUTED,
              border: `1px solid ${BORDER}`,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>

        {/* Configuração Atual */}
        <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} style={{ color: T }} />
            <p className="text-lg font-bold" style={{ ...H, color: '#f3fafa' }}>Configuração</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Horário de Execução</p>
              <p className="text-sm mt-1" style={{ color: '#f3fafa' }}>09:00 AM — São Paulo (UTC-3)</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Frequência</p>
              <p className="text-sm mt-1" style={{ color: '#f3fafa' }}>Diariamente (segunda a domingo)</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Destinatários</p>
              <p className="text-sm mt-1" style={{ color: '#f3fafa' }}>
                {process.env.NEXT_PUBLIC_NOTIFICATION_EMAILS || 'leo.frias@xtentgroup.com'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Plataforma</p>
              <p className="text-sm mt-1" style={{ color: '#f3fafa' }}>Vercel Cron Job</p>
            </div>
          </div>
        </div>

        {/* Histórico de Execuções */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: MUTED }}>
            <History size={10} /> Histórico ({logs.length})
          </p>

          {logs.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <Mail size={32} className="mx-auto mb-2" style={{ color: MUTED }} />
              <p className="text-sm" style={{ color: MUTED }}>Nenhuma execução registrada ainda</p>
              <p className="text-xs mt-1" style={{ color: MUTED }}>A primeira execução automática será às 09:00 AM</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="log-row rounded-lg" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <button
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    className="w-full flex items-center justify-between p-4 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div>
                        {log.status === 'success' && <CheckCircle2 size={16} style={{ color: '#7dd3a8' }} />}
                        {log.status === 'failed' && <AlertCircle size={16} style={{ color: '#f87171' }} />}
                        {log.status === 'partial' && <AlertCircle size={16} style={{ color: '#fbbf24' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#f3fafa' }}>
                          {new Date(log.executedAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(log.executedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs mt-1 flex items-center gap-2" style={{ color: MUTED }}>
                          <span className={log.status === 'success' ? 'text-green-400' : log.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}>
                            {log.status === 'success' && '✅ Sucesso'}
                            {log.status === 'failed' && '❌ Falha'}
                            {log.status === 'partial' && '⚠️  Parcial'}
                          </span>
                          •{' '}
                          {log.deliveryTime}ms
                        </p>
                      </div>
                    </div>
                    {expandedLog === log.id ? (
                      <ChevronUp size={16} style={{ color: MUTED }} />
                    ) : (
                      <ChevronDown size={16} style={{ color: MUTED }} />
                    )}
                  </button>

                  {expandedLog === log.id && (
                    <div className="px-4 pb-4 border-t" style={{ borderColor: BORDER }}>
                      <div className="space-y-3 mt-4">
                        <div>
                          <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Destinatários</p>
                          <p className="text-xs mt-1" style={{ color: '#f3fafa' }}>
                            {log.recipients.join(', ')}
                          </p>
                        </div>
                        {log.errorMessage && (
                          <div>
                            <p className="text-xs font-semibold uppercase" style={{ color: '#f87171' }}>Erro</p>
                            <p className="text-xs mt-1 font-mono" style={{ color: '#f87171' }}>
                              {log.errorMessage}
                            </p>
                          </div>
                        )}
                        {log.metadata?.health && (
                          <div>
                            <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Status da Operação</p>
                            <p className="text-xs mt-1" style={{ color: '#f3fafa' }}>
                              {log.metadata.health === 'healthy' && '🟢 Healthy'}
                              {log.metadata.health === 'attention' && '🟡 Attention'}
                              {log.metadata.health === 'critical' && '🔴 Critical'}
                            </p>
                          </div>
                        )}
                        {log.metadata?.metrics && (
                          <div>
                            <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Métricas</p>
                            <div className="text-xs mt-1 space-y-1" style={{ color: '#f3fafa' }}>
                              <p>• Total Aberto: {log.metadata.metrics.totalOpen}</p>
                              <p>• Críticos: {log.metadata.metrics.totalCritical}</p>
                              <p>• Vencidos: {log.metadata.metrics.jiraOverdue + log.metadata.metrics.glpiUnattended}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
