'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  RefreshCw, UserPlus, Building2, TrendingUp, AlertTriangle, Layers,
  Calendar, DollarSign, Users, Activity, Zap, ChevronRight, Clock,
} from 'lucide-react'
import Link from 'next/link'

// ── Constants ──────────────────────────────────────────────────────────────
const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const H: React.CSSProperties = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }

// ── Helpers ────────────────────────────────────────────────────────────────
function getGreeting(hour: number): string {
  if (hour >= 0 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n || 0)
}

function formatFullDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ── KPI Card ───────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  sublabel?: string
  value: string | number | undefined
  icon: React.ElementType
  color: string
  loading?: boolean
}

function KpiCard({ label, sublabel, value, icon: Icon, color, loading }: KpiCardProps) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        opacity: loading ? 0.55 : 1,
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = `${color}40`
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = `0 8px 24px ${color}12`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = BORDER
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Top row: icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} style={{ color }} />
        </div>
      </div>

      {/* Value */}
      <div
        style={{
          ...H,
          fontSize: 36,
          fontWeight: 800,
          color: '#f3fafa',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {loading ? '—' : (value ?? '—')}
      </div>

      {/* Label + sublabel */}
      <div>
        <div
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: T,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: 11, color: 'rgba(243,250,250,0.4)', marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Pipeline Bar Chart ─────────────────────────────────────────────────────
const pipelineStages = [
  { label: 'Prospecção', value: 35, color: '#3b82f6' },
  { label: 'Qualificação', value: 25, color: '#8fbfc2' },
  { label: 'Proposta', value: 22, color: '#a78bfa' },
  { label: 'Fechamento', value: 18, color: '#22c55e' },
]

function PipelineChart() {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 24,
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <div style={{ ...H, fontSize: 14, fontWeight: 700, color: '#f3fafa' }}>
          Pipeline Comercial
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
          Distribuição por estágio
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pipelineStages.map(stage => (
          <div key={stage.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#f3fafa' }}>{stage.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: stage.color }}>
                {stage.value}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(143,191,194,0.10)' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 99,
                  width: `${stage.value}%`,
                  background: stage.color,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, fontSize: 10, color: 'rgba(243,250,250,0.3)' }}>
        * Dados do HubSpot
      </div>
    </div>
  )
}

// ── Operational Status ─────────────────────────────────────────────────────
interface StatusPanelProps {
  openTickets: number
  totalBreached: number
  resolvedToday: number
  loading?: boolean
}

function StatusPanel({ openTickets, totalBreached, resolvedToday, loading }: StatusPanelProps) {
  const inProgress = Math.max(0, openTickets - totalBreached)

  const rows = [
    { label: 'Tickets Abertos', value: openTickets, color: '#f59e0b' },
    { label: 'SLA Vencido', value: totalBreached, color: '#ef4444' },
    { label: 'Em Andamento', value: inProgress, color: '#8fbfc2' },
    { label: 'Resolvidos Hoje', value: resolvedToday, color: '#22c55e' },
  ]

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 24,
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <div style={{ ...H, fontSize: 14, fontWeight: 700, color: '#f3fafa' }}>
          Status Operacional
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
          Últimas 24 horas
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: i < rows.length - 1 ? `1px solid rgba(143,191,194,0.07)` : 'none',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: row.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontSize: 13, color: '#f3fafa' }}>{row.label}</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: row.color,
                opacity: loading ? 0.4 : 1,
              }}
            >
              {loading ? '—' : row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Quick Access Card ──────────────────────────────────────────────────────
interface QuickCardProps {
  href: string
  icon: React.ElementType
  iconColor: string
  title: string
  desc: string
  metric: string
  metricColor: string
}

function QuickCard({ href, icon: Icon, iconColor, title, desc, metric, metricColor }: QuickCardProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 28,
          transition: 'border-color 0.2s, transform 0.2s',
          cursor: 'pointer',
          height: '100%',
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'rgba(143,191,194,0.25)'
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = BORDER
          el.style.transform = 'translateY(0)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <Icon size={28} style={{ color: iconColor }} />
          <ChevronRight size={16} style={{ color: 'rgba(143,191,194,0.3)' }} />
        </div>

        <div style={{ ...H, fontSize: 16, fontWeight: 700, color: '#f3fafa', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
          {desc}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: metricColor }}>
          {metric}
        </div>
      </div>
    </Link>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [greeting, setGreeting] = useState('Olá')
  const [dateStr, setDateStr] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  useEffect(() => {
    const now = new Date()
    setGreeting(getGreeting(now.getHours()))
    setDateStr(formatFullDate(now))
  }, [])

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt))
    }
  }, [dataUpdatedAt])

  const commercial = data?.commercial ?? {}
  const metrics = data?.metrics ?? {}

  const kpiCards: KpiCardProps[] = [
    {
      label: 'Leads Novos',
      sublabel: 'no HubSpot',
      value: commercial.leads,
      icon: UserPlus,
      color: '#3b82f6',
    },
    {
      label: 'Clientes Ativos',
      sublabel: 'cadastrados',
      value: commercial.customers,
      icon: Building2,
      color: '#22c55e',
    },
    {
      label: 'Pipeline',
      sublabel: 'em negociação',
      value: commercial.openPipeline != null ? fmtBRL(commercial.openPipeline) : undefined,
      icon: TrendingUp,
      color: '#8fbfc2',
    },
    {
      label: 'Tickets Críticos',
      sublabel: 'SLA vencido',
      value: metrics.totalBreached ?? 0,
      icon: AlertTriangle,
      color: '#ef4444',
    },
    {
      label: 'Projetos',
      sublabel: 'em andamento',
      value: '—',
      icon: Layers,
      color: '#a78bfa',
    },
    {
      label: 'GMUDs',
      sublabel: 'pendentes',
      value: '—',
      icon: Calendar,
      color: '#f59e0b',
    },
    {
      label: 'Receita Prevista',
      sublabel: 'pipeline total',
      value: commercial.openPipeline != null ? fmtBRL(commercial.openPipeline ?? 0) : undefined,
      icon: DollarSign,
      color: '#22c55e',
    },
  ]

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-kpi-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 768px) {
          .dash-kpi-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .dash-charts-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .dash-charts-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .dash-quick-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .dash-quick-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>

      <div
        style={{
          padding: '40px 32px',
          maxWidth: 1280,
          margin: '0 auto',
          animation: 'fadeInUp 0.4s ease both',
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 32,
          }}
        >
          <div>
            <div
              style={{
                ...H,
                fontSize: 28,
                fontWeight: 800,
                color: '#f3fafa',
                lineHeight: 1.2,
              }}
            >
              {greeting}, Leonardo
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(243,250,250,0.45)',
                marginTop: 6,
                textTransform: 'capitalize',
              }}
            >
              {dateStr}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {lastUpdated && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'rgba(243,250,250,0.35)',
                }}
              >
                <Clock size={11} />
                {formatTime(lastUpdated)}
              </div>
            )}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                background: CARD,
                border: `1px solid ${BORDER}`,
                color: 'rgba(243,250,250,0.5)',
                fontSize: 12,
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => {
                if (!isLoading) {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(143,191,194,0.3)'
                  el.style.color = T
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = BORDER
                el.style.color = 'rgba(243,250,250,0.5)'
              }}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: isLoading ? 'spin 1s linear infinite' : 'none',
                }}
              />
              Atualizar
            </button>
          </div>
        </div>

        {/* ── KPI ROW ── */}
        <div className="dash-kpi-grid" style={{ marginBottom: 32 }}>
          {kpiCards.map(card => (
            <KpiCard key={card.label} {...card} loading={isLoading} />
          ))}
        </div>

        {/* ── CHARTS ROW ── */}
        <div className="dash-charts-grid" style={{ marginBottom: 32 }}>
          <PipelineChart />
          <StatusPanel
            openTickets={metrics.openTickets ?? 0}
            totalBreached={metrics.totalBreached ?? 0}
            resolvedToday={metrics.resolvedToday ?? 0}
            loading={isLoading}
          />
        </div>

        {/* ── QUICK ACCESS ROW ── */}
        <div className="dash-quick-grid">
          <QuickCard
            href="/crm"
            icon={Users}
            iconColor="#8fbfc2"
            title="CRM"
            desc="Prospects · Clientes · Atividades"
            metric={
              isLoading
                ? '— contatos'
                : `${commercial.totalContacts ?? 0} contatos`
            }
            metricColor="#8fbfc2"
          />
          <QuickCard
            href="/operacoes"
            icon={Activity}
            iconColor="#f59e0b"
            title="Operações"
            desc="GLPI · Jira · GMUDs · Agenda"
            metric={
              isLoading
                ? '— tickets abertos'
                : `${metrics.openTickets ?? 0} tickets abertos`
            }
            metricColor="#f59e0b"
          />
          <QuickCard
            href="/automacao"
            icon={Zap}
            iconColor="#a78bfa"
            title="Automação"
            desc="n8n · Telegram · Relatórios"
            metric="3 fluxos configurados"
            metricColor="#a78bfa"
          />
        </div>
      </div>
    </>
  )
}
