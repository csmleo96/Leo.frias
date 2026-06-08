'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, memo } from 'react'
import {
  RefreshCw, AlertTriangle, CheckCircle2, TrendingDown, Clock, Users, Zap,
  AlertCircle, ChevronRight, Download, Share2, BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Constants ──────────────────────────────────────────────────────────────
const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const H = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }

// ── Skeleton ───────────────────────────────────────────────────────────────
const Sk = memo(({ w = '100%', h = '16px', r = '6px' }: any) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg, rgba(143,191,194,0.06) 25%, rgba(143,191,194,0.12) 50%, rgba(143,191,194,0.06) 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite',
  }} />
))

// ── Health Badge ───────────────────────────────────────────────────────────
const HealthBadge = memo(function HealthBadge({ health }: any) {
  const config = {
    healthy: { emoji: '🟢', label: 'HEALTHY', color: '#7dd3a8', bg: 'rgba(125,211,168,0.08)' },
    attention: { emoji: '🟡', label: 'ATTENTION', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
    critical: { emoji: '🔴', label: 'CRITICAL', color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  }[health] || config.healthy

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: config.bg, border: `1px solid ${config.color}30` }}>
      <span className="text-xl">{config.emoji}</span>
      <span className="font-bold text-sm uppercase tracking-wide" style={{ color: config.color }}>{config.label}</span>
    </div>
  )
})

// ── Metric Card ────────────────────────────────────────────────────────────
const MetricCard = memo(function MetricCard({ label, value, color, icon: Icon, subtext }: any) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase" style={{ color: MUTED }}>{label}</span>
        <Icon size={16} style={{ color }} />
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ ...H, color }}>{value}</p>
      {subtext && <p className="text-[10px]" style={{ color: MUTED }}>{subtext}</p>}
    </div>
  )
})

