'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Gauge, RefreshCw, ExternalLink, Search, AlertTriangle,
  CheckCircle2, XCircle, MinusCircle, Activity, Server,
  Bell, WifiOff, Settings, ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Design tokens (matches operacoes/page pattern) ────────────────────────────
const BG     = '#0a1316'
const CARD   = '#0d1a1e'
const CARD2  = '#0f1f24'
const BORDER = 'rgba(143,191,194,0.10)'
const T      = '#8fbfc2'
const MUTED  = 'rgba(243,250,250,0.40)'
const FONT   = { fontFamily: 'Space Grotesk, system-ui, sans-serif' }

// ── Monitor status config ─────────────────────────────────────────────────────
const MON_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OK:       { label: 'OK',        color: '#22c55e', icon: CheckCircle2 },
  Warn:     { label: 'Atenção',   color: '#f59e0b', icon: AlertTriangle },
  Alert:    { label: 'Alerta',    color: '#ef4444', icon: XCircle },
  'No Data':{ label: 'Sem Dados', color: '#6b7280', icon: MinusCircle },
  Muted:    { label: 'Silenciado',color: '#8b5cf6', icon: MinusCircle },
  Unknown:  { label: 'Desconhec.',color: '#94a3b8', icon: MinusCircle },
}

const ALERT_TYPE_COLOR: Record<string, string> = {
  error:   '#ef4444',
  warning: '#f59e0b',
  info:    '#60a5fa',
  success: '#22c55e',
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Monitor {
  id: string; name: string; type: string; status: string
  tags: string[]; creator: string; created: string; modified: string
}

interface Host {
  id: string; name: string; status: string; muted: boolean; lastReported: number
}

interface DDEvent {
  id: string; title: string; alertType: string; priority: string
  tags: string[]; time: number
}

interface DDData {
  configured: boolean
  message?: string
  error?: string
  summary?: { total: number; ok: number; warn: number; alert: number; noData: number; muted: number }
  monitors?: Monitor[]
  hosts?: { total: number; up: number; down: number; list: Host[] }
  events?: DDEvent[]
  site?: string
}

// ── Shared components ─────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  fontSize: 10, color: T, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', padding: '10px 14px',
  borderBottom: `1px solid ${BORDER}`, textAlign: 'left',
  whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.15)',
}
const TD: React.CSSProperties = {
  fontSize: 12, color: '#cbd5e1', padding: '10px 14px',
  borderBottom: `1px solid rgba(143,191,194,0.05)`, verticalAlign: 'middle',
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}18`,
      padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap', border: `1px solid ${color}30` }}>
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = MON_STATUS[status] ?? MON_STATUS.Unknown
  const Icon = cfg.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: `${cfg.color}15`, padding: '3px 8px',
      borderRadius: 6, border: `1px solid ${cfg.color}30` }}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

function KpiCard({ label, value, color, icon: Icon, sub }: {
  label: string; value: string | number; color: string; icon: React.ElementType; sub?: string
}) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: '#f3fafa', letterSpacing: '-0.5px', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

// ── Monitor type labels ───────────────────────────────────────────────────────
const MON_TYPE: Record<string, string> = {
  metric:        'Métrica',
  service_check: 'Serviço',
  event_alert:   'Evento',
  process:       'Processo',
  log_alert:     'Log',
  query_alert:   'Query',
  composite:     'Composto',
  apm_alert:     'APM',
}

// ── Config panel ──────────────────────────────────────────────────────────────

function ConfigPanel({ onSave: _onSave }: { onSave: () => void }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Settings size={18} color={T} />
        <span style={{ fontWeight: 700, color: '#f3fafa', fontSize: 15 }}>Configurar Datadog</span>
      </div>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 1.6 }}>
        Adicione as chaves no arquivo <code style={{ color: T, background: 'rgba(143,191,194,0.1)', padding: '2px 6px', borderRadius: 4 }}>.env.local</code> na raiz do projeto:
      </p>
      <pre style={{ background: '#060f12', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, fontSize: 12, color: '#a7d3d6', overflowX: 'auto', lineHeight: 1.8 }}>
{`# Datadog — https://app.datadoghq.com/organization-settings/api-keys
DD_API_KEY=your_api_key_here

# Datadog — https://app.datadoghq.com/organization-settings/application-keys
DD_APP_KEY=your_app_key_here

