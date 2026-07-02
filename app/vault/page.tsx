'use client'

import { useEffect, useState } from 'react'
import { Shield, Database, HardDrive, Cpu, Activity, Users, FileText, AlertTriangle, CheckCircle, XCircle, RefreshCw, Lock, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SystemHealth, AuditLog } from '@/types/vault'
import { CUSTOMERS, CUSTOMER_SLUGS, ROLE_LABELS } from '@/lib/vault/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface VaultPageData {
  health:   SystemHealth | null
  auditLogs: AuditLog[]
  loading:  boolean
  error:    string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === 'healthy' || status === 'connected')
    return <CheckCircle className="h-4 w-4 text-green-500" />
  if (status === 'degraded' || status === 'disconnected')
    return <AlertTriangle className="h-4 w-4 text-amber-500" />
  return <XCircle className="h-4 w-4 text-red-500" />
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    healthy: 'bg-green-500/10 text-green-400 border-green-500/30',
    connected: 'bg-green-500/10 text-green-400 border-green-500/30',
    degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    disconnected: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    critical: 'bg-red-500/10 text-red-400 border-red-500/30',
    unknown: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? map.unknown}`}>
      {status}
    </span>
  )
}

function ProgressBar({ value, max = 100, className = '' }: { value: number; max?: number; className?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className={`h-2 w-full bg-white/10 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, sub, status }: {
  icon: React.ElementType; label: string; value: string; sub?: string; status?: string
}) {
  return (
    <Card className="bg-[#1A2847] border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-lg bg-white/5"><Icon className="h-4 w-4 text-amber-400" /></div>
          {status && <StatusBadge status={status} />}
        </div>
        <p className="text-2xl font-bold text-white mt-2">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const [data, setData] = useState<VaultPageData>({ health: null, auditLogs: [], loading: true, error: null })
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  async function loadData() {
    setData(d => ({ ...d, loading: true, error: null }))
    try {
      const [healthRes, auditRes] = await Promise.all([
        fetch('/api/vault/health'),
        fetch('/api/vault/audit?limit=20'),
      ])
      const healthJson = await healthRes.json()
      const auditJson  = await auditRes.json()
      setData({
        health:    healthJson.health    ?? null,
        auditLogs: auditJson.logs       ?? [],
        loading:   false,
        error:     null,
      })
      setLastRefresh(new Date())
    } catch (err) {
      setData(d => ({ ...d, loading: false, error: String(err) }))
    }
  }

  useEffect(() => { loadData() }, [])

  const { health, auditLogs, loading, error } = data

  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Shield className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Vault — Leonardo CS Cockpit</h1>
            <p className="text-sm text-slate-400">Plataforma Corporativa Segura · Dados Segregados por Cliente</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Atualizado: {lastRefresh.toLocaleTimeString('pt-BR')}
          </span>
          <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:text-white"
            onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Health KPIs */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          <MetricCard icon={Activity} label="Saúde Geral"
            value={health.status.toUpperCase()} status={health.status} />
          <MetricCard icon={HardDrive} label="Disco"
            value={`${health.disk.percentUsed}%`}
            sub={`${health.disk.usedGb}GB / ${health.disk.totalGb}GB`}
            status={health.disk.status} />
          <MetricCard icon={Cpu} label="Memória"
            value={`${health.memory.usedMb}MB`}
            sub={`${health.memory.percentUsed}% em uso`}
            status={health.memory.status} />
          <MetricCard icon={Database} label="Database"
            value={health.database.latencyMs ? `${health.database.latencyMs}ms` : '—'}
            sub="Supabase latência" status={health.database.status} />
          <MetricCard icon={Lock} label="Integrações"
            value={`${health.integrations.filter(i => i.status === 'connected').length}/${health.integrations.length}`}
            sub="conectadas" />
          <MetricCard icon={Zap} label="IA"
            value={health.ai.status === 'healthy' ? 'Ativa' : 'Off'}
            sub={health.ai.lastGeneration ? `Último: ${new Date(health.ai.lastGeneration).toLocaleDateString('pt-BR')}` : 'Nenhuma geração'}
            status={health.ai.status} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Integrations */}
        {health && (
          <Card className="bg-[#1A2847] border-white/10 xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-400" /> Status das Integrações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {health.integrations.map(i => (
                  <div key={i.slug} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/5">
                    <StatusIcon status={i.status} />
                    <div>
                      <p className="text-xs font-medium text-white capitalize">{i.slug}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{i.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disk Breakdown */}
        {health && (
          <Card className="bg-[#1A2847] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-amber-400" /> Disco — Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Utilização total</span>
                  <span className="text-white font-medium">{health.disk.percentUsed}%</span>
                </div>
                <ProgressBar value={health.disk.percentUsed} />
              </div>
              <div className="pt-1 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Usado</span><span className="text-white">{health.disk.usedGb} GB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total</span><span className="text-white">{health.disk.totalGb} GB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Status</span><StatusBadge status={health.disk.status} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Customers Grid */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" /> Clientes — Segregação de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CUSTOMER_SLUGS.map(slug => {
              const c = CUSTOMERS[slug]
              return (
                <div key={slug} className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{c.segment}</p>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {['reports','monitoring','incidents','roadmap'].map(d => (
                      <span key={d} className="text-[9px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{d}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* RBAC Roles */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" /> Controle de Acesso — RBAC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {(Object.entries(ROLE_LABELS) as [string, string][]).map(([role, label]) => (
              <div key={role} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs font-semibold text-amber-400">{label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{role}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" /> Log de Auditoria
            </CardTitle>
            <Badge variant="outline" className="border-white/20 text-slate-400 text-xs">
              {auditLogs.length} registros
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Nenhum registro de auditoria encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-slate-400 text-xs">Data</TableHead>
                    <TableHead className="text-slate-400 text-xs">Usuário</TableHead>
                    <TableHead className="text-slate-400 text-xs">Ação</TableHead>
                    <TableHead className="text-slate-400 text-xs">Recurso</TableHead>
                    <TableHead className="text-slate-400 text-xs">Resultado</TableHead>
                    <TableHead className="text-slate-400 text-xs">Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map(log => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {log.userEmail ?? log.userId ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-amber-400">{log.action}</TableCell>
                      <TableCell className="text-xs text-slate-400">{log.resource}</TableCell>
                      <TableCell>
                        <StatusBadge status={log.result === 'success' ? 'healthy' : log.result === 'denied' ? 'disconnected' : 'critical'} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{log.origin}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-slate-600 py-2">
        Vault Leonardo CS Cockpit v1.0 · AES-256-GCM · RBAC · Audit · Supabase RLS
      </div>
    </div>
  )
}
