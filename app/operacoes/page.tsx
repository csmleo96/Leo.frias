'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, ExternalLink, Search, AlertTriangle, CheckCircle2, Clock, Activity, Calendar, FileText } from 'lucide-react'

// ── Design tokens ────────────────────────────────────────────────────────────
const BG = '#0a1316'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const T = '#8fbfc2'
const MUTED = 'rgba(243,250,250,0.4)'
const H: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif' }

// ── GLPI status/priority maps ────────────────────────────────────────────────
const GLPI_STATUS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Novo',           color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  2: { label: 'Em Atendimento', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  3: { label: 'Planejado',      color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  4: { label: 'Pendente',       color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  5: { label: 'Resolvido',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  6: { label: 'Fechado',        color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

const GLPI_PRIORITY: Record<number, { label: string; color: string }> = {
  1: { label: 'Muito Baixa', color: '#6b7280' },
  2: { label: 'Baixa',       color: '#8fbfc2' },
  3: { label: 'Média',       color: '#f59e0b' },
  4: { label: 'Alta',        color: '#fb923c' },
  5: { label: 'Crítico',     color: '#ef4444' },
}

const JIRA_PRIORITY_COLOR: Record<string, string> = {
  Highest: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#60a5fa', Lowest: '#6b7280',
}

// ── Shared components ────────────────────────────────────────────────────────
const TH: React.CSSProperties = {
  fontSize: 10, color: T, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
  padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, textAlign: 'left',
  whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.15)',
}
const TD: React.CSSProperties = {
  fontSize: 12, color: '#cbd5e1', padding: '10px 14px',
  borderBottom: `1px solid rgba(143,191,194,0.05)`, verticalAlign: 'middle',
}

function Badge({ label, color, bg }: { label: string; color: string; bg?: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg ?? `${color}18`, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function KpiCard({ label, value, sub, color, icon: Icon }: { label: string; value: string | number; sub?: string; color: string; icon: any }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color }} />
        </div>
        <span style={{ fontSize: 11, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ ...H, fontSize: 32, fontWeight: 800, color: '#f3fafa', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 20px', borderRadius: 8, fontSize: 13,
      fontWeight: active ? 600 : 400,
      border: active ? `1px solid rgba(143,191,194,0.3)` : '1px solid transparent',
      background: active ? 'rgba(143,191,194,0.12)' : 'transparent',
      color: active ? T : MUTED, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: 20, fontSize: 12,
      fontWeight: active ? 600 : 400,
      border: active ? `1px solid rgba(143,191,194,0.3)` : `1px solid ${BORDER}`,
      background: active ? 'rgba(143,191,194,0.12)' : 'transparent',
      color: active ? T : MUTED, cursor: 'pointer', transition: 'all 0.15s',
    }}>
      {children}
    </button>
  )
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 12px 7px 30px', fontSize: 12, color: '#e2e8f0', outline: 'none', width: 220 }} />
    </div>
  )
}

function fmtDate(str: string | null | undefined) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 3, height: 14, background: color, borderRadius: 2, display: 'inline-block' }} />
      {label}
    </div>
  )
}

