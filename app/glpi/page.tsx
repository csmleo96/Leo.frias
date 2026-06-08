'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, RefreshCw, Download, AlertCircle, Search, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import * as XLSX from 'xlsx'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const heading = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Novo' },
  { value: '2', label: 'Em Atendimento' },
  { value: '3', label: 'Planejado' },
  { value: '4', label: 'Pendente' },
  { value: '5', label: 'Resolvido' },
  { value: '6', label: 'Fechado' },
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: '6', label: 'Crítica' },
  { value: '5', label: 'Muito Alta' },
  { value: '4', label: 'Alta' },
  { value: '3', label: 'Média' },
  { value: '2', label: 'Baixa' },
  { value: '1', label: 'Muito Baixa' },
]

const STATUS_COLOR: Record<number, string> = {
  1: '#fbbf24', 2: T, 3: '#a78bfa', 4: '#fb923c', 5: '#7dd3a8', 6: '#94a3b8'
}
const PRIORITY_COLOR: Record<number, string> = {
  1: '#94a3b8', 2: '#94a3b8', 3: '#fbbf24', 4: '#fb923c', 5: '#f87171', 6: '#ef4444'
}

interface Ticket { id: number; title: string; status: number; statusLabel: string; priority: number; priorityLabel: string; type: number; typeLabel: string; dateMod: string | null; assignee: string | null }
interface Stats { total: number; new: number; inProgress: number; pending: number; solved: number; closed: number }

function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d === 0 ? 'hoje' : d === 1 ? 'ontem' : d < 7 ? `${d}d atrás` : `${Math.floor(d / 7)}sem atrás`
}

function filterBtn(active: boolean) {
  return active
    ? { background: 'rgba(143,191,194,0.15)', color: T, border: '1px solid rgba(143,191,194,0.30)' }
    : { background: CARD, color: MUTED, border: `1px solid ${BORDER}` }
}

export default function GlpiPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ status: statusFilter, priority: priorityFilter })
      if (search) params.set('search', search)
      const res = await fetch(`/api/glpi?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTickets(data.tickets ?? [])
      setStats(data.stats ?? null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, search])

  useEffect(() => { load() }, [load])

  function exportExcel() {
    if (!tickets.length) return
    const ws = XLSX.utils.json_to_sheet(tickets.map(t => ({
      'ID': t.id, 'Título': t.title, 'Status': t.statusLabel,
      'Prioridade': t.priorityLabel, 'Tipo': t.typeLabel,
      'Responsável': t.assignee ?? '—', 'Atualizado': t.dateMod ? new Date(t.dateMod).toLocaleDateString('pt-BR') : '—',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados GLPI')
    XLSX.writeFile(wb, `glpi-chamados-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const glpiUrl = process.env.NEXT_PUBLIC_GLPI_URL

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold" style={{ ...heading, color: '#f3fafa' }}>GLPI</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(244,114,182,0.12)', color: '#f472b6', border: '1px solid rgba(244,114,182,0.25)' }}>
              Suporte & Chamados
            </span>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>
            {loading ? 'Carregando...' : `${stats?.total ?? 0} chamados encontrados`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} disabled={!tickets.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: 'rgba(143,191,194,0.10)', color: T, border: '1px solid rgba(143,191,194,0.20)' }}>
            <Download size={14} /> Exportar Excel
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: CARD, color: MUTED, border: `1px solid ${BORDER}` }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Novos', count: stats.new, color: '#fbbf24' },
            { label: 'Em Atendimento', count: stats.inProgress, color: T },
            { label: 'Planejado', count: 0, color: '#a78bfa' },
            { label: 'Pendente', count: stats.pending, color: '#fb923c' },
            { label: 'Resolvidos', count: stats.solved, color: '#7dd3a8' },
            { label: 'Fechados', count: stats.closed, color: '#94a3b8' },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-xl font-bold" style={{ color }}>{count}</p>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 mb-5 flex items-start gap-3"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}>
          <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: '#f87171' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#f87171' }}>Erro ao conectar ao GLPI</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: MUTED }}>{error}</p>
            <p className="text-xs mt-2" style={{ color: MUTED }}>
              Configure <code className="px-1 rounded text-[11px]" style={{ background: 'rgba(255,255,255,0.06)' }}>GLPI_URL</code>,{' '}
              <code className="px-1 rounded text-[11px]" style={{ background: 'rgba(255,255,255,0.06)' }}>GLPI_APP_TOKEN</code>,{' '}
              <code className="px-1 rounded text-[11px]" style={{ background: 'rgba(255,255,255,0.06)' }}>GLPI_USER</code> e{' '}
              <code className="px-1 rounded text-[11px]" style={{ background: 'rgba(255,255,255,0.06)' }}>GLPI_PASSWORD</code> no .env.local
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 mb-5">
        {/* Status */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wider font-semibold w-16 shrink-0" style={{ color: MUTED }}>Status</span>
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={filterBtn(statusFilter === s.value)}>{s.label}</button>
          ))}
        </div>
        {/* Priority */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wider font-semibold w-16 shrink-0" style={{ color: MUTED }}>Prioridade</span>
          {PRIORITY_OPTIONS.map(p => (
            <button key={p.value} onClick={() => setPriorityFilter(p.value)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={filterBtn(priorityFilter === p.value)}>{p.label}</button>
          ))}
        </div>
        {/* Search */}
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setSearch(searchInput) }}>
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
            <Input className="pl-9 h-8 text-sm" placeholder="Buscar chamado..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput('') }}
              className="text-xs px-3 rounded-lg" style={{ background: CARD, color: MUTED, border: `1px solid ${BORDER}` }}>
              Limpar ×
            </button>
          )}
        </form>
      </div>

      {/* Tickets table */}
      <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: T }} /></div>
        ) : tickets.length === 0 && !error ? (
          <div className="py-12 text-center text-sm" style={{ color: MUTED }}>Nenhum chamado encontrado.</div>
        ) : !error ? (
          <table className="w-full text-sm">
            <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
              <tr>
                {['#', 'Título', 'Tipo', 'Status', 'Prioridade', 'Responsável', 'Atualizado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(243,250,250,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr key={t.id} className="hover:bg-white/[0.015] transition-colors"
                  style={{ borderTop: i > 0 ? `1px solid rgba(143,191,194,0.05)` : 'none' }}>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-semibold" style={{ color: MUTED }}>#{t.id}</span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-xs leading-relaxed line-clamp-2" style={{ color: '#f3fafa' }}>{t.title}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs" style={{ color: MUTED }}>{t.typeLabel}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${STATUS_COLOR[t.status]}15`, color: STATUS_COLOR[t.status], border: `1px solid ${STATUS_COLOR[t.status]}30` }}>
                      {t.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-medium" style={{ color: PRIORITY_COLOR[t.priority] }}>{t.priorityLabel}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs" style={{ color: MUTED }}>{t.assignee ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs" style={{ color: 'rgba(243,250,250,0.3)' }}>{timeAgo(t.dateMod)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {glpiUrl && (
                      <a href={`${glpiUrl}/front/ticket.form.php?id=${t.id}`} target="_blank" rel="noopener noreferrer"
                        className="opacity-30 hover:opacity-100 transition-opacity inline-flex">
                        <ExternalLink size={12} style={{ color: '#f472b6' }} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}
