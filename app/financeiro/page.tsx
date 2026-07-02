'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, TransactionType } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function FinanceiroPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TransactionType | 'todas'>('todas')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', type: 'receita' as TransactionType, category: '', date: '' })

  async function load() {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    setTransactions(data ?? [])
    setLoading(false)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const receitas = transactions.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
  const despesas = transactions.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
  const saldo = receitas - despesas
  const filtered = filter === 'todas' ? transactions : transactions.filter(t => t.type === filter)

  async function addTransaction() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    const { data } = await supabase.from('transactions').insert({
      description: form.description, amount: parseFloat(form.amount), type: form.type,
      category: form.category || 'Geral', date: form.date || new Date().toISOString().split('T')[0],
    }).select().single()
    if (data) setTransactions(prev => [data, ...prev])
    setForm({ description: '', amount: '', type: 'receita', category: '', date: '' })
    setOpen(false)
    setSaving(false)
  }

  async function deleteTransaction(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Financeiro</h2>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.56 0.02 230)' }}>{transactions.length} transações registradas</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2" style={{ background: 'oklch(0.8 0.13 186)', color: 'oklch(0.11 0.02 250)' }}>
          <Plus size={16} /> Nova Transação
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Receitas', value: receitas, icon: TrendingUp, color: 'oklch(0.75 0.15 160)' },
          { label: 'Despesas', value: despesas, icon: TrendingDown, color: 'oklch(0.65 0.22 27)' },
          { label: 'Saldo', value: saldo, icon: Wallet, color: saldo >= 0 ? 'oklch(0.8 0.13 186)' : 'oklch(0.65 0.22 27)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-5"
            style={{ background: 'oklch(0.15 0.02 250)', border: `1px solid ${color}25` }}>
            <div className="flex items-center gap-2 mb-3">
              <Icon size={16} style={{ color }} />
              <span className="text-sm" style={{ color: 'oklch(0.56 0.02 230)' }}>{label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color }}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {([['todas', 'Todas'], ['receita', 'Receitas'], ['despesa', 'Despesas']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={filter === key
              ? { background: 'oklch(0.8 0.13 186 / 15%)', color: 'oklch(0.8 0.13 186)', border: '1px solid oklch(0.8 0.13 186 / 30%)' }
              : { background: 'oklch(0.15 0.02 250)', color: 'oklch(0.56 0.02 230)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'oklch(0.15 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)' }}>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: 'oklch(0.8 0.13 186)' }} /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: 'oklch(0.45 0.02 230)' }}>Nenhuma transação encontrada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
              <tr>
                {['Descrição', 'Categoria', 'Data', 'Tipo', 'Valor', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'oklch(0.45 0.02 230)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} style={{ borderTop: i > 0 ? '1px solid oklch(1 0 0 / 5%)' : 'none' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {t.type === 'receita'
                        ? <TrendingUp size={13} style={{ color: 'oklch(0.75 0.15 160)' }} />
                        : <TrendingDown size={13} style={{ color: 'oklch(0.65 0.22 27)' }} />}
                      <span className="font-medium text-white">{t.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'oklch(0.56 0.02 230)' }}>{t.category}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'oklch(0.56 0.02 230)' }}>
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={t.type === 'receita'
                        ? { background: 'oklch(0.75 0.15 160 / 15%)', color: 'oklch(0.75 0.15 160)', border: '1px solid oklch(0.75 0.15 160 / 25%)' }
                        : { background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.65 0.22 27)', border: '1px solid oklch(0.65 0.22 27 / 25%)' }}>
                      {t.type === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold"
                    style={{ color: t.type === 'receita' ? 'oklch(0.75 0.15 160)' : 'oklch(0.65 0.22 27)' }}>
                    {t.type === 'despesa' ? '- ' : '+ '}{fmt(Number(t.amount))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteTransaction(t.id)} className="opacity-40 hover:opacity-100 hover:text-red-400 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Transação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {(['receita', 'despesa'] as TransactionType[]).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className="flex-1 py-2 rounded-lg text-sm font-medium border transition-all"
                    style={form.type === t
                      ? t === 'receita'
                        ? { background: 'oklch(0.75 0.15 160 / 20%)', borderColor: 'oklch(0.75 0.15 160 / 40%)', color: 'oklch(0.75 0.15 160)' }
                        : { background: 'oklch(0.65 0.22 27 / 20%)', borderColor: 'oklch(0.65 0.22 27 / 40%)', color: 'oklch(0.65 0.22 27)' }
                      : { borderColor: 'oklch(1 0 0 / 10%)', color: 'oklch(0.56 0.02 230)' }}>
                    {t === 'receita' ? 'Receita' : 'Despesa'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input placeholder="Descrição da transação" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input placeholder="Ex: Serviços, Software..." value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={addTransaction} disabled={saving}>
              {saving && <Loader2 size={14} className="mr-2 animate-spin" />} Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
