'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle, RefreshCw, Send, Loader2, AlertCircle, Search, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const heading = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }
const GREEN = '#7dd3a8'

interface WAMessage { id: string; from: string; body: string; timestamp: number; type: 'sent' | 'received' }
interface WAConversation { phone: string; name: string; lastMessage: string; timestamp: number; unread: number }

function SetupCard() {
  return (
    <div className="max-w-2xl mx-auto mt-16">
      <div className="rounded-2xl p-8" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(125,211,168,0.12)', border: '1px solid rgba(125,211,168,0.25)' }}>
          <MessageCircle size={22} style={{ color: GREEN }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ ...heading, color: '#f3fafa' }}>Configurar WhatsApp Business</h3>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: MUTED }}>
          Para receber e enviar mensagens do WhatsApp no cockpit, você precisa de acesso à WhatsApp Business Cloud API (Meta for Developers).
        </p>

        <div className="space-y-3 mb-6">
          {[
            { step: '1', text: 'Acesse business.facebook.com e crie ou acesse sua conta Meta Business' },
            { step: '2', text: 'Vá em developers.facebook.com → My Apps → Create App → Business' },
            { step: '3', text: 'Adicione o produto "WhatsApp" ao seu app' },
            { step: '4', text: 'Em WhatsApp → Getting Started: copie o Phone Number ID e o Temporary Token' },
            { step: '5', text: 'Configure o Webhook: URL = https://seu-dominio.com/api/whatsapp/webhook | Verify Token: qualquer string' },
            { step: '6', text: 'Para produção: adicione número real e faça a verificação do negócio na Meta' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: 'rgba(125,211,168,0.15)', color: GREEN }}>
                {step}
              </span>
              <p className="text-sm" style={{ color: MUTED }}>{text}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}` }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Adicionar ao .env.local</p>
          <pre className="text-xs leading-relaxed" style={{ color: '#7dd3a8' }}>{`WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
WHATSAPP_ACCESS_TOKEN=seu-access-token
WHATSAPP_VERIFY_TOKEN=sua-verify-token-aqui
WHATSAPP_BUSINESS_ACCOUNT_ID=seu-waba-id`}</pre>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#fbbf24' }}>Atenção</p>
          <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
            O webhook do WhatsApp precisa de uma URL pública (não funciona com localhost).
            Para desenvolvimento, use ngrok: <code className="px-1 rounded text-[10px]" style={{ background: 'rgba(255,255,255,0.06)' }}>ngrok http 3000</code> e use a URL gerada como webhook.
          </p>
        </div>
      </div>
    </div>
  )
}

function timeAgo(ts: number) {
  const d = Date.now() - ts * 1000
  const h = Math.floor(d / 3600000)
  const m = Math.floor(d / 60000)
  if (m < 60) return `${m}min`
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function WhatsappPage() {
  const [connected, setConnected] = useState(false)
  const [conversations, setConversations] = useState<WAConversation[]>([])
  const [messages, setMessages] = useState<WAMessage[]>([])
  const [selected, setSelected] = useState<WAConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/whatsapp')
      const data = await res.json()
      if (data.notConnected) { setConnected(false); return }
      if (data.error) throw new Error(data.error)
      setConnected(true)
      setConversations(data.conversations ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadMessages(conv: WAConversation) {
    setSelected(conv)
    try {
      const res = await fetch(`/api/whatsapp/messages?phone=${conv.phone}`)
      const data = await res.json()
      setMessages(data.messages ?? [])
    } catch { setMessages([]) }
  }

  async function sendMessage() {
    if (!selected || !text.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selected.phone, message: text }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setText('')
      loadMessages(selected)
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

  const filtered = conversations.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold" style={{ ...heading, color: '#f3fafa' }}>WhatsApp Business</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(125,211,168,0.12)', color: GREEN, border: '1px solid rgba(125,211,168,0.25)' }}>
              {conversations.length} conversas
            </span>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>Atendimento via WhatsApp Business API</p>
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
        {/* Conversation list */}
        <div className="col-span-2 rounded-xl overflow-hidden flex flex-col" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="p-3 border-b" style={{ borderColor: BORDER }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
              <Input className="pl-8 h-8 text-xs" placeholder="Buscar contato..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(conv => (
              <button key={conv.phone} onClick={() => loadMessages(conv)}
                className="w-full text-left p-4 transition-colors hover:bg-white/[0.02] border-b"
                style={{
                  borderColor: BORDER,
                  background: selected?.phone === conv.phone ? 'rgba(125,211,168,0.06)' : undefined,
                  boxShadow: selected?.phone === conv.phone ? `inset 2px 0 0 ${GREEN}` : undefined,
                }}>
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'rgba(125,211,168,0.15)', color: GREEN }}>
                      {conv.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#f3fafa' }}>{conv.name}</p>
                      <p className="text-[10px] flex items-center gap-1" style={{ color: MUTED }}>
                        <Phone size={9} /> {conv.phone}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px]" style={{ color: 'rgba(243,250,250,0.25)' }}>{timeAgo(conv.timestamp)}</p>
                    {conv.unread > 0 && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold mt-0.5"
                        style={{ background: GREEN, color: '#0a1316' }}>{conv.unread}</span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] truncate ml-10" style={{ color: MUTED }}>{conv.lastMessage}</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm" style={{ color: MUTED }}>Nenhuma conversa</div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="col-span-3 rounded-xl flex flex-col" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {selected ? (
            <>
              <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: BORDER }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(125,211,168,0.15)', color: GREEN }}>
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#f3fafa' }}>{selected.name}</p>
                  <p className="text-[11px] flex items-center gap-1" style={{ color: MUTED }}>
                    <Phone size={10} /> {selected.phone}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] rounded-xl px-3 py-2"
                      style={msg.type === 'sent'
                        ? { background: 'rgba(125,211,168,0.15)', border: '1px solid rgba(125,211,168,0.20)' }
                        : { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                      <p className="text-sm" style={{ color: '#f3fafa' }}>{msg.body}</p>
                      <p className="text-[10px] mt-1 text-right" style={{ color: 'rgba(243,250,250,0.3)' }}>
                        {timeAgo(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-sm" style={{ color: MUTED }}>Sem mensagens ainda</p>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <div className="p-4 border-t" style={{ borderColor: BORDER }}>
                <div className="flex gap-2">
                  <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 rounded-lg px-4 py-2 text-sm outline-none"
                    style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}`, color: '#f3fafa' }}
                  />
                  <button onClick={sendMessage} disabled={sending || !text.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                    style={{ background: GREEN, color: '#0a1316' }}>
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle size={36} className="mx-auto mb-3 opacity-20" style={{ color: GREEN }} />
                <p className="text-sm" style={{ color: MUTED }}>Selecione uma conversa</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
