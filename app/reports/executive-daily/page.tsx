'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'

// ── Types ──────────────────────────────────────────────────────────────────

type JiraTicket = {
  key: string; summary: string; status: string; statusGroup: string
  priority: string; assignee: string | null; project: string; projectName: string
  sprint: string | null; dueDate: string | null; daysRemaining: number | null
  created: string; updated: string; url: string
  isDone: boolean; isOverdue: boolean; isDueSoon: boolean; isDoneToday: boolean; isStale: boolean
}

type GLPITicket = {
  id: string | number; title: string; status: number; statusLabel: string
  priority: number; priorityLabel: string; assignee: string | null
  category: string; origin: string; dateCreation: string | null
  dateMod: string | null; solveDate: string | null
  daysOpen: number; daysSinceUpdate: number
}

type Deadline = {
  sistema: string; id: string; titulo: string; responsavel: string
  projeto: string; prazo: string; diasRestantes: number
  prioridade: string; status: string; url?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const fmtShort = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'

function priorityColor(p: string) {
  const lp = (p ?? '').toLowerCase()
  if (lp === 'highest' || lp === 'crítica' || lp === 'muito alta') return '#ef4444'
  if (lp === 'high' || lp === 'alta') return '#f97316'
  if (lp === 'medium' || lp === 'média') return '#eab308'
  return '#6b7280'
}

function glpiPriorityColor(p: number) {
  if (p >= 6) return '#ef4444'
  if (p >= 5) return '#f97316'
  if (p >= 4) return '#eab308'
  return '#6b7280'
}

function deadlineBadge(days: number | null) {
  if (days === null) return { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: 'Sem prazo' }
  if (days < 0) return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: `${Math.abs(days)}d atrasado` }
  if (days <= 2) return { bg: 'rgba(249,115,22,0.15)', color: '#f97316', label: `${days}d restante` }
  if (days <= 5) return { bg: 'rgba(234,179,8,0.15)', color: '#eab308', label: `${days}d restante` }
  return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: `${days}d restante` }
}

