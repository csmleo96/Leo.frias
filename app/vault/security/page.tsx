'use client'

import { Lock, Shield, CheckCircle, AlertTriangle, Key, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLE_PERMISSIONS, ROLE_LABELS } from '@/lib/vault/constants'
import type { VaultRole, VaultPermission } from '@/types/vault'

const PERM_CATEGORIES: { label: string; perms: VaultPermission[] }[] = [
  { label: 'Relatórios',    perms: ['reports.read', 'reports.write'] },
  { label: 'Clientes',      perms: ['customers.read', 'customers.write'] },
  { label: 'Integrações',   perms: ['integrations.read', 'integrations.write'] },
  { label: 'Auditoria / Logs', perms: ['audit.read', 'logs.read'] },
  { label: 'Backups',       perms: ['backups.read', 'backups.write'] },
  { label: 'Secrets',       perms: ['secrets.read', 'secrets.write'] },
  { label: 'IA',            perms: ['ai.read', 'ai.write'] },
  { label: 'Configuração',  perms: ['config.read', 'config.write'] },
  { label: 'Segurança',     perms: ['security.read', 'security.write'] },
  { label: 'Monitoramento', perms: ['monitoring.read'] },
]

const ROLES: VaultRole[] = ['admin', 'director', 'customer_success', 'operations', 'engineering', 'viewer']

const ROLE_COLORS: Record<VaultRole, string> = {
  admin:            '#EF4444',
  director:         '#F59E0B',
  customer_success: '#10B981',
  operations:       '#3B82F6',
  engineering:      '#8B5CF6',
  viewer:           '#6B7280',
}

export default function SecurityPage() {
  const securityChecks = [
    { label: 'Criptografia AES-256-GCM', ok: true },
    { label: 'Chave derivada via SHA-256 + env var', ok: true },
    { label: 'IV aleatório por operação (12 bytes)', ok: true },
    { label: 'GCM Auth Tag (16 bytes) — anti-tamper', ok: true },
    { label: 'RBAC com 6 papéis', ok: true },
    { label: 'Auditoria de todas as ações', ok: true },
    { label: 'Row Level Security no Supabase', ok: true },
    { label: 'Segredos exclusivamente em .env.local', ok: true },
    { label: 'Headers de segurança (CSP, HSTS, X-Frame)', ok: true },
    { label: 'Vault routes sem cache (no-store)', ok: true },
    { label: 'Backup automático (daily/weekly/monthly)', ok: true },
    { label: 'VAULT_ENCRYPTION_KEY configurada', ok: false },
  ]

  return (
    <div className="min-h-screen bg-[#111D38] text-white p-6 space-y-6">

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Lock className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Segurança</h1>
          <p className="text-sm text-slate-400">RBAC, criptografia e postura de segurança do Vault</p>
        </div>
      </div>

      {/* Security checklist */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-400" /> Checklist de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {securityChecks.map(c => (
              <div key={c.label} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                {c.ok
                  ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                }
                <span className={`text-xs ${c.ok ? 'text-slate-300' : 'text-amber-400'}`}>{c.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              Configure <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">VAULT_ENCRYPTION_KEY</code> no
              <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">.env.local</code> para máxima segurança.
              Sem ela, o sistema deriva a chave de NEXTAUTH_SECRET como fallback.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Encryption info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Key, label: 'Algoritmo', value: 'AES-256-GCM', sub: 'Autenticado — detecta adulteração' },
          { icon: Shield, label: 'IV por operação', value: '12 bytes', sub: 'Aleatório via crypto.randomBytes()' },
          { icon: Lock, label: 'Auth Tag', value: '16 bytes', sub: 'Verificação de integridade GCM' },
        ].map(({ icon: Icon, label, value, sub }) => (
          <Card key={label} className="bg-[#1A2847] border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
              <p className="text-xl font-bold text-white font-mono">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* RBAC Matrix */}
      <Card className="bg-[#1A2847] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" /> Matriz de Permissões — RBAC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-slate-400 font-medium py-2 pr-4 w-40">Permissão</th>
                  {ROLES.map(role => (
                    <th key={role} className="text-center py-2 px-3">
                      <div className="text-[10px] font-semibold whitespace-nowrap" style={{ color: ROLE_COLORS[role] }}>
                        {ROLE_LABELS[role]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM_CATEGORIES.map(cat => (
                  <>
                    <tr key={`cat-${cat.label}`}>
                      <td colSpan={ROLES.length + 1} className="py-2 pt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {cat.label}
                      </td>
                    </tr>
                    {cat.perms.map(perm => (
                      <tr key={perm} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-1.5 pr-4 text-slate-400 font-mono">{perm}</td>
                        {ROLES.map(role => {
                          const hasPerm = ROLE_PERMISSIONS[role]?.includes(perm)
                          return (
                            <td key={role} className="text-center py-1.5 px-3">
                              {hasPerm
                                ? <span className="inline-block w-4 h-4 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] leading-4">✓</span>
                                : <span className="inline-block w-4 h-4 rounded-full bg-white/5 text-slate-700 text-[10px] leading-4">—</span>
                              }
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
