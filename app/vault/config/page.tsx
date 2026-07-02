'use client'

import { useEffect, useState } from 'react'
import { Wrench, RefreshCw, Save, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { VaultConfig } from '@/types/vault'

interface ConfigData {
  config: VaultConfig | null
  loading: boolean
  saving: boolean
  error: string | null
  saved: boolean
}

function Field({ label, value, onChange, type = 'text', hint }: {
  label: string; value: string | number; onChange: (v: string) => void
  type?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={String(value)}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#111D38] border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
      />
      {hint && <p className="text-[10px] text-slate-600 mt-1">{hint}</p>}
    </div>
  )
}

export default function ConfigPage() {
  const [data, setData] = useState<ConfigData>({
    config: null, loading: true, saving: false, error: null, saved: false
  })

  async function load() {
    setData(d => ({ ...d, loading: true, error: null }))
    try {
      const res = await fetch('/api/vault/config')
      const json = await res.json()
      setData(d => ({ ...d, config: json.config ?? null, loading: false }))
    } catch (e) {
      setData(d => ({ ...d, loading: false, error: String(e) }))
    }
  }

  async function save() {
    if (!data.config) return
    setData(d => ({ ...d, saving: true, error: null, saved: false }))
    try {
      const res = await fetch('/api/vault/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.config),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(d => ({ ...d, saving: false, saved: true }))
      setTimeout(() => setData(d => ({ ...d, saved: false })), 3000)
    } catch (e) {
      setData(d => ({ ...d, saving: false, error: String(e) }))
    }
  }

  function updateConfig(path: string[], value: unknown) {
    setData(d => {
      if (!d.config) return d
      const config = { ...d.config } as Record<string, unknown>
      // shallow path update for 2 levels
      if (path.length === 1) {
        config[path[0]] = value
      } else if (path.length === 2) {
        const parent = { ...(config[path[0]] as Record<string, unknown>) }
        parent[path[1]] = value
        config[path[0]] = parent
      }
      return { ...d, config: config as unknown as VaultConfig }
    })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const c = data.config

  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Wrench className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Configuração</h1>
            <p className="text-sm text-slate-400">Ajustes do Vault · vault/config/vault.config.json</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.saved && (
            <span className="text-xs text-green-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Salvo com sucesso
            </span>
          )}
          <Button size="sm" variant="outline" className="border-white/10 text-slate-300"
            onClick={load} disabled={data.loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${data.loading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={save} disabled={data.saving || !c}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {data.saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {data.error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {data.error}
        </div>
      )}

      {data.loading && !c ? (
        <div className="text-center py-20 text-slate-500">Carregando configuração...</div>
      ) : !c ? (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          Configuração não encontrada. Verifique se o arquivo vault/config/vault.config.json existe.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Reports */}
          <Card className="bg-[#1A2847] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white">Agendamento de Relatórios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Cron — Diário" value={c.reports?.schedules?.daily ?? ''}
                onChange={v => updateConfig(['reports', 'schedules'], { ...(c.reports?.schedules ?? {}), daily: v })}
                hint="Ex: 0 8 * * *" />
              <Field label="Cron — Semanal" value={c.reports?.schedules?.weekly ?? ''}
                onChange={v => updateConfig(['reports', 'schedules'], { ...(c.reports?.schedules ?? {}), weekly: v })} />
              <Field label="Cron — Mensal" value={c.reports?.schedules?.monthly ?? ''}
                onChange={v => updateConfig(['reports', 'schedules'], { ...(c.reports?.schedules ?? {}), monthly: v })} />
            </CardContent>
          </Card>

          {/* AI */}
          <Card className="bg-[#1A2847] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white">Configuração de IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Modelo OpenAI" value={c.ai?.model ?? 'gpt-4o'}
                onChange={v => updateConfig(['ai'], { ...(c.ai ?? {}), model: v })} />
              <Field label="Max Tokens por Relatório" type="number" value={c.ai?.maxTokensPerReport ?? 4096}
                onChange={v => updateConfig(['ai'], { ...(c.ai ?? {}), maxTokensPerReport: Number(v) })} />
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card className="bg-[#1A2847] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white">Destinatários de Relatórios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="E-mails (separados por vírgula)"
                value={(c.reports?.recipients ?? []).join(', ')}
                onChange={v => updateConfig(['reports'], { ...(c.reports ?? {}), recipients: v.split(',').map(s => s.trim()).filter(Boolean) })} />
            </CardContent>
          </Card>

          {/* Backup */}
          <Card className="bg-[#1A2847] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white">Retenção de Backups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Backups Diários (dias)" type="number"
                value={c.backups?.retentionDays?.daily ?? 30}
                onChange={v => updateConfig(['backups', 'retentionDays'], { ...(c.backups?.retentionDays ?? {}), daily: Number(v) })} />
              <Field label="Backups Semanais (dias)" type="number"
                value={c.backups?.retentionDays?.weekly ?? 90}
                onChange={v => updateConfig(['backups', 'retentionDays'], { ...(c.backups?.retentionDays ?? {}), weekly: Number(v) })} />
              <Field label="Backups Mensais (dias)" type="number"
                value={c.backups?.retentionDays?.monthly ?? 365}
                onChange={v => updateConfig(['backups', 'retentionDays'], { ...(c.backups?.retentionDays ?? {}), monthly: Number(v) })} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
