'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mail, RefreshCw, Send, Reply, ArrowRight, Loader2, AlertCircle, Search, ExternalLink, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const heading = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }
const BLUE = '#60a5fa'

interface Email {
  id: string
  subject: string
  from: { name: string; address: string }
  receivedAt: string
  preview: string
  isRead: boolean
  hasAttachments: boolean
  importance: string
}

function SetupCard() {
  return (
    <div className="max-w-2xl mx-auto mt-16">
      <div className="rounded-2xl p-8" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)' }}>
          <Mail size={22} style={{ color: BLUE }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ ...heading, color: '#f3fafa' }}>Conectar Microsoft Outlook</h3>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: MUTED }}>
          Para exibir e responder e-mails diretamente do cockpit, configure as credenciais Microsoft Graph API no seu .env.local.
        </p>

        <div className="space-y-3 mb-6">
          {[
            { step: '1', text: 'Acesse portal.azure.com e faça login com a conta Xtentgroup' },
            { step: '2', text: 'Vá em Azure Active Directory → App Registrations → New Registration' },
            { step: '3', text: 'Nome: "CS Cockpit" | Tipo: Web | Redirect URI: http://localhost:3000/api/microsoft/callback' },
            { step: '4', text: 'Em Certificates & Secrets → New client secret → copie o valor' },
            { step: '5', text: 'Em API Permissions → Add: Mail.ReadWrite, Mail.Send, User.Read → Grant admin consent' },
            { step: '6', text: 'Copie o Application (client) ID e o Directory (tenant) ID da página Overview' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: 'rgba(96,165,250,0.15)', color: BLUE }}>
                {step}
              </span>
              <p className="text-sm" style={{ color: MUTED }}>{text}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}` }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Adicionar ao .env.local</p>
          <pre className="text-xs leading-relaxed" style={{ color: '#7dd3a8' }}>{`MICROSOFT_CLIENT_ID=seu-client-id-aqui
MICROSOFT_CLIENT_SECRET=seu-secret-aqui
MICROSOFT_TENANT_ID=seu-tenant-id-aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000`}</pre>
        </div>

        <a href="/api/microsoft/auth"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{ background: BLUE, color: '#fff' }}>
          <Mail size={15} /> Conectar Conta Microsoft
        </a>
      </div>
    </div>
  )
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const h = Math.floor(d / 3600000)
  const m = Math.floor(d / 60000)
  if (m < 60) return `${m}min`
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function OutlookPage() {
  const [connected, setConnected] = useState(false)
  const [emails, setEmails] = useState<Email[]>([])
  const [selected, setSelected] = useState<Email | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/microsoft/emails')
      const data = await res.json()
      if (data.notConnected) { setConnected(false); return }
      if (data.error) throw new Error(data.error)
      setConnected(true)
      setEmails(data.emails ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = emails.filter(e =>
    !search || e.subject.toLowerCase().includes(search.toLowerCase()) ||
    e.from.name.toLowerCase().includes(search.toLowerCase())
  )

  async function sendReply() {
    if (!selected || !replyText.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/microsoft/emails/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: selected.id, body: replyText }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setReplyText('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={22} className="animate-spin" style={{ color: T }} />
    </div>
  )

  if (!connected) return <SetupCard />

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold" style={{ ...heading, color: '#f3fafa' }}>Outlook</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(96,165,250,0.12)', color: BLUE, border: '1px solid rgba(96,165,250,0.25)' }}>
              Caixa de Entrada
            </span>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>{emails.length} e-mails carregados</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: CARD, color: MUTED, border: `1px solid ${BORDER}` }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}>
          <AlertCircle size={14} style={{ color: '#f87171' }} />
          <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4 h-[calc(100vh-220px)]">
        {/* Email list */}
        <div className="col-span-2 rounded-xl overflow-hidden flex flex-col" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="p-3 border-b" style={{ borderColor: BORDER }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
              <Input className="pl-8 h-8 text-xs" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(email => (
              <button key={email.id} onClick={() => setSelected(email)}
                className="w-full text-left p-4 transition-colors hover:bg-white/[0.02] border-b"
                style={{
                  borderColor: BORDER,
                  background: selected?.id === email.id ? 'rgba(143,191,194,0.06)' : undefined,
                  boxShadow: selected?.id === email.id ? `inset 2px 0 0 ${T}` : undefined,
                }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold truncate" style={{ color: email.isRead ? MUTED : '#f3fafa' }}>
                    {email.from.name || email.from.address}
                  </p>
                  <span className="text-[10px] shrink-0" style={{ color: 'rgba(243,250,250,0.25)' }}>
                    {timeAgo(email.receivedAt)}
                  </span>
                </div>
                <p className="text-[11px] font-medium truncate mb-0.5" style={{ color: email.isRead ? MUTED : '#f3fafa' }}>
                  {email.subject || '(sem assunto)'}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(243,250,250,0.3)' }}>{email.preview}</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm" style={{ color: MUTED }}>Nenhum e-mail encontrado</div>
            )}
          </div>
        </div>

        {/* Email detail */}
        <div className="col-span-3 rounded-xl flex flex-col" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {selected ? (
            <>
              <div className="p-5 border-b" style={{ borderColor: BORDER }}>
                <p className="text-base font-bold mb-2" style={{ color: '#f3fafa' }}>{selected.subject}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: T }}>{selected.from.name}</p>
                    <p className="text-[11px]" style={{ color: MUTED }}>{selected.from.address}</p>
                  </div>
                  <span className="text-[10px]" style={{ color: MUTED }}>
                    {new Date(selected.receivedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-5 overflow-y-auto">
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{selected.preview}</p>
              </div>
              <div className="p-4 border-t" style={{ borderColor: BORDER }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Responder</p>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Digite sua resposta..."
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}`, color: '#f3fafa' }}
                />
                <div className="flex justify-end mt-2">
                  <button onClick={sendReply} disabled={sending || !replyText.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                    style={{ background: BLUE, color: '#fff' }}>
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Enviar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail size={36} className="mx-auto mb-3 opacity-20" style={{ color: T }} />
                <p className="text-sm" style={{ color: MUTED }}>Selecione um e-mail para ler</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