function healthColor(h: string) {
  if (h === 'critical') return '#ef4444'
  if (h === 'attention') return '#eab308'
  return '#22c55e'
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = '#8fbfc2', icon }: {
  label: string; value: number | string; sub?: string; color?: string; icon: string
}) {
  return (
    <div style={{ background: '#0d1a1e', border: '1px solid rgba(143,191,194,0.12)', borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, color: '#8fbfc2', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <span style={{ fontSize: 32, fontWeight: 700, color, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</span>}
    </div>
  )
}

function SectionHeader({ title, count, color = '#8fbfc2' }: { title: string; count?: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 3, height: 20, background: color, borderRadius: 2 }} />
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', fontFamily: 'Space Grotesk, sans-serif', margin: 0 }}>{title}</h3>
      {count !== undefined && (
        <span style={{ background: 'rgba(143,191,194,0.12)', color, borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>{count}</span>
      )}
    </div>
  )
}

const TH: React.CSSProperties = { fontSize: 11, color: '#8fbfc2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 10px', borderBottom: '1px solid rgba(143,191,194,0.08)', whiteSpace: 'nowrap', textAlign: 'left' }
const TD: React.CSSProperties = { fontSize: 12, color: '#cbd5e1', padding: '8px 10px', borderBottom: '1px solid rgba(143,191,194,0.05)', verticalAlign: 'middle' }
const TDTitle: React.CSSProperties = { ...TD, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0' }

function EmptyRow({ cols, msg = 'Nenhum item' }: { cols: number; msg?: string }) {
  return <tr><td colSpan={cols} style={{ ...TD, textAlign: 'center', color: '#6b7280', padding: 20 }}>{msg}</td></tr>
}

function GLPITable({ tickets }: { tickets: GLPITicket[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['ID', 'Título', 'Responsável', 'Prioridade', 'Categoria', 'Abertura', 'Atualização', 'Dias'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? <EmptyRow cols={8} /> : tickets.map(t => (
            <tr key={t.id}>
              <td style={{ ...TD, color: '#8fbfc2', fontWeight: 600, minWidth: 50 }}>#{t.id}</td>
              <td style={TDTitle} title={t.title}>{t.title}</td>
              <td style={{ ...TD, minWidth: 100 }}>{t.assignee ?? <span style={{ color: '#ef4444' }}>N/A</span>}</td>
              <td style={TD}><span style={{ color: glpiPriorityColor(t.priority), fontWeight: 600, fontSize: 11 }}>{t.priorityLabel}</span></td>
              <td style={{ ...TD, minWidth: 90, fontSize: 11 }}>{t.category}</td>
              <td style={{ ...TD, minWidth: 80 }}>{fmtShort(t.dateCreation)}</td>
              <td style={{ ...TD, minWidth: 80 }}>{fmtShort(t.dateMod)}</td>
              <td style={{ ...TD, minWidth: 50 }}>
                <span style={{ color: t.daysOpen > 3 ? '#f97316' : '#cbd5e1', fontWeight: t.daysOpen > 3 ? 700 : 400 }}>{t.daysOpen}d</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function JiraTable({ tickets }: { tickets: JiraTicket[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Key', 'Resumo', 'Projeto', 'Responsável', 'Sprint', 'Prioridade', 'Prazo', 'Dias'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? <EmptyRow cols={8} /> : tickets.map(t => {
            const badge = deadlineBadge(t.daysRemaining)
            return (
              <tr key={t.key}>
                <td style={{ ...TD, minWidth: 80 }}>
                  <a href={t.url} target="_blank" rel="noreferrer" style={{ color: '#8fbfc2', fontWeight: 600, textDecoration: 'none', fontSize: 11 }}>{t.key}</a>
                </td>
                <td style={TDTitle} title={t.summary}>{t.summary}</td>
                <td style={{ ...TD, minWidth: 80, fontSize: 11 }}>{t.projectName}</td>
                <td style={{ ...TD, minWidth: 100 }}>{t.assignee ?? <span style={{ color: '#ef4444' }}>N/A</span>}</td>
                <td style={{ ...TD, minWidth: 90, fontSize: 11 }}>{t.sprint ?? '—'}</td>
                <td style={TD}><span style={{ color: priorityColor(t.priority), fontWeight: 600, fontSize: 11 }}>{t.priority}</span></td>
                <td style={{ ...TD, minWidth: 80 }}>{fmt(t.dueDate)}</td>
                <td style={{ ...TD, minWidth: 70 }}>
                  {t.dueDate
                    ? <span style={{ background: badge.bg, color: badge.color, borderRadius: 8, padding: '2px 7px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{badge.label}</span>
                    : <span style={{ color: '#6b7280' }}>—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function GroupTabs({ groups, labels, counts, activeTab, onTab }: {
  groups: string[]; labels: Record<string, string>; counts: Record<string, number>
  activeTab: string; onTab: (t: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
      {groups.map(g => (
        <button key={g} onClick={() => onTab(g)} style={{
          background: activeTab === g ? 'rgba(143,191,194,0.18)' : 'rgba(143,191,194,0.05)',
          border: activeTab === g ? '1px solid rgba(143,191,194,0.4)' : '1px solid rgba(143,191,194,0.1)',
          borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontSize: 12,
          color: activeTab === g ? '#8fbfc2' : '#6b7280', fontWeight: activeTab === g ? 700 : 400,
        }}>
          {labels[g]} <span style={{ marginLeft: 4, fontWeight: 700 }}>{counts[g] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ExecutiveDailyPage() {
  const [glpiTab, setGlpiTab] = useState('open')
  const [jiraTab, setJiraTab] = useState('inProgress')
  const [filter, setFilter] = useState({ search: '', project: '', responsible: '', priority: '' })

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['executive-daily'],
    queryFn: () => fetch('/api/reports/executive-daily').then(r => r.json()),
    refetchInterval: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  })

  const glpiGroups: Record<string, GLPITicket[]> = useMemo(() =>
    data?.glpi?.groups || { open: [], inProgress: [], pending: [], resolvedToday: [], overdue: [] }
  , [data])

  const jiraGroups: Record<string, JiraTicket[]> = useMemo(() =>
    data?.jira?.groups || { todo: [], inProgress: [], blocked: [], review: [], doneToday: [], overdue: [] }
  , [data])

  const applyFilters = useCallback(<T extends Record<string, any>>(items: T[], titleKey: string, responsibleKey: string, projectKey: string, priorityKey: string): T[] => {
    const { search, responsible, project, priority } = filter
    return items.filter(item => {
      if (search && !String(item[titleKey] ?? '').toLowerCase().includes(search.toLowerCase())) return false
      if (responsible && !String(item[responsibleKey] ?? '').toLowerCase().includes(responsible.toLowerCase())) return false
      if (project && !String(item[projectKey] ?? '').toLowerCase().includes(project.toLowerCase())) return false
      if (priority && !String(item[priorityKey] ?? '').toLowerCase().includes(priority.toLowerCase())) return false
      return true
    })
  }, [filter])

  const activeGlpiTickets = useMemo(() =>
    applyFilters(glpiGroups[glpiTab] || [], 'title', 'assignee', 'category', 'priorityLabel')
  , [glpiGroups, glpiTab, applyFilters])

  const activeJiraTickets = useMemo(() =>
    applyFilters(jiraGroups[jiraTab] || [], 'summary', 'assignee', 'projectName', 'priority')
  , [jiraGroups, jiraTab, applyFilters])

  const upcomingDeadlines: Deadline[] = useMemo(() =>
    applyFilters(data?.upcomingDeadlines || [], 'titulo', 'responsavel', 'projeto', 'prioridade')
  , [data, applyFilters])

  const staleItems: any[] = data?.staleItems || []

  // ── Export ─────────────────────────────────────────────────────────────

  function exportExcel() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Indicador: 'GLPI — Abertos', Valor: data?.glpi?.open ?? 0 },
      { Indicador: 'GLPI — Pendentes', Valor: data?.glpi?.pending ?? 0 },
      { Indicador: 'GLPI — Atrasados', Valor: data?.glpi?.overdue ?? 0 },
      { Indicador: 'GLPI — Resolvidos Hoje', Valor: data?.glpi?.resolvedToday ?? 0 },
      { Indicador: 'Jira — Abertos', Valor: data?.jira?.open ?? 0 },
      { Indicador: 'Jira — Em Andamento', Valor: jiraGroups.inProgress?.length ?? 0 },
      { Indicador: 'Jira — Bloqueados', Valor: jiraGroups.blocked?.length ?? 0 },
      { Indicador: 'Jira — Atrasados', Valor: data?.jira?.overdue ?? 0 },
      { Indicador: 'Jira — Concluídos Hoje', Valor: data?.jira?.completedToday ?? 0 },
    ]), 'KPIs')

    const glpiAll: GLPITicket[] = data?.glpi?.allTickets || []
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(glpiAll.map(t => ({
      ID: t.id, Título: t.title, Status: t.statusLabel, Prioridade: t.priorityLabel,
      Responsável: t.assignee ?? 'N/A', Categoria: t.category,
      Abertura: fmt(t.dateCreation), Atualização: fmt(t.dateMod), 'Dias Aberto': t.daysOpen,
    }))), 'GLPI')

    const jiraAll: JiraTicket[] = data?.jira?.allTickets || []
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jiraAll.map(t => ({
      Key: t.key, Projeto: t.projectName, Resumo: t.summary, Status: t.status,
      Prioridade: t.priority, Responsável: t.assignee ?? 'N/A', Sprint: t.sprint ?? '—',
      'Data Limite': fmt(t.dueDate), 'Dias Restantes': t.daysRemaining ?? '—',
    }))), 'Jira')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data?.upcomingDeadlines || []).map((d: Deadline) => ({
      Sistema: d.sistema, ID: d.id, Título: d.titulo, Responsável: d.responsavel,
      Projeto: d.projeto, Prazo: fmt(d.prazo), 'Dias Restantes': d.diasRestantes,
    }))), 'Vencimentos')

    XLSX.writeFile(wb, `relatorio-executivo-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function exportCSV() {
    const rows: string[][] = [['Sistema', 'ID', 'Título', 'Status', 'Prioridade', 'Responsável', 'Prazo', 'Dias']]
    ;(data?.glpi?.allTickets || []).forEach((t: GLPITicket) =>
      rows.push(['GLPI', String(t.id), t.title, t.statusLabel, t.priorityLabel, t.assignee ?? 'N/A', '—', String(t.daysOpen)])
    )
    ;(data?.jira?.allTickets || []).forEach((t: JiraTicket) =>
      rows.push(['Jira', t.key, t.summary, t.status, t.priority, t.assignee ?? 'N/A', t.dueDate ?? '—', String(t.daysRemaining ?? '—')])
    )
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `relatorio-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: '#0a1316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#8fbfc2' }}>
        <div style={{ fontSize: 40, marginBottom: 14, animation: 'spin 1s linear infinite' }}>⟳</div>
        <p style={{ fontSize: 14, margin: 0 }}>Carregando relatório executivo...</p>
      </div>
    </div>
  )

  if (error || data?.error) return (
    <div style={{ minHeight: '100vh', background: '#0a1316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: 400, padding: 20 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✕</div>
        <p style={{ fontSize: 14 }}>{String(data?.error ?? error)}</p>
      </div>
    </div>
  )

  const h = data?.health ?? 'healthy'
  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'

  const glpiTabLabels: Record<string, string> = { open: 'Novos', inProgress: 'Em Atendimento', pending: 'Pendente', resolvedToday: 'Resolvidos Hoje', overdue: 'Atrasados' }
  const jiraTabLabels: Record<string, string> = { inProgress: 'Em Andamento', todo: 'To Do', blocked: 'Bloqueado', review: 'Revisão', doneToday: 'Concluídos Hoje', overdue: 'Atrasados' }

  const glpiCounts: Record<string, number> = Object.fromEntries(Object.entries(glpiGroups).map(([k, v]) => [k, v.length]))
  const jiraCounts: Record<string, number> = Object.fromEntries(Object.entries(jiraGroups).map(([k, v]) => [k, v.length]))

  const S: React.CSSProperties = { minHeight: '100vh', background: '#0a1316', fontFamily: 'Inter, sans-serif', padding: '24px 28px', color: '#e2e8f0' }
  const card: React.CSSProperties = { background: '#0d1a1e', border: '1px solid rgba(143,191,194,0.10)', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }
  const hasFilters = filter.search || filter.project || filter.responsible || filter.priority

  return (
    <div style={S}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>
            Relatório Executivo Diário
          </h1>
          <p style={{ fontSize: 13, color: '#8fbfc2', margin: '4px 0 0' }}>
            GLPI + Jira · Atualizado às {lastUpdate} ·{' '}
            <span style={{ color: healthColor(h), fontWeight: 700 }}>
              {h === 'healthy' ? 'Operação Normal' : h === 'attention' ? 'Atenção Necessária' : 'Situação Crítica'}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => refetch()} style={{ background: 'rgba(143,191,194,0.08)', border: '1px solid rgba(143,191,194,0.2)', borderRadius: 8, padding: '7px 14px', color: '#8fbfc2', cursor: 'pointer', fontSize: 12 }}>↻ Atualizar</button>
          <button onClick={exportCSV} style={{ background: 'rgba(143,191,194,0.08)', border: '1px solid rgba(143,191,194,0.2)', borderRadius: 8, padding: '7px 14px', color: '#8fbfc2', cursor: 'pointer', fontSize: 12 }}>CSV</button>
          <button onClick={exportExcel} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '7px 14px', color: '#22c55e', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Excel</button>
          <button onClick={() => window.print()} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '7px 14px', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>PDF</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: '14px 18px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: '#8fbfc2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Filtros</span>
        {([['Buscar...', 'search'], ['Projeto / Categoria', 'project'], ['Responsável', 'responsible']] as [string, keyof typeof filter][]).map(([ph, k]) => (
          <input key={k} placeholder={ph} value={filter[k]} onChange={e => setFilter(p => ({ ...p, [k]: e.target.value }))}
            style={{ background: 'rgba(143,191,194,0.05)', border: '1px solid rgba(143,191,194,0.12)', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: '#e2e8f0', outline: 'none', flex: '1 1 120px', minWidth: 120 }} />
        ))}
        <select value={filter.priority} onChange={e => setFilter(p => ({ ...p, priority: e.target.value }))}
          style={{ background: '#0d1a1e', border: '1px solid rgba(143,191,194,0.12)', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: '#e2e8f0', cursor: 'pointer', flex: '1 1 100px' }}>
          <option value=''>Prioridade</option>
          <option>Crítica</option><option>Alta</option><option>Média</option><option>Baixa</option>
          <option>Highest</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
        {hasFilters && (
          <button onClick={() => setFilter({ search: '', project: '', responsible: '', priority: '' })}
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '6px 10px', fontSize: 11, color: '#ef4444', cursor: 'pointer' }}>✕ Limpar</button>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard label="GLPI Abertos" value={data?.glpi?.open ?? 0} sub={`${data?.glpi?.pending ?? 0} pendentes`} icon="🎫" />
        <KpiCard label="GLPI Atrasados" value={data?.glpi?.overdue ?? 0} sub="sem atualização 3d+" icon="⏰" color={data?.glpi?.overdue > 0 ? '#f97316' : '#22c55e'} />
        <KpiCard label="GLPI Resolvidos" value={data?.glpi?.resolvedToday ?? 0} sub="hoje" icon="✓" color="#22c55e" />
        <KpiCard label="Jira Abertos" value={data?.jira?.open ?? 0} sub={`${data?.jira?.unassigned ?? 0} s/ responsável`} icon="📋" />
        <KpiCard label="Em Andamento" value={jiraCounts.inProgress ?? 0} sub={`${jiraCounts.blocked ?? 0} bloqueados`} icon="⚡" color="#eab308" />
        <KpiCard label="Jira Atrasadas" value={data?.jira?.overdue ?? 0} sub="prazo vencido" icon="🚨" color={data?.jira?.overdue > 0 ? '#ef4444' : '#22c55e'} />
        <KpiCard label="Concluídas Hoje" value={data?.jira?.completedToday ?? 0} sub="no Jira" icon="🏁" color="#22c55e" />
      </div>

      {/* Próximos Vencimentos */}
      {upcomingDeadlines.length > 0 && (
        <div style={card}>
          <SectionHeader title="Próximos Vencimentos" count={upcomingDeadlines.length} color="#eab308" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Sistema', 'ID', 'Título', 'Projeto', 'Responsável', 'Prazo', 'Status'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {upcomingDeadlines.slice(0, 15).map(d => {
                  const badge = deadlineBadge(d.diasRestantes)
                  return (
                    <tr key={`${d.sistema}-${d.id}`}>
                      <td style={{ ...TD, minWidth: 55 }}><span style={{ fontSize: 10, background: 'rgba(143,191,194,0.1)', color: '#8fbfc2', borderRadius: 6, padding: '2px 6px', fontWeight: 600 }}>{d.sistema}</span></td>
                      <td style={{ ...TD, fontWeight: 600, color: '#8fbfc2', minWidth: 80 }}>{d.id}</td>
                      <td style={TDTitle} title={d.titulo}>{d.titulo}</td>
                      <td style={{ ...TD, fontSize: 11, minWidth: 80 }}>{d.projeto}</td>
                      <td style={{ ...TD, minWidth: 100 }}>{d.responsavel}</td>
                      <td style={{ ...TD, minWidth: 80 }}>{fmt(d.prazo)}</td>
                      <td style={{ ...TD, minWidth: 110 }}>
                        <span style={{ background: badge.bg, color: badge.color, borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>{badge.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GLPI */}
      <div style={card}>
        <SectionHeader title="GLPI — Chamados de Suporte" color="#8fbfc2" />
        <GroupTabs groups={['open', 'inProgress', 'pending', 'resolvedToday', 'overdue']} labels={glpiTabLabels} counts={glpiCounts} activeTab={glpiTab} onTab={setGlpiTab} />
        <GLPITable tickets={activeGlpiTickets} />
      </div>

      {/* Jira */}
      <div style={card}>
        <SectionHeader title="Jira — Atividades Estratégicas" color="#8fbfc2" />
        <GroupTabs groups={['inProgress', 'todo', 'blocked', 'review', 'doneToday', 'overdue']} labels={jiraTabLabels} counts={jiraCounts} activeTab={jiraTab} onTab={setJiraTab} />
        <JiraTable tickets={activeJiraTickets} />
      </div>

      {/* Riscos & Atenções */}
      {((data?.risks?.length ?? 0) > 0 || staleItems.length > 0) && (
        <div style={card}>
          <SectionHeader title="Riscos & Atenções" color="#f97316" />
          <div style={{ display: 'grid', gap: 10 }}>
            {(data?.risks || []).map((r: any, i: number) => (
              <div key={i} style={{ background: r.severity === 'critical' ? 'rgba(239,68,68,0.06)' : 'rgba(249,115,22,0.06)', border: `1px solid ${r.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.2)'}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span>{r.severity === 'critical' ? '🔴' : '🟠'}</span>
                  <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>{r.title}</span>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 4px' }}>{r.description}</p>
                <p style={{ fontSize: 12, color: '#8fbfc2', margin: 0 }}>→ {r.action}</p>
              </div>
            ))}
            {staleItems.length > 0 && (
              <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span>🟡</span>
                  <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>{staleItems.length} Itens Sem Atualização (3+ dias)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {staleItems.slice(0, 7).map((s: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, background: 'rgba(143,191,194,0.1)', color: '#8fbfc2', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>{s.sistema}</span>
                      <span style={{ fontSize: 12, color: '#cbd5e1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.id} · {s.titulo}</span>
                      <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.diasSemAtualizar}d</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resumo Executivo */}
      <div style={card}>
        <SectionHeader title="Resumo Executivo" color="#8fbfc2" />
        <div style={{ background: 'rgba(143,191,194,0.04)', border: '1px solid rgba(143,191,194,0.08)', borderRadius: 8, padding: '14px 16px', marginBottom: data?.recommendations?.length ? 12 : 0 }}>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>{data?.executiveSummary}</p>
        </div>
        {(data?.recommendations?.length ?? 0) > 0 && (
          <>
            <p style={{ fontSize: 12, color: '#8fbfc2', fontWeight: 600, margin: '0 0 8px' }}>Recomendações</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(data.recommendations as string[]).map((rec, i) => (
                <li key={i} style={{ fontSize: 12, color: '#94a3b8' }}>{rec}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: '#374151', fontSize: 11, marginTop: 8 }}>
        Leonardo CS Cockpit · Xtentgroup · Auto-refresh 15 min
      </div>

      <style>{`@media print { button { display: none !important; } body { background: white !important; } }`}</style>
    </div>
  )
}
