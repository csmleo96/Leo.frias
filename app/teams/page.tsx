'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageSquare, RefreshCw, Send, Loader2, AlertCircle, Users, Hash } from 'lucide-react'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'
const MUTED = 'rgba(243,250,250,0.45)'
const heading = { fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif' }
const PURPLE = '#a78bfa'

interface TeamsMessage {
  id: string
  sender: string
  senderEmail: string
  body: string
  createdAt: string
  channelName?: string
}

interface TeamsChannel { id: string; name: string; teamName: string }
interface TeamsUser { id: string; name: string; email: string; status: string }

function statusDot(s: string) {
  const c = s === 'Available' ? '#7dd3a8' : s === 'Busy' ? '#f87171' : s === 'Away' ? '#fbbf24' : '#94a3b8'
  return <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
}

function SetupCard() {
  return (
    <div className="max-w-2xl mx-auto mt-16">
      <div className="rounded-2xl p-8" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)' }}>
          <MessageSquare size={22} style={{ color: PURPLE }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ ...heading, color: '#f3fafa' }}>Conectar Microsoft Teams</h3>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: MUTED }}>
          Usa o mesmo App Registration do Outlook. Se já configurou o Outlook, adicione apenas as permissões adicionais do Teams.
        </p>

        <div className="space-y-3 mb-6">
          {[
            { step: '1', text: 'No portal.azure.com → App Registration "CS Cockpit" → API Permissions' },
            { step: '2', text: 'Add Permissions: Chat.Read, Chat.ReadWrite, ChannelMessage.Read.All, Presence.Read.All' },
            { step: '3', text: 'Grant admin consent para todas as permissões' },
            { step: '4', text: 'Mesmas credenciais do Outlook (CLIENT_ID, CLIENT_SECRET, TENANT_ID)' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: 'rgba(167,139,250,0.15)', color: PURPLE }}>
                {step}
              </span>
              <p className="text-sm" style={{ color: MUTED }}>{text}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}` }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Já no .env.local (compartilhado com Outlook)</p>
          <pre className="text-xs leading-relaxed" style={{ color: '#7dd3a8' }}>{`MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=...`}</pre>
        </div>

        <a href="/api/microsoft/auth?scope=teams"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{ background: PURPLE, color: '#fff' }}>
          <MessageSquare size={15} /> Conectar ao Teams
        </a>
      </div>
    </div>
  )
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const h = Math.floor(d / 3600000)
  const m = Math.floor(d / 60000)
  if (m < 60) return `${m}min atrás`
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default function TeamsPage() {
  const [connected, setConnected] = useState(false)
  const [channels, setChannels] = useState<TeamsChannel[]>([])
  const [messages, setMessages] = useState<TeamsMessage[]>([])
  const [users, setUsers] = useState<TeamsUser[]>([])
  const [selectedChannel, setSelectedChannel] = useState<TeamsChannel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/microsoft/teams')
      const data = await res.json()
      if (data.notConnected) { setConnected(false); return }
      if (data.error) throw new Error(data.error)
      setConnected(true)
      setChannels(data.channels ?? [])
      setUsers(data.users ?? [])
      setMessages(data.messages ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!selectedChannel || !replyText.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/microsoft/teams/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: selectedChannel.id, body: replyText }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setReplyText('')
      load()
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

  const channelMessages = selectedChannel
    ? messages.filter(m => m.channelName === selectedChannel.name)
    : messages

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold" style={{ ...heading, color: '#f3fafa' }}>Microsoft Teams</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(167,139,250,0.12)', color: PURPLE, border: '1px solid rgba(167,139,250,0.25)' }}>
              Comunicação Interna
            </span>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>{channels.length} canais · {users.length} usuários</p>
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
        {/* Sidebar: channels + users */}
        <div className="col-span-1 flex flex-col gap-3">
          {/* Channels */}
          <div className="rounded-xl overflow-hidden flex-1" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: MUTED }}>
                <Hash size={11} /> Canais
              </p>
            </div>
            <div className="py-1">
              <button onClick={() => setSelectedChannel(null)}
                className="w-full text-left px-4 py-2 text-xs transition-colors hover:bg-white/[0.02]"
                style={{ color: !selectedChannel ? T : MUTED, boxShadow: !selectedChannel ? `inset 2px 0 0 ${T}` : undefined }}>
                # todos
              </button>
              {channels.map(c => (
                <button key={c.id} onClick={() => setSelectedChannel(c)}
                  className="w-full text-left px-4 py-2 text-xs transition-colors hover:bg-white/[0.02]"
                  style={{ color: selectedChannel?.id === c.id ? T : MUTED, boxShadow: selectedChannel?.id === c.id ? `inset 2px 0 0 ${T}` : undefined }}>
                  # {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Users online */}
          {users.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: MUTED }}>
                  <Users size={11} /> Equipe
                </p>
              </div>
              <div className="py-1">
                {users.slice(0, 8).map(u => (
                  <div key={u.id} className="flex items-center gap-2 px-4 py-2">
                    {statusDot(u.status)}
                    <p className="text-[11px] truncate" style={{ color: MUTED }}>{u.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="col-span-4 rounded-xl flex flex-col" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
            <Hash size={14} style={{ color: MUTED }} />
            <p className="text-sm font-medium" style={{ color: '#f3fafa' }}>
              {selectedChannel ? selectedChannel.name : 'Todas as mensagens'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {channelMessages.map(msg => (
              <div key={msg.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: 'rgba(167,139,250,0.15)', color: PURPLE }}>
                  {msg.sender.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: '#f3fafa' }}>{msg.sender}</span>
                    <span className="text-[10px]" style={{ color: 'rgba(243,250,250,0.25)' }}>{timeAgo(msg.createdAt)}</span>
                    {msg.channelName && !selectedChannel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(167,139,250,0.10)', color: PURPLE }}>
                        #{msg.channelName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{msg.body}</p>
                </div>
              </div>
            ))}
            {channelMessages.length === 0 && (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm" style={{ color: MUTED }}>Nenhuma mensagem encontrada</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {selectedChannel && (
            <div className="p-4 border-t" style={{ borderColor: BORDER }}>
              <div className="flex gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder={`Mensagem em #${selectedChannel.name}...`}
                  className="flex-1 rounded-lg px-4 py-2 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}`, color: '#f3fafa' }}
                />
                <button onClick={sendMessage} disabled={sending || !replyText.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                  style={{ background: PURPLE, color: '#fff' }}>
                  {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
