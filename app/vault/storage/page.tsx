'use client'

import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw, HardDrive, Folder } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { StorageUsage } from '@/types/vault'

interface StorageData {
  usage: StorageUsage | null
  loading: boolean
  error: string | null
}

const DIR_COLORS: Record<string, string> = {
  'customers/connectpsp':   '#3B82F6',
  'customers/csce':         '#10B981',
  'customers/hospitalabc':  '#F59E0B',
  'customers/ticketsports': '#8B5CF6',
  'customers/lotus':        '#EC4899',
  'reports':     '#06B6D4',
  'backups':     '#6366F1',
  'logs':        '#6B7280',
  'exports':     '#84CC16',
  'temp':        '#9CA3AF',
  'config':      '#F97316',
  'integrations':'#A78BFA',
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function StoragePage() {
  const [data, setData] = useState<StorageData>({ usage: null, loading: true, error: null })

  async function load() {
    setData(d => ({ ...d, loading: true, error: null }))
    try {
      const res = await fetch('/api/vault/storage')
      const json = await res.json()
      setData({ usage: json.usage ?? null, loading: false, error: null })
    } catch (e) {
      setData(d => ({ ...d, loading: false, error: String(e) }))
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const { usage, loading, error } = data
  const totalBytes = (usage?.totalGb ?? 0) * 1024 * 1024 * 1024
  const dirs = usage?.breakdown ?? {}

  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <BarChart3 className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Storage</h1>
            <p className="text-sm text-slate-400">Uso de disco por diretório no Vault</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:text-white"
          onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Total */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-medium text-white">Uso Total do Vault</span>
            </div>
            <span className="text-2xl font-bold text-white">{formatBytes(totalBytes)}</span>
          </div>
          <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
            {Object.entries(dirs).map(([dir, bytes], _i) => {
              const pct = totalBytes > 0 ? (bytes / totalBytes) * 100 : 0
              const color = DIR_COLORS[dir] ?? '#6B7280'
              return pct > 0.5 ? (
                <div key={dir} className="h-full transition-all" title={`${dir}: ${formatBytes(bytes)}`}
                  style={{ width: `${pct}%`, background: color }} />
              ) : null
            })}
          </div>
        </CardContent>
      </Card>

      {/* Directory breakdown */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Folder className="h-4 w-4 text-amber-400" /> Por Diretório
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(dirs).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">
              {loading ? 'Carregando...' : 'Nenhum dado de storage disponível.'}
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(dirs)
                .sort(([, a], [, b]) => b - a)
                .map(([dir, bytes]) => {
                  const pct = totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0
                  const color = DIR_COLORS[dir] ?? '#6B7280'
                  return (
                    <div key={dir}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-xs font-mono text-slate-300">{dir}/</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500">{pct}%</span>
                          <span className="text-white font-medium w-20 text-right">{formatBytes(bytes)}</span>
                        </div>
                      </div>
                      <ProgressBar value={bytes} max={totalBytes} color={color} />
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
