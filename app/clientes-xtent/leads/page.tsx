'use client'

import { useEffect, useState } from 'react'
import { Loader2, Users, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const H: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif' }

interface Contact {
  id: string
  name: string
  email: string | null
  company: string | null
  lifecycleStage: string | null
  leadStatus: string | null
  createdAt: string | null
  updatedAt: string | null
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return '1 dia atrás'
  return `${diff} dias atrás`
}

function isWithin7Days(dateStr: string | null): boolean {
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() <= 7 * 86400000
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', ...H }}>{value}</div>
        <div style={{ fontSize: 11, color: T, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

function LeadCard({ contact, badge, sub }: { contact: Contact; badge: { label: string; color: string }; sub?: string }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{contact.name}</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: `${badge.color}18`, color: badge.color, flexShrink: 0 }}>
          {badge.label}
        </span>
      </div>
      {contact.email && <div style={{ fontSize: 11, color: T, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.email}</div>}
      {contact.company && <div style={{ fontSize: 11, color: '#6b7280' }}>{contact.company}</div>}
      {sub && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6, paddingTop: 6, borderTop: `1px solid rgba(143,191,194,0.05)` }}>{sub}</div>}
    </div>
  )
}

function Column({ title, color, count, children }: { title: string; color: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, borderTop: `3px solid ${color}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${color}18`, color }}>{count}</span>
      </div>
      <div style={{ padding: 12, overflowY: 'auto', maxHeight: 560 }}>
        {count === 0
          ? <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', padding: '32px 0' }}>Nenhum lead nesta categoria</p>
          : children}
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/hubspot/contacts?limit=100')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data?.contacts) ? data.contacts : []
        setContacts(list)
      })
      .catch(() => setError('Erro ao carregar contatos do HubSpot.'))
      .finally(() => setLoading(false))
  }, [])

  const novos = contacts.filter(c => {
    const stage = (c.lifecycleStage ?? '').toLowerCase()
    return stage === 'lead' && isWithin7Days(c.createdAt)
  })

  const negociacao = contacts.filter(c => {
    const stage = (c.lifecycleStage ?? '').toLowerCase()
    const status = (c.leadStatus ?? '').toLowerCase()
    return stage === 'opportunity' || status.includes('qual') || status.includes('negoc') || status.includes('connect')
  })

  const qualificados = contacts.filter(c => {
    const stage = (c.lifecycleStage ?? '').toLowerCase()
    return stage === 'marketingqualifiedlead' || stage === 'salesqualifiedlead'
  })

  const P: React.CSSProperties = { minHeight: '100vh', background: '#0a1316', padding: '28px 32px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }

  return (
    <div style={P}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ ...H, fontSize: 22, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>Leads Novos e em Evolução</h1>
        <p style={{ fontSize: 13, color: T, margin: '4px 0 0' }}>Pipeline de leads integrado com HubSpot</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Total Leads" value={contacts.length} icon={Users} color={T} />
        <KpiCard label="Novos (7 dias)" value={contacts.filter(c => isWithin7Days(c.createdAt)).length} icon={Sparkles} color="#3b82f6" />
        <KpiCard label="Em Negociação" value={negociacao.length} icon={TrendingUp} color="#f59e0b" />
        <KpiCard label="Qualificados" value={qualificados.length} icon={CheckCircle2} color="#22c55e" />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={26} style={{ color: T, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      )}

      {error && !loading && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 20, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Column title="Leads Novos" color="#3b82f6" count={novos.length}>
            {novos.map(c => <LeadCard key={c.id} contact={c} badge={{ label: 'Novo', color: '#3b82f6' }} sub={daysAgo(c.createdAt)} />)}
          </Column>
          <Column title="Em Negociação" color="#f59e0b" count={negociacao.length}>
            {negociacao.map(c => <LeadCard key={c.id} contact={c} badge={{ label: 'Em andamento', color: '#f59e0b' }} sub={`Atualizado: ${daysAgo(c.updatedAt)}`} />)}
          </Column>
          <Column title="Qualificados" color="#22c55e" count={qualificados.length}>
            {qualificados.map(c => <LeadCard key={c.id} contact={c} badge={{ label: 'Qualificado', color: '#22c55e' }} />)}
          </Column>
        </div>
      )}
    </div>
  )
}
