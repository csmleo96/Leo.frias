'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Send, Clock, CheckCircle2, AlertTriangle, Users, History,
  RefreshCw, Calendar, Zap, FileText, BarChart3, Plus, Trash2,
  Settings2, ExternalLink, ChevronRight, Activity,
} from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG     = '#0a1316'
const CARD   = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const T      = '#8fbfc2'
const MUTED  = 'rgba(243,250,250,0.4)'
const H: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif' }

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDateTime(str: string | null | undefined) {
  if (!str) return '—'
  return new Date(str).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}
function nextScheduledTime(hour: number, minute = 0): string {
  const now = new Date(), next = new Date()
  next.setHours(hour, minute, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  return next.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function nextMonday(hour = 8): string {
  const d = new Date(), day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day))
  d.setHours(hour, 0, 0, 0)
  return d.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function firstWorkday(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  d.setHours(8, 0, 0, 0)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ── Shared components ─────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', borderRadius: 8, fontSize: 13,
      fontWeight: active ? 600 : 400,
      border: active ? `1px solid rgba(143,191,194,0.3)` : '1px solid transparent',
      background: active ? 'rgba(143,191,194,0.12)' : 'transparent',
      color: active ? T : MUTED, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: '3px 10px', borderRadius: 20 }}>
      {label}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: T, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
      {children}
    </div>
  )
}

