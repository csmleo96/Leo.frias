'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo, useEffect, useState, memo } from 'react'
import {
  AlertTriangle, TrendingUp, TrendingDown, Activity, RefreshCw, Clock, Zap,
  ChevronRight, ArrowUpRight, ArrowDownRight, Minus, Server, BarChart3, Target,
  AlertCircle, CheckCircle2, Radio, Shield, Flame,
} from 'lucide-react'
import Link from 'next/link'

// ── Constants ──────────────────────────────────────────────────────────────
const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const H = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const d = Date.now() - new Date(iso).getTime()
  if (d < 60000) return 'agora'
  const m = Math.floor(d / 60000)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function healthStatus(score: number) {
  if (score >= 80) return { label: 'SAUDÁVEL', color: '#7dd3a8', bg: 'rgba(125,211,168,0.08)' }
  if (score >= 60) return { label: 'ATENÇÃO', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' }
  return { label: 'CRÍTICO', color: '#f87171', bg: 'rgba(248,113,113,0.08)' }
}

// ── Skeleton ───────────────────────────────────────────────────────────────
const Sk = memo(({ w = '100%', h = '16px', r = '6px' }: any) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg, rgba(143,191,194,0.06) 25%, rgba(143,191,194,0.12) 50%, rgba(143,191,194,0.06) 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite',
  }} />
))

// ── KPI Card ───────────────────────────────────────────────────────────────
const KpiCard = memo(function KpiCard({
  label, sublabel, value, icon: Icon, color, trend, loading, delay = 0,
}: any) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus

  return (
    <div className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-300"
      style={{
        background: CARD, border: `1px solid ${BORDER}`,
        animation: `fadeIn 0.5s ease both`,
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = `${color}30`
        el.style.boxShadow = `0 0 20px ${color}0d`
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = BORDER
        el.style.boxShadow = 'none'
        el.style.transform = 'translateY(0)'
      }}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend && !loading && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: trend === 'up' ? 'rgba(248,113,113,0.12)' : 'rgba(125,211,168,0.12)',
              color: trend === 'up' ? '#f87171' : '#7dd3a8',
            }}>
            <TrendIcon size={10} /> {trend === 'up' ? 'Alto' : 'Normal'}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2"><Sk h="28px" w="50%" /><Sk h="11px" w="70%" /></div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums" style={{ ...H, color: '#f3fafa' }}>
              {value ?? '—'}
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold" style={{ color }}>{label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{sublabel}</p>
          </div>
        </>
      )}
    </div>
  )
})

