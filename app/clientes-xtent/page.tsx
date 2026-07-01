'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Building2, Users, UserCheck, AlertTriangle, ExternalLink, ChevronRight } from 'lucide-react'

// ─── Design tokens ───────────────────────────────────────────────────────────
const BG      = '#0a1316'
const CARD    = '#0d1a1e'
const TEAL    = '#8fbfc2'
const BORDER  = 'rgba(143,191,194,0.10)'
const FONT_H: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif' }

// ─── Types ────────────────────────────────────────────────────────────────────
interface Company {
  id: string
  name: string
  domain: string | null
  industry: string | null
  ownerId: string | null
  lastActivityAt: string | null
  createdAt: string | null
}

type TabKey = 'todas' | 'clientes' | 'leads' | 'sem-atividade'
type StatusKey = 'ativo' | 'atencao' | 'critico' | 'lead'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = daysSince(iso)!
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  return `${d}d atrás`
}

// Lifecycle is not returned by the companies endpoint, so we derive status
// purely from lastActivityAt days.  Companies with no activity and unknown
// lifecycle default to "lead" appearance only when no date is ever present.
function getStatus(lastActivityAt: string | null): StatusKey {
  const d = daysSince(lastActivityAt)
  if (d === null) return 'critico'   // no date at all → critical
  if (d < 30)    return 'ativo'
  if (d < 60)    return 'atencao'
  return 'critico'
}

