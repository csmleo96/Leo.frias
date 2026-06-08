'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, RefreshCw, FileText, TrendingUp, Loader2, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid,
} from 'recharts'
import * as XLSX from 'xlsx'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const heading = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }

const COLORS_STATUS = ['#fbbf24', T, '#a78bfa', '#fb923c', '#7dd3a8', '#94a3b8']
const COLORS_PRIORITY = ['#ef4444', '#f87171', '#fb923c', '#fbbf24', '#94a3b8', '#94a3b8']

interface GlpiStats { total: number; new: number; inProgress: number; pending: number; solved: number; closed: number }
interface GlpiTicket { id: number; statusLabel: string; priorityLabel: string; typeLabel: string }
interface JiraIssue { key: string; project: { key: string; name: string }; status: string; statusCategory: string; priority: string }
interface Task { status: string; priority: string }
interface Transaction { type: string; amount: number; category: string }

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <p className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: MUTED }}>{label}</p>
      <p className="text-2xl font-bold" style={{ ...heading, color: color ?? '#f3fafa' }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{sub}</p>}
    </div>
  )
}

const TOOLTIP_STYLE = {
  backgroundColor: '#0d1a1e',
  border: '1px solid rgba(143,191,194,0.15)',
  borderRadius: '8px',
  color: '#f3fafa',
  fontSize: 12,
}

