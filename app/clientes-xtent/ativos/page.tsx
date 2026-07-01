'use client'

import { useEffect, useState, useMemo } from 'react'
import { Loader2, AlertTriangle, Users, CheckCircle2, Clock, XCircle, Calendar } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string
  name: string
  domain: string | null
  industry: string | null
  ownerId: string | null
  lastActivityAt: string | null
}

type HealthStatus = 'saudavel' | 'atencao' | 'critico'

interface EnrichedCompany extends Company {
  health: HealthStatus
  daysAgo: number | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const BG = '#0a1316'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const TEAL = '#8fbfc2'
const MUTED = '#475569'
const TEXT = '#e2e8f0'
const TEXT_SM = '#94a3b8'

const TH_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: TEAL,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '10px 14px',
  borderBottom: '1px solid rgba(143,191,194,0.08)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const TD_STYLE: React.CSSProperties = {
  fontSize: 13,
  color: TEXT,
  padding: '11px 14px',
  borderBottom: '1px solid rgba(143,191,194,0.05)',
  verticalAlign: 'middle',
}

// ── Health helpers ───────────────────────────────────────────────────────────

function getHealth(lastActivityAt: string | null): { status: HealthStatus; daysAgo: number | null } {
  if (!lastActivityAt) return { status: 'critico', daysAgo: null }
  const daysAgo = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86_400_000)
  if (daysAgo <= 30) return { status: 'saudavel', daysAgo }
  if (daysAgo <= 60) return { status: 'atencao', daysAgo }
  return { status: 'critico', daysAgo }
}

function healthOrder(s: HealthStatus): number {
  return s === 'critico' ? 0 : s === 'atencao' ? 1 : 2
}

function formatDaysAgo(daysAgo: number | null): string {
  if (daysAgo === null) return 'Sem atividade'
  if (daysAgo === 0) return 'hoje'
  if (daysAgo === 1) return '1d atrás'
  return `${daysAgo}d atrás`
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  label: string
  value: number
  icon: React.ReactNode
  accent: string
  accentBg: string
}

function KpiCard({ label, value, icon, accent, accentBg }: KpiProps) {
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 10,
        background: accentBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0, lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: 12, color: TEXT_SM, margin: '3px 0 0', whiteSpace: 'nowrap' }}>{label}</p>
      </div>
    </div>
  )
}

// ── Health Badge ──────────────────────────────────────────────────────────────