// ── Health Status Badge ────────────────────────────────────────────────────
const HealthBadge = memo(function HealthBadge({ score, loading }: any) {
  const h = score !== null ? healthStatus(score) : { label: '—', color: T, bg: BORDER }

  return (
    <div className="rounded-xl p-6 flex items-center gap-4" style={{ background: h.bg, border: `1px solid ${h.color}20` }}>
      <div className="w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ background: `${h.color}15`, border: `1px solid ${h.color}25` }}>
        <Shield size={22} style={{ color: h.color }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
          Status Operacional
        </p>
        {loading ? (
          <Sk h="24px" w="150px" />
        ) : (
          <p className="text-2xl font-bold mt-1" style={{ ...H, color: h.color }}>
            {h.label}
          </p>
        )}
      </div>
      <div className="ml-auto text-right">
        {!loading && score !== null && (
          <>
            <p className="text-3xl font-bold tabular-nums" style={{ ...H, color: h.color }}>
              {score}
            </p>
            <p className="text-[9px]" style={{ color: MUTED }}>Score de Saúde</p>
          </>
        )}
      </div>
    </div>
  )
})

// ── Priority Actions ────────────────────────────────────────────────────────
const PriorityActions = memo(function PriorityActions({ actions, loading }: any) {
  const LEVEL_COLOR = {
    critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)', dot: '#ef4444', icon: Flame },
    warning: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.20)', dot: '#fbbf24', icon: AlertTriangle },
    info: { bg: 'rgba(143,191,194,0.08)', border: 'rgba(143,191,194,0.15)', dot: T, icon: AlertCircle },
  }

  return (
    <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} style={{ color: '#fbbf24' }} />
        <p className="text-sm font-bold" style={{ ...H, color: '#f3fafa' }}>O que Requer Atenção</p>
        {!loading && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
            {actions.length} item(ns)
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Sk key={i} h="48px" r="8px" />)}</div>
      ) : actions.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2 opacity-30" style={{ color: '#7dd3a8' }} />
          <p className="text-xs" style={{ color: MUTED }}>Nenhuma ação urgente identificada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((a: any, i: number) => {
            const s = LEVEL_COLOR[a.level as keyof typeof LEVEL_COLOR] || LEVEL_COLOR.info
            const Icon = s.icon
            return (
              <Link key={i} href={a.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:opacity-80 transition-all"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <Icon size={14} style={{ color: s.dot, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: '#f3fafa' }}>{a.title}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: MUTED }}>{a.description}</p>
                </div>
                <ChevronRight size={12} style={{ color: s.dot, flexShrink: 0 }} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
})

// ── Infrastructure Panel ───────────────────────────────────────────────────
const InfraPanel = memo(function InfraPanel({ infra, loading }: any) {
  return (
    <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <Server size={16} style={{ color: '#fbbf24' }} />
        <p className="text-sm font-bold" style={{ ...H, color: '#f3fafa' }}>Saúde da Infraestrutura</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <Sk key={i} h="40px" r="8px" />)}</div>
      ) : (
        <div className="space-y-3">
          {/* Availability */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: '#f3fafa' }}>Disponibilidade</p>
              <span className="text-sm font-bold tabular-nums"
                style={{ color: infra.availability >= 99 ? '#7dd3a8' : infra.availability >= 95 ? '#fbbf24' : '#f87171' }}>
                {infra.availability}%
              </span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: BORDER }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${infra.availability}%`,
                  background: infra.availability >= 99 ? '#7dd3a8' : infra.availability >= 95 ? '#fbbf24' : '#f87171',
                }} />
            </div>
          </div>

          {/* Hosts */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total', value: infra.hostsTotal, color: T },
              { label: 'Online', value: infra.hostsUp, color: '#7dd3a8' },
              { label: 'Down', value: infra.hostsDown, color: '#f87171' },
            ].map(h => (
              <div key={h.label} className="rounded-lg p-2 text-center"
                style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${BORDER}` }}>
                <p className="text-xs font-bold tabular-nums" style={{ color: h.color }}>{h.value}</p>
                <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>{h.label}</p>
              </div>
            ))}
          </div>

          {/* Severity count */}
          {(infra.criticalProblems > 0 || infra.highProblems > 0) && (
            <div className="pt-2 border-t" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: MUTED }}>Problemas</span>
                <div className="flex items-center gap-2">
                  {infra.criticalProblems > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                      🔴 {infra.criticalProblems}
                    </span>
                  )}
                  {infra.highProblems > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
                      🟠 {infra.highProblems}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <Link href="/zabbix" className="mt-2 text-xs flex items-center gap-1 hover:opacity-80"
            style={{ color: T, fontWeight: 500 }}>
            Ver Monitoramento <ChevronRight size={11} />
          </Link>
        </div>
      )}
    </div>
  )
})