# Site (padrão: datadoghq.com | EU: datadoghq.eu)
DD_SITE=datadoghq.com`}
      </pre>
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
        <p style={{ fontSize: 12, color: '#fbbf24', margin: 0 }}>
          Após configurar, reinicie o servidor: <code style={{ background: 'rgba(245,158,11,0.15)', padding: '1px 5px', borderRadius: 3 }}>npm run dev</code>
        </p>
      </div>
      <a
        href="https://app.datadoghq.com/organization-settings/api-keys"
        target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
          fontSize: 12, color: T, textDecoration: 'none', fontWeight: 600 }}>
        <ExternalLink size={12} /> Abrir configurações do Datadog
      </a>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DatadogPage() {
  const [data, setData] = useState<DDData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [showHosts, setShowHosts] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/datadog')
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch (e) {
      setData({ configured: false, error: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const monitors = data?.monitors ?? []

  const filteredMonitors = monitors.filter(m => {
    const matchSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === 'todos' || m.status === statusFilter
    return matchSearch && matchStatus
  })

  const isConfigured = data?.configured === true

  return (
    <div style={{ background: BG, minHeight: '100vh', ...FONT }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(98,24,255,0.15)', border: '1px solid rgba(98,24,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gauge size={22} color="#7c3aed" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f3fafa', margin: 0, letterSpacing: '-0.3px' }}>
              Datadog
            </h1>
            <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
              Monitoramento · Alertas · Infraestrutura
              {data?.site && <span style={{ color: T, marginLeft: 8 }}>· {data.site}</span>}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: MUTED }}>
              {lastRefresh.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <button onClick={load} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 8, border: `1px solid ${BORDER}`, background: 'rgba(143,191,194,0.06)',
            color: loading ? MUTED : T, fontSize: 12, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
          }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>
          {isConfigured && (
            <a href={`https://app.${data?.site ?? 'datadoghq.com'}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 8, border: '1px solid rgba(98,24,255,0.3)', background: 'rgba(98,24,255,0.1)',
                color: '#a78bfa', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              <ExternalLink size={13} /> Abrir Datadog
            </a>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Not configured ──────────────────────────────────────────────── */}
        {!isConfigured && !loading && (
          <>
            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <WifiOff size={16} color="#f59e0b" />
              <span style={{ fontSize: 13, color: '#fbbf24' }}>
                {data?.message ?? 'Datadog não conectado. Configure as chaves abaixo.'}
              </span>
            </div>
            <ConfigPanel onSave={load} />
          </>
        )}

        {/* ── API error ───────────────────────────────────────────────────── */}
        {isConfigured && data?.error && (
          <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#f87171' }}>
            Erro ao conectar com Datadog: {data.error}
          </div>
        )}

        {/* ── Loading skeleton ────────────────────────────────────────────── */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 110, background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, opacity: 0.4 }} />
            ))}
          </div>
        )}

        {/* ── KPI row ─────────────────────────────────────────────────────── */}
        {isConfigured && data?.summary && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px,1fr))', gap: 16 }}>
            <KpiCard label="Total Monitors" value={data.summary.total} color="#8fbfc2" icon={Activity} />
            <KpiCard label="OK" value={data.summary.ok} color="#22c55e" icon={CheckCircle2}
              sub={`${Math.round((data.summary.ok / (data.summary.total || 1)) * 100)}% saudáveis`} />
            <KpiCard label="Alertas" value={data.summary.alert} color="#ef4444" icon={XCircle} />
            <KpiCard label="Atenção" value={data.summary.warn} color="#f59e0b" icon={AlertTriangle} />
            <KpiCard label="Sem Dados" value={data.summary.noData} color="#6b7280" icon={MinusCircle} />
            <KpiCard label="Hosts"
              value={data.hosts?.total ?? '—'} color="#7c3aed" icon={Server}
              sub={`${data.hosts?.up ?? 0} UP · ${data.hosts?.down ?? 0} DOWN`} />
          </div>
        )}

        {/* ── Status bar ──────────────────────────────────────────────────── */}
        {isConfigured && data?.summary && data.summary.total > 0 && !loading && (() => {
          const s = data.summary
          const pctOk    = (s.ok    / s.total) * 100
          const pctWarn  = (s.warn  / s.total) * 100
          const pctAlert = (s.alert / s.total) * 100
          const pctRest  = 100 - pctOk - pctWarn - pctAlert
          return (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: T, fontWeight: 700 }}>Status dos Monitors</span>
                <span style={{ fontSize: 11, color: MUTED }}>{s.total} monitores</span>
              </div>
              <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
                {pctOk > 0    && <div title={`OK: ${s.ok}`}    style={{ flex: pctOk,    background: '#22c55e' }} />}
                {pctWarn > 0  && <div title={`Warn: ${s.warn}`}style={{ flex: pctWarn,  background: '#f59e0b' }} />}
                {pctAlert > 0 && <div title={`Alert: ${s.alert}`}style={{ flex: pctAlert, background: '#ef4444' }} />}
                {pctRest > 0  && <div title="Sem dados/Muted" style={{ flex: pctRest,  background: '#374151' }} />}
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                {([['OK', '#22c55e', s.ok], ['Atenção', '#f59e0b', s.warn], ['Alerta', '#ef4444', s.alert], ['Sem Dados', '#6b7280', s.noData]] as const).map(([l, c, n]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: MUTED }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
                    {l}: <strong style={{ color: '#f3fafa' }}>{n}</strong>
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── Recent events ───────────────────────────────────────────────── */}
        {isConfigured && data?.events && data.events.length > 0 && !loading && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={14} color={T} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f3fafa' }}>Eventos Recentes</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED }}>Últimas 24h</span>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {data.events.map(ev => {
                const color = ALERT_TYPE_COLOR[ev.alertType] ?? '#8fbfc2'
                return (
                  <div key={ev.id} style={{ padding: '12px 20px', borderBottom: `1px solid rgba(143,191,194,0.04)`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: '#f3fafa', margin: '0 0 4px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.title}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color }}>
                          {ev.alertType}
                        </span>
                        {ev.tags.slice(0, 3).map(t => (
                          <span key={t} style={{ fontSize: 10, color: MUTED, background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: MUTED, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {new Date(ev.time * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Monitors table ──────────────────────────────────────────────── */}
        {isConfigured && monitors.length > 0 && !loading && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color={T} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f3fafa' }}>Monitors</span>
              </div>

              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={13} color={MUTED} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" placeholder="Buscar monitor ou tag…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                    background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8,
                    fontSize: 12, color: '#f3fafa', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Status filter */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['todos', 'OK', 'Warn', 'Alert', 'No Data'].map(s => {
                  const cfg = s === 'todos' ? null : MON_STATUS[s]
                  const active = statusFilter === s
                  return (
                    <button key={s} onClick={() => setStatusFilter(s)} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: active ? `1px solid ${cfg?.color ?? T}` : `1px solid ${BORDER}`,
                      background: active ? `${cfg?.color ?? T}15` : 'transparent',
                      color: active ? (cfg?.color ?? T) : MUTED,
                    }}>
                      {s === 'todos' ? 'Todos' : cfg?.label}
                    </button>
                  )
                })}
              </div>

              <span style={{ fontSize: 11, color: MUTED, marginLeft: 'auto' }}>
                {filteredMonitors.length} de {monitors.length}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Monitor</th>
                    <th style={TH}>Status</th>
                    <th style={TH}>Tipo</th>
                    <th style={TH}>Tags</th>
                    <th style={TH}>Criador</th>
                    <th style={TH}>Modificado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMonitors.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ ...TD, textAlign: 'center', color: MUTED, padding: 40 }}>
                        Nenhum monitor encontrado.
                      </td>
                    </tr>
                  ) : filteredMonitors.map(m => (
                    <tr key={m.id} style={{ transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(143,191,194,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ ...TD, maxWidth: 380 }}>
                        <span style={{ color: '#f3fafa', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name}
                        </span>
                        <span style={{ fontSize: 10, color: MUTED }}>ID: {m.id}</span>
                      </td>
                      <td style={TD}><StatusBadge status={m.status} /></td>
                      <td style={TD}>
                        <span style={{ fontSize: 11, color: MUTED }}>{MON_TYPE[m.type] ?? m.type}</span>
                      </td>
                      <td style={{ ...TD, maxWidth: 200 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {m.tags.slice(0, 3).map(t => (
                            <span key={t} style={{ fontSize: 10, color: T, background: 'rgba(143,191,194,0.08)', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
                          ))}
                          {m.tags.length > 3 && <span style={{ fontSize: 10, color: MUTED }}>+{m.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td style={{ ...TD, fontSize: 11, color: MUTED }}>{m.creator}</td>
                      <td style={{ ...TD, fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>
                        {m.modified ? new Date(m.modified).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Hosts table ─────────────────────────────────────────────────── */}
        {isConfigured && (data?.hosts?.list?.length ?? 0) > 0 && !loading && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            <button onClick={() => setShowHosts(h => !h)}
              style={{ width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: showHosts ? `1px solid ${BORDER}` : 'none' }}>
              <Server size={14} color={T} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f3fafa' }}>
                Hosts ({data!.hosts!.total})
              </span>
              <span style={{ marginLeft: 8, fontSize: 11, color: '#22c55e' }}>{data!.hosts!.up} UP</span>
              {data!.hosts!.down > 0 && (
                <span style={{ fontSize: 11, color: '#ef4444' }}>{data!.hosts!.down} DOWN</span>
              )}
              <span style={{ marginLeft: 'auto', color: MUTED }}>
                {showHosts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {showHosts && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={TH}>Host</th>
                      <th style={TH}>Status</th>
                      <th style={TH}>Silenciado</th>
                      <th style={TH}>Último Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.hosts!.list.map(h => (
                      <tr key={h.id}>
                        <td style={{ ...TD, color: '#f3fafa', fontWeight: 500 }}>{h.name}</td>
                        <td style={TD}>
                          <Badge label={h.status} color={h.status === 'UP' ? '#22c55e' : '#ef4444'} />
                        </td>
                        <td style={TD}>
                          {h.muted
                            ? <Badge label="Muted" color="#8b5cf6" />
                            : <span style={{ fontSize: 11, color: MUTED }}>—</span>}
                        </td>
                        <td style={{ ...TD, fontSize: 11, color: MUTED }}>
                          {h.lastReported
                            ? new Date(h.lastReported * 1000).toLocaleString('pt-BR')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Empty configured state ──────────────────────────────────────── */}
        {isConfigured && !data?.error && !loading && monitors.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: MUTED, fontSize: 13 }}>
            <Activity size={40} color={MUTED} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.4 }} />
            Nenhum monitor encontrado na conta Datadog.
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(143,191,194,0.3); }
        input:focus { border-color: rgba(143,191,194,0.4) !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(143,191,194,0.2); border-radius: 3px; }
      `}</style>
    </div>
  )
}
