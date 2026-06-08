'use client'

import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Loader2, RefreshCw, AlertTriangle, Server, Activity, ShieldCheck,
  ExternalLink, AlertCircle, Download, CheckCircle2, Clock,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts'
import * as XLSX from 'xlsx'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const H = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }
const TOOLTIP = { backgroundColor: '#0d1a1e', border: '1px solid rgba(143,191,194,0.15)', borderRadius: 8, color: '#f3fafa', fontSize: 11 }

const SEV_COLOR: Record<number, string> = {
  0: '#94a3b8', 1: '#60a5fa', 2: '#fbbf24', 3: '#fb923c', 4: '#f87171', 5: '#ef4444',
}
const SEV_LABEL: Record<number, string> = {
  0: 'N/C', 1: 'Info', 2: 'Aviso', 3: 'Médio', 4: 'Alto', 5: 'Desastre',
}

const SEV_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: '5', label: 'Desastre' },
  { value: '4', label: 'Alto' },
  { value: '3', label: 'Médio' },
  { value: '2', label: 'Aviso' },
  { value: '1', label: 'Info' },
]

function Sk({ w = '100%', h = '14px', r = '6px' }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(143,191,194,0.07)', animation: 'shimmer 1.5s infinite', backgroundSize: '200%' }} />
}

function KpiCard({ icon: Icon, label, value, sub, color, loading }: any) {
  return (
    <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      {loading ? <><Sk h="28px" w="50%" /><Sk h="11px" w="70%" /></> : (
        <>
          <p className="text-2xl font-bold tabular-nums" style={{ ...H, color: '#f3fafa' }}>{value}</p>
          <p className="text-[11px] font-semibold mt-0.5" style={{ color }}>{label}</p>
          {sub && <p className="text-[11px]" style={{ color: MUTED }}>{sub}</p>}
        </>
      )}
    </div>
  )
}

