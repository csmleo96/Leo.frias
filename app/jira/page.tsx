'use client'

import { useEffect, useState, useCallback } from 'react'
import { ExternalLink, Loader2, RefreshCw, AlertCircle, TrendingUp, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'

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
  created: string | null
  url: string
}

interface ProjectMetrics {
  name: string
  key: string
  total: number
  backlog: number
  progress: number
  done: number
  critical: number
  overdue: number
  nextWeek: number
  completionRate: number
  issues: JiraIssue[]
}

const STRATEGIC_PROJECTS = [
  { key: 'HV', name: 'Neural Lens', color: '#8fbfc2' },
  { key: 'MSPINFRA', name: 'MSP Infra', color: '#7dd3a8' },
  { key: 'MSPPRO', name: 'MSP Projetos', color: '#fbbf24' },
]

const H = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'

export default function JiraPage() {
  const [metrics, setMetrics] = useState<ProjectMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjectsData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch issues for all strategic projects
      const projectsData: ProjectMetrics[] = []

      for (const proj of STRATEGIC_PROJECTS) {
        try {
          const res = await fetch(`/api/jira?project=${proj.key}`)
          const data = await res.json()

          if (data.error) {
            throw new Error(data.error)
          }

          const issues: JiraIssue[] = data.issues || []
          const now = new Date()
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

          const metrics: ProjectMetrics = {
            name: proj.name,
            key: proj.key,
            total: issues.length,
            backlog: issues.filter(i => i.status.toLowerCase() === 'backlog').length,
            progress: issues.filter(i => ['em andamento', 'on going', 'code review'].includes(i.status.toLowerCase())).length,
            done: issues.filter(i => ['concluído', 'close'].includes(i.status.toLowerCase())).length,
            critical: issues.filter(i => ['highest', 'high'].includes(i.priority?.toLowerCase() ?? '')).length,
            overdue: issues.filter(i => {
              if (i.created && ['em andamento', 'on going'].includes(i.status.toLowerCase())) {
                const createdDate = new Date(i.created)
                return (now.getTime() - createdDate.getTime()) > 7 * 24 * 60 * 60 * 1000
              }
              return false
            }).length,
            nextWeek: issues.filter(i => {
              if (i.updated) {
                const updatedDate = new Date(i.updated)
                return updatedDate >= now && updatedDate <= weekFromNow
              }
              return false
            }).length,
            completionRate: issues.length > 0 ? Math.round((issues.filter(i => ['concluído', 'close'].includes(i.status.toLowerCase())).length / issues.length) * 100) : 0,
            issues: issues.slice(0, 5), // Top 5 recent issues
          }

          projectsData.push(metrics)
        } catch (e) {
          console.error(`Erro ao carregar projeto ${proj.name}:`, e)
        }
      }

      setMetrics(projectsData)
    } catch (e: any) {
      setError(e.message || 'Não foi possível sincronizar os dados do Jira. Tente novamente em alguns instantes.')
      console.error('Erro ao carregar Jira:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjectsData()
  }, [loadProjectsData])

  const _formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold" style={{ ...H, color: '#f3fafa' }}>
            Jira — Projetos Estratégicos
          </h1>
          <p className="text-sm mt-2" style={{ color: MUTED }}>
            {loading ? 'Carregando...' : `${metrics.length} projetos, ${metrics.reduce((a, m) => a + m.total, 0)} demandas totais`}
          </p>
        </div>
        <button
          onClick={loadProjectsData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all"
          style={{
            background: '#8fbfc2',
            color: '#0a1316',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: CARD, border: `1px solid rgba(248,113,113,0.25)` }}>
          <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0 }} className="mt-0.5" />
          <div>
            <p className="font-medium" style={{ color: '#f87171' }}>Erro ao sincronizar dados</p>
            <p className="text-sm mt-1" style={{ color: MUTED }}>
              Não foi possível sincronizar os dados do Jira. Tente novamente em alguns instantes.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="rounded-xl p-12 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: '#8fbfc2' }} />
          <p style={{ color: MUTED }}>Carregando dados dos projetos...</p>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && metrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {metrics.map((project) => {
            const projectColor = STRATEGIC_PROJECTS.find(p => p.key === project.key)?.color || '#8fbfc2'

            return (
              <div
                key={project.key}
                className="rounded-xl overflow-hidden"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                {/* Project Header */}
                <div className="p-6 border-b" style={{ borderColor: BORDER }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold" style={{ ...H, color: '#f3fafa' }}>
                      {project.name}
                    </h2>
                    <div
                      className="px-3 py-1 rounded-full text-sm font-semibold"
                      style={{
                        color: projectColor,
                        background: `${projectColor}20`,
                        border: `1px solid ${projectColor}40`,
                      }}
                    >
                      {project.total}
                    </div>
                  </div>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <p className="text-xs" style={{ color: MUTED }}>Em Progresso</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: '#8fbfc2' }}>
                        {project.progress}
                      </p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <p className="text-xs" style={{ color: MUTED }}>Concluído</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: '#7dd3a8' }}>
                        {project.done}
                      </p>
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="p-6 border-b" style={{ borderColor: BORDER }}>
                  <div className="space-y-3">
                    {/* Atrasadas */}
                    {project.overdue > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} style={{ color: '#f87171' }} />
                          <span className="text-xs font-medium" style={{ color: MUTED }}>Demandas Atrasadas</span>
                        </div>
                        <span className="font-bold" style={{ color: '#f87171' }}>{project.overdue}</span>
                      </div>
                    )}

                    {/* Críticas */}
                    {project.critical > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} style={{ color: '#fbbf24' }} />
                          <span className="text-xs font-medium" style={{ color: MUTED }}>Demandas Críticas</span>
                        </div>
                        <span className="font-bold" style={{ color: '#fbbf24' }}>{project.critical}</span>
                      </div>
                    )}

                    {/* Próxima semana */}
                    {project.nextWeek > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(143,191,194,0.08)', border: '1px solid rgba(143,191,194,0.2)' }}>
                        <div className="flex items-center gap-2">
                          <Clock size={14} style={{ color: '#8fbfc2' }} />
                          <span className="text-xs font-medium" style={{ color: MUTED }}>Próx. 7 dias</span>
                        </div>
                        <span className="font-bold" style={{ color: '#8fbfc2' }}>{project.nextWeek}</span>
                      </div>
                    )}

                    {/* Taxa de Conclusão */}
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} style={{ color: '#7dd3a8' }} />
                        <span className="text-xs font-medium" style={{ color: MUTED }}>Taxa de Conclusão</span>
                      </div>
                      <span className="font-bold" style={{ color: '#7dd3a8' }}>{project.completionRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Recent Issues */}
                {project.issues.length > 0 && (
                  <div className="p-6">
                    <p className="text-xs font-semibold uppercase mb-3" style={{ color: MUTED }}>
                      Atividades Recentes
                    </p>
                    <div className="space-y-2">
                      {project.issues.map((issue) => (
                        <a
                          key={issue.key}
                          href={issue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                        >
                          <span className="text-xs font-mono font-semibold mt-0.5" style={{ color: projectColor }}>
                            {issue.key}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate group-hover:underline" style={{ color: '#f3fafa' }}>
                              {issue.summary}
                            </p>
                            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                              {issue.status}
                            </p>
                          </div>
                          <ExternalLink size={12} style={{ color: MUTED, flexShrink: 0 }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && metrics.length === 0 && !error && (
        <div className="rounded-xl p-12 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: MUTED }} />
          <p style={{ color: MUTED }}>Nenhum projeto encontrado</p>
        </div>
      )}
    </div>
  )
}
