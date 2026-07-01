'use client'

import { useState } from 'react'
import { FileText, Download, Eye, Search, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ReportItem {
  id: string
  customer: string
  type: 'executivo' | 'tecnico' | 'sla' | 'incidente'
  period: string
  generatedAt: string
  sizeKb: number
  status: 'ready' | 'generating' | 'error'
}

const MOCK_REPORTS: ReportItem[] = [
  { id: 'r1',  customer: 'ConnectPSP',   type: 'executivo', period: 'Jun/2026', generatedAt: '2026-06-30T08:00:00Z', sizeKb: 412, status: 'ready' },
  { id: 'r2',  customer: 'CSCE',         type: 'sla',       period: 'Jun/2026', generatedAt: '2026-06-30T08:05:00Z', sizeKb: 188, status: 'ready' },
  { id: 'r3',  customer: 'Hospital ABC', type: 'executivo', period: 'Jun/2026', generatedAt: '2026-06-30T08:10:00Z', sizeKb: 520, status: 'ready' },
  { id: 'r4',  customer: 'Ticket Sports',type: 'tecnico',   period: 'Jun/2026', generatedAt: '2026-06-29T17:00:00Z', sizeKb: 290, status: 'ready' },
  { id: 'r5',  customer: 'Lotus',        type: 'sla',       period: 'Jun/2026', generatedAt: '2026-06-29T17:05:00Z', sizeKb: 140, status: 'ready' },
  { id: 'r6',  customer: 'ConnectPSP',   type: 'incidente', period: 'Mai/2026', generatedAt: '2026-05-31T08:00:00Z', sizeKb: 88,  status: 'ready' },
  { id: 'r7',  customer: 'Hospital ABC', type: 'executivo', period: 'Mai/2026', generatedAt: '2026-05-31T08:15:00Z', sizeKb: 498, status: 'ready' },
  { id: 'r8',  customer: 'CSCE',         type: 'executivo', period: 'Mai/2026', generatedAt: '2026-05-31T08:20:00Z', sizeKb: 376, status: 'ready' },
]

const TYPE_STYLE: Record<string, string> = {
  executivo: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  tecnico:   'bg-blue-500/10 text-blue-400 border-blue-500/30',
  sla:       'bg-green-500/10 text-green-400 border-green-500/30',
  incidente: 'bg-red-500/10 text-red-400 border-red-500/30',
}

export default function ReportsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('todos')

  const filtered = MOCK_REPORTS.filter(r => {
    const matchSearch = !search ||
      r.customer.toLowerCase().includes(search.toLowerCase()) ||
      r.period.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'todos' || r.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <FileText className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-sm text-slate-400">Histórico de relatórios executivos e técnicos gerados</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: MOCK_REPORTS.length, color: 'text-white' },
          { label: 'Executivos', value: MOCK_REPORTS.filter(r => r.type === 'executivo').length, color: 'text-amber-400' },
          { label: 'SLA', value: MOCK_REPORTS.filter(r => r.type === 'sla').length, color: 'text-green-400' },
          { label: 'Incidentes', value: MOCK_REPORTS.filter(r => r.type === 'incidente').length, color: 'text-red-400' },
        ].map(s => (
          <Card key={s.label} className="bg-[#1A2847] border-white/10">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input type="text" placeholder="Buscar por cliente ou período..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#1A2847] border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50" />
        </div>
        <div className="flex gap-1.5">
          {['todos', 'executivo', 'tecnico', 'sla', 'incidente'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 border border-white/10 hover:text-white hover:bg-white/5'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white">Biblioteca de Relatórios</CardTitle>
            <Badge variant="outline" className="border-white/20 text-slate-400 text-xs">
              {filtered.length} relatórios
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400 text-xs">Cliente</TableHead>
                  <TableHead className="text-slate-400 text-xs">Tipo</TableHead>
                  <TableHead className="text-slate-400 text-xs">Período</TableHead>
                  <TableHead className="text-slate-400 text-xs">Gerado em</TableHead>
                  <TableHead className="text-slate-400 text-xs">Tamanho</TableHead>
                  <TableHead className="text-slate-400 text-xs">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="text-sm text-white font-medium">{r.customer}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_STYLE[r.type]}`}>
                        {r.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-slate-500" />{r.period}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(r.generatedAt).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{r.sizeKb} KB</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400 hover:text-white">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400 hover:text-amber-400">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
