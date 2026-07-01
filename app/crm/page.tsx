'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  UserPlus,
  Mail,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Search,
  Activity,
} from 'lucide-react'

type Tab = 'prospects' | 'clientes' | 'atividades'

interface HubSpotContact {
  id: string
  name: string
  email: string | null
  company: string | null
  lifecycleStage: string | null
  leadStatus: string | null
  createdAt: string | null
  updatedAt: string | null
}

interface ContactsResponse {
  contacts: HubSpotContact[]
}

const ACTIVITIES = [
  {
    icon: UserPlus,
    iconBg: '#1e3a5f',
    iconColor: '#60a5fa',
    title: 'Novo lead: Felipe Vallini',
    description: 'Adicionado via HubSpot',
    time: '2h atrás',
  },
  {
    icon: Mail,
    iconBg: '#0d2a2a',
    iconColor: '#8fbfc2',
    title: 'Email enviado para Matheus Rossi',
    description: 'Proposta comercial',
    time: '4h atrás',
  },
  {
    icon: Calendar,
    iconBg: '#2a1a3e',
    iconColor: '#a78bfa',
    title: 'Reunião agendada',
    description: 'Demo com Empresa XYZ',
    time: 'Ontem',
  },
  {
    icon: TrendingUp,
    iconBg: '#0d2a1a',
    iconColor: '#4ade80',
    title: 'Deal atualizado',
    description: 'Contrato em revisão',
    time: '2 dias atrás',
  },
  {
    icon: AlertTriangle,
    iconBg: '#2a0d0d',
    iconColor: '#f87171',
    title: 'Ticket criado',
    description: 'Suporte técnico urgente',
    time: '3 dias atrás',
  },
]

function getDaysSince(dateStr: string | null): number {
  if (!dateStr) return 999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function HealthBadge({ days }: { days: number }) {
  if (days <= 30) {
    return (
      <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
        Ativo
      </span>
    )
  }
  if (days <= 60) {
    return (
      <span style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
        Atenção
      </span>
    )
  }
  return (
    <span style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
      Crítico
    </span>
  )
}

function StageBadge({ stage }: { stage?: string }) {
  if (stage === 'lead') {
    return (
      <span style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
        Lead
      </span>
    )
  }
  return (
    <span style={{ background: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
      Subscriber
    </span>
  )
}

const thStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#8fbfc2',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '8px 14px',
  textAlign: 'left',
  borderBottom: '1px solid rgba(143,191,194,0.10)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#cbd5e1',
  padding: '10px 14px',
  borderBottom: '1px solid rgba(143,191,194,0.05)',
}

export default function CRMPage() {
  const [tab, setTab] = useState<Tab>('prospects')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<ContactsResponse>({
    queryKey: ['crm-contacts'],
    queryFn: async () => {
      const res = await fetch('/api/hubspot/contacts?limit=100')
      if (!res.ok) throw new Error('Failed to fetch contacts')
      return res.json()
    },
  })

  const allContacts = data?.contacts ?? []

  const filtered = allContacts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.name ?? '').toLowerCase().includes(q)
      || (c.email ?? '').toLowerCase().includes(q)
      || (c.company ?? '').toLowerCase().includes(q)
  })

  const prospects = filtered.filter((c) => {
    const stage = c.lifecycleStage ?? ''
    return stage === 'lead' || stage === 'subscriber' || !stage
  })

  const clientes = filtered.filter((c) => {
    const stage = c.lifecycleStage ?? ''
    return stage === 'customer' || stage === 'opportunity'
  })

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        padding: '6px 16px',
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 500,
        border: tab === id ? '1px solid rgba(143,191,194,0.25)' : '1px solid transparent',
        background: tab === id ? 'rgba(143,191,194,0.15)' : 'transparent',
        color: tab === id ? '#8fbfc2' : '#64748b',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ background: '#0a1316', minHeight: '100vh', padding: 32, fontFamily: 'Space Grotesk, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f3fafa', margin: 0, lineHeight: 1.2 }}>CRM</h1>
          <p style={{ fontSize: 13, color: '#8fbfc2', margin: '4px 0 0' }}>Gestão de relacionamento com clientes</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8fbfc2' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato, empresa..."
            style={{
              background: '#0d1a1e',
              border: '1px solid rgba(143,191,194,0.15)',
              borderRadius: 8,
              padding: '8px 12px 8px 30px',
              fontSize: 13,
              color: '#f3fafa',
              outline: 'none',
              width: 240,
            }}
          />
        </div>
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabBtn('prospects', 'Prospects')}
        {tabBtn('clientes', 'Clientes')}
        {tabBtn('atividades', 'Atividades')}
      </div>

      {/* Prospects Tab */}
      {tab === 'prospects' && (
        <div style={{ background: '#0d1a1e', border: '1px solid rgba(143,191,194,0.10)', borderRadius: 12, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#8fbfc2', fontSize: 13 }}>Carregando...</div>
          ) : prospects.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Users size={32} style={{ color: '#8fbfc2', marginBottom: 8, opacity: 0.5 }} />
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Nenhum prospect encontrado</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Empresa</th>
                  <th style={thStyle}>Origem</th>
                  <th style={thStyle}>Data Entrada</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((c) => (
                  <tr
                    key={c.id}
                    style={{ transition: 'background 0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#f1f5f9', display: 'block' }}>{c.name || '—'}</span>
                      <span style={{ fontSize: 11, color: '#8fbfc2' }}>{c.email ?? '—'}</span>
                    </td>
                    <td style={tdStyle}>{c.company ?? '—'}</td>
                    <td style={tdStyle}>—</td>
                    <td style={tdStyle}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={tdStyle}>
                      <StageBadge stage={c.lifecycleStage ?? undefined} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Clientes Tab */}
      {tab === 'clientes' && (
        <div style={{ background: '#0d1a1e', border: '1px solid rgba(143,191,194,0.10)', borderRadius: 12, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#8fbfc2', fontSize: 13 }}>Carregando...</div>
          ) : clientes.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Users size={32} style={{ color: '#8fbfc2', marginBottom: 8, opacity: 0.5 }} />
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Nenhum cliente encontrado</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Empresa</th>
                  <th style={thStyle}>Contato</th>
                  <th style={thStyle}>Responsável</th>
                  <th style={thStyle}>Última Interação</th>
                  <th style={thStyle}>Saúde</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const days = getDaysSince(c.updatedAt)
                  const lastDate = c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('pt-BR') : '—'
                  return (
                    <tr
                      key={c.id}
                      style={{ transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{c.company ?? '—'}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'block' }}>{c.name || '—'}</span>
                        <span style={{ fontSize: 11, color: '#8fbfc2' }}>{c.email ?? ''}</span>
                      </td>
                      <td style={tdStyle}>—</td>
                      <td style={tdStyle}>{lastDate}</td>
                      <td style={tdStyle}>
                        <HealthBadge days={days} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Atividades Tab */}
      {tab === 'atividades' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ACTIVITIES.map((act, i) => {
            const Icon = act.icon
            return (
              <div
                key={i}
                style={{
                  background: '#0d1a1e',
                  border: '1px solid rgba(143,191,194,0.10)',
                  borderRadius: 10,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'background 0.1s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0d1a1e')}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: act.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} color={act.iconColor} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{act.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{act.description}</p>
                </div>
                <span style={{ fontSize: 11, color: '#8fbfc2', whiteSpace: 'nowrap' }}>{act.time}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
