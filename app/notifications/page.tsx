'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, memo } from 'react'
import {
  Send, CheckCircle2, AlertCircle, RefreshCw, Filter, FileText, Mail, MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Constants ──────────────────────────────────────────────────────────────
const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const H = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }

// ── Skeleton ───────────────────────────────────────────────────────────────
const Sk = memo(function Sk({ w = '100%', h = '16px', r = '6px' }: { w?: string; h?: string; r?: string }) { return (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg, rgba(143,191,194,0.06) 25%, rgba(143,191,194,0.12) 50%, rgba(143,191,194,0.06) 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite',
  }} />
) })

// ── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = memo(function StatCard({ label, value, color, icon: Icon }: any) {
  return (
    <div className="rounded-xl p-5 flex flex-col items-center gap-2 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ ...H, color }}>{value ?? '—'}</p>
      <p className="text-[10px]" style={{ color: MUTED }}>{label}</p>
    </div>
  )
})

// ── Log Row ────────────────────────────────────────────────────────────────
const LogRow = memo(function LogRow({ log, onResend }: any) {
  const statusColor = log.status === 'success' ? '#7dd3a8' : log.status === 'partial' ? '#fbbf24' : '#f87171'
  const StatusIcon = log.status === 'success' ? CheckCircle2 : log.status === 'partial' ? AlertCircle : AlertCircle

  const date = new Date(log.executed_at)
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = date.toLocaleDateString('pt-BR')

  const channels = log.channel?.split(',').filter(Boolean) || []

  return (
    <div className="rounded-lg p-4 border" style={{ background: CARD, borderColor: BORDER }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <StatusIcon size={18} style={{ color: statusColor, flexShrink: 0 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#f3fafa' }}>
              {dateStr} às {timeStr}
            </p>
            <p className="text-xs mt-1" style={{ color: MUTED }}>
              {log.delivery_time ? `Entregue em ${log.delivery_time}ms` : 'Processado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-1 rounded"
            style={{ background: `${statusColor}20`, color: statusColor, textTransform: 'uppercase' }}>
            {log.status}
          </span>
          {log.status === 'failed' && (
            <button onClick={() => onResend(log.id)}
              className="px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all"
              style={{ background: `${T}12`, color: T, border: `1px solid ${T}25` }}>
              <RefreshCw size={10} /> Reenviar
            </button>
          )}
        </div>
      </div>

      {/* Channels */}
      {channels.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {channels.map((ch: string) => (
            <div key={ch} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}` }}>
              {ch === 'email' ? <Mail size={10} /> : <MessageSquare size={10} />}
              {ch === 'email' ? 'Email' : 'Teams'}
            </div>
          ))}
        </div>
      )}

      {/* Recipients */}
      {log.recipients && log.recipients.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] mb-1" style={{ color: MUTED }}>Destinatários:</p>
          {log.recipients.map((r: string, i: number) => (
            <div key={i} className="flex items-center justify-between py-1 px-2 rounded text-[11px]"
              style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${BORDER}` }}>
              <span style={{ color: '#f3fafa' }}>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      {log.kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Abertos', value: log.kpis.ticketsAbertos },
            { label: 'Resolvidos', value: log.kpis.ticketsResolvidos },
            { label: 'SLA', value: `${log.kpis.slaCumprido}%` },
            { label: 'Críticos', value: log.kpis.backlogCritico },
          ].map(kpi => (
            <div key={kpi.label} className="rounded p-2 text-center text-xs"
              style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${BORDER}` }}>
              <p style={{ color: MUTED }}>{kpi.label}</p>
              <p className="font-bold mt-1" style={{ color: '#f3fafa' }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {log.error_message && (
        <div className="rounded p-2 text-[10px]" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <p style={{ color: '#f87171', fontFamily: 'monospace' }}>{log.error_message}</p>
        </div>
      )}
    </div>
  )
})

// ── Main Page ──────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications-admin'],
    queryFn: () => fetch('/api/notifications/admin').then(r => r.json()),
    refetchInterval: 60_000,
  })

  const resendMutation = useMutation({
    mutationFn: (logId: number) =>
      fetch('/api/notifications/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', logId }),
      }).then(r => r.json()),
    onSuccess: () => {
      toast.success('Notificação reenviada com sucesso!')
      refetch()
    },
    onError: () => {
      toast.error('Erro ao reenviar notificação')
    },
  })

  const sendNowMutation = useMutation({
    mutationFn: () =>
      fetch('/api/notifications/daily', { method: 'POST' }).then(r => r.json()),
    onSuccess: () => {
      toast.success('Relatório enviado agora!')
      refetch()
    },
    onError: () => {
      toast.error('Erro ao enviar relatório')
    },
  })

  const stats = data?.stats || {}
  const lastExecution = data?.lastExecution
  const logs = data?.logs || []
  const filteredLogs = logs.filter((log: any) =>
    filter === 'all' ? true : log.status === filter
  )

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ ...H, color: '#f3fafa' }}>
              Executive Board Notifications
            </h1>
            <p className="text-sm mt-1" style={{ color: MUTED }}>Controle de envios automáticos diários às 08:00 UTC</p>
          </div>
          <button onClick={() => sendNowMutation.mutate()} disabled={sendNowMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: `${T}20`, color: T, border: `1px solid ${T}30` }}>
            {sendNowMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            Enviar Agora
          </button>
        </div>

        {/* Stats Grid — 4 Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total de Envios" value={stats.total} color={T} icon={FileText} />
          <StatCard label="Sucessos" value={stats.success} color="#7dd3a8" icon={CheckCircle2} />
          <StatCard label="Falhas" value={stats.failed} color="#f87171" icon={AlertCircle} />
          <StatCard label="Parciais" value={stats.partial} color="#fbbf24" icon={AlertCircle} />
        </div>

        {/* Last Execution Premium Card */}
        {lastExecution ? (
          <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold" style={{ color: '#f3fafa' }}>Último Envio</p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>
                  {new Date(lastExecution.executed_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <span className="text-sm font-bold px-3 py-1.5 rounded-lg"
                style={{
                  background: lastExecution.status === 'success' ? 'rgba(125,211,168,0.15)' : lastExecution.status === 'partial' ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)',
                  color: lastExecution.status === 'success' ? '#7dd3a8' : lastExecution.status === 'partial' ? '#fbbf24' : '#f87171',
                  textTransform: 'uppercase'
                }}>
                {lastExecution.status === 'success' ? '✓ Sucesso' : lastExecution.status === 'partial' ? '⚠ Parcial' : '✗ Falha'}
              </span>
            </div>

            {/* KPIs from last execution */}
            {lastExecution.kpis && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Tickets Abertos', value: lastExecution.kpis.ticketsAbertos },
                  { label: 'Resolvidos', value: lastExecution.kpis.ticketsResolvidos },
                  { label: 'SLA Cumprido', value: `${lastExecution.kpis.slaCumprido}%` },
                  { label: 'Backlog Crítico', value: lastExecution.kpis.backlogCritico },
                ].map(item => (
                  <div key={item.label} className="rounded p-3 text-center"
                    style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${BORDER}` }}>
                    <p className="text-xs mb-1" style={{ color: MUTED }}>{item.label}</p>
                    <p className="text-lg font-bold" style={{ color: '#f3fafa' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Filters */}
        {logs.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: MUTED }} />
            {(['all', 'success', 'failed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
                style={filter === f
                  ? { background: `${T}20`, color: T, border: `1px solid ${T}40` }
                  : { background: BORDER, color: MUTED, border: `1px solid ${BORDER}` }}>
                {f === 'all' ? 'Todos' : f === 'success' ? 'Sucessos' : 'Falhas'}
              </button>
            ))}
          </div>
        )}

        {/* Logs Table or Empty State */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <Sk h="24px" w="30%" />
                <div className="mt-3 space-y-2">
                  <Sk h="12px" w="60%" />
                  <Sk h="12px" w="40%" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-xl p-16 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <FileText size={48} className="mx-auto mb-4 opacity-20" style={{ color: MUTED }} />
            <p className="text-lg font-semibold mb-1" style={{ color: '#f3fafa' }}>Nenhum envio realizado até o momento</p>
            <p className="text-sm mb-6" style={{ color: MUTED }}>Os relatórios executivos enviados aparecerão aqui</p>
            <button onClick={() => sendNowMutation.mutate()} disabled={sendNowMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: `${T}20`, color: T, border: `1px solid ${T}30` }}>
              {sendNowMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar Primeiro Relatório
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log: any) => (
              <LogRow key={log.id} log={log} onResend={(id: number) => resendMutation.mutate(id)} />
            ))}
          </div>
        )}

      </div>
    </>
  )
}
