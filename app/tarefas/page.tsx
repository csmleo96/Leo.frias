'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, Clock, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus, TaskPriority } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const statusLabel: Record<TaskStatus, string> = { pendente: 'Pendente', em_andamento: 'Em Andamento', concluida: 'Concluída' }
const priorityLabel: Record<TaskPriority, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }
const priorityColor: Record<TaskPriority, string> = {
  baixa: 'oklch(0.7 0.15 145)',
  media: 'oklch(0.8 0.18 75)',
  alta: 'oklch(0.65 0.22 27)',
}
const statusOrder: TaskStatus[] = ['pendente', 'em_andamento', 'concluida']

function StatCard({ count, label, icon: Icon, iconClass }: { count: number; label: string; icon: React.ElementType; iconClass: string }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: 'oklch(0.15 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)' }}>
      <Icon size={18} className={iconClass} />
      <div>
        <p className="text-2xl font-bold text-white">{count}</p>
        <p className="text-xs" style={{ color: 'oklch(0.56 0.02 230)' }}>{label}</p>
      </div>
    </div>
  )
}

const supabase = createClient()

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskStatus | 'todas'>('todas')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'media' as TaskPriority })

  async function load() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    setTasks(data ?? [])
    setLoading(false)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  async function addTask() {
    if (!form.title.trim()) return
    setSaving(true)
    const { data } = await supabase.from('tasks').insert({ title: form.title, description: form.description || null, priority: form.priority, status: 'pendente' }).select().single()
    if (data) setTasks(prev => [data, ...prev])
    setForm({ title: '', description: '', priority: 'media' })
    setOpen(false)
    setSaving(false)
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function cycleStatus(task: Task) {
    const next = statusOrder[(statusOrder.indexOf(task.status) + 1) % 3]
    await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
  }

  const filtered = filter === 'todas' ? tasks : tasks.filter(t => t.status === filter)
  const counts = {
    pendente: tasks.filter(t => t.status === 'pendente').length,
    em_andamento: tasks.filter(t => t.status === 'em_andamento').length,
    concluida: tasks.filter(t => t.status === 'concluida').length,
  }

  const filters: Array<{ key: TaskStatus | 'todas'; label: string }> = [
    { key: 'todas', label: 'Todas' },
    { key: 'pendente', label: 'Pendente' },
    { key: 'em_andamento', label: 'Em Andamento' },
    { key: 'concluida', label: 'Concluída' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Tarefas</h2>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.56 0.02 230)' }}>{tasks.length} tarefas no total</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2" style={{ background: 'oklch(0.8 0.13 186)', color: 'oklch(0.11 0.02 250)' }}>
          <Plus size={16} /> Nova Tarefa
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard count={counts.pendente} label="Pendente" icon={Circle} iconClass="text-slate-400" />
        <StatCard count={counts.em_andamento} label="Em Andamento" icon={Clock} iconClass="text-yellow-400" />
        <StatCard count={counts.concluida} label="Concluída" icon={CheckCircle2} iconClass="text-emerald-400" />
      </div>

      <div className="flex gap-2 mb-5">
        {filters.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={filter === key
              ? { background: 'oklch(0.8 0.13 186 / 15%)', color: 'oklch(0.8 0.13 186)', border: '1px solid oklch(0.8 0.13 186 / 30%)' }
              : { background: 'oklch(0.15 0.02 250)', color: 'oklch(0.56 0.02 230)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: 'oklch(0.8 0.13 186)' }} /></div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="rounded-xl p-10 text-center text-sm"
              style={{ background: 'oklch(0.15 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.45 0.02 230)' }}>
              Nenhuma tarefa encontrada.
            </div>
          )}
          {filtered.map(task => (
            <div key={task.id} className="rounded-xl p-4 flex items-start gap-4 transition-all"
              style={{ background: 'oklch(0.15 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)' }}>
              <button onClick={() => cycleStatus(task)} className="mt-0.5 shrink-0">
                {task.status === 'concluida' ? <CheckCircle2 size={20} className="text-emerald-400" />
                  : task.status === 'em_andamento' ? <Clock size={20} className="text-yellow-400" />
                  : <Circle size={20} style={{ color: 'oklch(0.45 0.02 230)' }} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-white ${task.status === 'concluida' ? 'line-through opacity-40' : ''}`}>{task.title}</p>
                {task.description && <p className="text-sm mt-0.5" style={{ color: 'oklch(0.56 0.02 230)' }}>{task.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${priorityColor[task.priority]}18`, color: priorityColor[task.priority], border: `1px solid ${priorityColor[task.priority]}30` }}>
                    {priorityLabel[task.priority]}
                  </span>
                  <span className="text-xs" style={{ color: 'oklch(0.45 0.02 230)' }}>{statusLabel[task.status]}</span>
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} className="shrink-0 opacity-40 hover:opacity-100 transition-opacity hover:text-red-400">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input placeholder="Título da tarefa" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input placeholder="Descrição opcional" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as TaskPriority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={addTask} disabled={saving}>
              {saving && <Loader2 size={14} className="mr-2 animate-spin" />} Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