export default function RelatoriosPage() {
  const [glpiStats, setGlpiStats] = useState<GlpiStats | null>(null)
  const [glpiTickets, setGlpiTickets] = useState<GlpiTicket[]>([])
  const [jiraIssues, setJiraIssues] = useState<JiraIssue[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setErrors([])
    const errs: string[] = []

    const [glpiRes, jiraRes] = await Promise.allSettled([
      fetch('/api/glpi').then(r => r.json()),
      fetch('/api/jira').then(r => r.json()),
    ])

    if (glpiRes.status === 'fulfilled' && !glpiRes.value.error) {
      setGlpiStats(glpiRes.value.stats)
      setGlpiTickets(glpiRes.value.tickets ?? [])
    } else {
      errs.push('GLPI: ' + (glpiRes.status === 'rejected' ? glpiRes.reason : glpiRes.value?.error))
    }

    if (jiraRes.status === 'fulfilled' && !jiraRes.value.error) {
      setJiraIssues(jiraRes.value.issues ?? [])
    } else {
      errs.push('Jira: ' + (jiraRes.status === 'rejected' ? jiraRes.reason : jiraRes.value?.error))
    }

    // Supabase
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const [{ data: t }, { data: tr }] = await Promise.all([
        sb.from('tasks').select('status, priority'),
        sb.from('transactions').select('type, amount, category'),
      ])
      setTasks(t ?? [])
      setTransactions(tr ?? [])
    } catch {
      errs.push('Supabase: falha ao carregar tarefas e transações')
    }

    setErrors(errs)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // --- derived data ---
  const glpiByStatus = [
    { name: 'Novos', value: glpiStats?.new ?? 0 },
    { name: 'Atendimento', value: glpiStats?.inProgress ?? 0 },
    { name: 'Pendente', value: glpiStats?.pending ?? 0 },
    { name: 'Resolvidos', value: glpiStats?.solved ?? 0 },
    { name: 'Fechados', value: glpiStats?.closed ?? 0 },
  ]

  const glpiByType = Object.entries(
    glpiTickets.reduce((acc, t) => { acc[t.typeLabel] = (acc[t.typeLabel] ?? 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const jiraByProject = Object.entries(
    jiraIssues.reduce((acc, i) => { const k = i.project?.key ?? '?'; acc[k] = (acc[k] ?? 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const jiraByStatus = Object.entries(
    jiraIssues.reduce((acc, i) => { acc[i.statusCategory] = (acc[i.statusCategory] ?? 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const taskByStatus = Object.entries(
    tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const receita = transactions.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
  const despesa = transactions.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)

  const finByCategory = Object.entries(
    transactions.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = { receita: 0, despesa: 0 }
      acc[t.category][t.type === 'receita' ? 'receita' : 'despesa'] += Number(t.amount)
      return acc
    }, {} as Record<string, { receita: number; despesa: number }>)
  ).map(([name, v]) => ({ name, ...v }))

  function exportExcel() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(glpiByStatus), 'GLPI Status')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jiraByProject), 'Jira Projetos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskByStatus), 'Tarefas Status')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Tipo: 'Receita', Total: receita.toFixed(2) },
      { Tipo: 'Despesa', Total: despesa.toFixed(2) },
      { Tipo: 'Saldo', Total: (receita - despesa).toFixed(2) },
    ]), 'Financeiro')
    XLSX.writeFile(wb, `relatorio-cockpit-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold" style={{ ...heading, color: '#f3fafa' }}>Central de Relatórios</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(143,191,194,0.10)', color: T, border: `1px solid rgba(143,191,194,0.25)` }}>
              Consolidado
            </span>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>Visão executiva de todos os módulos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
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

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin" style={{ color: T }} /></div>
      ) : (
        <>
          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-5 rounded-xl p-3 flex items-start gap-2"
              style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)' }}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: '#f87171' }} />
              <p className="text-xs" style={{ color: '#f87171' }}>{errors.join(' · ')}</p>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard label="Chamados GLPI" value={glpiStats?.total ?? 0} sub={`${glpiStats?.pending ?? 0} pendentes`} color={T} />
            <StatCard label="Issues Jira" value={jiraIssues.length} sub={`${jiraByProject.length} projetos`} color="#a78bfa" />
            <StatCard label="Tarefas" value={tasks.length} sub={`${tasks.filter(t => t.status === 'concluida').length} concluídas`} color="#7dd3a8" />
            <StatCard label="Saldo Financeiro" value={`R$ ${(receita - despesa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub={`Receita: R$ ${receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color={receita - despesa >= 0 ? '#7dd3a8' : '#f87171'} />
          </div>

          {/* Charts row 1: GLPI + Jira */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* GLPI por status */}
            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-semibold mb-4" style={{ ...heading, color: '#f3fafa' }}>GLPI — Chamados por Status</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={glpiByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {glpiByStatus.map((_, i) => <Cell key={i} fill={COLORS_STATUS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: MUTED }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Jira por projeto */}
            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-semibold mb-4" style={{ ...heading, color: '#f3fafa' }}>Jira — Issues por Projeto</p>
              {jiraByProject.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-sm" style={{ color: MUTED }}>Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={jiraByProject} layout="vertical" barSize={16}>
                    <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" fill="#a78bfa" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Charts row 2: Tarefas + Financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Tarefas por status */}
            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-semibold mb-4" style={{ ...heading, color: '#f3fafa' }}>Tarefas — Distribuição por Status</p>
              {taskByStatus.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-sm" style={{ color: MUTED }}>Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={taskByStatus} barSize={32}>
                    <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" fill="#7dd3a8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Financeiro por categoria */}
            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-semibold mb-4" style={{ ...heading, color: '#f3fafa' }}>Financeiro — Receita vs Despesa</p>
              {finByCategory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] gap-3">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(125,211,168,0.08)', border: '1px solid rgba(125,211,168,0.2)' }}>
                      <p className="text-xs" style={{ color: MUTED }}>Receita</p>
                      <p className="text-lg font-bold" style={{ color: '#7dd3a8' }}>R$ {receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                      <p className="text-xs" style={{ color: MUTED }}>Despesa</p>
                      <p className="text-lg font-bold" style={{ color: '#f87171' }}>R$ {despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={finByCategory} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(143,191,194,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: MUTED }} />
                    <Bar dataKey="receita" fill="#7dd3a8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesa" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* GLPI tipo + Jira status row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-semibold mb-4" style={{ ...heading, color: '#f3fafa' }}>GLPI — Incidentes vs Requisições</p>
              {glpiByType.length === 0 ? (
                <div className="flex items-center justify-center h-[180px] text-sm" style={{ color: MUTED }}>Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={glpiByType} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={4}>
                      <Cell fill="#f472b6" />
                      <Cell fill={T} />
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: MUTED }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-semibold mb-4" style={{ ...heading, color: '#f3fafa' }}>Jira — Issues por Categoria</p>
              {jiraByStatus.length === 0 ? (
                <div className="flex items-center justify-center h-[180px] text-sm" style={{ color: MUTED }}>Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={jiraByStatus} barSize={36}>
                    <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" fill={T} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
