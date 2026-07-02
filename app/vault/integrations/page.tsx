'use client'

import { useEffect, useState } from 'react'
import { Plug, RefreshCw, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { SystemHealth } from '@/types/vault'

interface Integration {
  slug: string
  label: string
  category: string
  status: 'connected' | 'disconnected' | 'degraded' | 'unknown'
  latencyMs?: number
  lastCheck?: string
  description: string
}

const INTEGRATION_META: Record<string, { label: string; category: string; description: string }> = {
  zabbix:    { label: 'Zabbix',    category: 'Monitoramento', description: 'Coleta de métricas e alertas de infraestrutura' },
  grafana:   { label: 'Grafana',   category: 'Monitoramento', description: 'Dashboards e visualização de séries temporais' },
  hivegate:  { label: 'HiveGate', category: 'Service Desk',  description: 'Gestão de incidentes e tickets ITSM' },
  jira:      { label: 'Jira',      category: 'Projetos',      description: 'Rastreamento de projetos e tarefas' },
  hubspot:   { label: 'HubSpot',  category: 'CRM',           description: 'Pipeline de CRM e gestão de contatos' },
  glpi:      { label: 'GLPI',     category: 'ITSM',          description: 'Inventário e gestão de ativos de TI' },
  openai:    { label: 'OpenAI',   category: 'IA',            description: 'Geração de relatórios com GPT-4o' },
  outlook:   { label: 'Outlook',  category: 'Comunicação',   description: 'Envio de relatórios via Microsoft 365' },
  teams:     { label: 'Teams',    category: 'Comunicação',   description: 'Notificações e compartilhamento de relatórios' },
  sharepoint:{ label: 'SharePoint', category: 'Armazenamento', description: 'Arquivo central de documentos' },
  supabase:  { label: 'Supabase', category: 'Database',      description: 'Banco de dados PostgreSQL com RLS e auditoria' },
  n8n:       { label: 'N8N',      category: 'Automação',     description: 'Orquestração de workflows e automações' },
}

const CATEGORY_COLOR: Record<string, string> = {
  Monitoramento: '#3B82F6',
  'Service Desk': '#F59E0B',
  Projetos:      '#8B5CF6',
  CRM:           '#10B981',
  ITSM:          '#06B6D4',
  IA:            '#EC4899',
  Comunicação:   '#6366F1',
  Armazenamento: '#84CC16',
  Database:      '#F97316',
  Automação:     '#A78BFA',
}

export default function IntegrationsPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/vault/health')
      const json = await res.json()
      setHealth(json.health ?? null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const integrations: Integration[] = (health?.integrations.map(i => ({
    ...i,
    ...(INTEGRATION_META[i.slug] ?? { label: i.slug, category: 'Outro', description: '' }),
  })) ?? []) as unknown as Integration[]

  const categories = [...new Set(Object.values(INTEGRATION_META).map(m => m.category))]
  const connected = integrations.filter(i => i.status === 'connected').length

  function StatusIcon({ status }: { status: string }) {
    if (status === 'connected') return <CheckCircle className="h-5 w-5 text-green-500" />
    if (status === 'degraded')  return <AlertTriangle className="h-5 w-5 text-amber-500" />
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Plug className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Integrações</h1>
            <p className="text-sm text-slate-400">Status em tempo real de todas as conexões do Vault</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:text-white"
          onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-white">{integrations.length || Object.keys(INTEGRATION_META).length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Integrações Configuradas</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-400">{connected}</p>
            <p className="text-xs text-slate-400 mt-0.5">Conectadas</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-400">{integrations.length - connected}</p>
            <p className="text-xs text-slate-400 mt-0.5">Com Problema</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Integration cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(INTEGRATION_META).map(([slug, meta]) => {
          const live = integrations.find(i => i.slug === slug)
          const status = live?.status ?? 'unknown'
          const color = CATEGORY_COLOR[meta.category] ?? '#6B7280'

          return (
            <Card key={slug} className="bg-[#1A2847] border-white/10 hover:border-white/20 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-white">{meta.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                        {meta.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{meta.description}</p>
                  </div>
                  <StatusIcon status={status} />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs font-medium ${
                    status === 'connected'    ? 'text-green-400'
                    : status === 'degraded'  ? 'text-amber-400'
                    : status === 'unknown'   ? 'text-slate-500'
                    : 'text-red-400'
                  }`}>
                    {status === 'connected' ? 'Conectado'
                      : status === 'degraded' ? 'Degradado'
                      : status === 'disconnected' ? 'Desconectado'
                      : 'Desconhecido'}
                  </span>
                  {live?.latencyMs && (
                    <span className="text-xs text-slate-500">{live.latencyMs}ms</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
