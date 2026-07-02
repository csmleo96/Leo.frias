'use client'

import { useState } from 'react'
import { Brain, Search, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface AIEntry {
  id: string
  customer: string
  model: string
  promptType: string
  tokensIn: number
  tokensOut: number
  latencyMs: number
  status: 'success' | 'error'
  generatedAt: string
  reportType: string
}

const MOCK_AI: AIEntry[] = [
  { id: 'ai1', customer: 'ConnectPSP',   model: 'gpt-4o', promptType: 'executivo',  tokensIn: 3200, tokensOut: 1800, latencyMs: 4200, status: 'success', generatedAt: '2026-06-30T08:01:00Z', reportType: 'Relatório Executivo Mensal' },
  { id: 'ai2', customer: 'CSCE',         model: 'gpt-4o', promptType: 'sla',        tokensIn: 2100, tokensOut: 980,  latencyMs: 3100, status: 'success', generatedAt: '2026-06-30T08:06:00Z', reportType: 'Relatório SLA' },
  { id: 'ai3', customer: 'Hospital ABC', model: 'gpt-4o', promptType: 'executivo',  tokensIn: 4100, tokensOut: 2200, latencyMs: 5800, status: 'success', generatedAt: '2026-06-30T08:11:00Z', reportType: 'Relatório Executivo Mensal' },
  { id: 'ai4', customer: 'Ticket Sports',model: 'gpt-4o', promptType: 'tecnico',    tokensIn: 2800, tokensOut: 1500, latencyMs: 3900, status: 'success', generatedAt: '2026-06-29T17:01:00Z', reportType: 'Relatório Técnico' },
  { id: 'ai5', customer: 'Lotus',        model: 'gpt-4o', promptType: 'sla',        tokensIn: 1900, tokensOut: 820,  latencyMs: 2600, status: 'success', generatedAt: '2026-06-29T17:06:00Z', reportType: 'Relatório SLA' },
  { id: 'ai6', customer: 'Hospital ABC', model: 'gpt-4o', promptType: 'incidente',  tokensIn: 1200, tokensOut: 680,  latencyMs: 1900, status: 'error',   generatedAt: '2026-06-28T14:30:00Z', reportType: 'Sumário de Incidente' },
]

function formatTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function AIPage() {
  const [search, setSearch] = useState('')

  const filtered = MOCK_AI.filter(e =>
    !search ||
    e.customer.toLowerCase().includes(search.toLowerCase()) ||
    e.reportType.toLowerCase().includes(search.toLowerCase()) ||
    e.promptType.toLowerCase().includes(search.toLowerCase())
  )

  const totalTokensIn  = MOCK_AI.reduce((s, e) => s + e.tokensIn, 0)
  const totalTokensOut = MOCK_AI.reduce((s, e) => s + e.tokensOut, 0)
  const avgLatency     = Math.round(MOCK_AI.reduce((s, e) => s + e.latencyMs, 0) / MOCK_AI.length)

  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Brain className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">IA — Histórico</h1>
          <p className="text-sm text-slate-400">Gerações de relatórios via OpenAI GPT-4o</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-white">{MOCK_AI.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Gerações Totais</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">{formatTokens(totalTokensIn + totalTokensOut)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Tokens Consumidos</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-white">{(avgLatency / 1000).toFixed(1)}s</p>
            <p className="text-xs text-slate-400 mt-0.5">Latência Média</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-400">{MOCK_AI.filter(e => e.status === 'success').length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Bem-sucedidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Token breakdown */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-400" /> Consumo por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['ConnectPSP', 'CSCE', 'Hospital ABC', 'Ticket Sports', 'Lotus'].map(customer => {
              const entries = MOCK_AI.filter(e => e.customer === customer)
              const tokens = entries.reduce((s, e) => s + e.tokensIn + e.tokensOut, 0)
              const pct = Math.round((tokens / (totalTokensIn + totalTokensOut)) * 100)
              return (
                <div key={customer}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{customer}</span>
                    <span className="text-slate-400">{formatTokens(tokens)} tokens ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input type="text" placeholder="Buscar por cliente, tipo ou relatório..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#1A2847] border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50" />
      </div>

      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white">Histórico de Gerações</CardTitle>
            <Badge variant="outline" className="border-white/20 text-slate-400 text-xs">{filtered.length} eventos</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400 text-xs">Data</TableHead>
                  <TableHead className="text-slate-400 text-xs">Cliente</TableHead>
                  <TableHead className="text-slate-400 text-xs">Tipo de Relatório</TableHead>
                  <TableHead className="text-slate-400 text-xs">Modelo</TableHead>
                  <TableHead className="text-slate-400 text-xs">Tokens In</TableHead>
                  <TableHead className="text-slate-400 text-xs">Tokens Out</TableHead>
                  <TableHead className="text-slate-400 text-xs">Latência</TableHead>
                  <TableHead className="text-slate-400 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(e.generatedAt).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs text-white font-medium">{e.customer}</TableCell>
                    <TableCell className="text-xs text-slate-300">{e.reportType}</TableCell>
                    <TableCell className="text-xs text-amber-400 font-mono">{e.model}</TableCell>
                    <TableCell className="text-xs text-slate-400">{formatTokens(e.tokensIn)}</TableCell>
                    <TableCell className="text-xs text-slate-400">{formatTokens(e.tokensOut)}</TableCell>
                    <TableCell className="text-xs text-slate-400">{(e.latencyMs / 1000).toFixed(1)}s</TableCell>
                    <TableCell>
                      {e.status === 'success'
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <XCircle className="h-4 w-4 text-red-500" />
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
