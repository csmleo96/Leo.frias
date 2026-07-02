'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Wallet, Layers, ExternalLink, Loader2, Users, CheckCircle2, Clock, Circle } from 'lucide-react'
import Link from 'next/link'
import type { Transaction } from '@/lib/supabase/types'

const T = '#8fbfc2'
const DIM = 'rgba(143,191,194,0.10)'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const CARD = '#0d1a1e'
const heading = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function _timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d === 0 ? 'hoje' : d === 1 ? 'ontem' : d < 7 ? `${d}d atrás` : `${Math.floor(d / 7)}sem atrás`
}
function projectColor(key: string) {
  const m: Record<string, string> = { HV: T, MSPINFRA: '#a78bfa', MSPPRO: '#7dd3a8', IDB: '#fbbf24', NMA: '#f472b6' }
  return m[key] ?? T
}
function statusColor(s: string) {
  const sl = s.toLowerCase()
  if (sl === 'backlog') return MUTED
  if (sl.includes('andamento') || sl === 'on going') return T
  if (sl === 'code review') return '#a78bfa'
  if (sl === 'waiting') return '#fbbf24'
  if (sl === 'concluído' || sl === 'close') return '#7dd3a8'
  return MUTED
}

const stageLabel: Record<string, string> = { lead: 'Lead', contato: 'Contato', proposta: 'Proposta', negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido' }
const stageColor: Record<string, string> = { lead: '#94a3b8', contato: T, proposta: '#fbbf24', negociacao: '#fb923c', fechado: '#7dd3a8', perdido: '#f87171' }

const supabase = createClient()

export default function PainelPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [jiraIssues, setJiraIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    async function load() {
      const [txRes, prRes, tkRes, jiraRes] = await Promise.allSettled([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('prospects').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        fetch('/api/jira?project=todos&status=todos').then(r => r.json()),
      ])
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.data ?? [])
      if (prRes.status === 'fulfilled') setProspects(prRes.value.data ?? [])
      if (tkRes.status === 'fulfilled') setTasks(tkRes.value.data ?? [])
      if (jiraRes.status === 'fulfilled') setJiraIssues((jiraRes.value.issues ?? []).slice(0, 6))
      setLoading(false)
    }
    load()
  }, [])

  const receitas = transactions.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
  const despesas = transactions.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
  const pipeline = prospects.filter(p => !['fechado', 'perdido'].includes(p.stage)).reduce((s: number, p: any) => s + Number(p.value ?? 0), 0)
  const tasksDone = tasks.filter(t => t.status === 'concluida').length
  const tasksProgress = tasks.filter(t => t.status === 'em_andamento').length
  const tasksPending = tasks.filter(t => t.status === 'pendente').length

  const section = (title: string, href: string, icon: React.ReactNode) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-sm" style={{ ...heading, color: '#f3fafa' }}>{title}</h2>
      </div>
      <Link href={href} className="text-xs px-2.5 py-1 rounded-lg transition-all"
        style={{ color: T, background: DIM, border: `1px solid ${BORDER}` }}>
        Ver tudo →
      </Link>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-full py-32">
      <Loader2 size={24} className="animate-spin" style={{ color: T }} />
    </div>
  )

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ ...heading, color: '#f3fafa' }}>Painel</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Visão em tempo real · financeiro, pipeline e atividades</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Receitas', value: fmt(receitas), color: '#7dd3a8', icon: <TrendingUp size={16} style={{ color: '#7dd3a8' }} /> },
          { label: 'Despesas', value: fmt(despesas), color: '#f87171', icon: <TrendingDown size={16} style={{ color: '#f87171' }} /> },
          { label: 'Saldo', value: fmt(receitas - despesas), color: receitas >= despesas ? T : '#f87171', icon: <Wallet size={16} style={{ color: T }} /> },
          { label: 'Pipeline', value: fmt(pipeline), color: '#fb923c', icon: <Users size={16} style={{ color: '#fb923c' }} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs" style={{ color: MUTED }}>{label}</span></div>
            <p className="text-xl font-bold" style={{ ...heading, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tasks summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Pendentes', count: tasksPending, icon: <Circle size={14} style={{ color: MUTED }} />, color: MUTED },
          { label: 'Em Andamento', count: tasksProgress, icon: <Clock size={14} style={{ color: '#fbbf24' }} />, color: '#fbbf24' },
          { label: 'Concluídas', count: tasksDone, icon: <CheckCircle2 size={14} style={{ color: '#7dd3a8' }} />, color: '#7dd3a8' },
        ].map(({ label, count, icon, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            {icon}
            <div><p className="text-xl font-bold" style={{ color }}>{count}</p><p className="text-xs" style={{ color: MUTED }}>{label}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline */}
        <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {section('Pipeline de Prospects', '/prospects', <TrendingUp size={16} style={{ color: '#fb923c' }} />)}
          </div>
          <div className="p-2">
            {prospects.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: MUTED }}>Nenhum prospect cadastrado.</p>
            ) : prospects.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#f3fafa' }}>{p.name}</p>
                  <p className="text-xs" style={{ color: MUTED }}>{p.company ?? '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  {p.value && <span className="text-xs font-semibold" style={{ color: '#fb923c' }}>{fmt(Number(p.value))}</span>}
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${stageColor[p.stage]}15`, color: stageColor[p.stage] }}>
                    {stageLabel[p.stage]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Jira activities */}
        <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {section('Jira — Atividades Recentes', '/jira', <Layers size={16} style={{ color: T }} />)}
          </div>
          <div className="p-2">
            {jiraIssues.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: MUTED }}>Nenhuma issue encontrada.</p>
            ) : jiraIssues.map((i: any) => (
              <div key={i.key} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono font-semibold shrink-0" style={{ color: projectColor(i.project.key) }}>{i.key}</span>
                  <p className="text-sm truncate" style={{ color: '#f3fafa' }}>{i.summary}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs" style={{ color: statusColor(i.status) }}>{i.status}</span>
                  <a href={i.url} target="_blank" rel="noopener noreferrer" className="opacity-30 hover:opacity-100">
                    <ExternalLink size={11} style={{ color: T }} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