// ── REPORT CARD ───────────────────────────────────────────────────────────────
function ReportCard({
  type, title, schedule, nextAt, sections, accent,
}: {
  type: string; title: string; schedule: string; nextAt: string; sections: string[]; accent: string
}) {
  const [sending, setSending] = useState(false)
  const [result, setResult]   = useState<{ ok: boolean; msg: string } | null>(null)
  const { data: recipientsData } = useQuery({
    queryKey: ['recipients'],
    queryFn: () => fetch('/api/automation/recipients').then(r => r.json()),
  })
  const recipients: string[] = recipientsData?.recipients ?? []

  async function handleSend() {
    setSending(true); setResult(null)
    try {
      const r = await fetch('/api/automation/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, recipients }),
      })
      const json = await r.json()
      if (json.ok) {
        const dest = Array.isArray(json.to) ? json.to.join(', ') : json.to
        setResult({ ok: true, msg: `Enviado para ${dest} · ${(json.duration / 1000).toFixed(1)}s` })
      } else {
        setResult({ ok: false, msg: json.error ?? 'Erro ao enviar' })
      }
    } catch (e: any) {
      setResult({ ok: false, msg: e.message })
    } finally { setSending(false) }
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ ...H, fontSize: 17, fontWeight: 700, color: '#f3fafa', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: T, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={11} /> {schedule}
            </div>
          </div>
          <Pill label="Ativo" color="#22c55e" bg="rgba(34,197,94,0.1)" />
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Próximo Envio</div>
            <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{nextAt}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Destinatários</div>
            <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
              {recipients.length > 0 ? `${recipients.length} configurado${recipients.length > 1 ? 's' : ''}` : '—'}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Conteúdo do Relatório</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sections.map(s => (
              <span key={s} style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)', padding: '3px 10px', borderRadius: 20 }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Recipients preview */}
        {recipients.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Será enviado para</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recipients.map(r => (
                <div key={r} style={{ fontSize: 11, color: MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={10} style={{ color: T }} /> {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {result && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            {result.ok
              ? <CheckCircle2 size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
              : <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />}
            <span style={{ fontSize: 12, color: result.ok ? '#22c55e' : '#ef4444' }}>{result.msg}</span>
          </div>
        )}

        <button onClick={handleSend} disabled={sending} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          color: '#22c55e', cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.6 : 1, transition: 'all 0.15s',
        }}>
          {sending ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
          {sending ? 'Enviando...' : 'Enviar Agora'}
        </button>
      </div>
    </div>
  )
}

// ── DESTINATÁRIOS ─────────────────────────────────────────────────────────────
function RecipientsView() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['recipients'],
    queryFn: () => fetch('/api/automation/recipients').then(r => r.json()),
  })
  const recipients: string[] = data?.recipients ?? []
  const [newEmail, setNewEmail] = useState('')
  const [err, setErr] = useState('')

  const mutation = useMutation({
    mutationFn: (list: string[]) =>
      fetch('/api/automation/recipients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: list }),
      }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipients'] }); setNewEmail(''); setErr('') },
    onError: (e: any) => setErr(e.message),
  })

  function addEmail() {
    const email = newEmail.trim()
    if (!email.includes('@')) { setErr('Email inválido'); return }
    if (recipients.includes(email)) { setErr('Já adicionado'); return }
    mutation.mutate([...recipients, email])
  }

  function removeEmail(email: string) {
    if (recipients.length <= 1) { setErr('Mínimo 1 destinatário'); return }
    mutation.mutate(recipients.filter(e => e !== email))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Add recipient */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={15} style={{ color: T }} /> Adicionar Destinatário
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="email"
            placeholder="email@empresa.com"
            value={newEmail}
            onChange={e => { setNewEmail(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && addEmail()}
            style={{
              flex: 1, padding: '10px 14px', background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${err ? 'rgba(239,68,68,0.5)' : BORDER}`,
              borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none',
            }}
          />
          <button onClick={addEmail} disabled={mutation.isPending} style={{
            padding: '10px 20px', borderRadius: 8, background: 'rgba(143,191,194,0.12)',
            border: `1px solid rgba(143,191,194,0.3)`, color: T, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
        {err && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{err}</p>}
      </div>

      {/* List */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users size={15} style={{ color: T }} /> Destinatários Configurados</div>
          <Pill label={`${recipients.length} destinatário${recipients.length !== 1 ? 's' : ''}`} color={T} bg="rgba(143,191,194,0.1)" />
        </div>
        <p style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Todos os relatórios serão enviados para estes endereços.</p>

        {isLoading ? (
          <div style={{ padding: 20, textAlign: 'center', color: T, fontSize: 13 }}>Carregando...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recipients.map((email, idx) => (
              <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Mail size={14} style={{ color: T }} />
                  <span style={{ fontSize: 13, color: '#e2e8f0' }}>{email}</span>
                  {idx === 0 && <Pill label="Principal" color="#22c55e" bg="rgba(34,197,94,0.1)" />}
                </div>
                <button onClick={() => removeEmail(email)} title="Remover" style={{
                  padding: '5px 8px', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 6, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  opacity: recipients.length <= 1 ? 0.4 : 1,
                }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* n8n webhook info */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 12, color: T, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={13} /> Webhooks n8n para agendamento automático
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#8fbfc2', lineHeight: 2 }}>
          POST /api/automation/reports/daily &nbsp;&nbsp;→ Relatório Diário<br />
          POST /api/automation/reports/weekly &nbsp;→ Relatório Semanal<br />
          POST /api/automation/reports/monthly → Relatório Mensal
        </div>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 10 }}>
          Configure no n8n: Schedule Trigger → HTTP Request com a URL acima → envia para todos os destinatários cadastrados.
        </p>
      </div>
    </div>
  )
}

// ── HISTÓRICO ─────────────────────────────────────────────────────────────────
function HistoryView() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-history'],
    queryFn: () => fetch('/api/automation/reports/history').then(r => r.json()),
    staleTime: 30_000,
  })
  const logs: any[] = data?.logs ?? []

  const TH: React.CSSProperties = {
    fontSize: 10, color: T, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', padding: '10px 14px', borderBottom: `1px solid ${BORDER}`,
    textAlign: 'left', background: 'rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
  }
  const TD: React.CSSProperties = {
    fontSize: 12, color: '#cbd5e1', padding: '10px 14px',
    borderBottom: `1px solid rgba(143,191,194,0.05)`, verticalAlign: 'middle',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: MUTED }}>{logs.length} registro{logs.length !== 1 ? 's' : ''}</div>
        <button onClick={() => refetch()} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 7, color: T, cursor: 'pointer', fontSize: 12,
        }}>
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: T, fontSize: 13 }}>Carregando histórico...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <History size={32} style={{ color: T, opacity: 0.3, margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: 13, color: MUTED }}>Nenhum relatório enviado ainda.</p>
            <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Use "Enviar Agora" em qualquer aba de relatório.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Data / Hora', 'Tipo', 'Status', 'Método', 'Destinatários', 'Duração', 'Log'].map(h =>
                  <th key={h} style={TH}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => {
                const ok = log.status === 'success'
                const recips: string[] = Array.isArray(log.recipients) ? log.recipients.filter(Boolean) : []
                const isOpen = expanded === log.id
                return (
                  <>
                    <tr key={log.id}
                      onClick={() => setExpanded(isOpen ? null : log.id)}
                      style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                    >
                      <td style={{ ...TD, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{fmtDateTime(log.executed_at)}</td>
                      <td style={{ ...TD, fontSize: 11 }}>
                        <span style={{ color: MUTED }}>
                          {log.metadata?.type === 'daily' ? 'Diário'
                          : log.metadata?.type === 'weekly' ? 'Semanal'
                          : log.metadata?.type === 'monthly' ? 'Mensal'
                          : log.metadata?.type ?? 'Diário'}
                        </span>
                      </td>
                      <td style={TD}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ok ? '#22c55e' : '#ef4444', background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: 6 }}>
                          {ok ? '✓ Enviado' : '✗ Falhou'}
                        </span>
                      </td>
                      <td style={{ ...TD, fontSize: 11, color: MUTED, textTransform: 'capitalize' }}>
                        {log.metadata?.method ?? '—'}
                      </td>
                      <td style={{ ...TD, fontSize: 11, color: MUTED }}>
                        {recips.length > 0 ? `${recips[0]}${recips.length > 1 ? ` +${recips.length - 1}` : ''}` : '—'}
                      </td>
                      <td style={{ ...TD, fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>
                        {log.delivery_time ? `${(log.delivery_time / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td style={{ ...TD }}>
                        <ChevronRight size={13} style={{ color: T, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${log.id}-detail`}>
                        <td colSpan={7} style={{ padding: '10px 14px 14px', background: 'rgba(0,0,0,0.2)', borderBottom: `1px solid ${BORDER}` }}>
                          <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.8 }}>
                            <strong style={{ color: T }}>Destinatários completos:</strong> {recips.join(', ') || '—'}<br />
                            {log.metadata?.error && (
                              <><strong style={{ color: '#ef4444' }}>Erro:</strong> {log.metadata.error}<br /></>
                            )}
                            <strong style={{ color: T }}>Canal:</strong> {log.channel ?? '—'} &nbsp;|&nbsp;
                            <strong style={{ color: T }}>ID:</strong> {log.id}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── AGENDAMENTOS ──────────────────────────────────────────────────────────────
function AgendamentosView() {
  const schedules = [
    {
      id: 'daily',
      title: 'Relatório Diário',
      icon: FileText, color: '#22c55e',
      schedule: 'Todo dia útil às 09:00',
      nextAt: nextScheduledTime(9),
      webhook: '/api/automation/reports/daily',
      n8nCron: '0 9 * * 1-5',
    },
    {
      id: 'weekly',
      title: 'Relatório Semanal',
      icon: BarChart3, color: '#3b82f6',
      schedule: 'Toda segunda-feira às 08:00',
      nextAt: nextMonday(8),
      webhook: '/api/automation/reports/weekly',
      n8nCron: '0 8 * * 1',
    },
    {
      id: 'monthly',
      title: 'Relatório Mensal',
      icon: Calendar, color: '#a78bfa',
      schedule: '1º dia útil do mês às 08:00',
      nextAt: firstWorkday(),
      webhook: '/api/automation/reports/monthly',
      n8nCron: '0 8 1-7 * 1',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status n8n */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={15} style={{ color: '#a78bfa' }} /> Motor de Automação — n8n
          </div>
          <a href="http://localhost:5678" target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T,
            background: 'rgba(143,191,194,0.08)', border: `1px solid ${BORDER}`,
            padding: '5px 10px', borderRadius: 6, textDecoration: 'none', fontWeight: 600,
          }}>
            <ExternalLink size={11} /> Abrir n8n
          </a>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>URL</div>
            <div style={{ fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace' }}>http://localhost:5678</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Banco</div>
            <div style={{ fontSize: 12, color: '#22c55e', fontFamily: 'monospace', fontWeight: 600 }}>PostgreSQL 16 ✓</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Status</div>
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>● Rodando</div>
          </div>
        </div>
      </div>

      {/* Schedule cards */}
      {schedules.map(s => {
        const Icon = s.icon
        return (
          <div key={s.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ height: 2, background: s.color }} />
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={17} style={{ color: s.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f3fafa' }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: MUTED, display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <Clock size={10} /> {s.schedule}
                    </div>
                  </div>
                </div>
                <Pill label={`Próximo: ${s.nextAt}`} color={T} bg="rgba(143,191,194,0.08)" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Webhook (n8n → CS Cockpit)</div>
                  <div style={{ fontSize: 11, color: '#8fbfc2', fontFamily: 'monospace' }}>
                    POST {s.webhook}
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Cron Expression (n8n)</div>
                  <div style={{ fontSize: 11, color: '#8fbfc2', fontFamily: 'monospace' }}>{s.n8nCron}</div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Telegram future */}
      <div style={{ background: CARD, border: `1px solid rgba(59,130,246,0.15)`, borderRadius: 12, padding: 20, opacity: 0.75 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f3fafa' }}>Telegram — Canal Executivo</div>
          <Pill label="Em breve" color="#6b7280" bg="rgba(107,114,128,0.12)" />
        </div>
        <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
          O mesmo relatório enviado por email será enviado ao canal Telegram via n8n. Configure <code style={{ color: T, fontSize: 11 }}>TELEGRAM_BOT_TOKEN</code> e <code style={{ color: T, fontSize: 11 }}>TELEGRAM_CHAT_ID</code> no .env para ativar.
        </p>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
type Tab = 'diario' | 'semanal' | 'mensal' | 'destinatarios' | 'agendamentos' | 'historico'

const DAILY_SECTIONS   = ['Resumo Executivo', 'CRM HubSpot', 'GLPI', 'Jira', 'GMUDs', 'Agenda']
const WEEKLY_SECTIONS  = ['Resumo Semanal', 'CRM — Leads & Pipeline', 'GLPI — Consolidado', 'Jira — Sprint Review', 'KPIs da Semana']
const MONTHLY_SECTIONS = ['CRM — Crescimento', 'Retenção de Clientes', 'GLPI — SLA Mensal', 'Jira — Entregas', 'Indicadores Estratégicos']

export default function AutomacaoPage() {
  const [tab, setTab] = useState<Tab>('diario')
  const { data: recipientsData } = useQuery({
    queryKey: ['recipients'],
    queryFn: () => fetch('/api/automation/recipients').then(r => r.json()),
  })
  const recipientsCount = recipientsData?.recipients?.length ?? 0

  const tabs: { id: Tab; label: string }[] = [
    { id: 'diario',        label: 'Relatório Diário' },
    { id: 'semanal',       label: 'Semanal' },
    { id: 'mensal',        label: 'Mensal' },
    { id: 'destinatarios', label: 'Destinatários' },
    { id: 'agendamentos',  label: 'Agendamentos' },
    { id: 'historico',     label: 'Histórico' },
  ]

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ ...H, fontSize: 24, fontWeight: 800, color: '#f3fafa', margin: 0 }}>Central de Relatórios</h1>
          <p style={{ fontSize: 13, color: T, margin: '4px 0 0' }}>Relatórios executivos automáticos — CRM · GLPI · Jira · GMUDs · Agenda</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: CARD, border: '1px solid rgba(34,197,94,0.25)', borderRadius: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Resend · Email OK</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: CARD, border: '1px solid rgba(167,139,250,0.25)', borderRadius: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }} />
            <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>n8n · Rodando</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20 }}>
            <Users size={11} style={{ color: T }} />
            <span style={{ fontSize: 11, color: T, fontWeight: 600 }}>{recipientsCount} destinatário{recipientsCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Próximo Diário',   value: nextScheduledTime(9), icon: Clock,    color: '#22c55e' },
          { label: 'Próximo Semanal',  value: nextMonday(8),        icon: Calendar, color: '#3b82f6' },
          { label: 'Próximo Mensal',   value: firstWorkday(),        icon: Activity, color: '#a78bfa' },
          { label: 'Destinatários',    value: `${recipientsCount} configurado${recipientsCount !== 1 ? 's' : ''}`, icon: Users, color: T },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} style={{ color: k.color }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: T, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k.label}</div>
                <div style={{ ...H, fontSize: 13, fontWeight: 700, color: '#f3fafa' }}>{k.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', borderBottom: `1px solid ${BORDER}`, paddingBottom: 16 }}>
        {tabs.map(t => <TabBtn key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
      </div>

      {/* Content */}
      {tab === 'diario'        && <ReportCard type="daily"   title="Relatório Executivo Diário"   schedule="Todo dia útil às 09:00 · Via n8n"                nextAt={nextScheduledTime(9)} sections={DAILY_SECTIONS}   accent="#22c55e" />}
      {tab === 'semanal'       && <ReportCard type="weekly"  title="Relatório Executivo Semanal"  schedule="Toda segunda-feira às 08:00 · Via n8n"            nextAt={nextMonday(8)}        sections={WEEKLY_SECTIONS}  accent="#3b82f6" />}
      {tab === 'mensal'        && <ReportCard type="monthly" title="Relatório Executivo Mensal"   schedule="1º dia útil do mês às 08:00 · Para Diretoria"     nextAt={firstWorkday()}       sections={MONTHLY_SECTIONS} accent="#a78bfa" />}
      {tab === 'destinatarios' && <RecipientsView />}
      {tab === 'agendamentos'  && <AgendamentosView />}
      {tab === 'historico'     && <HistoryView />}
    </div>
  )
}