function HealthBadge({ status }: { status: HealthStatus }) {
  const config = {
    saudavel: { label: 'Saudável', dot: '🟢', color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)' },
    atencao:  { label: 'Atenção',  dot: '🟡', color: '#eab308', bg: 'rgba(234,179,8,0.10)',  border: 'rgba(234,179,8,0.25)'  },
    critico:  { label: 'Crítico',  dot: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)'  },
  }[status]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 11,
      fontWeight: 600,
      color: config.color,
      background: config.bg,
      border: `1px solid ${config.border}`,
      borderRadius: 20,
      padding: '3px 10px',
      whiteSpace: 'nowrap',
    }}>
      {config.dot} {config.label}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientesAtivosPage() {
  const [companies, setCompanies] = useState<EnrichedCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/hubspot/companies?limit=100')
        const json = await res.json()
        if (json.error) throw new Error(json.error)

        const raw: Company[] = json.companies ?? []
        const enriched: EnrichedCompany[] = raw.map(c => {
          const { status, daysAgo } = getHealth(c.lastActivityAt)
          return { ...c, health: status, daysAgo }
        })

        // Sort: critical first, then by daysAgo ascending (null = worst)
        enriched.sort((a, b) => {
          const hDiff = healthOrder(a.health) - healthOrder(b.health)
          if (hDiff !== 0) return hDiff
          const da = a.daysAgo ?? 9999
          const db = b.daysAgo ?? 9999
          return da - db
        })

        setCompanies(enriched)
      } catch (err: any) {
        setError(err.message ?? 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return companies
    const q = search.toLowerCase()
    return companies.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.domain ?? '').toLowerCase().includes(q) ||
      (c.industry ?? '').toLowerCase().includes(q)
    )
  }, [companies, search])

  // KPI counts
  const total = companies.length
  const saudaveis = companies.filter(c => c.health === 'saudavel').length
  const atencao   = companies.filter(c => c.health === 'atencao').length
  const criticos  = companies.filter(c => c.health === 'critico').length

  // Warning banner: clients without interaction > 30d
  const semInteracao = companies.filter(c => c.health === 'atencao' || c.health === 'critico').length

  const PAGE_STYLE: React.CSSProperties = {
    minHeight: '100vh',
    background: BG,
    padding: '28px 32px',
    fontFamily: 'Inter, sans-serif',
    color: TEXT,
  }

  return (
    <div style={PAGE_STYLE}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>
          Clientes Ativos
        </h1>
        <p style={{ fontSize: 13, color: TEAL, margin: '5px 0 0' }}>
          Visão 360° dos seus clientes
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 10, color: TEAL }}>
          <Loader2 size={22} className="animate-spin" />
          <span style={{ fontSize: 14 }}>Carregando clientes...</span>
        </div>
      ) : error ? (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10,
          padding: '18px 20px',
          color: '#ef4444',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <XCircle size={18} />
          {error}
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <KpiCard
              label="Total Clientes"
              value={total}
              icon={<Users size={20} />}
              accent={TEAL}
              accentBg="rgba(143,191,194,0.12)"
            />
            <KpiCard
              label="Saudáveis (< 30d)"
              value={saudaveis}
              icon={<CheckCircle2 size={20} />}
              accent="#22c55e"
              accentBg="rgba(34,197,94,0.10)"
            />
            <KpiCard
              label="Em Atenção (30–60d)"
              value={atencao}
              icon={<Clock size={20} />}
              accent="#eab308"
              accentBg="rgba(234,179,8,0.10)"
            />
            <KpiCard
              label="Críticos (> 60d)"
              value={criticos}
              icon={<XCircle size={20} />}
              accent="#ef4444"
              accentBg="rgba(239,68,68,0.10)"
            />
          </div>

          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <input
              placeholder="Buscar por empresa, domínio ou setor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'rgba(143,191,194,0.05)',
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: '8px 14px',
                color: TEXT,
                fontSize: 13,
                outline: 'none',
                width: 300,
              }}
            />
          </div>

          {/* Table */}
          <div style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Empresa', 'Setor', 'Responsável', 'Última Atividade', 'Próxima Ação', 'Saúde'].map(h => (
                      <th key={h} style={TH_STYLE}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ ...TD_STYLE, textAlign: 'center', color: MUTED, padding: 40 }}>
                        Nenhum cliente encontrado.
                      </td>
                    </tr>
                  ) : filtered.map(c => (
                    <tr key={c.id} style={{ transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(143,191,194,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Empresa */}
                      <td style={{ ...TD_STYLE, minWidth: 180 }}>
                        <p style={{ margin: 0, fontWeight: 600, color: TEXT, fontSize: 13 }}>{c.name}</p>
                        {c.domain && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTED }}>{c.domain}</p>
                        )}
                      </td>

                      {/* Setor */}
                      <td style={{ ...TD_STYLE, minWidth: 120, color: TEXT_SM, fontSize: 12 }}>
                        {c.industry ?? '—'}
                      </td>

                      {/* Responsável */}
                      <td style={{ ...TD_STYLE, minWidth: 120, color: TEXT_SM, fontSize: 12 }}>
                        {c.ownerId ? (
                          <span style={{
                            background: 'rgba(143,191,194,0.08)',
                            border: `1px solid ${BORDER}`,
                            borderRadius: 6,
                            padding: '2px 8px',
                            fontSize: 11,
                            color: TEAL,
                          }}>
                            #{c.ownerId}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Última Atividade */}
                      <td style={{ ...TD_STYLE, minWidth: 130 }}>
                        {c.lastActivityAt ? (
                          <span style={{
                            color: c.health === 'saudavel' ? '#22c55e' : c.health === 'atencao' ? '#eab308' : '#ef4444',
                            fontSize: 13,
                          }}>
                            {formatDaysAgo(c.daysAgo)}
                          </span>
                        ) : (
                          <span style={{ color: MUTED, fontSize: 12 }}>Sem atividade</span>
                        )}
                      </td>

                      {/* Próxima Ação */}
                      <td style={{ ...TD_STYLE, minWidth: 160 }}>
                        <button
                          onClick={() => alert(`Agendar follow-up para ${c.name}`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(143,191,194,0.08)',
                            border: `1px solid rgba(143,191,194,0.18)`,
                            borderRadius: 7,
                            padding: '5px 11px',
                            color: TEAL,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(143,191,194,0.15)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(143,191,194,0.08)')}
                        >
                          <Calendar size={12} />
                          Agendar follow-up
                        </button>
                      </td>

                      {/* Saúde */}
                      <td style={{ ...TD_STYLE, minWidth: 110 }}>
                        <HealthBadge status={c.health} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(143,191,194,0.06)',
              fontSize: 12,
              color: MUTED,
            }}>
              Mostrando {filtered.length} de {total} clientes
            </div>
          </div>

          {/* Warning Banner */}
          {semInteracao > 0 && (
            <div style={{
              marginTop: 20,
              background: 'rgba(234,179,8,0.07)',
              border: '1px solid rgba(234,179,8,0.22)',
              borderRadius: 10,
              padding: '13px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#eab308',
              fontSize: 13,
              fontWeight: 500,
            }}>
              <AlertTriangle size={17} style={{ flexShrink: 0 }} />
              {semInteracao} {semInteracao === 1 ? 'cliente sem interação' : 'clientes sem interação'} há mais de 30 dias
            </div>
          )}
        </>
      )}
    </div>
  )
}