// ── VISÃO EXECUTIVA ──────────────────────────────────────────────────────────
function ExecutiveView({ glpiData, jiraData }: { glpiData: any; jiraData: any }) {
  const tickets: any[] = glpiData?.tickets ?? []
  const issues: any[] = jiraData?.issues ?? []

  const glpi = {
    abertos:   tickets.filter(t => t.status <= 2).length,
    criticos:  tickets.filter(t => t.priority >= 4 && t.status <= 4).length,
    pendentes: tickets.filter(t => t.status === 4).length,
    resolvidos: tickets.filter(t => t.status === 5 || t.status === 6).length,
  }

  const jira = {
    ativos:     issues.filter(i => i.statusCategory !== 'done').length,
    risco:      issues.filter(i => i.daysRemaining !== null && i.daysRemaining < 0).length,
    semana:     issues.filter(i => i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 7).length,
    concluidos: issues.filter(i => i.statusCategory === 'done').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <SectionLabel label="GLPI — Gestão de Tickets" color="#a78bfa" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <KpiCard label="Abertos"    value={glpi.abertos}   sub="aguardando atendimento"  color="#f59e0b" icon={Clock} />
          <KpiCard label="Críticos"   value={glpi.criticos}  sub="prioridade alta / crítica" color="#ef4444" icon={AlertTriangle} />
          <KpiCard label="Pendentes"  value={glpi.pendentes} sub="aguardando cliente"       color="#fb923c" icon={AlertTriangle} />
          <KpiCard label="Resolvidos" value={glpi.resolvidos} sub="fechados ou resolvidos"  color="#22c55e" icon={CheckCircle2} />
        </div>
      </div>

      <div>
        <SectionLabel label="Jira — Gestão de Projetos" color="#60a5fa" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <KpiCard label="Em Andamento" value={jira.ativos}     sub="issues ativas"          color="#60a5fa" icon={Activity} />
          <KpiCard label="Em Risco"     value={jira.risco}      sub="prazo vencido"          color="#ef4444" icon={AlertTriangle} />
          <KpiCard label="Esta Semana"  value={jira.semana}     sub="vencimentos próximos"   color="#f59e0b" icon={Calendar} />
          <KpiCard label="Concluídos"   value={jira.concluidos} sub="no período"             color="#22c55e" icon={CheckCircle2} />
        </div>
      </div>

      <div>
        <SectionLabel label="GMUDs — Gestão de Mudanças" color="#22c55e" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <KpiCard label="Planejadas"   value="—" sub="aguardando aprovação"  color={T}        icon={FileText} />
          <KpiCard label="Aprovadas"    value="—" sub="prontas para execução" color="#22c55e"  icon={CheckCircle2} />
          <KpiCard label="Em Execução"  value="—" sub="em andamento agora"   color="#f59e0b"  icon={Activity} />
          <KpiCard label="Concluídas"   value="—" sub="este mês"             color="#6b7280"  icon={CheckCircle2} />
        </div>
      </div>
    </div>
  )
}

