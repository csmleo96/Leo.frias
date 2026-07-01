'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'

const T = '#8fbfc2'; const CARD = '#0d1a1e'; const BORDER = 'rgba(143,191,194,0.10)'
const H: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif' }
const TH: React.CSSProperties = { fontSize: 11, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid rgba(143,191,194,0.08)', textAlign: 'left' }
const TD: React.CSSProperties = { fontSize: 12, color: '#cbd5e1', padding: '8px 12px', borderBottom: '1px solid rgba(143,191,194,0.05)' }

const REPORTS = [
  { id: 'contacts-last30', label: 'Contatos criados — 30 dias', icon: '👥', desc: 'Novos contatos adicionados nos últimos 30 dias' },
  { id: 'deals-by-stage', label: 'Negócios por estágio', icon: '📊', desc: 'Distribuição de negócios abertos por estágio do pipeline' },
  { id: 'revenue-monthly', label: 'Receita mensal', icon: '💰', desc: 'Receita acumulada por negócios ganhos mês a mês' },
  { id: 'conversion-by-owner', label: 'Conversão por vendedor', icon: '🏆', desc: 'Taxa de conversão e receita por responsável' },
  { id: 'companies-no-activity', label: 'Empresas sem atividade 60d', icon: '😴', desc: 'Empresas sem nenhuma atividade nos últimos 60 dias' },
  { id: 'deals-closing-soon', label: 'Negócios vencendo em 30 dias', icon: '⏰', desc: 'Negócios com previsão de fechamento nos próximos 30 dias' },
]

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function RowsTable({ rows }: { rows: any[] }) {
  if (!rows.length) return <p style={{ color: '#6b7280', fontSize: 12, padding: 16 }}>Sem resultados</p>
  const keys = Object.keys(rows[0]).filter(k => k !== 'id')
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{keys.map(k => <th key={k} style={TH}>{k.replace(/([A-Z])/g, ' $1').trim()}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {keys.map(k => (
                <td key={k} style={TD}>
                  {row[k] != null
                    ? (typeof row[k] === 'number' && (k.toLowerCase().includes('amount') || k.toLowerCase().includes('revenue'))
                        ? fmtCurrency(row[k])
                        : String(row[k]))
                    : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MonthlyChart({ months }: { months: any[] }) {
  const maxRev = Math.max(...months.map(m => m.revenue), 1)
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-end', height: 120 }}>
        {months.slice(-6).map(m => {
          const h = (m.revenue / maxRev) * 100
          return (
            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>{fmtCurrency(m.revenue)}</span>
              <div style={{ width: '100%', background: 'rgba(34,197,94,0.1)', borderRadius: 4, height: 80, display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', height: `${h}%`, background: '#22c55e', borderRadius: 4, minHeight: 4 }} />
              </div>
              <span style={{ fontSize: 10, color: '#6b7280' }}>{m.month}</span>
              <span style={{ fontSize: 9, color: T }}>{m.count || 0} deals</span>
            </div>
          )
        })}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['Mês', 'Negócios', 'Receita'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={i}>
              <td style={TD}>{m.month}</td>
              <td style={{ ...TD, textAlign: 'center' }}>{m.count || 0}</td>
              <td style={{ ...TD, color: '#22c55e', fontWeight: 600 }}>{fmtCurrency(m.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StagesReport({ stages }: { stages: any[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {stages.map(s => (
        <div key={s.stage} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ ...H, fontSize: 14, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{s.stage}</h3>
            <div style={{ display: 'flex', gap: 14 }}>
              <span style={{ fontSize: 12, color: T }}>{s.count} negócios</span>
              <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>{fmtCurrency(s.totalAmount)}</span>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Nome', 'Valor', 'Previsão'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {s.rows.map((r: any) => (
                <tr key={r.id}>
                  <td style={TD}>{r.name}</td>
                  <td style={{ ...TD, color: '#22c55e' }}>{fmtCurrency(r.amount)}</td>
                  <td style={TD}>{fmtDate(r.closeDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function OwnerConversionTable({ rows }: { rows: any[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['Vendedor', 'Ganhos', 'Perdidos', 'Total', 'Win Rate', 'Receita'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ ...TD, fontWeight: 600, color: '#e2e8f0' }}>{r.ownerId}</td>
              <td style={{ ...TD, color: '#22c55e', textAlign: 'center' }}>{r.won}</td>
              <td style={{ ...TD, color: '#ef4444', textAlign: 'center' }}>{r.lost}</td>
              <td style={{ ...TD, textAlign: 'center' }}>{r.total}</td>
              <td style={{ ...TD, fontWeight: 700, color: r.winRate >= 50 ? '#22c55e' : '#eab308', textAlign: 'center' }}>{r.winRate}%</td>
              <td style={{ ...TD, color: '#22c55e' }}>{fmtCurrency(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReportResult({ data, reportId }: { data: any; reportId: string }) {
  if (!data) return null
  if (data.error) return <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>{data.error}</div>
  if (data.rows) return <RowsTable rows={data.rows} />
  if (data.months) return <MonthlyChart months={data.months} />
  if (data.stages) return <StagesReport stages={data.stages} />
  if (reportId === 'conversion-by-owner' && Array.isArray(data.rows_or_results)) return <OwnerConversionTable rows={data.rows_or_results} />
  return <div style={{ padding: 24, color: '#6b7280', fontSize: 12 }}>Sem dados para exibir</div>
}

export default function HubSpotReportsPage() {
  const [selectedReport, setSelectedReport] = useState(REPORTS[0].id)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hubspot-report', selectedReport],
    queryFn: () => fetch(`/api/hubspot/reports?type=${selectedReport}`).then(r => r.json()),
    staleTime: 10 * 60 * 1000,
  })

  function exportExcel() {
    if (!data) return
    const wb = XLSX.utils.book_new()
    const rows = data.rows ?? data.months ?? (data.stages?.flatMap((s: any) => s.rows) ?? [])
    if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Relatório')
    XLSX.writeFile(wb, `hubspot-${selectedReport}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function exportCSV() {
    const rows = data?.rows ?? data?.months ?? []
    if (!rows.length) return
    const keys = Object.keys(rows[0])
    const csv = '﻿' + [keys, ...rows.map((r: any) => keys.map((k: string) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`))]
      .map((r: any) => r.join(',')).join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `hubspot-${selectedReport}.csv`; a.click()
  }

  const P: React.CSSProperties = { minHeight: '100vh', background: '#0a1316', padding: '28px 32px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }
  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 22px', marginBottom: 16 }
  const reportInfo = REPORTS.find(r => r.id === selectedReport)!

  return (
    <div style={P}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ ...H, fontSize: 22, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>Relatórios HubSpot</h1>
          <p style={{ fontSize: 13, color: T, margin: '4px 0 0' }}>Análises personalizadas do CRM</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => refetch()} style={{ background: 'rgba(143,191,194,0.08)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 14px', color: T, cursor: 'pointer', fontSize: 12 }}>↻ Atualizar</button>
          <button onClick={exportCSV} style={{ background: 'rgba(143,191,194,0.08)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 14px', color: T, cursor: 'pointer', fontSize: 12 }}>CSV</button>
          <button onClick={exportExcel} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '7px 14px', color: '#22c55e', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Excel</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Selector */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Relatórios Disponíveis</p>
          </div>
          {REPORTS.map(r => (
            <button key={r.id} onClick={() => setSelectedReport(r.id)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: selectedReport === r.id ? 'rgba(143,191,194,0.1)' : 'transparent', border: 'none', borderLeft: selectedReport === r.id ? `3px solid ${T}` : '3px solid transparent', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(143,191,194,0.05)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{r.icon}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: selectedReport === r.id ? T : '#cbd5e1', margin: 0, lineHeight: 1.3 }}>{r.label}</p>
                <p style={{ fontSize: 10, color: '#6b7280', margin: '2px 0 0' }}>{r.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Result */}
        <div>
          {/* Report header */}
          <div style={{ background: 'rgba(143,191,194,0.04)', border: '1px solid rgba(143,191,194,0.12)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 30 }}>{reportInfo.icon}</span>
            <div style={{ flex: 1 }}>
              <h2 style={{ ...H, fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{data?.title ?? reportInfo.label}</h2>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{reportInfo.desc}</p>
            </div>
            {data?.count != null && (
              <div style={{ background: 'rgba(143,191,194,0.12)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: T, ...H }}>{data.count}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>registros</div>
              </div>
            )}
            {data?.totalRevenue != null && (
              <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', ...H }}>{fmtCurrency(data.totalRevenue)}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>receita total</div>
              </div>
            )}
          </div>

          <div style={card}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: 60, color: T }}>⟳ Gerando relatório...</div>
            ) : (
              <ReportResult data={data} reportId={selectedReport} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
