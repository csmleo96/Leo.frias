'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, memo } from 'react'
import { RefreshCw, Loader2, ExternalLink, AlertTriangle, CheckCircle2, TrendingDown, Clock } from 'lucide-react'
import { toast } from 'sonner'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const H = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }

interface Ticket {
  key: string
  summary: string
  status: string
  priority: string
  assignee: string
  dueDate: string | null
  url: string
  isCompleted: boolean
  isOverdue: boolean
  isDueSoon: boolean
  daysUntilDue: number | null
}

interface Project {
  key: string
  name: string
  total: number
  open: number
  completed: number
  inProgress: number
  critical: number
  overdue: number
  dueSoon: number
  unassigned: number
  tickets: Ticket[]
}

interface CriticalItem {
  key: string
  summary: string
  project: string
  priority: string
  assignee: string
  issue: string
}

export default function ExecutiveDailyReportPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['executive-daily-report'],
    queryFn: () => fetch('/api/reports/executive-daily').then(r => r.json()),
    staleTime: 0,
  })

  const report = data || {}
  const metrics = report.metrics || {}
  const jira = report.jira || {}
  const glpi = report.glpi || {}
  const risks = report.risks || []
  const recommendations = report.recommendations || []
  const projectsData = jira.projectsData || {}
  const criticalItems = jira.criticalItems || []

  const projectsList: Project[] = Object.values(projectsData)
  const projectsCount = projectsList.length

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold" style={{ ...H, color: '#f3fafa' }}>
            Executive Daily Report
          </h1>
          <p className="text-sm mt-2" style={{ color: MUTED }}>
            {isLoading ? 'Carregando...' : 'Visão Consolidada com Detalhamento de Projetos'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all"
          style={{
            background: T,
            color: '#0a1316',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {!isLoading && (
        <>
          {/* Resumo Geral Consolidado */}
          <div>
            <h2 className="text-sm font-bold uppercase mb-4" style={{ ...H, color: MUTED, letterSpacing: '0.12em' }}>
              Resumo Geral Consolidado
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Total de Tickets', value: metrics.totalOpen || 0, color: T },
                { label: 'Em Andamento', value: metrics.inProgress || 0, color: '#8fbfc2' },
                { label: 'Concluídos Hoje', value: metrics.jiraCompleted || 0, color: '#7dd3a8' },
                { label: 'Atrasados', value: metrics.jiraOverdue || 0, color: '#f87171' },
                { label: 'Próximos 3 dias', value: jira.dueSoon || 0, color: '#fbbf24' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <p className="text-xs" style={{ color: MUTED }}>{label}</p>
                  <p className="text-3xl font-bold mt-2" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Itens Críticos */}
          {criticalItems.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase mb-4" style={{ ...H, color: MUTED, letterSpacing: '0.12em' }}>
                Itens Críticos ({criticalItems.length})
              </h2>
              <div className="rounded-xl p-6 overflow-x-auto" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <table className="w-full text-sm">
                  <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <tr>
                      {['Status', 'Ticket', 'Título', 'Projeto', 'Prioridade', 'Responsável'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: MUTED }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {criticalItems.map((item: CriticalItem, i) => (
                      <tr key={item.key} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                        <td className="px-4 py-3">{item.issue}</td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color: T }}>{item.key}</td>
                        <td className="px-4 py-3 max-w-xs">{item.summary.substring(0, 50)}</td>
                        <td className="px-4 py-3">{item.project}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded" style={{
                            background: item.priority === 'High' || item.priority === 'Highest' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)',
                            color: item.priority === 'High' || item.priority === 'Highest' ? '#f87171' : '#fbbf24',
                          }}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">{item.assignee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Projetos Detalhados */}
          <div>
            <h2 className="text-sm font-bold uppercase mb-4" style={{ ...H, color: MUTED, letterSpacing: '0.12em' }}>
              Jira Projects ({projectsCount} projetos)
            </h2>

            <div className="space-y-6">
              {projectsList.map((project: Project) => (
                <div key={project.key} className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  {/* Project Header */}
                  <div className="p-6 border-b" style={{ borderColor: BORDER }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold" style={{ ...H, color: '#f3fafa' }}>
                        {project.name}
                      </h3>
                      <span className="text-sm px-3 py-1 rounded-full" style={{ background: `${T}20`, color: T, fontWeight: 'bold' }}>
                        {project.total} tickets
                      </span>
                    </div>

                    {/* Project Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                      {[
                        { label: 'Em Andamento', value: project.inProgress, color: '#8fbfc2' },
                        { label: 'Concluído Hoje', value: project.completed, color: '#7dd3a8' },
                        { label: 'Atrasados', value: project.overdue, color: '#f87171' },
                        { label: 'Próx. 3 dias', value: project.dueSoon, color: '#fbbf24' },
                        { label: 'Sem Responsável', value: project.unassigned, color: '#fb923c' },
                        { label: 'Críticos', value: project.critical, color: '#ef4444' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded p-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                          <p className="text-xs" style={{ color: MUTED }}>{label}</p>
                          <p className="text-lg font-bold mt-1" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Status Geral */}
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Status Geral:</span>
                      <span className="text-sm font-bold px-3 py-1 rounded" style={{
                        background: project.overdue > 0 ? 'rgba(248,113,113,0.2)' : project.dueSoon > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(125,211,168,0.2)',
                        color: project.overdue > 0 ? '#f87171' : project.dueSoon > 0 ? '#fbbf24' : '#7dd3a8',
                      }}>
                        {project.overdue > 0 ? '🔴 Crítico' : project.dueSoon > 0 ? '🟠 Atenção' : '🟢 Normal'}
                      </span>
                    </div>
                  </div>

                  {/* Tickets Table */}
                  {project.tickets.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                            {['Status', 'Ticket', 'Título', 'Responsável', 'Prioridade', 'Data Limite'].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: MUTED }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {project.tickets.map((t: Ticket, i) => (
                            <tr key={t.key} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-sm">
                                {t.isOverdue ? '🔴' : t.isDueSoon ? '🟠' : t.isCompleted ? '✅' : '🔵'}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold" style={{ color: T }}>
                                <a href={t.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
                                  {t.key}
                                </a>
                              </td>
                              <td className="px-4 py-3 max-w-xs" style={{ color: '#f3fafa' }}>
                                {t.summary.substring(0, 50)}
                              </td>
                              <td className="px-4 py-3">{t.assignee}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs px-2 py-1 rounded" style={{
                                  background: t.priority === 'High' || t.priority === 'Highest' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)',
                                  color: t.priority === 'High' || t.priority === 'Highest' ? '#f87171' : '#fbbf24',
                                }}>
                                  {t.priority}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* GLPI Service Desk */}
          {glpi.total > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase mb-4" style={{ ...H, color: MUTED, letterSpacing: '0.12em' }}>
                GLPI Service Desk
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Chamados de Clientes</p>
                  <p className="text-3xl font-bold mt-3" style={{ color: '#8fbfc2' }}>{glpi.customerTickets || 0}</p>
                </div>
                <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Infraestrutura</p>
                  <p className="text-3xl font-bold mt-3" style={{ color: '#fbbf24' }}>{glpi.infrastructureTickets || 0}</p>
                </div>
                <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>Banco de Dados</p>
                  <p className="text-3xl font-bold mt-3" style={{ color: '#fb923c' }}>{glpi.databaseTickets || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Risks & Recommendations */}
          {(risks.length > 0 || recommendations.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {risks.length > 0 && (
                <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <p className="text-sm font-bold uppercase mb-4" style={{ ...H, color: MUTED }}>Riscos Identificados</p>
                  <div className="space-y-3">
                    {risks.slice(0, 5).map((r: any, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.2)', borderLeft: `3px solid ${r.severity === 'critical' ? '#f87171' : '#fbbf24'}` }}>
                        <p className="text-sm font-bold" style={{ color: '#f3fafa' }}>{r.title}</p>
                        <p className="text-xs mt-1" style={{ color: MUTED }}>{r.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendations.length > 0 && (
                <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <p className="text-sm font-bold uppercase mb-4" style={{ ...H, color: MUTED }}>Recomendações</p>
                  <div className="space-y-2">
                    {recommendations.map((r: string, i: number) => (
                      <div key={i} className="flex gap-2">
                        <span style={{ color: T }}>→</span>
                        <p className="text-sm" style={{ color: '#f3fafa' }}>{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {isLoading && (
        <div className="rounded-xl p-12 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: T }} />
          <p style={{ color: MUTED }}>Carregando relatório...</p>
        </div>
      )}
    </div>
  )
}