// ── Risk Card ──────────────────────────────────────────────────────────────
const RiskCard = memo(function RiskCard({ risk }: any) {
  const colorMap = { critical: '#f87171', high: '#fbbf24', medium: '#fb923c', low: '#7dd3a8' }
  const color = colorMap[risk.severity as keyof typeof colorMap] || colorMap.low
  const Icon = AlertTriangle

  return (
    <div className="rounded-lg p-4 border" style={{ background: CARD, borderColor: `${color}30` }}>
      <div className="flex items-start gap-3">
        <Icon size={16} style={{ color, flexShrink: 0 }} className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: '#f3fafa' }}>{risk.title}</p>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: MUTED }}>{risk.description}</p>
          <div className="mt-2 flex items-start gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5" style={{ background: `${color}15`, color }}>
              {risk.severity.toUpperCase()}
            </span>
          </div>
          <p className="text-[10px] mt-1" style={{ color }}>💡 {risk.action}</p>
        </div>
      </div>
    </div>
  )
})

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ExecutiveDailyReportPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['executive-daily-report'],
    queryFn: () => fetch('/api/reports/executive-daily').then(r => r.json()),
    staleTime: 0,
  })

  const report = data || {}
  const health = report.health || 'healthy'
  const metrics = report.metrics || {}
  const jira = report.jira || {}
  const glpi = report.glpi || {}
  const risks = report.risks || []
  const recommendations = report.recommendations || []
  const summary = report.executiveSummary || ''

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold" style={{ ...H, color: '#f3fafa' }}>
              Executive Daily Report
            </h1>
            <p className="text-sm mt-2" style={{ color: MUTED }}>
              {isLoading ? 'Carregando...' : new Date(report.generatedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="animate-spin"><RefreshCw size={20} style={{ color: MUTED }} /></div>
            ) : (
              <>
                <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-white/5 transition-all" style={{ color: MUTED }}>
                  <RefreshCw size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Health Status */}
        {!isLoading && <HealthBadge health={health} />}

        {/* Executive Summary */}
        <div className="rounded-xl p-6 lg:p-8" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ ...H, color: MUTED }}>Executive Summary</p>
          {isLoading ? (
            <div className="space-y-3"><Sk /><Sk w="95%" /><Sk w="90%" /></div>
          ) : (
            <p className="text-base leading-relaxed" style={{ color: '#f3fafa' }}>{summary}</p>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: MUTED }}>
            <BarChart3 size={10} /> Principais Indicadores
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total Aberto" value={metrics.totalOpen || 0} color={T} icon={AlertCircle} subtext={`${metrics.totalCritical || 0} críticos`} />
            <MetricCard label="Resolvidos" value={metrics.totalResolved || 0} color="#7dd3a8" icon={CheckCircle2} subtext={`${metrics.jiraCompleted || 0} hoje`} />
            <MetricCard label="Vencidos" value={(metrics.jiraOverdue || 0) + (metrics.glpiUnattended || 0)} color="#f87171" icon={TrendingDown} subtext="Exigem ação" />
            <MetricCard label="Sem Responsável" value={metrics.jiraUnassigned || 0} color="#fbbf24" icon={Users} subtext="Jira" />
          </div>
        </div>

        {/* Jira Section */}
        <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: T }} />
            <p className="text-lg font-bold" style={{ ...H, color: '#f3fafa' }}>Jira — Delivery Status</p>
          </div>
          {isLoading ? (
            <Sk h="40px" />
          ) : (
            <div className="space-y-4">
              {jira.completedDetails && jira.completedDetails.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase mb-2" style={{ color: MUTED }}>Concluídas Hoje ({jira.completedDetails.length})</p>
                  <div className="space-y-1">
                    {jira.completedDetails.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(125,211,168,0.08)', border: '1px solid rgba(125,211,168,0.15)' }}>
                        <span className="text-xs font-mono" style={{ color: T }}>{item.key}</span>
                        <span className="text-xs truncate mx-2 flex-1" style={{ color: '#f3fafa' }}>{item.summary.substring(0, 40)}</span>
                        <span className="text-[10px]" style={{ color: MUTED }}>{item.assignee}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jira.overdueDetails && jira.overdueDetails.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#f87171' }}>Vencidas ({jira.overdueDetails.length})</p>
                  <div className="space-y-1">
                    {jira.overdueDetails.slice(0, 5).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
                        <span className="text-xs font-mono" style={{ color: '#f87171' }}>{item.key}</span>
                        <span className="text-xs truncate mx-2 flex-1" style={{ color: '#f3fafa' }}>{item.summary.substring(0, 40)}</span>
                        <span className="text-[10px] font-bold" style={{ color: '#f87171' }}>+{Math.abs(item.daysOverdue)}d</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jira.criticalDetails && jira.criticalDetails.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#fbbf24' }}>Críticas em Aberto ({jira.criticalDetails.length})</p>
                  <div className="space-y-1">
                    {jira.criticalDetails.slice(0, 5).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                        <span className="text-xs font-mono" style={{ color: '#fbbf24' }}>{item.key}</span>
                        <span className="text-xs truncate mx-2 flex-1" style={{ color: '#f3fafa' }}>{item.summary.substring(0, 40)}</span>
                        <span className="text-[10px]" style={{ color: MUTED }}>{item.assignee}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* GLPI Section */}
        <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} style={{ color: '#a78bfa' }} />
            <p className="text-lg font-bold" style={{ ...H, color: '#f3fafa' }}>GLPI — Operational Overview</p>
          </div>
          {isLoading ? (
            <Sk h="40px" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Total', value: glpi.total, color: T },
                { label: 'Abertos', value: glpi.open, color: '#fb923c' },
                { label: 'Críticos', value: glpi.critical, color: '#f87171' },
                { label: 'Pendentes', value: glpi.pending, color: '#fbbf24' },
                { label: 'Sem Atendimento', value: glpi.unattended, color: '#f87171' },
              ].map(m => (
                <div key={m.label} className="rounded p-3 text-center" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}` }}>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-[10px] mt-1" style={{ color: MUTED }}>{m.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risks Section */}
        {risks.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: MUTED }}>
              <Zap size={10} /> Executive Risks ({risks.length})
            </p>
            <div className="space-y-3">
              {isLoading ? (
                [...Array(2)].map((_, i) => <Sk key={i} h="100px" r="8px" />)
              ) : (
                risks.map((risk: any, i: number) => <RiskCard key={i} risk={risk} />)
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ ...H, color: MUTED }}>Executive Recommendations</p>
            <div className="space-y-2">
              {isLoading ? (
                [...Array(3)].map((_, i) => <Sk key={i} h="20px" w="80%" />)
              ) : (
                recommendations.map((rec: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2">
                    <ChevronRight size={14} className="mt-0.5 shrink-0" style={{ color: T }} />
                    <p className="text-sm leading-relaxed" style={{ color: '#f3fafa' }}>{rec}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
