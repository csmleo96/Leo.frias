'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, useMemo, useCallback } from 'react'
import {
  Brain, RefreshCw, Loader2, AlertTriangle, TrendingUp, TrendingDown,
  Minus, Download, Send, Mail, MessageSquare, Shield, Clock, Zap,
  FileText, BarChart2, Users, AlertCircle, CheckCircle2, ChevronRight,
  Copy, Check, Settings, Activity, Radio,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

// ── Constants ──────────────────────────────────────────────────────────────
const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const H = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }
const TT = { backgroundColor: '#0d1a1e', border: '1px solid rgba(143,191,194,0.15)', borderRadius: 8, color: '#f3fafa', fontSize: 11 }

const SEV_STYLE = {
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.22)', dot: '#ef4444', label: 'Crítico' },
  high:     { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.22)', dot: '#f87171', label: 'Alto' },
  medium:   { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.22)',  dot: '#fbbf24', label: 'Médio' },
  low:      { bg: 'rgba(143,191,194,0.08)', border: 'rgba(143,191,194,0.18)', dot: T,         label: 'Baixo' },
  info:     { bg: 'rgba(125,211,168,0.08)', border: 'rgba(125,211,168,0.18)', dot: '#7dd3a8', label: 'Info' },
}

const TYPE_ICON = { risk: AlertTriangle, bottleneck: Users, trend: TrendingUp, opportunity: CheckCircle2, alert: AlertCircle }
const TYPE_COLOR = { risk: '#f87171', bottleneck: '#fb923c', trend: T, opportunity: '#7dd3a8', alert: '#fbbf24' }

const TABS = [
  { id: 'analysis', label: 'Análise IA', icon: Brain },
  { id: 'predictions', label: 'Previsões', icon: TrendingUp },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'notifications', label: 'Notificações', icon: Send },
  { id: 'audit', label: 'Auditoria', icon: Shield },
]

// ── Skeleton ───────────────────────────────────────────────────────────────
const Sk = ({ w = '100%', h = '14px', r = '6px' }: any) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(143,191,194,0.07)', animation: 'shimmer 1.5s infinite', backgroundSize: '200%' }} />
)

// ── Insight Card ───────────────────────────────────────────────────────────
function InsightCard({ insight }: { insight: any }) {
  const s = SEV_STYLE[insight.severity as keyof typeof SEV_STYLE] ?? SEV_STYLE.info
  const Icon = TYPE_ICON[insight.type as keyof typeof TYPE_ICON] ?? AlertCircle
  const iconColor = TYPE_COLOR[insight.type as keyof typeof TYPE_COLOR] ?? T

  return (
    <div className="rounded-xl p-4" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}25` }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-bold" style={{ color: '#f3fafa' }}>{insight.title}</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: `${s.dot}20`, color: s.dot }}>{s.label}</span>
          </div>
          <p className="text-[11px] leading-relaxed mb-2" style={{ color: MUTED }}>{insight.description}</p>
          <div className="flex items-start gap-1">
            <ChevronRight size={10} className="mt-0.5 shrink-0" style={{ color: iconColor }} />
            <p className="text-[10px] leading-relaxed font-medium" style={{ color: iconColor }}>{insight.recommendation}</p>
          </div>
          {insight.value !== undefined && (
            <p className="text-[10px] mt-1.5 tabular-nums" style={{ color: MUTED }}>
              Valor: <span style={{ color: s.dot, fontWeight: 600 }}>{insight.value}{insight.unit ?? ''}</span>
              {insight.trend && (
                <span className="ml-2">
                  {insight.trend === 'up' ? '↑ crescendo' : insight.trend === 'down' ? '↓ caindo' : '→ estável'}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Prediction Card ────────────────────────────────────────────────────────
function PredictionCard({ pred }: { pred: any }) {
  const color = pred.risk === 'high' ? '#f87171' : pred.risk === 'medium' ? '#fbbf24' : '#7dd3a8'
  const DirIcon = pred.direction === 'up' ? TrendingUp : pred.direction === 'down' ? TrendingDown : Minus
  const change7d = pred.predicted7d - pred.current
  const changePct = pred.current > 0 ? Math.abs(Math.round((change7d / pred.current) * 100)) : 0

  return (
    <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
          <DirIcon size={16} style={{ color }} />
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: `${color}12`, color }}>
          {pred.direction === 'up' ? '↑' : pred.direction === 'down' ? '↓' : '→'}
          {changePct > 0 ? `${changePct}%` : 'estável'}
        </div>
      </div>

      <p className="text-xs font-semibold mb-1" style={{ color }}>{pred.label}</p>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-2xl font-bold tabular-nums" style={{ ...H, color: '#f3fafa' }}>{pred.predicted7d}</span>
        <span className="text-[11px]" style={{ color: MUTED }}>{pred.unit} em 7 dias</span>
      </div>
      <p className="text-[10px] mb-3 leading-relaxed" style={{ color: MUTED }}>{pred.reasoning}</p>

      <div className="space-y-1.5">
        {[
          { label: 'Atual', val: pred.current },
          { label: '7 dias', val: pred.predicted7d },
          { label: '30 dias', val: pred.predicted30d },
        ].map(({ label, val }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[9px] w-10 shrink-0" style={{ color: MUTED }}>{label}</span>
            <div className="flex-1 h-1 rounded-full" style={{ background: BORDER }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(100, (val / (pred.predicted30d || 1)) * 100)}%`,
                background: color,
              }} />
            </div>
            <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: '#f3fafa' }}>{val}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <div className="text-[9px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(143,191,194,0.08)', color: MUTED }}>
          Confiança: {pred.confidence}%
        </div>
      </div>
    </div>
  )
}

