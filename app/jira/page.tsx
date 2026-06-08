'use client'

import { useEffect, useState, useCallback } from 'react'
import { ExternalLink, Loader2, Search, RefreshCw, AlertCircle, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { exportJira } from '@/lib/export-excel'

interface JiraIssue {
  key: string
  summary: string
  status: string
  statusCategory: string
  type: string
  priority: string
  assignee: string | null
  project: { key: string; name: string }
  updated: string
  url: string
}

const PROJECTS = [
  { key: 'todos', name: 'Todos' },
  { key: 'HV', name: 'Neural Lens' },
  { key: 'MSPINFRA', name: 'MSP-Infra' },
  { key: 'MSPPRO', name: 'MSP-Projetos' },
  { key: 'IDB', name: 'Infra & DB' },
  { key: 'NMA', name: 'NL Marisa' },
]

const STATUSES = [
  { key: 'todos', label: 'Todos' },
  { key: 'Backlog', label: 'Backlog' },
  { key: 'On going', label: 'On Going' },
  { key: 'Em andamento', label: 'Em Andamento' },
  { key: 'CODE REVIEW', label: 'Code Review' },
  { key: 'Waiting', label: 'Waiting' },
  { key: 'Concluído', label: 'Concluído' },
  { key: 'Close', label: 'Close' },
]

function statusStyle(status: string, cat: string) {
  const s = status.toLowerCase()
  if (s === 'backlog') return { bg: 'oklch(0.35 0.02 250 / 50%)', color: 'oklch(0.65 0.02 230)', border: 'oklch(0.65 0.02 230 / 20%)' }
  if (s.includes('andamento') || s === 'on going') return { bg: 'oklch(0.8 0.13 186 / 12%)', color: 'oklch(0.8 0.13 186)', border: 'oklch(0.8 0.13 186 / 25%)' }
  if (s === 'code review') return { bg: 'oklch(0.7 0.18 280 / 12%)', color: 'oklch(0.7 0.18 280)', border: 'oklch(0.7 0.18 280 / 25%)' }
  if (s === 'waiting') return { bg: 'oklch(0.8 0.18 75 / 12%)', color: 'oklch(0.8 0.18 75)', border: 'oklch(0.8 0.18 75 / 25%)' }
  if (s === 'concluído' || s === 'close' || cat === 'done') return { bg: 'oklch(0.75 0.15 160 / 12%)', color: 'oklch(0.75 0.15 160)', border: 'oklch(0.75 0.15 160 / 25%)' }
  return { bg: 'oklch(0.35 0.02 250 / 50%)', color: 'oklch(0.65 0.02 230)', border: 'oklch(0.65 0.02 230 / 20%)' }
}

function priorityColor(p: string) {
  if (p === 'High' || p === 'Highest') return 'oklch(0.65 0.22 27)'
  if (p === 'Medium') return 'oklch(0.8 0.18 75)'
  return 'oklch(0.56 0.02 230)'
}

function projectColor(key: string) {
  const map: Record<string, string> = {
    HV: 'oklch(0.8 0.13 186)',
    MSPINFRA: 'oklch(0.7 0.18 280)',
    MSPPRO: 'oklch(0.75 0.15 160)',
    IDB: 'oklch(0.75 0.18 55)',
    NMA: 'oklch(0.7 0.2 340)',
  }
  return map[key] ?? 'oklch(0.56 0.02 230)'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  if (d < 7) return `${d}d atrás`
  if (d < 30) return `${Math.floor(d / 7)}sem atrás`
  return `${Math.floor(d / 30)}m atrás`
}

export default function JiraPage() {
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ project, status })
      if (search) params.set('search', search)
      const res = await fetch(`/api/jira?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setIssues(data.issues ?? [])
      setTotal(data.total ?? 0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [project, status, search])

  useEffect(() => { load() }, [load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
  }

  const counts = {
    backlog: issues.filter(i => i.status.toLowerCase() === 'backlog').length,
    progress: issues.filter(i => ['on going', 'em andamento', 'code review'].includes(i.status.toLowerCase())).length,
    done: issues.filter(i => ['concluído', 'close'].includes(i.status.toLowerCase())).length,
  }

  const filterBtn = (active: boolean) => ({
    ...(active
      ? { background: 'oklch(0.8 0.13 186 / 15%)', color: 'oklch(0.8 0.13 186)', border: '1px solid oklch(0.8 0.13 186 / 30%)' }
      : { background: 'oklch(0.15 0.02 250)', color: 'oklch(0.56 0.02 230)', border: '1px solid oklch(1 0 0 / 8%)' }),
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white">Jira</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'oklch(0.8 0.13 186 / 12%)', color: 'oklch(0.8 0.13 186)', border: '1px solid oklch(0.8 0.13 186 / 25%)' }}>
              productxtentgroup.atlassian.net
            </span>
          </div>
          <p className="text-sm" style={{ color: 'rgba(243,250,250,0.45)' }}>
            Controle de atividades · {loading ? 'carregando...' : `${total} issues`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => issues.length > 0 && exportJira(issues)}
            disabled={issues.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: 'rgba(143,191,194,0.10)', color: '#8fbfc2', border: '1px solid rgba(143,191,194,0.20)' }}>
            <Download size={14} /> Exportar Excel
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: '#0d1a1e', color: 'rgba(243,250,250,0.45)', border: '1px solid rgba(143,191,194,0.10)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Backlog', count: counts.backlog, color: 'oklch(0.65 0.02 230)' },
          { label: 'Em Progresso', count: counts.progress, color: 'oklch(0.8 0.13 186)' },
          { label: 'Concluído', count: counts.done, color: 'oklch(0.75 0.15 160)' },
        ].map(({ label, count, color }) => (
          <div key={label} className="rounded-xl p-4"
            style={{ background: 'oklch(0.15 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            <p className="text-2xl font-bold" style={{ color }}>{count}</p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.56 0.02 230)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Project filter */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PROJECTS.map(p => (
          <button key={p.key} onClick={() => setProject(p.key)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={filterBtn(project === p.key)}>
            {p.name}
          </button>
        ))}
      </div>

      {/* Status filter + search */}
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <form onSubmit={handleSearch} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'oklch(0.45 0.02 230)' }} />
          <Input
            className="pl-8 w-52 h-8 text-sm"
            placeholder="Buscar issue..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </form>
        <div className="w-px h-5 mx-1" style={{ background: 'oklch(1 0 0 / 8%)' }} />
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => setStatus(s.key)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={filterBtn(status === s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 mb-4 flex items-center gap-3"
          style={{ background: 'oklch(0.65 0.22 27 / 10%)', border: '1px solid oklch(0.65 0.22 27 / 25%)' }}>
          <AlertCircle size={16} style={{ color: 'oklch(0.65 0.22 27)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'oklch(0.65 0.22 27)' }}>Erro ao conectar ao Jira</p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.56 0.02 230)' }}>
              Configure <code className="px-1 py-0.5 rounded" style={{ background: 'oklch(1 0 0 / 8%)' }}>JIRA_EMAIL</code> e{' '}
              <code className="px-1 py-0.5 rounded" style={{ background: 'oklch(1 0 0 / 8%)' }}>JIRA_API_TOKEN</code> no .env.local
            </p>
          </div>
        </div>
      )}

      {/* Issues table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'oklch(0.15 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)' }}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: 'oklch(0.8 0.13 186)' }} />
          </div>
        ) : issues.length === 0 && !error ? (
          <div className="p-10 text-center text-sm" style={{ color: 'oklch(0.45 0.02 230)' }}>
            Nenhuma issue encontrada.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
              <tr>
                {['Chave', 'Resumo', 'Projeto', 'Tipo', 'Status', 'Responsável', 'Atualizado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'oklch(0.45 0.02 230)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, i) => {
                const st = statusStyle(issue.status, issue.statusCategory)
                return (
                  <tr key={issue.key} style={{ borderTop: i > 0 ? '1px solid oklch(1 0 0 / 5%)' : 'none' }}
                    className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono font-semibold" style={{ color: projectColor(issue.project.key) }}>
                        {issue.key}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-white font-medium line-clamp-2 text-xs leading-relaxed">
                        {issue.summary}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${projectColor(issue.project.key)}15`, color: projectColor(issue.project.key), border: `1px solid ${projectColor(issue.project.key)}25` }}>
                        {issue.project.key}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs" style={{ color: 'oklch(0.56 0.02 230)' }}>{issue.type}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {issue.assignee ? (
                        <span className="text-xs" style={{ color: 'oklch(0.56 0.02 230)' }}>
                          {issue.assignee.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'oklch(0.35 0.02 230)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs" style={{ color: 'oklch(0.45 0.02 230)' }}>{timeAgo(issue.updated)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={issue.url} target="_blank" rel="noopener noreferrer"
                        className="opacity-40 hover:opacity-100 transition-opacity inline-flex">
                        <ExternalLink size={13} style={{ color: 'oklch(0.8 0.13 186)' }} />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
