'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

const T = '#8fbfc2'; const CARD = '#0d1a1e'; const BORDER = 'rgba(143,191,194,0.10)'
const H: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif' }
const TH: React.CSSProperties = { fontSize: 11, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid rgba(143,191,194,0.08)', textAlign: 'left' }
const TD: React.CSSProperties = { fontSize: 12, color: '#cbd5e1', padding: '9px 12px', borderBottom: '1px solid rgba(143,191,194,0.05)', verticalAlign: 'middle' }

function fmtCurrency(n: number | null) {
  if (n == null || n === 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(n)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}
function daysUntil(iso: string | null) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function StatusBadge({ deal }: { deal: any }) {
  if (deal.isWon) return <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>Ganho ✓</span>
  if (deal.isClosed) return <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>Perdido</span>
  const days = daysUntil(deal.closeDate)
  if (days !== null && days < 0) return <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>Atrasado {Math.abs(days)}d</span>
  if (days !== null && days <= 7) return <span style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>Vence em {days}d</span>
  return <span style={{ background: 'rgba(143,191,194,0.1)', color: T, borderRadius: 8, padding: '3px 8px', fontSize: 11 }}>Em andamento</span>
}

export default function DealsPage() {
  const [selectedPipeline, setSelectedPipeline] = useState('')
  const [selectedStage, setSelectedStage] = useState('')
  const [showWon, setShowWon] = useState<'all' | 'open' | 'won' | 'lost'>('open')
  const [after, _setAfter] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['hubspot-deals', selectedPipeline, selectedStage, after],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: '100', ...(selectedPipeline ? { pipeline: selectedPipeline } : {}), ...(selectedStage ? { stage: selectedStage } : {}), ...(after ? { after } : {}) })
      return fetch(`/api/hubspot/deals?${qs}`).then(r => r.json())
    },
    staleTime: 3 * 60 * 1000,
  })

  const pipelines: any[] = data?.pipelines ?? []
  const selectedPipelineObj = pipelines.find(p => p.id === selectedPipeline)

  const filteredDeals = (data?.deals ?? []).filter((d: any) => {
    if (showWon === 'open') return !d.isClosed
    if (showWon === 'won') return d.isWon
    if (showWon === 'lost') return d.isClosed && !d.isWon
    return true
  })

  const totalAmount = filteredDeals.reduce((s: number, d: any) => s + (d.amount ?? 0), 0)

  const P: React.CSSProperties = { minHeight: '100vh', background: '#0a1316', padding: '28px 32px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }
  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 22px' }
  const selStyle: React.CSSProperties = { background: '#0d1a1e', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 12px', color: '#e2e8f0', fontSize: 12, cursor: 'pointer' }
  const btnFilter = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(143,191,194,0.15)' : 'rgba(143,191,194,0.04)', border: `1px solid ${active ? 'rgba(143,191,194,0.35)' : BORDER}`,
    borderRadius: 20, padding: '5px 12px', color: active ? T : '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
  })

  return (
    <div style={P}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ ...H, fontSize: 22, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>Negócios (Deals)</h1>
          <p style={{ fontSize: 13, color: T, margin: '4px 0 0' }}>{filteredDeals.length} negócios · {fmtCurrency(totalAmount)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status filter */}
          {(['all', 'open', 'won', 'lost'] as const).map(v => (
            <button key={v} onClick={() => setShowWon(v)} style={btnFilter(showWon === v)}>
              {{ all: 'Todos', open: 'Abertos', won: 'Ganhos', lost: 'Perdidos' }[v]}
            </button>
          ))}
          {/* Pipeline filter */}
          <select value={selectedPipeline} onChange={e => { setSelectedPipeline(e.target.value); setSelectedStage('') }} style={selStyle}>
            <option value="">Pipeline: todos</option>
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {/* Stage filter */}
          {selectedPipelineObj && (
            <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} style={selStyle}>
              <option value="">Estágio: todos</option>
              {selectedPipelineObj.stages.map((s: any) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* KPI mini bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total', value: (data?.deals ?? []).length, color: T },
          { label: 'Abertos', value: (data?.deals ?? []).filter((d: any) => !d.isClosed).length, color: '#eab308' },
          { label: 'Ganhos', value: (data?.deals ?? []).filter((d: any) => d.isWon).length, color: '#22c55e' },
          { label: 'Perdidos', value: (data?.deals ?? []).filter((d: any) => d.isClosed && !d.isWon).length, color: '#ef4444' },
          { label: 'Pipeline (R$)', value: fmtCurrency((data?.deals ?? []).filter((d: any) => !d.isClosed).reduce((s: number, d: any) => s + (d.amount ?? 0), 0)), color: '#3b82f6' },
          { label: 'Receita', value: fmtCurrency((data?.deals ?? []).filter((d: any) => d.isWon).reduce((s: number, d: any) => s + (d.amount ?? 0), 0)), color: '#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: T, fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color, ...H }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={card}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T }}>⟳ Carregando negócios...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Negócio', 'Valor', 'Pipeline', 'Estágio', 'Responsável', 'Previsão', 'Status'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredDeals.map((d: any) => (
                  <tr key={d.id}>
                    <td style={{ ...TD, fontWeight: 600, color: '#e2e8f0', minWidth: 200, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</td>
                    <td style={{ ...TD, color: '#22c55e', fontWeight: 600, minWidth: 110 }}>{fmtCurrency(d.amount)}</td>
                    <td style={{ ...TD, fontSize: 11, minWidth: 100, color: '#94a3b8' }}>{d.pipelineLabel ?? d.pipeline ?? '—'}</td>
                    <td style={{ ...TD, minWidth: 120, fontSize: 11 }}>{d.stageLabel ?? d.stage ?? '—'}</td>
                    <td style={{ ...TD, minWidth: 120, fontSize: 11 }}>{d.ownerName ?? '—'}</td>
                    <td style={{ ...TD, minWidth: 90, color: '#6b7280' }}>{fmtDate(d.closeDate)}</td>
                    <td style={{ ...TD, minWidth: 110 }}><StatusBadge deal={d} /></td>
                  </tr>
                ))}
                {filteredDeals.length === 0 && (
                  <tr><td colSpan={7} style={{ ...TD, textAlign: 'center', color: '#6b7280', padding: 32 }}>Nenhum negócio encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
