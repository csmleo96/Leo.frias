'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useEffect, useState, useCallback, memo, useRef } from 'react'
import {
  AlertTriangle, Clock, ShieldX, UserX, MessageCircle, Truck,
  CheckCircle2, RefreshCw, Loader2, ExternalLink, Search,
  Wifi, WifiOff, AlertCircle, ChevronDown, X, Radio, Activity,
  Zap, Filter,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

// ── Constants ──────────────────────────────────────────────────────────────
const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const H = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }
const TOOLTIP = { backgroundColor: '#0d1a1e', border: '1px solid rgba(143,191,194,0.15)', borderRadius: 8, color: '#f3fafa', fontSize: 11 }

const SLA_COLOR = { ok: '#7dd3a8', at_risk: '#fbbf24', breached: '#f87171', resolved: '#94a3b8', unknown: '#475569' }
const SLA_LABEL = { ok: 'OK', at_risk: 'Em Risco', breached: 'Vencido', resolved: 'Resolvido', unknown: '—' }

const PRIORITY_COLOR: Record<number, string> = { 6: '#ef4444', 5: '#f87171', 4: '#fb923c', 3: '#fbbf24', 2: '#94a3b8', 1: '#475569' }
const GLPI_STATUS_COLOR: Record<number, string> = { 1: '#fbbf24', 2: T, 3: '#a78bfa', 4: '#fb923c', 5: '#7dd3a8', 6: '#94a3b8' }

