'use client'

import Link from 'next/link'
import { Building2, FolderOpen, FileText, Activity, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CUSTOMERS, CUSTOMER_SLUGS } from '@/lib/vault/constants'

const CUSTOMER_META: Record<string, { color: string; status: string; reports: number; incidents: number }> = {
  connectpsp:   { color: '#3B82F6', status: 'Atenção',  reports: 12, incidents: 3 },
  csce:         { color: '#10B981', status: 'Saudável', reports: 8,  incidents: 0 },
  hospitalabc:  { color: '#F59E0B', status: 'Crítico',  reports: 15, incidents: 5 },
  ticketsports: { color: '#8B5CF6', status: 'Saudável', reports: 6,  incidents: 1 },
  lotus:        { color: '#EC4899', status: 'Saudável', reports: 4,  incidents: 0 },
}

const STATUS_STYLE: Record<string, string> = {
  'Saudável': 'bg-green-500/10 text-green-400 border-green-500/30',
  'Atenção':  'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Crítico':  'bg-red-500/10 text-red-400 border-red-500/30',
}

export default function CustomersPage() {
  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Building2 className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-slate-400">Dados segregados por cliente · Vault Leonardo CS Cockpit</p>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-white">{CUSTOMER_SLUGS.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total de Clientes</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-green-400">
              {Object.values(CUSTOMER_META).filter(m => m.status === 'Saudável').length}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Saudáveis</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2847] border-white/10">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-amber-400">
              {Object.values(CUSTOMER_META).reduce((s, m) => s + m.incidents, 0)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Incidentes Abertos</p>
          </CardContent>
        </Card>
      </div>

      {/* Client cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CUSTOMER_SLUGS.map(slug => {
          const c = CUSTOMERS[slug]
          const m = CUSTOMER_META[slug]
          return (
            <Link key={slug} href={`/vault/customers/${slug}`} style={{ textDecoration: 'none' }}>
              <Card className="bg-[#1A2847] border-white/10 hover:border-white/20 transition-all cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ background: `${m.color}20`, border: `1px solid ${m.color}40` }}>
                        <FolderOpen className="h-5 w-5" style={{ color: m.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-base text-white group-hover:text-amber-400 transition-colors">
                          {c.name}
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">{c.segment}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[m.status]}`}>
                      {m.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <FileText className="h-3 w-3" />
                      <span>{m.reports} relatórios</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Activity className="h-3 w-3" />
                      <span>Monitoramento</span>
                    </div>
                    {m.incidents > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{m.incidents} incidentes</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {['reports', 'monitoring', 'incidents', 'roadmap', 'integrations'].map(d => (
                      <span key={d} className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                        {d}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
