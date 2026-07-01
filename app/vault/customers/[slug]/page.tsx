'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FolderOpen, FileText, Activity, AlertTriangle,
  ChevronLeft, RefreshCw, HardDrive, Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CUSTOMERS } from '@/lib/vault/constants'
import type { CustomerSlug, VaultFile } from '@/types/vault'

interface CustomerData {
  files: VaultFile[]
  totalSize: number
  loading: boolean
  error: string | null
}

const DIRECTORIES = ['reports', 'monitoring', 'incidents', 'roadmap', 'integrations', 'notes', 'exports']

export default function CustomerDetailPage() {
  const params = useParams()
  const slug = params.slug as CustomerSlug
  const customer = CUSTOMERS[slug]

  const [data, setData] = useState<CustomerData>({ files: [], totalSize: 0, loading: true, error: null })
  const [activeDir, setActiveDir] = useState('reports')

  async function load() {
    setData(d => ({ ...d, loading: true, error: null }))
    try {
      const res = await fetch(`/api/vault/customers/${slug}`)
      const json = await res.json()
      setData({
        files:     json.files      ?? [],
        totalSize: json.totalSize  ?? 0,
        loading:   false,
        error:     null,
      })
    } catch (e) {
      setData(d => ({ ...d, loading: false, error: String(e) }))
    }
  }

  useEffect(() => { if (slug) load() }, [slug])

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#111D38] text-white p-6 flex items-center justify-center">
        <p className="text-slate-400">Cliente não encontrado: <span className="text-amber-400">{slug}</span></p>
      </div>
    )
  }

  const dirFiles = data.files.filter(f => f.path.includes(`/${activeDir}/`))

  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/vault/customers"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <FolderOpen className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
            <p className="text-sm text-slate-400">{customer.segment} · /vault/customers/{slug}/</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:text-white"
          onClick={load} disabled={data.loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${data.loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {data.error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{data.error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-white">{data.files.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Arquivos</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-white">{(data.totalSize / 1024 / 1024).toFixed(1)} MB</p>
            <p className="text-xs text-slate-400 mt-0.5">Tamanho Total</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-white">{DIRECTORIES.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Diretórios</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">AES-256</p>
            <p className="text-xs text-slate-400 mt-0.5">Criptografia</p>
          </CardContent>
        </Card>
      </div>

      {/* Directory browser */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-amber-400" /> Explorador de Arquivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Dir tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {DIRECTORIES.map(dir => (
              <button key={dir} onClick={() => setActiveDir(dir)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeDir === dir
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 border border-white/10 hover:text-white hover:bg-white/5'
                }`}>
                {dir}
              </button>
            ))}
          </div>

          {dirFiles.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <FolderOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>Nenhum arquivo em <span className="font-mono text-amber-400">{activeDir}/</span></p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400 text-xs">Nome</TableHead>
                  <TableHead className="text-slate-400 text-xs">Tamanho</TableHead>
                  <TableHead className="text-slate-400 text-xs">Modificado</TableHead>
                  <TableHead className="text-slate-400 text-xs">Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dirFiles.map(f => (
                  <TableRow key={f.path} className="border-white/5 hover:bg-white/5">
                    <TableCell className="text-xs text-white font-mono">{f.name}</TableCell>
                    <TableCell className="text-xs text-slate-400">{(f.sizeBytes / 1024).toFixed(1)} KB</TableCell>
                    <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(f.modifiedAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px]">
                        {f.encrypted ? 'enc' : 'plain'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