// ── Types ──────────────────────────────────────────────────────────────────
interface Ticket {
  id: string; rawId: string | number; source: 'glpi' | 'jira'
  title: string; status: string; statusNum: number; statusCategory?: string
  priority: string; priorityNum: number
  assignee: string | null; project: string
  createdAt: string | null; updatedAt: string | null
  slaHours: number; slaDeadline: string | null; slaStatus: string
  url: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

function slaRemaining(deadline: string | null) {
  if (!deadline) return null
  const r = new Date(deadline).getTime() - Date.now()
  if (r <= 0) return 'Vencido'
  const h = Math.floor(r / 3600000)
  if (h < 1) return `${Math.floor(r / 60000)}min`
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function groupByDay(tickets: Ticket[], days = 7) {
  const result: { date: string; glpi: number; jira: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const dayStr = d.toDateString()
    result.push({
      date: key,
      glpi: tickets.filter(t => t.source === 'glpi' && t.createdAt && new Date(t.createdAt).toDateString() === dayStr).length,
      jira: tickets.filter(t => t.source === 'jira' && t.createdAt && new Date(t.createdAt).toDateString() === dayStr).length,
    })
  }
  return result
}

function groupByProject(tickets: Ticket[]) {
  const counts: Record<string, number> = {}
  tickets.forEach(t => { counts[t.project] = (counts[t.project] ?? 0) + 1 })
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
}

// ── Skeleton ───────────────────────────────────────────────────────────────
const Sk = ({ w = '100%', h = '14px', r = '6px' }: { w?: string; h?: string; r?: string }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(143,191,194,0.06)', animation: 'shimmer 1.5s infinite', backgroundSize: '200%' }} />
)

// ── Widget Card ────────────────────────────────────────────────────────────
const Widget = memo(({ icon: Icon, label, count, color, active, onClick, loading }: {
  icon: any; label: string; count: number; color: string; active: boolean; onClick: () => void; loading: boolean
}) => (
  <button onClick={onClick} className="rounded-xl p-4 text-left transition-all duration-200 w-full"
    style={{
      background: active ? `${color}10` : CARD,
      border: `1px solid ${active ? `${color}35` : BORDER}`,
      boxShadow: active ? `0 0 20px ${color}0d` : 'none',
    }}>
    <div className="flex items-center justify-between mb-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon size={13} style={{ color }} />
      </div>
      {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
    </div>
    {loading ? <Sk h="22px" w="40%" /> : (
      <p className="text-xl font-bold tabular-nums" style={{ ...H, color: active ? color : '#f3fafa' }}>{count}</p>
    )}
    <p className="text-[10px] mt-0.5 leading-tight" style={{ color: active ? `${color}cc` : MUTED }}>{label}</p>
  </button>
))
Widget.displayName = 'Widget'

// ── Alert Toast System ─────────────────────────────────────────────────────
function useAlerts(tickets: Ticket[], prevCountRef: React.MutableRefObject<number>) {
  useEffect(() => {
    if (!tickets.length) return

    const breached = tickets.filter(t => t.slaStatus === 'breached')
    const critical = tickets.filter(t => t.priorityNum >= 5 && t.slaStatus !== 'resolved')
    const noOwner = critical.filter(t => !t.assignee)
    const currentTotal = tickets.filter(t => t.slaStatus !== 'resolved').length

    if (breached.length > 0) {
      toast.error(`${breached.length} SLA vencido${breached.length > 1 ? 's' : ''}`, {
        description: breached.slice(0, 2).map(t => t.title).join(' · '),
        duration: 8000,
      })
    }
    if (noOwner.length > 0) {
      toast.warning(`${noOwner.length} chamado${noOwner.length > 1 ? 's' : ''} crítico${noOwner.length > 1 ? 's' : ''} sem responsável`, {
        description: 'Recomenda-se triagem imediata',
        duration: 6000,
      })
    }
    if (prevCountRef.current > 0 && currentTotal > prevCountRef.current + 5) {
      toast.info(`Backlog aumentou: +${currentTotal - prevCountRef.current} tickets abertos`, { duration: 5000 })
    }
    prevCountRef.current = currentTotal
  }, [tickets, prevCountRef])
}

// ── Main Page ──────────────────────────────────────────────────────────────
const WIDGET_DEFS = [
  { id: 'critical',       label: 'Chamados Críticos',      icon: AlertTriangle, color: '#f87171' },
  { id: 'sla_breached',   label: 'SLA Vencido',            icon: ShieldX,       color: '#ef4444' },
  { id: 'sla_at_risk',    label: 'SLA em Risco',           icon: Clock,         color: '#fbbf24' },
  { id: 'no_owner',       label: 'Sem Responsável',        icon: UserX,         color: '#fb923c' },
  { id: 'waiting_client', label: 'Aguardando Cliente',     icon: MessageCircle, color: '#a78bfa' },
  { id: 'waiting_vendor', label: 'Aguardando Fornecedor',  icon: Truck,         color: '#60a5fa' },
  { id: 'resolved_today', label: 'Resolvidos Hoje',        icon: CheckCircle2,  color: '#7dd3a8' },
]

const SYNC_INTERVAL_MS = 15 * 60 * 1000

export default function OperacoesPage() {
  const qc = useQueryClient()
  const [activeWidget, setActiveWidget] = useState<string | null>(null)
  const [filterSource, setFilterSource] = useState<'all' | 'glpi' | 'jira'>('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterSla, setFilterSla] = useState('all')
  const [search, setSearch] = useState('')
  const [rtConnected, setRtConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const prevCountRef = useRef(0)

  // ── Data ──────────────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery<{ tickets: Ticket[]; lastSync: any }>({
    queryKey: ['operacoes'],
    queryFn: () => fetch('/api/operacoes').then(r => r.json()),
    staleTime: 60_000,
  })

  const tickets: Ticket[] = data?.tickets ?? []

  // ── Sync Mutation ─────────────────────────────────────────────────────
  const syncMutation = useMutation({
    mutationFn: () => fetch('/api/operacoes/sync', { method: 'POST' }).then(r => r.json()),
    onMutate: () => setSyncing(true),
    onSuccess: (result) => {
      setSyncing(false)
      setLastSyncTime(new Date().toISOString())
      qc.invalidateQueries({ queryKey: ['operacoes'] })
      toast.success(`Sync concluído — ${result.total ?? 0} tickets`, { duration: 3000 })
    },
    onError: () => {
      setSyncing(false)
      toast.error('Erro ao sincronizar')
    },
  })

  // ── Auto-sync every 15 min ────────────────────────────────────────────
  useEffect(() => {
    syncMutation.mutate()
    const t = setInterval(() => syncMutation.mutate(), SYNC_INTERVAL_MS)
    return () => clearInterval(t)
  }, []) // eslint-disable-line

  // ── Supabase Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    const sb = createClient()
    const channel = sb.channel('operacoes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'glpi_tickets' }, () => {
        qc.invalidateQueries({ queryKey: ['operacoes'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jira_tickets' }, () => {
        qc.invalidateQueries({ queryKey: ['operacoes'] })
      })
      .subscribe(status => {
        setRtConnected(status === 'SUBSCRIBED')
      })
    return () => { sb.removeChannel(channel) }
  }, [qc])

  // ── Alerts ────────────────────────────────────────────────────────────
  useAlerts(tickets, prevCountRef)

  // ── Widget counts ─────────────────────────────────────────────────────
  const todayStr = new Date().toDateString()
  const widgetCounts = useMemo(() => {
    const open = tickets.filter(t => !['resolved', 'resolved_glpi'].includes(t.slaStatus ?? '') && ![5, 6].includes(t.statusNum ?? 0) && t.statusCategory !== 'done')
    return {
      critical: tickets.filter(t => t.priorityNum >= 5 && t.slaStatus !== 'resolved').length,
      sla_breached: tickets.filter(t => t.slaStatus === 'breached').length,
      sla_at_risk: tickets.filter(t => t.slaStatus === 'at_risk').length,
      no_owner: open.filter(t => !t.assignee).length,
      waiting_client: tickets.filter(t => t.statusNum === 4 || t.status?.toLowerCase().includes('waiting') || t.status?.toLowerCase().includes('aguard')).length,
      waiting_vendor: tickets.filter(t => t.status?.toLowerCase().includes('vendor') || t.status?.toLowerCase().includes('fornecedor') || t.status?.toLowerCase().includes('third')).length,
      resolved_today: tickets.filter(t => {
        const isResolved = [5, 6].includes(t.statusNum ?? 0) || t.slaStatus === 'resolved' || t.statusCategory === 'done'
        return isResolved && t.updatedAt ? new Date(t.updatedAt).toDateString() === todayStr : false
      }).length,
    }
  }, [tickets, todayStr])

  // ── Filter logic ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...tickets]

    // Widget filter
    if (activeWidget) {
      const open = list.filter(t => ![5, 6].includes(t.statusNum ?? 0) && t.statusCategory !== 'done' && t.slaStatus !== 'resolved')
      switch (activeWidget) {
        case 'critical':       list = list.filter(t => t.priorityNum >= 5 && t.slaStatus !== 'resolved'); break
        case 'sla_breached':   list = list.filter(t => t.slaStatus === 'breached'); break
        case 'sla_at_risk':    list = list.filter(t => t.slaStatus === 'at_risk'); break
        case 'no_owner':       list = open.filter(t => !t.assignee); break
        case 'waiting_client': list = list.filter(t => t.statusNum === 4 || t.status?.toLowerCase().includes('waiting') || t.status?.toLowerCase().includes('aguard')); break
        case 'waiting_vendor': list = list.filter(t => t.status?.toLowerCase().includes('vendor') || t.status?.toLowerCase().includes('fornecedor')); break
        case 'resolved_today': list = list.filter(t => {
          const isResolved = [5, 6].includes(t.statusNum ?? 0) || t.slaStatus === 'resolved' || t.statusCategory === 'done'
          return isResolved && t.updatedAt ? new Date(t.updatedAt).toDateString() === todayStr : false
        }); break
      }
    }

    if (filterSource !== 'all') list = list.filter(t => t.source === filterSource)
    if (filterPriority !== 'all') list = list.filter(t => t.priority === filterPriority)
    if (filterAssignee !== 'all') list = list.filter(t => (t.assignee ?? '—') === filterAssignee)
    if (filterSla !== 'all') list = list.filter(t => t.slaStatus === filterSla)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(q) || String(t.rawId).includes(q) || t.project.toLowerCase().includes(q))
    }

    return list
  }, [tickets, activeWidget, filterSource, filterPriority, filterAssignee, filterSla, search, todayStr])

  // ── Chart data ────────────────────────────────────────────────────────
  const chartData = useMemo(() => ({
    slaDonut: [
      { name: 'OK', value: tickets.filter(t => t.slaStatus === 'ok').length, color: '#7dd3a8' },
      { name: 'Em Risco', value: tickets.filter(t => t.slaStatus === 'at_risk').length, color: '#fbbf24' },
      { name: 'Vencido', value: tickets.filter(t => t.slaStatus === 'breached').length, color: '#f87171' },
      { name: 'Resolvido', value: tickets.filter(t => t.slaStatus === 'resolved').length, color: '#475569' },
    ].filter(d => d.value > 0),
    backlogDonut: [
      { name: 'GLPI', value: tickets.filter(t => t.source === 'glpi').length, color: '#f472b6' },
      { name: 'Jira', value: tickets.filter(t => t.source === 'jira').length, color: T },
    ],
    daily: groupByDay(tickets, 7),
    byProject: groupByProject(tickets),
  }), [tickets])

  // ── Unique filter values ──────────────────────────────────────────────
  const priorities = useMemo(() => [...new Set(tickets.map(t => t.priority).filter(Boolean))], [tickets])
  const assignees = useMemo(() => [...new Set(tickets.map(t => t.assignee).filter(Boolean) as string[])].sort(), [tickets])

  const resetFilters = useCallback(() => {
    setActiveWidget(null); setFilterSource('all'); setFilterPriority('all')
    setFilterAssignee('all'); setFilterSla('all'); setSearch('')
  }, [])

  const hasFilters = activeWidget || filterSource !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all' || filterSla !== 'all' || search

  return (
    <>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pulse2  { 0%,100% { opacity:1 } 50% { opacity:.3 } }
        .fade-in { animation: fadeIn .4s ease both }
      `}</style>

      <div className="p-6 space-y-5 max-w-[1600px]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: '#f472b6', animation: 'pulse2 2s infinite' }} />
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
                Torre de Operações
              </span>
            </div>
            <h1 className="text-2xl font-bold" style={{ ...H, color: '#f3fafa' }}>Controle Operacional</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs" style={{ color: MUTED }}>
                {tickets.length} tickets · {filtered.length} exibidos
              </span>
              {(data?.lastSync || lastSyncTime) && (
                <span className="text-[10px] flex items-center gap-1" style={{ color: MUTED }}>
                  <Clock size={9} /> Sync {timeAgo(lastSyncTime ?? data?.lastSync?.synced_at)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Realtime indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium"
              style={{ background: rtConnected ? 'rgba(125,211,168,0.10)' : 'rgba(248,113,113,0.10)', color: rtConnected ? '#7dd3a8' : '#f87171', border: `1px solid ${rtConnected ? 'rgba(125,211,168,0.20)' : 'rgba(248,113,113,0.20)'}` }}>
              {rtConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {rtConnected ? 'Realtime' : 'Offline'}
            </div>

            <button onClick={() => syncMutation.mutate()} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: CARD, color: T, border: `1px solid rgba(143,191,194,0.20)` }}>
              {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
        </div>

        {/* ── 7 Widgets ── */}
        <div className="grid grid-cols-4 lg:grid-cols-7 gap-2.5 fade-in" style={{ animationDelay: '60ms' }}>
          {WIDGET_DEFS.map(w => (
            <Widget
              key={w.id}
              icon={w.icon}
              label={w.label}
              count={widgetCounts[w.id as keyof typeof widgetCounts] ?? 0}
              color={w.color}
              active={activeWidget === w.id}
              onClick={() => setActiveWidget(prev => prev === w.id ? null : w.id)}
              loading={isLoading}
            />
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-2 fade-in" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
            <Filter size={10} /> Filtros
          </div>

          {/* Source */}
          {(['all', 'glpi', 'jira'] as const).map(s => (
            <button key={s} onClick={() => setFilterSource(s)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={filterSource === s
                ? { background: 'rgba(143,191,194,0.15)', color: T, border: `1px solid rgba(143,191,194,0.30)` }
                : { background: CARD, color: MUTED, border: `1px solid ${BORDER}` }}>
              {s === 'all' ? 'Todos' : s.toUpperCase()}
            </button>
          ))}

          <div className="w-px h-4" style={{ background: BORDER }} />

          {/* Priority */}
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs outline-none"
            style={{ background: filterPriority !== 'all' ? 'rgba(143,191,194,0.10)' : CARD, color: filterPriority !== 'all' ? T : MUTED, border: `1px solid ${filterPriority !== 'all' ? 'rgba(143,191,194,0.25)' : BORDER}` }}>
            <option value="all">Prioridade</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Assignee */}
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs outline-none max-w-[160px]"
            style={{ background: filterAssignee !== 'all' ? 'rgba(143,191,194,0.10)' : CARD, color: filterAssignee !== 'all' ? T : MUTED, border: `1px solid ${filterAssignee !== 'all' ? 'rgba(143,191,194,0.25)' : BORDER}` }}>
            <option value="all">Responsável</option>
            <option value="—">Sem responsável</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* SLA Status */}
          <select value={filterSla} onChange={e => setFilterSla(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs outline-none"
            style={{ background: filterSla !== 'all' ? 'rgba(143,191,194,0.10)' : CARD, color: filterSla !== 'all' ? T : MUTED, border: `1px solid ${filterSla !== 'all' ? 'rgba(143,191,194,0.25)' : BORDER}` }}>
            <option value="all">SLA</option>
            <option value="ok">OK</option>
            <option value="at_risk">Em Risco</option>
            <option value="breached">Vencido</option>
            <option value="resolved">Resolvido</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
            <Input
              className="pl-7 h-7 text-xs w-52"
              placeholder="Buscar ticket, projeto..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>

          {hasFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(248,113,113,0.10)', color: '#f87171', border: '1px solid rgba(248,113,113,0.20)' }}>
              <X size={10} /> Limpar
            </button>
          )}
        </div>

        {/* ── Charts Row ── */}
        {!isLoading && tickets.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 fade-in" style={{ animationDelay: '180ms' }}>

            {/* SLA Donut */}
            <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-xs font-semibold mb-3" style={{ ...H, color: '#f3fafa' }}>SLA Performance</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={chartData.slaDonut} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" paddingAngle={3}>
                    {chartData.slaDonut.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: MUTED }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Backlog Source */}
            <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-xs font-semibold mb-3" style={{ ...H, color: '#f3fafa' }}>Backlog por Origem</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={chartData.backlogDonut} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" paddingAngle={3}>
                    {chartData.backlogDonut.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: MUTED }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Daily evolution */}
            <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-xs font-semibold mb-3" style={{ ...H, color: '#f3fafa' }}>Novos por Dia (7d)</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData.daily} barSize={8}>
                  <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Bar dataKey="glpi" fill="#f472b6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="jira" fill={T} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By project */}
            <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-xs font-semibold mb-3" style={{ ...H, color: '#f3fafa' }}>Por Projeto</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData.byProject} layout="vertical" barSize={8}>
                  <XAxis type="number" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Bar dataKey="value" fill="#a78bfa" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}

        {/* ── Ticket Table ── */}
        <div className="rounded-xl overflow-hidden fade-in" style={{ background: CARD, border: `1px solid ${BORDER}`, animationDelay: '240ms' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER }}>
            <p className="text-sm font-semibold" style={{ ...H, color: '#f3fafa' }}>
              {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
              {activeWidget && <span className="ml-2 text-xs font-normal" style={{ color: MUTED }}>— {WIDGET_DEFS.find(w => w.id === activeWidget)?.label}</span>}
            </p>
            {isLoading && <Loader2 size={14} className="animate-spin" style={{ color: T }} />}
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Sk w="60px" h="20px" r="8px" />
                  <Sk h="12px" w="50%" />
                  <Sk h="12px" w="80px" />
                  <Sk h="12px" w="60px" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm" style={{ color: MUTED }}>
                {tickets.length === 0 ? 'Clique em "Sincronizar" para carregar os tickets' : 'Nenhum ticket corresponde aos filtros'}
              </p>
              {tickets.length === 0 && (
                <button onClick={() => syncMutation.mutate()} disabled={syncing}
                  className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: T, color: '#0a1316' }}>
                  {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Sincronizar agora
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <tr>
                    {['Fonte', '#', 'Título', 'Status', 'Prioridade', 'Responsável', 'Projeto', 'SLA', 'Restante', 'Atualizado', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider"
                        style={{ color: 'rgba(243,250,250,0.3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((t, i) => {
                    const slaColor = SLA_COLOR[t.slaStatus as keyof typeof SLA_COLOR] ?? MUTED
                    const priorityColor = PRIORITY_COLOR[t.priorityNum] ?? '#94a3b8'
                    const statusColor = t.source === 'glpi' ? (GLPI_STATUS_COLOR[t.statusNum] ?? MUTED) : T
                    return (
                      <tr key={t.id} className="hover:bg-white/[0.015] transition-colors"
                        style={{ borderTop: i > 0 ? `1px solid rgba(143,191,194,0.04)` : 'none' }}>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                            style={t.source === 'glpi'
                              ? { background: 'rgba(244,114,182,0.12)', color: '#f472b6' }
                              : { background: 'rgba(143,191,194,0.12)', color: T }}>
                            {t.source}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px]" style={{ color: MUTED }}>
                          {t.rawId}
                        </td>
                        <td className="px-3 py-2.5 max-w-[280px]">
                          <p className="truncate font-medium" style={{ color: '#f3fafa' }}>{t.title}</p>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                            style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}25` }}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-medium" style={{ color: priorityColor }}>
                          {t.priority}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: t.assignee ? MUTED : '#f87171' }}>
                          {t.assignee ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(143,191,194,0.08)', color: T }}>
                            {t.project}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                            style={{ background: `${slaColor}12`, color: slaColor }}>
                            {SLA_LABEL[t.slaStatus as keyof typeof SLA_LABEL] ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-[10px]" style={{ color: slaColor }}>
                          {t.slaStatus === 'resolved' ? '—' : slaRemaining(t.slaDeadline)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-[10px]" style={{ color: 'rgba(243,250,250,0.28)' }}>
                          {timeAgo(t.updatedAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          {t.url && (
                            <a href={t.url} target="_blank" rel="noopener noreferrer"
                              className="opacity-30 hover:opacity-100 transition-opacity inline-flex">
                              <ExternalLink size={11} style={{ color: T }} />
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length > 100 && (
                <p className="text-center py-3 text-[10px]" style={{ color: MUTED }}>
                  Exibindo 100 de {filtered.length} tickets
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