const STATUS_CONFIG: Record<StatusKey, { label: string; bg: string; color: string; border: string }> = {
  ativo:    { label: 'Ativo',    bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.25)'  },
  atencao:  { label: 'Atenção',  bg: 'rgba(234,179,8,0.12)', color: '#eab308', border: 'rgba(234,179,8,0.25)'  },
  critico:  { label: 'Crítico',  bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.25)'  },
  lead:     { label: 'Lead',     bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = TEAL }: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  color?: string
}) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 22px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ ...FONT_H, fontSize: 26, fontWeight: 800, color: '#e2e8f0', margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#475569', margin: '6px 0 0' }}>{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: StatusKey }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClientesXtentPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('todas')

  // Parallel queries
  const companiesQ = useQuery({
    queryKey: ['clientes-xtent-companies'],
    queryFn: () => fetch('/api/hubspot/companies?limit=50').then(r => r.json()),
    staleTime: 3 * 60_000,
  })

  const dashboardQ = useQuery({
    queryKey: ['clientes-xtent-dashboard'],
    queryFn: () => fetch('/api/hubspot/dashboard').then(r => r.json()),
    staleTime: 3 * 60_000,
  })

  const companies: Company[] = useMemo(() => companiesQ.data?.companies ?? [], [companiesQ.data])
  const overview = dashboardQ.data?.overview ?? null

  // ── KPI derivation ──────────────────────────────────────────────────────────
  const totalEmpresas  = companiesQ.data?.total ?? companies.length
  // Dashboard contacts counts cover lifecycle; fall back to local derivations.
  const clientesAtivos = overview?.customers ?? 0
  const totalLeads     = overview?.leads ?? 0

  const semAtividade = useMemo(
    () => companies.filter(c => {
      const d = daysSince(c.lastActivityAt)
      return d === null || d > 60
    }).length,
    [companies]
  )

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeTab === 'todas') return companies
    if (activeTab === 'sem-atividade') {
      return companies.filter(c => {
        const d = daysSince(c.lastActivityAt)
        return d === null || d > 60
      })
    }
    if (activeTab === 'clientes') {
      return companies.filter(c => {
        const d = daysSince(c.lastActivityAt)
        return d !== null && d < 30
      })
    }
    if (activeTab === 'leads') {
      return companies.filter(c => {
        const d = daysSince(c.lastActivityAt)
        return d !== null && d >= 30 && d <= 60
      })
    }
    return companies
  }, [companies, activeTab])

  const isLoading = companiesQ.isLoading || dashboardQ.isLoading
  const hasError  = companiesQ.isError || dashboardQ.isError

  // ── Styles ───────────────────────────────────────────────────────────────────
  const P: React.CSSProperties = { minHeight: '100vh', background: BG, padding: '28px 32px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }
  const TH: React.CSSProperties = { fontSize: 11, color: TEAL, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px', borderBottom: `1px solid rgba(143,191,194,0.08)`, textAlign: 'left', whiteSpace: 'nowrap' }
  const TD: React.CSSProperties = { fontSize: 12, color: '#cbd5e1', padding: '10px 14px', borderBottom: `1px solid rgba(143,191,194,0.05)`, verticalAlign: 'middle' }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'todas',         label: 'Todas' },
    { key: 'clientes',      label: 'Clientes' },
    { key: 'leads',         label: 'Leads' },
    { key: 'sem-atividade', label: 'Sem Atividade' },
  ]

  return (
    <div style={P}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ ...FONT_H, fontSize: 24, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>Clientes XTENT</h1>
          <p style={{ fontSize: 13, color: '#475569', margin: '5px 0 0' }}>Visão geral de empresas e contatos via HubSpot</p>
        </div>
        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => router.push('/clientes-xtent/leads')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, background: 'rgba(96,165,250,0.10)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            Ver Leads <ChevronRight size={14} />
          </button>
          <button
            onClick={() => router.push('/clientes-xtent/ativos')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, background: `${TEAL}1a`, border: `1px solid ${TEAL}40`, color: TEAL, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            Ver Ativos <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <KpiCard icon={Building2}     label="Total Empresas"      value={isLoading ? '…' : totalEmpresas.toLocaleString('pt-BR')}  color={TEAL}      />
        <KpiCard icon={UserCheck}     label="Clientes Ativos"     value={isLoading ? '…' : clientesAtivos.toLocaleString('pt-BR')} color="#22c55e"   sub="lifecycle = customer" />
        <KpiCard icon={Users}         label="Leads"               value={isLoading ? '…' : totalLeads.toLocaleString('pt-BR')}     color="#60a5fa"   sub="lifecycle = lead" />
        <KpiCard icon={AlertTriangle} label="Sem Atividade 60d"   value={isLoading ? '…' : semAtividade.toLocaleString('pt-BR')}  color="#ef4444"   sub="nenhuma atividade registrada" />
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: CARD, borderRadius: 10, padding: 4, width: 'fit-content', border: `1px solid ${BORDER}` }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '7px 18px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s',
                background: isActive ? `${TEAL}20` : 'transparent',
                color: isActive ? TEAL : '#64748b',
                outline: isActive ? `1px solid ${TEAL}40` : 'none',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Table card ──────────────────────────────────────────────────────── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: TEAL, fontSize: 14 }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
            &nbsp; Carregando empresas...
          </div>
        ) : hasError ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#ef4444', fontSize: 14 }}>
            Erro ao carregar dados do HubSpot. Verifique a conexão.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(143,191,194,0.03)' }}>
                  {['Empresa', 'Domínio', 'Setor', 'Responsável', 'Última Atividade', 'Status'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...TD, textAlign: 'center', color: '#475569', padding: '36px 0' }}>
                      Nenhuma empresa encontrada nesta categoria.
                    </td>
                  </tr>
                ) : (
                  filtered.map(company => {
                    const status = getStatus(company.lastActivityAt)
                    return (
                      <tr
                        key={company.id}
                        style={{ transition: 'background 0.12s' }}
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(143,191,194,0.04)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Empresa */}
                        <td style={{ ...TD, fontWeight: 600, color: '#e2e8f0', minWidth: 180 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 7, background: `${TEAL}15`, border: `1px solid ${TEAL}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Building2 size={13} color={TEAL} />
                            </div>
                            <span style={{ fontSize: 13 }}>{company.name}</span>
                          </div>
                        </td>

                        {/* Domínio */}
                        <td style={{ ...TD, minWidth: 150 }}>
                          {company.domain ? (
                            <a
                              href={`https://${company.domain}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: TEAL, textDecoration: 'none', fontSize: 12 }}
                            >
                              {company.domain} <ExternalLink size={11} />
                            </a>
                          ) : <span style={{ color: '#374151' }}>—</span>}
                        </td>

                        {/* Setor */}
                        <td style={{ ...TD, minWidth: 130, color: '#94a3b8', fontSize: 11 }}>
                          {company.industry ?? <span style={{ color: '#374151' }}>—</span>}
                        </td>

                        {/* Responsável */}
                        <td style={{ ...TD, minWidth: 130, color: '#94a3b8' }}>
                          {company.ownerId
                            ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(143,191,194,0.08)', color: '#8fbfc2', border: `1px solid ${BORDER}` }}>ID {company.ownerId}</span>
                            : <span style={{ color: '#374151' }}>—</span>}
                        </td>

                        {/* Última Atividade */}
                        <td style={{ ...TD, minWidth: 130 }}>
                          {company.lastActivityAt ? (
                            <span style={{ color: status === 'ativo' ? '#22c55e' : status === 'atencao' ? '#eab308' : '#ef4444', fontSize: 12 }}>
                              {fmtDate(company.lastActivityAt)}
                            </span>
                          ) : (
                            <span style={{ color: '#374151', fontSize: 12 }}>Sem atividade</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ ...TD, minWidth: 100 }}>
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {/* Footer row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: `1px solid rgba(143,191,194,0.06)` }}>
              <span style={{ fontSize: 12, color: '#475569' }}>
                Mostrando <strong style={{ color: '#64748b' }}>{filtered.length}</strong> de <strong style={{ color: '#64748b' }}>{totalEmpresas}</strong> empresas
              </span>
              <span style={{ fontSize: 11, color: '#374151' }}>
                Dados via HubSpot · atualizado agora
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Spin keyframes (injected inline) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
