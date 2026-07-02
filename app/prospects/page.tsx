'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Stage = 'lead' | 'contato' | 'proposta' | 'negociacao' | 'fechado' | 'perdido'

interface Prospect { id: string; name: string; email: string | null; phone: string | null; company: string | null; stage: Stage; value: number | null; notes: string | null; created_at: string }

const stageLabel: Record<Stage, string> = { lead: 'Lead', contato: 'Contato', proposta: 'Proposta', negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido' }
const stageColor: Record<Stage, string> = { lead: '#94a3b8', contato: '#8fbfc2', proposta: '#fbbf24', negociacao: '#fb923c', fechado: '#7dd3a8', perdido: '#f87171' }
const stages: Stage[] = ['lead', 'contato', 'proposta', 'negociacao', 'fechado', 'perdido']

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const heading = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

const supabase = createClient()

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState<Stage | 'todos'>('todos')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', stage: 'lead' as Stage, value: '', notes: '' })

  async function load() {
    const { data } = await supabase.from('prospects').select('*').order('created_at', { ascending: false })
    setProspects((data ?? []) as unknown as Prospect[])
    setLoading(false)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const filtered = prospects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.company ?? '').toLowerCase().includes(search.toLowerCase())
    return matchSearch && (filterStage === 'todos' || p.stage === filterStage)
  })

  const pipeline = prospects.filter(p => !['fechado', 'perdido'].includes(p.stage)).reduce((s, p) => s + Number(p.value ?? 0), 0)
  const fechados = prospects.filter(p => p.stage === 'fechado').length

  async function addProspect() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('prospects').insert({
      name: form.name, email: form.email || null, phone: form.phone || null,
      company: form.company || null, stage: form.stage,
      value: form.value ? parseFloat(form.value) : null,
      notes: form.notes || null,
    }).select().single()
    if (data) setProspects(prev => [data as unknown as Prospect, ...prev])
    setForm({ name: '', email: '', phone: '', company: '', stage: 'lead', value: '', notes: '' })
    setOpen(false)
    setSaving(false)
  }

  async function deleteProspect(id: string) {
    await supabase.from('prospects').delete().eq('id', id)
    setProspects(prev => prev.filter(p => p.id !== id))
  }

  async function changeStage(p: Prospect, stage: Stage) {
    await supabase.from('prospects').update({ stage }).eq('id', p.id)
    setProspects(prev => prev.map(x => x.id === p.id ? { ...x, stage } : x))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold" style={{ ...heading, color: '#f3fafa' }}>Prospects</h2>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            Pipeline · {fmt(pipeline)} em aberto · {fechados} fechados
          </p>
        </div>
        <Button onClick={() => setOpen(true)} style={{ background: T, color: '#0a1316', fontWeight: 600 }}>
          <Plus size={16} className="mr-2" /> Novo Prospect
        </Button>
      </div>

      {/* Stage summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {stages.map(s => {
          const count = prospects.filter(p => p.stage === s).length
          return (
            <div key={s} className="rounded-xl p-3 text-center cursor-pointer transition-all"
              style={{ background: CARD, border: `1px solid ${filterStage === s ? stageColor[s] + '40' : BORDER}` }}
              onClick={() => setFilterStage(filterStage === s ? 'todos' : s)}>
              <p className="text-lg font-bold" style={{ color: stageColor[s] }}>{count}</p>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{stageLabel[s]}</p>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
          <Input className="pl-9" placeholder="Buscar por nome ou empresa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filterStage !== 'todos' && (
          <button onClick={() => setFilterStage('todos')} className="text-xs px-3 py-2 rounded-lg"
            style={{ background: CARD, color: MUTED, border: `1px solid ${BORDER}` }}>
            Limpar filtro ×
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: T }} /></div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm" style={{ color: MUTED }}>Nenhum prospect encontrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
                <tr>
                  {['Nome', 'Empresa', 'Etapa', 'Valor', 'Notas', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(243,250,250,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: i > 0 ? `1px solid rgba(143,191,194,0.05)` : 'none' }}
                    className="hover:bg-white/[0.015] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: '#f3fafa' }}>{p.name}</p>
                      {p.email && <p className="text-xs mt-0.5" style={{ color: MUTED }}>{p.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: MUTED }}>{p.company ?? '—'}</td>
                    <td className="px-4 py-3">
                      <select value={p.stage} onChange={e => changeStage(p, e.target.value as Stage)}
                        className="text-xs px-2 py-1 rounded-lg border-none outline-none cursor-pointer"
                        style={{ background: `${stageColor[p.stage]}15`, color: stageColor[p.stage] }}>
                        {stages.map(s => <option key={s} value={s}>{stageLabel[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#fb923c' }}>
                      {p.value ? fmt(Number(p.value)) : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs truncate" style={{ color: MUTED }}>{p.notes ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteProspect(p.id)} className="opacity-30 hover:opacity-100 hover:text-red-400 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Prospect</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nome *</Label><Input placeholder="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="email@..." value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Empresa</Label><Input placeholder="Empresa" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Valor (R$)</Label><Input type="number" placeholder="0,00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as Stage }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{stages.map(s => <SelectItem key={s} value={s}>{stageLabel[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Notas</Label><Input placeholder="Observações..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={addProspect} disabled={saving} style={{ background: T, color: '#0a1316' }}>
              {saving && <Loader2 size={14} className="mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
