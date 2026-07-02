'use client'

import { useState } from 'react'
import { HardDrive, Play, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface BackupEntry {
  id: string
  type: 'daily' | 'weekly' | 'monthly'
  filename: string
  sizeKb: number
  createdAt: string
  status: 'ok' | 'failed'
  retention: string
}

const MOCK_BACKUPS: BackupEntry[] = [
  { id: 'b1', type: 'daily',   filename: 'vault-daily-20260630-080000.json.gz',   sizeKb: 128, createdAt: '2026-06-30T08:00:00Z', status: 'ok', retention: '30 dias' },
  { id: 'b2', type: 'daily',   filename: 'vault-daily-20260629-080000.json.gz',   sizeKb: 124, createdAt: '2026-06-29T08:00:00Z', status: 'ok', retention: '30 dias' },
  { id: 'b3', type: 'daily',   filename: 'vault-daily-20260628-080000.json.gz',   sizeKb: 122, createdAt: '2026-06-28T08:00:00Z', status: 'ok', retention: '30 dias' },
  { id: 'b4', type: 'weekly',  filename: 'vault-weekly-20260629-000000.json.gz',  sizeKb: 340, createdAt: '2026-06-29T00:00:00Z', status: 'ok', retention: '90 dias' },
  { id: 'b5', type: 'weekly',  filename: 'vault-weekly-20260622-000000.json.gz',  sizeKb: 328, createdAt: '2026-06-22T00:00:00Z', status: 'ok', retention: '90 dias' },
  { id: 'b6', type: 'monthly', filename: 'vault-monthly-20260601-000000.json.gz', sizeKb: 980, createdAt: '2026-06-01T00:00:00Z', status: 'ok', retention: '365 dias' },
  { id: 'b7', type: 'monthly', filename: 'vault-monthly-20260501-000000.json.gz', sizeKb: 912, createdAt: '2026-05-01T00:00:00Z', status: 'ok', retention: '365 dias' },
]

const TYPE_STYLE: Record<string, string> = {
  daily:   'bg-blue-500/10 text-blue-400 border-blue-500/30',
  weekly:  'bg-purple-500/10 text-purple-400 border-purple-500/30',
  monthly: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
}

export default function BackupsPage() {
  const [filter, setFilter] = useState<string>('todos')
  const [running, setRunning] = useState<string | null>(null)

  function triggerBackup(type: string) {
    setRunning(type)
    setTimeout(() => setRunning(null), 3000)
  }

  const filtered = filter === 'todos' ? MOCK_BACKUPS : MOCK_BACKUPS.filter(b => b.type === filter)

  const totalSizeKb = MOCK_BACKUPS.reduce((s, b) => s + b.sizeKb, 0)

  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <HardDrive className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Backups</h1>
            <p className="text-sm text-slate-400">Snapshots automáticos do Vault · Retenção 30/90/365 dias</p>
          </div>
        </div>
        <div className="flex gap-2">
          {['daily', 'weekly', 'monthly'].map(t => (
            <Button key={t} size="sm" variant="outline"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              disabled={running === t} onClick={() => triggerBackup(t)}>
              {running === t
                ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Play className="h-3.5 w-3.5 mr-1.5" />
              }
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-white">{MOCK_BACKUPS.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total de Backups</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-white">{(totalSizeKb / 1024).toFixed(1)} MB</p>
            <p className="text-xs text-slate-400 mt-0.5">Armazenamento Total</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-400">{MOCK_BACKUPS.filter(b => b.status === 'ok').length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Bem-sucedidos</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">
              {new Date(MOCK_BACKUPS[0].createdAt).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Último Backup</p>
          </CardContent>
        </Card>
      </div>

      {/* Retention policy */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" /> Política de Retenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { type: 'Diário', days: 30, count: MOCK_BACKUPS.filter(b => b.type === 'daily').length, color: '#3B82F6' },
              { type: 'Semanal', days: 90, count: MOCK_BACKUPS.filter(b => b.type === 'weekly').length, color: '#8B5CF6' },
              { type: 'Mensal', days: 365, count: MOCK_BACKUPS.filter(b => b.type === 'monthly').length, color: '#F59E0B' },
            ].map(p => (
              <div key={p.type} className="p-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-sm font-semibold text-white">{p.type}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: p.color }}>{p.days} dias</p>
                <p className="text-xs text-slate-500 mt-1">{p.count} arquivos armazenados</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backup list */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white">Histórico de Backups</CardTitle>
            <div className="flex gap-1.5">
              {['todos', 'daily', 'weekly', 'monthly'].map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    filter === t
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 border border-white/10 hover:text-white'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400 text-xs">Arquivo</TableHead>
                  <TableHead className="text-slate-400 text-xs">Tipo</TableHead>
                  <TableHead className="text-slate-400 text-xs">Tamanho</TableHead>
                  <TableHead className="text-slate-400 text-xs">Criado em</TableHead>
                  <TableHead className="text-slate-400 text-xs">Retenção</TableHead>
                  <TableHead className="text-slate-400 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(b => (
                  <TableRow key={b.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="text-xs text-white font-mono">{b.filename}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_STYLE[b.type]}`}>
                        {b.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{b.sizeKb} KB</TableCell>
                    <TableCell className="text-xs text-slate-400">{new Date(b.createdAt).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-xs text-slate-400">{b.retention}</TableCell>
                    <TableCell>
                      {b.status === 'ok'
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <AlertTriangle className="h-4 w-4 text-red-500" />
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
