'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const H = { fontFamily: 'Space Grotesk, sans-serif' }

function fmt(n: number, currency = false) {
  if (currency) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(n)
  return new Intl.NumberFormat('pt-BR').format(n)
}

function KpiCard({ label, value, sub, color = T, icon }: { label: string; value: string | number; sub?: string; color?: string; icon: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color, ...H, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function BarChart({ data, keyX, keyY, colorFn }: { data: any[]; keyX: string; keyY: string; colorFn?: (v: number) => string }) {
  if (!data.length) return <div style={{ color: '#6b7280', fontSize: 12, padding: 16 }}>Sem dados</div>
  const max = Math.max(...data.map(d => d[keyY]))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '0 4px' }}>
      {data.map((d, i) => {
        const h = max > 0 ? (d[keyY] / max) * 100 : 0
        const color = colorFn ? colorFn(d[keyY]) : T
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#8fbfc2', fontWeight: 600 }}>
              {typeof d[keyY] === 'number' && d[keyY] > 999 ? fmt(d[keyY], keyY.includes('rev') || keyY === 'revenue') : d[keyY]}
            </span>
            <div style={{ width: '100%', background: `${color}20`, borderRadius: 4, height: 90, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', height: `${h}%`, background: color, borderRadius: 4, minHeight: 4, transition: 'height 0.3s' }} />
            </div>
            <span style={{ fontSize: 9, color: '#6b7280', textAlign: 'center', lineHeight: 1.2 }}>{d[keyX]}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function HubSpotDashboard() {
  const { data: status } = useQuery({
    queryKey: ['hubspot-status'],
    queryFn: () => fetch('/api/hubspot/auth/status').then(r => r.json()),
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['hubspot-dashboard'],
    queryFn: () => fetch('/api/hubspot/dashboard').then(r => r.json()),
    enabled: status?.connected === true,
    staleTime: 5 * 60 * 1000,
  })

  const P: React.CSSProperties = { minHeight: '100vh', background: '#0a1316', padding: '28px 32px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }
  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 22px', marginBottom: 20 }

  if (!status?.connected) return (
    <div style={P}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔌</div>
        <h2 style={{ ...H, fontSize: 20, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>HubSpot não conectado</h2>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0, textAlign: 'center' }}>Conecte sua conta HubSpot para visualizar o dashboard CRM</p>
        <Link href="/hubspot/settings" style={{ background: 'rgba(255,122,0,0.15)', border: '1px solid rgba(255,122,0,0.3)', color: '#ff7a00', borderRadius: 8, padding: '10px 20px', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
          Configurar HubSpot →
        </Link>
      </div>
    </div>
  )

  if (isLoading) return (
    <div style={P}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: T }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div><p style={{ fontSize: 14 }}>Carregando CRM...</p></div>
      </div>
    </div>
  )

  if (data?.error) return (
    <div style={P}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: 400 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✕</div>
          <p style={{ fontSize: 14 }}>{data.error}</p>
          <Link href="/hubspot/settings" style={{ fontSize: 12, color: T, textDecoration: 'underline' }}>Verificar configurações</Link>
        </div>
      </div>
    </div>
  )

  const o = data?.overview ?? {}
  const charts = data?.charts ?? {}

  return (
    <div style={P}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ ...H, fontSize: 22, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>CRM HubSpot</h1>
          <p style={{ fontSize: 13, color: T, margin: '4px 0 0' }}>
            {status.hubDomain ?? status.portalId} · Dashboard Executivo
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['Contatos', '/hubspot/contacts'], ['Empresas', '/hubspot/companies'], ['Negócios', '/hubspot/deals'], ['Relatórios', '/hubspot/reports']].map(([l, h]) => (
            <Link key={h} href={h} style={{ background: 'rgba(143,191,194,0.06)', border: `1px solid ${BORDER}`, color: T, borderRadius: 8, padding: '7px 14px', textDecoration: 'none', fontSize: 12, fontWeight: 500 }}>{l}</Link>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Total Contatos" value={fmt(o.totalContacts ?? 0)} icon="👥" />
        <KpiCard label="Negócios Abertos" value={fmt(o.openDeals ?? 0)} sub={`Pipeline: ${fmt(o.openPipeline ?? 0, true)}`} icon="📊" color="#eab308" />
        <KpiCard label="Receita Total" value={fmt(o.totalRevenue ?? 0, true)} sub={`${o.wonDeals ?? 0} negócios ganhos`} icon="💰" color="#22c55e" />
        <KpiCard label="Leads" value={fmt(o.leads ?? 0)} sub={`${o.customers ?? 0} clientes`} icon="🎯" />
        <KpiCard label="Taxa de Conversão" value={`${o.conversionRate ?? 0}%`} sub="leads → clientes" icon="📈" color={o.conversionRate >= 20 ? '#22c55e' : '#eab308'} />
        <KpiCard label="Win Rate" value={`${o.winRate ?? 0}%`} sub={`${o.lostDeals ?? 0} perdidos`} icon="🏆" color={o.winRate >= 50 ? '#22c55e' : '#ef4444'} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <h3 style={{ ...H, fontSize: 14, fontWeight: 700, color: T, margin: '0 0 16px' }}>Receita Mensal (últimos 6 meses)</h3>
          <BarChart data={charts.revenueByMonth ?? []} keyX="month" keyY="revenue" colorFn={() => '#22c55e'} />
        </div>
        <div style={card}>
          <h3 style={{ ...H, fontSize: 14, fontWeight: 700, color: T, margin: '0 0 16px' }}>Contatos por Mês</h3>
          <BarChart data={charts.contactsByMonth ?? []} keyX="month" keyY="contacts" />
        </div>
      </div>

      {/* Deals by Stage + Owner Ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <h3 style={{ ...H, fontSize: 14, fontWeight: 700, color: T, margin: '0 0 14px' }}>Negócios por Estágio</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(charts.dealsByStage ?? []).slice(0, 8).map((s: any) => {
              const maxCount = Math.max(...(charts.dealsByStage ?? []).map((x: any) => x.count))
              const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0
              return (
                <div key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{s.label || s.id}</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#22c55e' }}>{fmt(s.amount, true)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T }}>{s.count}</span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: 'rgba(143,191,194,0.1)', borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: T, borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
            {(charts.dealsByStage ?? []).length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>Nenhum negócio aberto</p>}
          </div>
        </div>

        <div style={card}>
          <h3 style={{ ...H, fontSize: 14, fontWeight: 700, color: T, margin: '0 0 14px' }}>Ranking de Vendedores</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Vendedor', 'Ganhos', 'Receita', 'Win%'].map(h => (
                <th key={h} style={{ fontSize: 11, color: T, padding: '4px 8px', borderBottom: '1px solid rgba(143,191,194,0.08)', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {(charts.ownerRanking ?? []).slice(0, 8).map((o: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontSize: 12, padding: '6px 8px', borderBottom: '1px solid rgba(143,191,194,0.04)', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{o.name}</td>
                  <td style={{ fontSize: 12, padding: '6px 8px', borderBottom: '1px solid rgba(143,191,194,0.04)', color: '#22c55e', textAlign: 'center' }}>{o.won}</td>
                  <td style={{ fontSize: 11, padding: '6px 8px', borderBottom: '1px solid rgba(143,191,194,0.04)', color: '#22c55e' }}>{fmt(o.revenue, true)}</td>
                  <td style={{ fontSize: 12, padding: '6px 8px', borderBottom: '1px solid rgba(143,191,194,0.04)', color: o.winRate >= 50 ? '#22c55e' : '#eab308', fontWeight: 600 }}>
                    {o.won + o.lost > 0 ? `${Math.round((o.won / (o.won + o.lost)) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
              {(charts.ownerRanking ?? []).length === 0 && (
                <tr><td colSpan={4} style={{ fontSize: 12, color: '#6b7280', padding: 16, textAlign: 'center' }}>Sem dados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { label: 'Contatos', desc: `${fmt(o.totalContacts ?? 0)} registros`, href: '/hubspot/contacts', icon: '👥' },
          { label: 'Empresas', desc: 'Contas e domínios', href: '/hubspot/companies', icon: '🏢' },
          { label: 'Negócios', desc: `${fmt(o.openDeals ?? 0)} abertos`, href: '/hubspot/deals', icon: '💼' },
          { label: 'Relatórios', desc: 'Análises personalizadas', href: '/hubspot/reports', icon: '📊' },
          { label: 'Configurações', desc: 'OAuth e sincronização', href: '/hubspot/settings', icon: '⚙️' },
        ].map(({ label, desc, href, icon }) => (
          <Link key={href} href={href} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 18px', textDecoration: 'none', display: 'flex', gap: 12, alignItems: 'center', transition: 'border-color 0.15s' }}>
            <span style={{ fontSize: 24 }}>{icon}</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>{label}</p>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