// ── GLPI ─────────────────────────────────────────────────────────────────────
function GLPIView({ data, loading }: { data: any; loading: boolean }) {
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')

  const tickets: any[] = data?.tickets ?? []

  const filtered = useMemo(() => {
    let list = tickets
    if (filter === 'abertos')    list = list.filter(t => t.status <= 2)
    if (filter === 'criticos')   list = list.filter(t => t.priority >= 4)
    if (filter === 'pendentes')  list = list.filter(t => t.status === 4)
    if (filter === 'resolvidos') list = list.filter(t => t.status === 5 || t.status === 6)
    if (search) list = list.filter(t => (t.title ?? '').toLowerCase().includes(search.toLowerCase()) || String(t.id).includes(search))
    return list
  }, [tickets, filter, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([['todos','Todos'], ['abertos','Abertos'], ['criticos','Críticos'], ['pendentes','Pendentes'], ['resolvidos','Resolvidos']] as [string,string][]).map(([id, label]) => (
            <FilterBtn key={id} active={filter === id} onClick={() => setFilter(id)}>{label}</FilterBtn>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar ticket..." />
          <span style={{ fontSize: 12, color: MUTED }}>{filtered.length} tickets</span>
        </div>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: T, fontSize: 13 }}>Carregando tickets...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 13 }}>Nenhum ticket encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Título', 'Categoria', 'Prioridade', 'Status', 'Responsável', 'Abertura', 'SLA'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t: any) => {
                  const st = GLPI_STATUS[t.status] ?? { label: t.statusLabel ?? `Status ${t.status}`, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' }
                  const pr = GLPI_PRIORITY[t.priority] ?? { label: String(t.priority), color: '#6b7280' }
                  const daysOpen = t.daysOpen ?? 0
                  const slaColor = t.status <= 2 && daysOpen > 3 ? '#ef4444' : t.status <= 2 && daysOpen > 1 ? '#f59e0b' : '#22c55e'
                  return (
                    <tr key={t.id}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                      style={{ transition: 'background 0.1s' }}>
                      <td style={{ ...TD, color: T, fontWeight: 600, fontSize: 11 }}>#{t.id}</td>
                      <td style={{ ...TD, maxWidth: 280 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0', fontWeight: 500 }} title={t.title}>{t.title}</div>
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>{t.typeLabel ?? ''}</div>
                      </td>
                      <td style={{ ...TD, fontSize: 11, color: MUTED }}>{t.category || '—'}</td>
                      <td style={TD}><Badge label={pr.label} color={pr.color} /></td>
                      <td style={TD}><Badge label={st.label} color={st.color} bg={st.bg} /></td>
                      <td style={{ ...TD, fontSize: 11 }}>{t.assignee ?? <span style={{ color: MUTED }}>Não atribuído</span>}</td>
                      <td style={{ ...TD, fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{fmtDate(t.dateCreation)}</td>
                      <td style={TD}>
                        {t.status <= 2
                          ? <span style={{ fontSize: 11, fontWeight: 600, color: slaColor }}>{daysOpen === 0 ? 'Hoje' : `${daysOpen}d`}</span>
                          : <span style={{ fontSize: 11, color: MUTED }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── JIRA ──────────────────────────────────────────────────────────────────────
function JiraView({ data, loading }: { data: any; loading: boolean }) {
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('todos')

  const issues: any[] = data?.issues ?? []

  const projects = useMemo(() => {
    const map: Record<string, string> = {}
    issues.forEach((i: any) => { if (i.project?.key) map[i.project.key] = i.project.name })
    return Object.entries(map).map(([key, name]) => ({ key, name }))
  }, [issues])

  const filtered = useMemo(() => {
    let list = issues
    if (projectFilter !== 'todos') list = list.filter((i: any) => i.project?.key === projectFilter)
    if (search) list = list.filter((i: any) =>
      (i.summary ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (i.key ?? '').toLowerCase().includes(search.toLowerCase())
    )
    return list
  }, [issues, projectFilter, search])

  const kanban = useMemo(() => ({
    todo:       filtered.filter((i: any) => i.statusCategory === 'new'),
    inProgress: filtered.filter((i: any) => i.statusCategory === 'indeterminate'),
    done:       filtered.filter((i: any) => i.statusCategory === 'done'),
  }), [filtered])

  function JiraCard({ issue }: { issue: any }) {
    const prColor = JIRA_PRIORITY_COLOR[issue.priority] ?? '#6b7280'
    const isOverdue = issue.daysRemaining !== null && issue.daysRemaining < 0
    const isDueSoon = issue.daysRemaining !== null && issue.daysRemaining >= 0 && issue.daysRemaining <= 3
    return (
      <div style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: T }}>{issue.key}</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: prColor, flexShrink: 0, marginTop: 2 }} />
        </div>
        <p style={{ fontSize: 12, color: '#e2e8f0', margin: '0 0 6px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2 } as any}>{issue.summary}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: MUTED }}>{(issue.assignee ?? '').split(' ')[0] || '—'}</span>
          {issue.daysRemaining !== null && (
            <span style={{ fontSize: 10, fontWeight: 600, color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : MUTED }}>
              {isOverdue ? `${Math.abs(issue.daysRemaining)}d atraso` : `${issue.daysRemaining}d`}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 10px', color: '#e2e8f0', fontSize: 12, cursor: 'pointer' }}>
            <option value="todos">Todos os projetos</option>
            {projects.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
          <div style={{ display: 'flex', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
            {(['table', 'kanban'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: view === v ? 600 : 400, background: view === v ? 'rgba(143,191,194,0.15)' : 'transparent', color: view === v ? T : MUTED, border: 'none', cursor: 'pointer' }}>
                {v === 'table' ? 'Tabela' : 'Kanban'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar issue..." />
          <span style={{ fontSize: 12, color: MUTED }}>{filtered.length} issues</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: T, fontSize: 13 }}>Carregando projetos...</div>
      ) : view === 'table' ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Chave', 'Título', 'Projeto', 'Status', 'Prioridade', 'Responsável', 'Sprint', 'Prazo'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((i: any) => {
                  const catColor = i.statusCategory === 'done' ? '#22c55e' : i.statusCategory === 'indeterminate' ? '#f59e0b' : '#60a5fa'
                  const prColor = JIRA_PRIORITY_COLOR[i.priority] ?? '#6b7280'
                  const isOverdue = i.daysRemaining !== null && i.daysRemaining < 0
                  return (
                    <tr key={i.key}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                      style={{ transition: 'background 0.1s' }}>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                        <a href={i.url} target="_blank" rel="noreferrer" style={{ color: T, fontWeight: 700, fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {i.key} <ExternalLink size={10} />
                        </a>
                      </td>
                      <td style={{ ...TD, maxWidth: 280 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0', fontWeight: 500 }} title={i.summary}>{i.summary}</div>
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>{i.type}</div>
                      </td>
                      <td style={{ ...TD, fontSize: 11, color: MUTED }}>{i.project?.name ?? '—'}</td>
                      <td style={TD}><Badge label={i.status} color={catColor} /></td>
                      <td style={TD}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: prColor, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: MUTED }}>{i.priority}</span>
                        </span>
                      </td>
                      <td style={{ ...TD, fontSize: 11 }}>{i.assignee ?? <span style={{ color: MUTED }}>—</span>}</td>
                      <td style={{ ...TD, fontSize: 11, color: MUTED }}>{i.sprint?.name ?? '—'}</td>
                      <td style={TD}>
                        {i.daysRemaining !== null
                          ? <span style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? '#ef4444' : i.daysRemaining <= 3 ? '#f59e0b' : '#22c55e' }}>
                              {isOverdue ? `${Math.abs(i.daysRemaining)}d atraso` : `${i.daysRemaining}d`}
                            </span>
                          : <span style={{ fontSize: 11, color: MUTED }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { key: 'todo',       label: 'A Fazer',      color: '#60a5fa', items: kanban.todo },
            { key: 'inProgress', label: 'Em Andamento', color: '#f59e0b', items: kanban.inProgress },
            { key: 'done',       label: 'Concluído',    color: '#22c55e', items: kanban.done },
          ].map(col => (
            <div key={col.key} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, borderTop: `3px solid ${col.color}` }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: `${col.color}18`, color: col.color, padding: '2px 8px', borderRadius: 10 }}>{col.items.length}</span>
              </div>
              <div style={{ padding: 10, maxHeight: 520, overflowY: 'auto' }}>
                {col.items.length === 0
                  ? <p style={{ fontSize: 11, color: MUTED, textAlign: 'center', padding: '20px 0' }}>Nenhuma issue</p>
                  : col.items.map((i: any) => <JiraCard key={i.key} issue={i} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── GMUDs ────────────────────────────────────────────────────────────────────
const GMUD_SAMPLE = [
  { id: 'GMUD-001', cliente: 'AVHealth',  desc: 'Atualização do servidor de autenticação',    janela: '22/06 02:00–04:00', status: 'Planejada',  responsavel: 'Jefferson Pelizari' },
  { id: 'GMUD-002', cliente: 'Geodis',    desc: 'Migração de banco de dados PostgreSQL 14→16', janela: '25/06 01:00–03:00', status: 'Aprovada',   responsavel: 'Leo Frias' },
  { id: 'GMUD-003', cliente: 'XTENT',     desc: 'Deploy microserviços v2.4.1',                janela: '28/06 00:00–02:00', status: 'Planejada',  responsavel: 'Jefferson Pelizari' },
]

const GMUD_STATUS: Record<string, { color: string; bg: string }> = {
  'Planejada':   { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'Aprovada':    { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  'Em execução': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'Concluída':   { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

function GMUDView() {
  const [filter, setFilter] = useState('todos')
  const filtered = filter === 'todos' ? GMUD_SAMPLE : GMUD_SAMPLE.filter(g => g.status === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['todos', 'Planejada', 'Aprovada', 'Em execução', 'Concluída']).map(f => (
          <FilterBtn key={f} active={filter === f} onClick={() => setFilter(f)}>{f === 'todos' ? 'Todas' : f}</FilterBtn>
        ))}
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['GMUD', 'Cliente', 'Descrição', 'Janela', 'Status', 'Responsável'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', color: MUTED, padding: 32 }}>Nenhuma GMUD encontrada</td></tr>
            ) : filtered.map(g => {
              const st = GMUD_STATUS[g.status] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' }
              return (
                <tr key={g.id}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  style={{ transition: 'background 0.1s' }}>
                  <td style={{ ...TD, fontWeight: 700, color: T, fontSize: 11 }}>{g.id}</td>
                  <td style={{ ...TD, fontWeight: 600, color: '#e2e8f0' }}>{g.cliente}</td>
                  <td style={{ ...TD, maxWidth: 280 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{g.desc}</span>
                  </td>
                  <td style={{ ...TD, fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{g.janela}</td>
                  <td style={TD}><Badge label={g.status} color={st.color} bg={st.bg} /></td>
                  <td style={{ ...TD, fontSize: 11 }}>{g.responsavel}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: 'rgba(143,191,194,0.04)', border: `1px solid rgba(143,191,194,0.1)`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: MUTED }}>
        GMUDs serão integradas automaticamente via n8n quando configurado. Dados acima são demonstrativos.
      </div>
    </div>
  )
}

// ── AGENDA ───────────────────────────────────────────────────────────────────
const AGENDA_DAYS = [
  { day: 'Seg 23', items: [{ time: '09:00', title: 'Daily de Projetos', type: 'Reunião', color: '#60a5fa' }, { time: '14:00', title: 'Review Sprint MSP-Infra', type: 'Jira', color: '#a78bfa' }] },
  { day: 'Ter 24', items: [{ time: '10:00', title: 'Apresentação AVHealth', type: 'CRM', color: '#22c55e' }, { time: '15:00', title: 'Review Neural Lens', type: 'Projeto', color: '#f59e0b' }] },
  { day: 'Qua 25', items: [{ time: '01:00', title: 'GMUD-002 — Geodis DB', type: 'GMUD', color: '#ef4444' }, { time: '11:00', title: 'Planejamento Q3', type: 'Reunião', color: '#60a5fa' }] },
  { day: 'Qui 26', items: [{ time: '09:00', title: 'Daily de Projetos', type: 'Reunião', color: '#60a5fa' }] },
  { day: 'Sex 27', items: [{ time: '16:00', title: 'Relatório Semanal', type: 'Relatório', color: T }] },
]

function AgendaView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12, color: MUTED, background: 'rgba(143,191,194,0.04)', border: `1px solid rgba(143,191,194,0.1)`, borderRadius: 8, padding: '10px 14px' }}>
        Integração com Google Calendar / Microsoft 365 disponível em breve. Agenda atual é demonstrativa.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {AGENDA_DAYS.map(day => (
          <div key={day.day} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.15)' }}>
              <span style={{ ...H, fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{day.day}</span>
            </div>
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {day.items.map((item, i) => (
                <div key={i} style={{ borderLeft: `3px solid ${item.color}`, paddingLeft: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <div style={{ fontSize: 10, color: MUTED }}>{item.time}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginTop: 2, lineHeight: 1.3 }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: item.color, marginTop: 2 }}>{item.type}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
type Tab = 'executivo' | 'glpi' | 'jira' | 'gmuds' | 'agenda'

export default function OperacoesPage() {
  const [tab, setTab] = useState<Tab>('executivo')

  const { data: glpiData, isLoading: glpiLoading, refetch: refetchGlpi } = useQuery({
    queryKey: ['glpi'],
    queryFn: () => fetch('/api/glpi', { cache: 'no-store' }).then(r => r.json()),
    staleTime: 2 * 60 * 1000,
  })

  const { data: jiraData, isLoading: jiraLoading, refetch: refetchJira } = useQuery({
    queryKey: ['jira'],
    queryFn: () => fetch('/api/jira', { cache: 'no-store' }).then(r => r.json()),
    staleTime: 2 * 60 * 1000,
  })

  const loading = glpiLoading || jiraLoading

  const tabs: { id: Tab; label: string }[] = [
    { id: 'executivo', label: 'Visão Executiva' },
    { id: 'glpi',      label: 'GLPI' },
    { id: 'jira',      label: 'Jira' },
    { id: 'gmuds',     label: 'GMUDs' },
    { id: 'agenda',    label: 'Agenda' },
  ]

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ ...H, fontSize: 24, fontWeight: 800, color: '#f3fafa', margin: 0 }}>Central de Operações</h1>
          <p style={{ fontSize: 13, color: T, margin: '4px 0 0' }}>GLPI · Jira · GMUDs · Agenda</p>
        </div>
        <button
          onClick={() => { refetchGlpi(); refetchJira() }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: T, cursor: 'pointer', fontSize: 12 }}>
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', borderBottom: `1px solid ${BORDER}`, paddingBottom: 16 }}>
        {tabs.map(t => <TabBtn key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
      </div>

      {/* Content */}
      {tab === 'executivo' && <ExecutiveView glpiData={glpiData} jiraData={jiraData} />}
      {tab === 'glpi'      && <GLPIView  data={glpiData}  loading={glpiLoading} />}
      {tab === 'jira'      && <JiraView  data={jiraData}  loading={jiraLoading} />}
      {tab === 'gmuds'     && <GMUDView />}
      {tab === 'agenda'    && <AgendaView />}
    </div>
  )
}