export default function ZabbixPage() {
  const [sevFilter, setSevFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['zabbix'],
    queryFn: () => fetch('/api/zabbix').then(r => r.json()),
    refetchInterval: 60_000,
  })

  const problems: any[] = data?.problems ?? []
  const stats = data?.stats

  const filtered = problems.filter(p => {
    if (sevFilter !== 'all' && String(p.severity) !== sevFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.host.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const sevChartData = [5, 4, 3, 2, 1, 0].map(s => ({
    name: SEV_LABEL[s],
    value: problems.filter(p => p.severity === s).length,
    color: SEV_COLOR[s],
  })).filter(d => d.value > 0)

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(filtered.map(p => ({
      'Host': p.host, 'Problema': p.name, 'Severidade': p.severityLabel,
      'Tempo': p.age, 'Reconhecido': p.acknowledged ? 'Sim' : 'Não',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Problemas Zabbix')
    XLSX.writeFile(wb, `zabbix-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const zbxUrl = process.env.NEXT_PUBLIC_ZABBIX_URL

  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold" style={{ ...H, color: '#f3fafa' }}>Zabbix</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full"
                style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                Monitoramento
              </span>
              {!isLoading && !error && (
                <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: 'rgba(125,211,168,0.10)', color: '#7dd3a8', border: '1px solid rgba(125,211,168,0.20)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#7dd3a8' }} />
                  Online
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: MUTED }}>
              {isLoading ? 'Carregando...' : `${stats?.totalProblems ?? 0} problemas ativos · ${stats?.hostsTotal ?? 0} hosts monitorados`}
            </p>
          </div>
          <div className="flex gap-2">
            {zbxUrl && (
              <a href={zbxUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.20)' }}>
                <ExternalLink size={13} /> Abrir Zabbix
              </a>
            )}
            <button onClick={exportExcel} disabled={!filtered.length}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              style={{ background: 'rgba(143,191,194,0.10)', color: T, border: '1px solid rgba(143,191,194,0.20)' }}>
              <Download size={13} /> Exportar
            </button>
            <button onClick={() => refetch()} disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: CARD, color: MUTED, border: `1px solid ${BORDER}` }}>
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </div>

        {/* Error */}
        {error || data?.error ? (
          <div className="rounded-xl p-4 mb-6 flex items-start gap-3"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: '#f87171' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#f87171' }}>Erro ao conectar ao Zabbix</p>
              <p className="text-xs mt-1" style={{ color: MUTED }}>{data?.error ?? String(error)}</p>
              <p className="text-xs mt-1" style={{ color: MUTED }}>Verifique se o servidor Zabbix (10.70.0.12) está acessível pela rede.</p>
            </div>
          </div>
        ) : null}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard icon={AlertTriangle} label="Problemas Críticos" color="#ef4444"
            value={stats?.critical ?? 0} sub={`${stats?.disaster ?? 0} desastre · ${stats?.high ?? 0} alto`} loading={isLoading} />
          <KpiCard icon={Activity} label="Problemas Ativos" color="#fbbf24"
            value={stats?.totalProblems ?? 0} sub={`${stats?.unacknowledged ?? 0} não reconhecidos`} loading={isLoading} />
          <KpiCard icon={ShieldCheck} label="Disponibilidade" color="#7dd3a8"
            value={`${stats?.availability ?? 0}%`} sub={`${stats?.hostsUp ?? 0} de ${stats?.hostsTotal ?? 0} hosts online`} loading={isLoading} />
          <KpiCard icon={Server} label="Hosts Down" color="#fb923c"
            value={stats?.hostsDown ?? 0} sub={`${stats?.hostsUnknown ?? 0} status desconhecido`} loading={isLoading} />
        </div>

        {/* Charts */}
        {!isLoading && sevChartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Severity donut */}
            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-semibold mb-4" style={{ ...H, color: '#f3fafa' }}>Distribuição por Severidade</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sevChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} dataKey="value" paddingAngle={3}>
                    {sevChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: MUTED }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Severity bar */}
            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-semibold mb-4" style={{ ...H, color: '#f3fafa' }}>Quantidade por Severidade</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sevChartData} layout="vertical" barSize={16}>
                  <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Bar dataKey="value" radius={4}>
                    {sevChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {SEV_FILTERS.map(f => (
            <button key={f.value} onClick={() => setSevFilter(f.value)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={sevFilter === f.value
                ? { background: 'rgba(143,191,194,0.15)', color: T, border: '1px solid rgba(143,191,194,0.30)' }
                : { background: CARD, color: MUTED, border: `1px solid ${BORDER}` }}>
              {f.label}
              {f.value !== 'all' && stats && (
                <span className="ml-1.5 tabular-nums" style={{ color: SEV_COLOR[Number(f.value)] }}>
                  {stats[['info', 'warning', 'average', 'high', 'disaster'][Number(f.value) - 1] ?? 'info'] ?? 0}
                </span>
              )}
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar problema ou host..."
            className="px-3 py-1 rounded-lg text-xs outline-none ml-2"
            style={{ background: CARD, border: `1px solid ${BORDER}`, color: '#f3fafa', minWidth: 200 }} />
        </div>

        {/* Problems Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: T }} /></div>
          ) : filtered.length === 0 && !data?.error ? (
            <div className="py-12 text-center">
              <CheckCircle2 size={28} className="mx-auto mb-2 opacity-30" style={{ color: '#7dd3a8' }} />
              <p className="text-sm" style={{ color: MUTED }}>Nenhum problema encontrado</p>
            </div>
          ) : !data?.error ? (
            <table className="w-full text-xs">
              <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
                <tr>
                  {['Severidade', 'Host', 'Problema', 'Duração', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(243,250,250,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className="hover:bg-white/[0.015] transition-colors"
                    style={{ borderTop: i > 0 ? `1px solid rgba(143,191,194,0.04)` : 'none' }}>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${p.severityColor}18`, color: p.severityColor, border: `1px solid ${p.severityColor}30` }}>
                        {p.severityLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: T }}>{p.host}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate" style={{ color: '#f3fafa' }}>{p.name}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap flex items-center gap-1" style={{ color: MUTED }}>
                      <Clock size={10} /> {p.age}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.acknowledged
                        ? <span className="flex items-center gap-1 text-[10px]" style={{ color: '#7dd3a8' }}><CheckCircle2 size={11} /> Reconhecido</span>
                        : <span className="text-[10px]" style={{ color: '#f87171' }}>Não reconhecido</span>}
                    </td>
                    <td className="px-4 py-3">
                      {zbxUrl && (
                        <a href={zbxUrl} target="_blank" rel="noopener noreferrer"
                          className="opacity-30 hover:opacity-100 transition-opacity inline-flex">
                          <ExternalLink size={11} style={{ color: '#fbbf24' }} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        {dataUpdatedAt > 0 && (
          <p className="text-[10px] mt-3 text-center" style={{ color: MUTED }}>
            Atualizado automaticamente a cada 60s · Último: {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')}
          </p>
        )}
      </div>
    </>
  )
}
