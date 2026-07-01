'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

const T = '#8fbfc2'; const CARD = '#0d1a1e'; const BORDER = 'rgba(143,191,194,0.10)'
const H: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif' }
const TH: React.CSSProperties = { fontSize: 11, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid rgba(143,191,194,0.08)', textAlign: 'left' }
const TD: React.CSSProperties = { fontSize: 12, color: '#cbd5e1', padding: '9px 12px', borderBottom: '1px solid rgba(143,191,194,0.05)', verticalAlign: 'middle' }

function fmtCurrency(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(n)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  return `${d}d atrás`
}

export default function CompaniesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [after, setAfter] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])

  const debounce = useCallback((v: string) => {
    setSearch(v)
    const t = setTimeout(() => { setDebouncedSearch(v); setAfter(null); setHistory([]) }, 400)
    return () => clearTimeout(t)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['hubspot-companies', debouncedSearch, after],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: '50', ...(debouncedSearch ? { search: debouncedSearch } : {}), ...(after ? { after } : {}) })
      return fetch(`/api/hubspot/companies?${qs}`).then(r => r.json())
    },
    staleTime: 3 * 60 * 1000,
  })

  const goNext = () => {
    const nextAfter = data?.paging?.next?.after
    if (nextAfter) { setHistory(h => [...h, after ?? '']); setAfter(nextAfter) }
  }
  const goPrev = () => {
    const prev = [...history]; const p = prev.pop() ?? null; setHistory(prev); setAfter(p || null)
  }

  const P: React.CSSProperties = { minHeight: '100vh', background: '#0a1316', padding: '28px 32px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }
  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 22px' }

  return (
    <div style={P}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ ...H, fontSize: 22, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>Empresas HubSpot</h1>
          {data?.total != null && <p style={{ fontSize: 13, color: T, margin: '4px 0 0' }}>{data.total.toLocaleString('pt-BR')} empresas</p>}
        </div>
        <input placeholder="Buscar por nome..." value={search} onChange={e => debounce(e.target.value)}
          style={{ background: 'rgba(143,191,194,0.05)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 14px', color: '#e2e8f0', fontSize: 13, outline: 'none', minWidth: 240 }} />
      </div>

      <div style={card}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T }}>⟳ Carregando...</div>
        ) : data?.error ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#ef4444' }}>{data.error}</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Empresa', 'Domínio', 'Setor', 'Funcionários', 'Receita', 'Última Atividade', 'País'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(data?.companies ?? []).map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ ...TD, fontWeight: 600, color: '#e2e8f0', minWidth: 160 }}>{c.name}</td>
                      <td style={{ ...TD, minWidth: 140 }}>
                        {c.domain ? <a href={`https://${c.domain}`} target="_blank" rel="noreferrer" style={{ color: T, textDecoration: 'none', fontSize: 11 }}>{c.domain}</a> : '—'}
                      </td>
                      <td style={{ ...TD, minWidth: 120, fontSize: 11, color: '#94a3b8' }}>{c.industry ?? '—'}</td>
                      <td style={{ ...TD, minWidth: 90, textAlign: 'center' }}>{c.numEmployees ?? '—'}</td>
                      <td style={{ ...TD, minWidth: 90, color: '#22c55e' }}>{fmtCurrency(c.annualRevenue)}</td>
                      <td style={{ ...TD, minWidth: 110 }}>
                        {c.lastActivityAt
                          ? <span style={{ color: Date.now() - new Date(c.lastActivityAt).getTime() > 60 * 86400000 ? '#ef4444' : '#94a3b8' }}>{fmtDate(c.lastActivityAt)}</span>
                          : <span style={{ color: '#6b7280' }}>Sem atividade</span>}
                      </td>
                      <td style={{ ...TD, minWidth: 80, fontSize: 11, color: '#6b7280' }}>{c.country ?? c.city ?? '—'}</td>
                    </tr>
                  ))}
                  {(data?.companies ?? []).length === 0 && (
                    <tr><td colSpan={7} style={{ ...TD, textAlign: 'center', color: '#6b7280', padding: 32 }}>Nenhuma empresa encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `1px solid rgba(143,191,194,0.06)` }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Mostrando {(data?.companies ?? []).length} de {data?.total?.toLocaleString('pt-BR') ?? '?'}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={goPrev} disabled={history.length === 0} style={{ background: 'rgba(143,191,194,0.08)', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '6px 14px', color: T, cursor: 'pointer', fontSize: 12, opacity: history.length === 0 ? 0.4 : 1 }}>← Anterior</button>
                <button onClick={goNext} disabled={!data?.paging?.next?.after} style={{ background: 'rgba(143,191,194,0.08)', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '6px 14px', color: T, cursor: 'pointer', fontSize: 12, opacity: !data?.paging?.next?.after ? 0.4 : 1 }}>Próxima →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
