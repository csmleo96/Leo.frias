'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Client, ClientStatus } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const avatarPalette = [
  { bg: 'oklch(0.8 0.13 186 / 15%)', color: 'oklch(0.8 0.13 186)', border: 'oklch(0.8 0.13 186 / 30%)' },
  { bg: 'oklch(0.7 0.18 280 / 15%)', color: 'oklch(0.7 0.18 280)', border: 'oklch(0.7 0.18 280 / 30%)' },
  { bg: 'oklch(0.75 0.15 160 / 15%)', color: 'oklch(0.75 0.15 160)', border: 'oklch(0.75 0.15 160 / 30%)' },
  { bg: 'oklch(0.75 0.18 55 / 15%)', color: 'oklch(0.75 0.18 55)', border: 'oklch(0.75 0.18 55 / 30%)' },
  { bg: 'oklch(0.7 0.2 340 / 15%)', color: 'oklch(0.7 0.2 340)', border: 'oklch(0.7 0.2 340 / 30%)' },
]

export default function ClientesPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'todos'>('todos')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', status: 'ativo' as ClientStatus })

  async function load() {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase())
    return matchSearch && (filterStatus === 'todos' || c.status === filterStatus)
  })

  async function addClient() {
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    const { data } = await supabase.from('clients').insert({ name: form.name, email: form.email, phone: form.phone || null, company: form.company || null, status: form.status }).select().single()
    if (data) setClients(prev => [data, ...prev])
    setForm({ name: '', email: '', phone: '', company: '', status: 'ativo' })
    setOpen(false)
    setSaving(false)
  }

  async function deleteClient(id: string) {
    await supabase.from('clients').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  async function toggleStatus(client: Client) {
    const next: ClientStatus = client.status === 'ativo' ? 'inativo' : 'ativo'
    await supabase.from('clients').update({ status: next }).eq('id', client.id)
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: next } : c))
  }

  const ativos = clients.filter(c => c.status === 'ativo').length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Clientes</h2>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.56 0.02 230)' }}>
            {ativos} ativos · {clients.length - ativos} inativos
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2" style={{ background: 'oklch(0.8 0.13 186)', color: 'oklch(0.11 0.02 250)' }}>
          <Plus size={16} /> Novo Cliente
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'oklch(0.45 0.02 230)' }} />
          <Input className="pl-9" placeholder="Buscar por nome, email ou empresa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {(['todos', 'ativo', 'inativo'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={filterStatus === s
              ? { background: 'oklch(0.8 0.13 186 / 15%)', color: 'oklch(0.8 0.13 186)', border: '1px solid oklch(0.8 0.13 186 / 30%)' }
              : { background: 'oklch(0.15 0.02 250)', color: 'oklch(0.56 0.02 230)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            {s === 'todos' ? 'Todos' : s === 'ativo' ? 'Ativos' : 'Inativos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color: 'oklch(0.8 0.13 186)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-10 text-center text-sm"
          style={{ background: 'oklch(0.15 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.45 0.02 230)' }}>
          Nenhum cliente encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client, i) => {
            const pal = avatarPalette[i % avatarPalette.length]
            return (
              <div key={client.id} className="rounded-xl p-5 transition-all"
                style={{ background: 'oklch(0.15 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: pal.bg, color: pal.color, border: `1px solid ${pal.border}` }}>
                      {initials(client.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{client.name}</p>
                      <p className="text-xs" style={{ color: 'oklch(0.45 0.02 230)' }}>{client.company || '—'}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleStatus(client)}
                    className="text-xs px-2 py-0.5 rounded-full font-medium transition-all"
                    style={client.status === 'ativo'
                      ? { background: 'oklch(0.75 0.15 160 / 15%)', color: 'oklch(0.75 0.15 160)', border: '1px solid oklch(0.75 0.15 160 / 30%)' }
                      : { background: 'oklch(0.4 0.02 230 / 20%)', color: 'oklch(0.56 0.02 230)', border: '1px solid oklch(1 0 0 / 10%)' }}>
                    {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-xs" style={{ color: 'oklch(0.56 0.02 230)' }}>{client.email}</p>
                  {client.phone && <p className="text-xs" style={{ color: 'oklch(0.56 0.02 230)' }}>{client.phone}</p>}
                </div>
                <div className="flex justify-end mt-4 pt-3" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
                  <button onClick={() => deleteClient(client.id)} className="opacity-40 hover:opacity-100 hover:text-red-400 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ClientStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Input placeholder="Nome da empresa" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={addClient} disabled={saving}>
              {saving && <Loader2 size={14} className="mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