// ── Print Report ───────────────────────────────────────────────────────────
function printReport(data: any, period: string) {
  const win = window.open('', '_blank')
  if (!win) return
  const { summaryLines = [], metrics = {}, insights = [], predictions = [] } = data
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const periodLabel = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' }[period] ?? 'Executivo'

  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>CS Cockpit — Relatório ${periodLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; padding: 40px; }
  h1 { font-size: 22px; color: #0d1a1e; } h2 { font-size: 14px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; margin: 24px 0 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .header { border-bottom: 2px solid #8fbfc2; padding-bottom: 16px; margin-bottom: 20px; }
  .meta { color: #6b7280; font-size: 12px; margin-top: 4px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi-val { font-size: 28px; font-weight: 700; } .kpi-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; }
  .summary p { font-size: 13px; line-height: 1.7; margin: 8px 0; }
  .insight { border-left: 3px solid; padding: 10px 12px; border-radius: 0 6px 6px 0; margin: 8px 0; }
  .critical { border-color: #ef4444; background: #fef2f2; } .high { border-color: #f59e0b; background: #fffbeb; }
  .medium { border-color: #8fbfc2; background: #f0fdfe; } .low, .info { border-color: #10b981; background: #f0fdf4; }
  .insight-title { font-weight: 600; font-size: 13px; } .insight-desc { font-size: 11px; color: #6b7280; margin-top: 3px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <h1>🎯 CS Cockpit — Relatório ${periodLabel}</h1>
  <p class="meta">Xtentgroup · ${date} · Gerado às ${new Date().toLocaleTimeString('pt-BR')}</p>
</div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-val" style="color:#3b82f6">${(metrics.glpiTotal ?? 0) + (metrics.jiraTotal ?? 0)}</div><div class="kpi-label">Total Chamados</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${(metrics.breached ?? 0) > 0 ? '#ef4444' : '#10b981'}">${metrics.breached ?? 0}</div><div class="kpi-label">SLA Vencido</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#f59e0b">${metrics.atRisk ?? 0}</div><div class="kpi-label">SLA em Risco</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#8fbfc2">${metrics.resolved ?? 0}</div><div class="kpi-label">Resolvidos</div></div>
</div>
<h2>Análise Executiva</h2>
<div class="summary">${summaryLines.map((l: string) => `<p>• ${l}</p>`).join('')}</div>
${insights.length > 0 ? `<h2>Insights e Alertas</h2>${insights.map((i: any) => `<div class="insight ${i.severity}"><div class="insight-title">${i.title}</div><div class="insight-desc">${i.description} — ${i.recommendation}</div></div>`).join('')}` : ''}
${predictions.length > 0 ? `<h2>Previsões</h2>${predictions.map((p: any) => `<div class="insight low"><div class="insight-title">${p.label}: ${p.predicted7d} ${p.unit} (7d) / ${p.predicted30d} ${p.unit} (30d)</div><div class="insight-desc">${p.reasoning}</div></div>`).join('')}` : ''}
<div class="footer">Relatório gerado automaticamente pelo CS Cockpit · Xtentgroup<br>Para mais informações, acesse a plataforma em ${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}</div>
</body></html>`)
  win.document.close()
  setTimeout(() => win.print(), 800)
}

function exportExcel(data: any, period: string) {
  const { summaryLines = [], metrics = {}, insights = [], predictions = [] } = data
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    { Métrica: 'Total Chamados', Valor: (metrics.glpiTotal ?? 0) + (metrics.jiraTotal ?? 0) },
    { Métrica: 'GLPI', Valor: metrics.glpiTotal ?? 0 },
    { Métrica: 'Jira', Valor: metrics.jiraTotal ?? 0 },
    { Métrica: 'SLA Vencido', Valor: metrics.breached ?? 0 },
    { Métrica: 'SLA em Risco', Valor: metrics.atRisk ?? 0 },
    { Métrica: 'Resolvidos', Valor: metrics.resolved ?? 0 },
    { Métrica: 'Sem Responsável', Valor: metrics.noOwner ?? 0 },
  ]), 'Métricas')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    summaryLines.map((l: string, i: number) => ({ '#': i + 1, 'Ponto': l }))
  ), 'Resumo Executivo')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    insights.map((i: any) => ({ Tipo: i.type, Severidade: i.severity, Título: i.title, Descrição: i.description, Recomendação: i.recommendation }))
  ), 'Insights')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    predictions.map((p: any) => ({ Métrica: p.label, Atual: p.current, '7 dias': p.predicted7d, '30 dias': p.predicted30d, Confiança: `${p.confidence}%`, Tendência: p.direction, Risco: p.risk }))
  ), 'Previsões')

  XLSX.writeFile(wb, `cs-cockpit-relatorio-${period}-${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function IaPage() {
  const [tab, setTab] = useState('analysis')
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [copied, setCopied] = useState(false)

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['ia'],
    queryFn: () => fetch('/api/ia').then(r => r.json()),
    staleTime: 120_000,
  })

  const teamsMutation = useMutation({
    mutationFn: () => fetch('/api/notifications/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: async r => {
      const d = await r.json()
      if (d.error) toast.error(`Teams: ${d.error}`)
      else toast.success('Enviado ao Teams com sucesso!')
    },
    onError: () => toast.error('Erro ao enviar para o Teams'),
  })

  const emailMutation = useMutation({
    mutationFn: () => fetch('/api/notifications/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: async r => {
      const d = await r.json()
      if (d.error) toast.error(`Email: ${d.error}`)
      else toast.success(`Email enviado para ${d.to}!`)
    },
    onError: () => toast.error('Erro ao enviar email'),
  })

  const copyText = useCallback(() => {
    const text = data?.summaryLines?.join('\n\n') ?? ''
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [data])

  const chartData = useMemo(() => {
    if (!data?.chartData) return []
    return data.chartData.dailyLabels.map((label: string, i: number) => ({
      label,
      GLPI: data.chartData.glpiDaily[i] ?? 0,
      Jira: data.chartData.jiraDaily[i] ?? 0,
      total: (data.chartData.glpiDaily[i] ?? 0) + (data.chartData.jiraDaily[i] ?? 0),
    }))
  }, [data])

  const insights = data?.insights ?? []
  const predictions = data?.predictions ?? []
  const summaryLines = data?.summaryLines ?? []
  const metrics = data?.metrics ?? {}
  const auditLogs = data?.auditLog ?? []

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn .4s ease both }
      `}</style>
      <div className="p-6 space-y-5 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#a78bfa' }} />
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>Central Executiva</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ ...H, color: '#f3fafa' }}>Inteligência Operacional</h1>
            {dataUpdatedAt > 0 && <p className="text-xs mt-0.5" style={{ color: MUTED }}>Análise gerada {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')}</p>}
          </div>
          <button onClick={() => refetch()} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
            {isLoading ? 'Analisando...' : 'Gerar Análise'}
          </button>
        </div>

        {/* Quick Metrics Strip */}
        {!isLoading && (
          <div className="grid grid-cols-5 gap-2.5 fade-in" style={{ animationDelay: '60ms' }}>
            {[
              { label: 'Total', val: (metrics.glpiTotal ?? 0) + (metrics.jiraTotal ?? 0), color: T },
              { label: 'SLA Vencido', val: metrics.breached ?? 0, color: metrics.breached > 0 ? '#f87171' : '#7dd3a8' },
              { label: 'Em Risco', val: metrics.atRisk ?? 0, color: '#fbbf24' },
              { label: 'Sem Responsável', val: metrics.noOwner ?? 0, color: '#fb923c' },
              { label: 'Alerts', val: metrics.critical ?? 0, color: metrics.critical > 0 ? '#ef4444' : '#7dd3a8' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-xl font-bold tabular-nums" style={{ ...H, color }}>{val}</p>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center"
                style={tab === t.id
                  ? { background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }
                  : { color: MUTED }}>
                <Icon size={13} /> <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* ── Tab: Análise ── */}
        {tab === 'analysis' && (
          <div className="space-y-4 fade-in">
            {/* Executive Summary */}
            <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.25)' }}>
                    <Brain size={14} style={{ color: '#a78bfa' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ ...H, color: '#f3fafa' }}>Resumo Executivo</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>Análise automática dos dados operacionais</p>
                  </div>
                </div>
                {!isLoading && summaryLines.length > 0 && (
                  <button onClick={copyText}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(143,191,194,0.10)', color: T, border: `1px solid rgba(143,191,194,0.20)` }}>
                    {copied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                  </button>
                )}
              </div>
              {isLoading ? (
                <div className="space-y-3">{[95, 80, 70, 60, 85].map((w, i) => <Sk key={i} h="14px" w={`${w}%`} />)}</div>
              ) : (
                <div className="space-y-2">
                  {summaryLines.map((line: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 py-1.5 px-3 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.02)', animation: `fadeIn .3s ease ${i * 80}ms both` }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#a78bfa' }} />
                      <p className="text-[12px] leading-relaxed" style={{ color: '#f3fafa', opacity: 0.85 }}>{line}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Insights Grid */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: MUTED }}>
                <Zap size={10} /> Insights Identificados ({insights.length})
              </p>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}`, height: 100 }}><Sk /><div className="mt-2"><Sk h="11px" w="60%" /></div></div>)}
                </div>
              ) : insights.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <CheckCircle2 size={28} className="mx-auto mb-2 opacity-30" style={{ color: '#7dd3a8' }} />
                  <p className="text-sm" style={{ color: MUTED }}>Nenhum insight crítico identificado. Situação operacional estável.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insights.map((insight: any) => <InsightCard key={insight.id} insight={insight} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Previsões ── */}
        {tab === 'predictions' && (
          <div className="space-y-4 fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {isLoading
                ? [...Array(3)].map((_, i) => <div key={i} className="rounded-xl p-5 h-48" style={{ background: CARD, border: `1px solid ${BORDER}` }}><Sk /></div>)
                : predictions.map((p: any) => <PredictionCard key={p.metric} pred={p} />)}
            </div>

            {/* Volume chart */}
            {!isLoading && chartData.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-sm font-semibold mb-4" style={{ ...H, color: '#f3fafa' }}>Volume de Novos Chamados — Últimos 14 Dias</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gGLPI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gJira" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={T} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={T} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(143,191,194,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TT} />
                    <Area type="monotone" dataKey="GLPI" stroke="#f472b6" fill="url(#gGLPI)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Jira" stroke={T} fill="url(#gJira)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Relatórios ── */}
        {tab === 'reports' && (
          <div className="space-y-4 fade-in">
            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-bold mb-4" style={{ ...H, color: '#f3fafa' }}>Gerar Relatório</p>
              <div className="flex gap-2 mb-5">
                {(['daily', 'weekly', 'monthly'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={period === p
                      ? { background: 'rgba(143,191,194,0.15)', color: T, border: '1px solid rgba(143,191,194,0.30)' }
                      : { background: 'rgba(0,0,0,0.2)', color: MUTED, border: `1px solid ${BORDER}` }}>
                    {{ daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' }[p]}
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}` }}>
                <p className="text-xs font-semibold mb-2" style={{ color: MUTED }}>Prévia do relatório</p>
                {summaryLines.slice(0, 3).map((l: string, i: number) => (
                  <p key={i} className="text-[11px] mb-1 opacity-70" style={{ color: '#f3fafa' }}>• {l}</p>
                ))}
                {summaryLines.length > 3 && <p className="text-[10px]" style={{ color: MUTED }}>+{summaryLines.length - 3} pontos adicionais...</p>}
              </div>

              <div className="flex gap-3">
                <button onClick={() => printReport(data, period)} disabled={isLoading || !data}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(143,191,194,0.12)', color: T, border: '1px solid rgba(143,191,194,0.25)' }}>
                  <FileText size={14} /> Imprimir / PDF
                </button>
                <button onClick={() => exportExcel(data, period)} disabled={isLoading || !data}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(125,211,168,0.12)', color: '#7dd3a8', border: '1px solid rgba(125,211,168,0.25)' }}>
                  <Download size={14} /> Exportar Excel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Notificações ── */}
        {tab === 'notifications' && (
          <div className="space-y-4 fade-in">
            {/* Teams */}
            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.22)' }}>
                    <MessageSquare size={14} style={{ color: '#a78bfa' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#f3fafa' }}>Microsoft Teams</p>
                    <p className="text-[11px]" style={{ color: MUTED }}>Envio via Incoming Webhook</p>
                  </div>
                </div>
                <button onClick={() => teamsMutation.mutate()} disabled={teamsMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                  {teamsMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Enviar Agora
                </button>
              </div>
              <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${BORDER}` }}>
                <p style={{ color: MUTED }}>Para ativar: crie um <strong style={{ color: '#f3fafa' }}>Incoming Webhook</strong> no Teams:</p>
                <p style={{ color: MUTED }}>1. Abra o canal → Apps → Incoming Webhook → Criar</p>
                <p style={{ color: MUTED }}>2. Copie a URL gerada</p>
                <p style={{ color: MUTED }}>3. Adicione ao <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 4px', borderRadius: 3 }}>.env.local</code>:</p>
                <p className="font-mono" style={{ color: '#7dd3a8' }}>TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...</p>
              </div>
            </div>

            {/* Email */}
            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(96,165,250,0.14)', border: '1px solid rgba(96,165,250,0.22)' }}>
                    <Mail size={14} style={{ color: '#60a5fa' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#f3fafa' }}>Email (SMTP)</p>
                    <p className="text-[11px]" style={{ color: MUTED }}>Relatório em HTML com todos os indicadores</p>
                  </div>
                </div>
                <button onClick={() => emailMutation.mutate()} disabled={emailMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
                  {emailMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Enviar Agora
                </button>
              </div>
              <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${BORDER}` }}>
                <p style={{ color: MUTED }}>Configure no <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 4px', borderRadius: 3 }}>.env.local</code>:</p>
                {[
                  'SMTP_HOST=smtp.office365.com',
                  'SMTP_PORT=587',
                  'SMTP_USER=leo.frias@xtentgroup.com',
                  'SMTP_PASS=sua-senha-de-aplicativo',
                  'NOTIFICATION_EMAIL_TO=destinatario@xtentgroup.com',
                ].map(line => <p key={line} className="font-mono" style={{ color: '#7dd3a8' }}>{line}</p>)}
              </div>
            </div>

            {/* Schedule info */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
              <div className="flex items-start gap-2">
                <Clock size={14} className="mt-0.5 shrink-0" style={{ color: '#fbbf24' }} />
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#fbbf24' }}>Envio Automático Diário às 08:00</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
                    Configure o Windows Task Scheduler para chamar:
                  </p>
                  <p className="text-[10px] font-mono mt-1 px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.3)', color: '#7dd3a8' }}>
                    curl -X POST http://localhost:3000/api/notifications/email -H "Content-Type: application/json" -d @report.json
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Auditoria ── */}
        {tab === 'audit' && (
          <div className="fade-in">
            <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
                <p className="text-sm font-bold" style={{ ...H, color: '#f3fafa' }}>Log de Auditoria</p>
                <p className="text-[10px]" style={{ color: MUTED }}>{auditLogs.length} eventos recentes</p>
              </div>
              {isLoading ? (
                <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="flex gap-3"><Sk w="80px" /><Sk /></div>)}</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-10 text-center text-sm" style={{ color: MUTED }}>Nenhum evento de auditoria ainda</div>
              ) : (
                <table className="w-full text-xs">
                  <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <tr>
                      {['Nível', 'Módulo', 'Ação', 'Descrição', 'Quando'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(243,250,250,0.3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any, i: number) => {
                      const lvlColor = { info: T, warning: '#fbbf24', error: '#f87171', critical: '#ef4444' }[log.level as string] ?? MUTED
                      const d = Date.now() - new Date(log.created_at).getTime()
                      const ago = d < 60000 ? 'agora' : d < 3600000 ? `${Math.floor(d/60000)}min` : `${Math.floor(d/3600000)}h`
                      return (
                        <tr key={log.id} style={{ borderTop: i > 0 ? `1px solid rgba(143,191,194,0.04)` : 'none' }}>
                          <td className="px-4 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                              style={{ background: `${lvlColor}15`, color: lvlColor }}>{log.level}</span>
                          </td>
                          <td className="px-4 py-2" style={{ color: T }}>{log.module}</td>
                          <td className="px-4 py-2 font-mono text-[10px]" style={{ color: MUTED }}>{log.action}</td>
                          <td className="px-4 py-2 max-w-xs">
                            <p className="truncate" style={{ color: '#f3fafa' }}>{log.description ?? '—'}</p>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap" style={{ color: MUTED }}>{ago} atrás</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
