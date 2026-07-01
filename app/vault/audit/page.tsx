'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, RefreshCw, Search, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AuditLog } from '@/types/vault'

function StatusBadge({ result }: { result: string }) {
  const map: Record<string, string> = {
    success: 'bg-green-500/10 text-green-400 border-green-500/30',
    denied:  'bg-amber-500/10 text-amber-400 border-amber-500/30',
    error:   'bg-red-500/10 text-red-400 border-red-500/30',
  }
  const cls = map[result] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/30'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {result}
    </span>
  )
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const limit = 50

  async function load(offset = 0) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vault/audit?limit=${limit}&offset=${offset}`)
      const json = await res.json()
      setLogs(json.logs ?? [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page * limit) }, [page])

  const filtered = logs.filter(l =>
    !search ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.resource.toLowerCase().includes(search.toLowerCase()) ||
    (l.userEmail ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <ClipboardList className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Auditoria</h1>
            <p className="text-sm text-slate-400">Registro imutável de todas as ações no Vault</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:text-white"
          onClick={() => load(page * limit)} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Eventos', value: logs.length },
          { label: 'Sucesso', value: logs.filter(l => l.result === 'success').length },
          { label: 'Negados / Erros', value: logs.filter(l => l.result !== 'success').length },
        ].map(s => (
          <Card key={s.label} className="bg-[#1A2847] border-white/10">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text" placeholder="Buscar por ação, recurso ou usuário..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#1A2847] border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Filter className="h-4 w-4 text-amber-400" /> Log de Eventos
            </CardTitle>
            <Badge variant="outline" className="border-white/20 text-slate-400 text-xs">
              {filtered.length} registros
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 && !loading ? (
            <p className="text-sm text-slate-500 text-center py-12">
              {logs.length === 0 ? 'Nenhum registro ainda.' : 'Nenhum resultado para o filtro.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-slate-400 text-xs">Data / Hora</TableHead>
                    <TableHead className="text-slate-400 text-xs">Usuário</TableHead>
                    <TableHead className="text-slate-400 text-xs">Role</TableHead>
                    <TableHead className="text-slate-400 text-xs">Ação</TableHead>
                    <TableHead className="text-slate-400 text-xs">Recurso</TableHead>
                    <TableHead className="text-slate-400 text-xs">Resultado</TableHead>
                    <TableHead className="text-slate-400 text-xs">IP / Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(log => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{log.userEmail ?? log.userId ?? '—'}</TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">—</TableCell>
                      <TableCell className="text-xs font-mono text-amber-400">{log.action}</TableCell>
                      <TableCell className="text-xs text-slate-400">{log.resource}</TableCell>
                      <TableCell><StatusBadge result={log.result} /></TableCell>
                      <TableCell className="text-xs text-slate-500">{log.ip ?? log.origin ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Página {page + 1}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-white/10 text-slate-300"
            disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <Button size="sm" variant="outline" className="border-white/10 text-slate-300"
            disabled={logs.length < limit} onClick={() => setPage(p => p + 1)}>
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