// ── Source Health ────────────────────────────────────────────────────────────
const SourceHealth = memo(function SourceHealth({ sources, loading }: any) {
  return (
    <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <p className="text-sm font-bold mb-4" style={{ ...H, color: '#f3fafa' }}>Health por Fonte</p>

      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <Sk key={i} h="60px" r="8px" />)}</div>
      ) : (
        <div className="space-y-3">
          {Object.entries(sources).map(([source, data]: any) => {
            const total = data.total || 0
            const resolved = data.resolved || 0
            const breached = data.breached || 0
            const rate = total > 0 ? Math.round((resolved / total) * 100) : 0
            const color = rate >= 70 ? '#7dd3a8' : rate >= 50 ? '#fbbf24' : '#f87171'

            return (
              <div key={source}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: source === 'glpi' ? '#a78bfa' : T }}>
                    {source}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tabular-nums" style={{ color }}>{rate}%</span>
                    <span className="text-[10px]" style={{ color: MUTED }}>({resolved}/{total})</span>
                  </div>
                </div>
                <div className="h-1 rounded-full" style={{ background: BORDER }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
                </div>
                {breached > 0 && (
                  <p className="text-[9px] mt-0.5" style={{ color: '#f87171' }}>⚠️ {breached} SLA vencido</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

// ── Recent Activity ────────────────────────────────────────────────────────
const RecentActivity = memo(function RecentActivity({ activity, loading }: any) {
  return (
    <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold" style={{ ...H, color: '#f3fafa' }}>Atividade Recente</p>
        <Link href="/operacoes" className="text-[10px] flex items-center gap-0.5 hover:opacity-80" style={{ color: T }}>
          Ver tudo <ChevronRight size={10} />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Sk key={i} h="32px" r="6px" />)}</div>
      ) : activity.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: MUTED }}>Nenhuma atividade recente</p>
      ) : (
        <div className="space-y-1">
          {activity.slice(0, 8).map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-white/[0.02] transition-colors">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-semibold shrink-0"
                style={{ background: `${a.source === 'GLPI' ? '#a78bfa' : T}15`, color: a.source === 'GLPI' ? '#a78bfa' : T }}>
                {a.source}
              </span>
              <p className="text-[11px] flex-1 truncate" style={{ color: '#f3fafa' }}>{a.title}</p>
              <p className="text-[10px] shrink-0" style={{ color: MUTED }}>{timeAgo(a.timestamp)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const now = new Date()
  const [lastUpdate, setLastUpdate] = useState<Date>(now)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  useEffect(() => {
    if (data?.timestamp) setLastUpdate(new Date(data.timestamp))
  }, [data])

  const metrics = data?.metrics || {}
  const infra = data?.infrastructure || {}
  const health = data?.health || {}
  const actions = data?.priorityActions || []
  const activity = data?.recentActivity || []
  const sources = data?.sources || {}

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ ...H, color: '#f3fafa' }}>
              Executive Command Center
            </h1>
            <p className="text-sm mt-1 flex items-center gap-2" style={{ color: MUTED }}>
              <Clock size={12} /> {formatDate(now)} — {formatTime(now)}
            </p>
          </div>
          <button onClick={() => refetch()} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUTED }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = `${T}30`
              el.style.color = T
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = BORDER
              el.style.color = MUTED
            }}>
            {isLoading ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Atualizar
          </button>
        </div>

        {/* ── Health Status + Last Update ── */}
        <HealthBadge score={health.score} loading={isLoading} />

        {/* ── Executive Metrics ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: MUTED }}>
            <BarChart3 size={10} /> Métricas Operacionais
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total de Chamados" sublabel="GLPI + Jira" value={metrics.totalTickets} icon={AlertTriangle} color={T} loading={isLoading} delay={0} />
            <KpiCard label="Em Aberto" sublabel="Aguardando resolução" value={metrics.openTickets} icon={Radio} color="#fb923c" loading={isLoading} delay={100} />
            <KpiCard label="SLA Vencido" sublabel={`${metrics.breachPct ?? 0}% do portfólio`} value={metrics.totalBreached} icon={AlertTriangle} color="#f87171" trend={metrics.totalBreached > 5 ? 'up' : 'down'} loading={isLoading} delay={200} />
            <KpiCard label="Em Risco" sublabel={`${metrics.atRiskPct ?? 0}% próximo vencimento`} value={metrics.totalAtRisk} icon={AlertCircle} color="#fbbf24" trend={metrics.totalAtRisk > 3 ? 'up' : 'down'} loading={isLoading} delay={300} />
          </div>
        </div>

        {/* ── Priority Actions + Infra Side Panel ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <PriorityActions actions={actions} loading={isLoading} />
          </div>
          <div>
            <InfraPanel infra={infra} loading={isLoading} />
          </div>
        </div>

        {/* ── Source Health + Activity ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SourceHealth sources={sources} loading={isLoading} />
          <RecentActivity activity={activity} loading={isLoading} />
        </div>

        {/* ── Resolution Rate ── */}
        <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold" style={{ ...H, color: '#f3fafa' }}>Taxa de Resolução</p>
              <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Chamados resolvidos vs. total</p>
            </div>
            <p className="text-4xl font-bold tabular-nums" style={{ ...H, color: '#7dd3a8' }}>
              {metrics.resolutionRate ?? 0}%
            </p>
          </div>
          {isLoading ? (
            <Sk h="8px" />
          ) : (
            <div className="h-2 rounded-full" style={{ background: BORDER }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${metrics.resolutionRate ?? 0}%`, background: '#7dd3a8' }} />
            </div>
          )}
          {!isLoading && metrics.resolvedToday > 0 && (
            <p className="text-[10px] mt-3" style={{ color: MUTED }}>
              🎯 {metrics.resolvedToday} chamados resolvidos hoje
            </p>
          )}
        </div>

      </div>
    </>
  )
}
