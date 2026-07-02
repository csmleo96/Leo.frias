'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

const T = '#8fbfc2'
const CARD = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.10)'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HubSpotSettingsPage() {
  const qc = useQueryClient()
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: status, isLoading } = useQuery({
    queryKey: ['hubspot-status'],
    queryFn: () => fetch('/api/hubspot/auth/status').then(r => r.json()),
    refetchInterval: 30000,
  })

  const { data: syncLogs } = useQuery({
    queryKey: ['hubspot-sync-logs'],
    queryFn: () => fetch('/api/hubspot/sync').then(r => r.json()),
    refetchInterval: 10000,
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      setSuccessMsg('HubSpot conectado com sucesso!')
      window.history.replaceState({}, '', '/hubspot/settings')
      qc.invalidateQueries({ queryKey: ['hubspot-status'] })
    }
    if (params.get('error')) {
      setErrorMsg(decodeURIComponent(params.get('error') ?? ''))
      window.history.replaceState({}, '', '/hubspot/settings')
    }
  }, [qc])

  async function disconnect() {
    if (!confirm('Tem certeza? Isso desconectará o HubSpot e removera o acesso.')) return
    const r = await fetch('/api/hubspot/auth/disconnect', { method: 'POST' })
    const data = await r.json()
    if (data.ok) { setSuccessMsg('HubSpot desconectado.'); qc.invalidateQueries({ queryKey: ['hubspot-status'] }) }
    else setErrorMsg(data.error)
  }

  async function runSync(type: string) {
    setSyncing(true); setSyncResult(null)
    try {
      const r = await fetch(`/api/hubspot/sync?type=${type}`, { method: 'POST' })
      const data = await r.json()
      setSyncResult(data)
      if (data.ok) qc.invalidateQueries({ queryKey: ['hubspot-sync-logs'] })
    } catch (err: any) {
      setSyncResult({ ok: false, error: err.message })
    } finally {
      setSyncing(false)
    }
  }

  const connected = status?.connected === true

  const P: React.CSSProperties = { minHeight: '100vh', background: '#0a1316', padding: '28px 32px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }
  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px 26px', marginBottom: 20 }
  const btn = (bg: string, color: string): React.CSSProperties => ({ background: bg, border: 'none', borderRadius: 8, padding: '9px 18px', color, cursor: 'pointer', fontSize: 13, fontWeight: 600 })

  return (
    <div style={P}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>Configurações HubSpot</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Gerencie a conexão OAuth e sincronização de dados CRM</p>
      </div>

      {/* Alerts */}
      {errorMsg && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>✕ {errorMsg}</div>}
      {successMsg && <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#22c55e', fontSize: 13 }}>✓ {successMsg}</div>}

      {/* Connection Status */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: connected ? '#22c55e' : '#6b7280' }} />
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                {isLoading ? 'Verificando...' : connected ? 'Conectado ao HubSpot' : 'HubSpot não conectado'}
              </h2>
            </div>
            {connected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 12, color: '#8fbfc2' }}>Portal: <strong>{status.hubDomain ?? status.portalId}</strong></span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Conectado em: {fmt(status.connectedAt)}</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Última sincronização: {fmt(status.lastSyncAt)}</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Token expira: {fmt(status.tokenExpiresAt)}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {connected
              ? <button onClick={disconnect} style={btn('rgba(239,68,68,0.1)', '#ef4444')}>Desconectar HubSpot</button>
              : <a href="/api/hubspot/auth/connect" style={{ ...btn('rgba(255,122,0,0.15)', '#ff7a00'), textDecoration: 'none', display: 'inline-block' }}>
                  Conectar HubSpot
                </a>
            }
          </div>
        </div>
      </div>

      {/* Scopes */}
      {connected && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#8fbfc2', margin: '0 0 12px' }}>Permissões (Scopes)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(status.scope ?? '').split(' ').filter(Boolean).map((s: string) => (
              <span key={s} style={{ background: 'rgba(143,191,194,0.1)', color: '#8fbfc2', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontFamily: 'monospace' }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Sync */}
      {connected && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#8fbfc2', margin: '0 0 4px' }}>Sincronização de Dados</h3>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>Sincronize os dados do HubSpot para o banco de dados local para relatórios mais rápidos.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {['all', 'contacts', 'companies', 'deals', 'tickets'].map(type => (
              <button key={type} onClick={() => runSync(type)} disabled={syncing}
                style={{ ...btn(type === 'all' ? 'rgba(143,191,194,0.15)' : 'rgba(143,191,194,0.06)', type === 'all' ? T : '#94a3b8'), opacity: syncing ? 0.5 : 1 }}>
                {syncing && type === 'all' ? '⟳ Sincronizando...' : `Sync ${type === 'all' ? 'Completo' : type.charAt(0).toUpperCase() + type.slice(1)}`}
              </button>
            ))}
          </div>
          {syncResult && (
            <div style={{ background: syncResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${syncResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
              {syncResult.ok
                ? <span style={{ color: '#22c55e' }}>✓ Sincronizado: {syncResult.totalSynced} registros em {Math.round(syncResult.durationMs / 1000)}s</span>
                : <span style={{ color: '#ef4444' }}>✕ Erro: {syncResult.error}</span>
              }
              {syncResult.results && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(syncResult.results).map(([k, v]: any) => (
                    <span key={k} style={{ background: 'rgba(143,191,194,0.08)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#8fbfc2' }}>
                      {k}: {v.synced} ✓
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sync History */}
      {connected && (syncLogs?.logs?.length ?? 0) > 0 && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#8fbfc2', margin: '0 0 12px' }}>Histórico de Sincronizações</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Tipo', 'Objetos', 'Status', 'Registros', 'Duração', 'Iniciado'].map(h => (
                <th key={h} style={{ fontSize: 11, color: T, padding: '6px 10px', borderBottom: '1px solid rgba(143,191,194,0.08)', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {(syncLogs.logs as any[]).map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: 12, padding: '7px 10px', borderBottom: '1px solid rgba(143,191,194,0.04)', color: '#cbd5e1' }}>{log.sync_type}</td>
                  <td style={{ fontSize: 12, padding: '7px 10px', borderBottom: '1px solid rgba(143,191,194,0.04)', color: '#cbd5e1' }}>{log.object_type}</td>
                  <td style={{ fontSize: 11, padding: '7px 10px', borderBottom: '1px solid rgba(143,191,194,0.04)' }}>
                    <span style={{ color: log.status === 'success' ? '#22c55e' : log.status === 'running' ? '#eab308' : '#ef4444', fontWeight: 600 }}>{log.status}</span>
                  </td>
                  <td style={{ fontSize: 12, padding: '7px 10px', borderBottom: '1px solid rgba(143,191,194,0.04)', color: '#8fbfc2' }}>{log.records_synced ?? 0}</td>
                  <td style={{ fontSize: 12, padding: '7px 10px', borderBottom: '1px solid rgba(143,191,194,0.04)', color: '#6b7280' }}>{log.duration_ms ? `${Math.round(log.duration_ms / 1000)}s` : '—'}</td>
                  <td style={{ fontSize: 11, padding: '7px 10px', borderBottom: '1px solid rgba(143,191,194,0.04)', color: '#6b7280' }}>{fmt(log.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Setup Guide */}
      {!connected && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#8fbfc2', margin: '0 0 16px' }}>Guia de Configuração</h3>
          {[
            ['1', 'Criar App no HubSpot', 'Acesse developers.hubspot.com → Manage Apps → Create App'],
            ['2', 'Configurar OAuth', 'Em Auth → Redirect URL: adicione a URL do callback do seu portal'],
            ['3', 'Copiar credenciais', 'Copie Client ID e Client Secret para o .env.local'],
            ['4', 'Configurar Scopes', 'Adicione os scopes listados abaixo na seção Auth > Scopes'],
            ['5', 'Conectar', 'Clique em "Conectar HubSpot" acima e autorize o acesso'],
          ].map(([num, title, desc]) => (
            <div key={num} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(143,191,194,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: T, flexShrink: 0 }}>{num}</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: '2px 0 2px' }}>{title}</p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, background: '#0a1316', borderRadius: 8, padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#8fbfc2' }}>
            <p style={{ margin: '0 0 6px', color: '#6b7280' }}># .env.local — adicione estas variáveis:</p>
            <p style={{ margin: '2px 0', color: '#e2e8f0' }}>HUBSPOT_CLIENT_ID=seu-client-id</p>
            <p style={{ margin: '2px 0', color: '#e2e8f0' }}>HUBSPOT_CLIENT_SECRET=seu-client-secret</p>
            <p style={{ margin: '2px 0', color: '#e2e8f0' }}>HUBSPOT_REDIRECT_URI=http://localhost:3000/api/hubspot/auth/callback</p>
            <p style={{ margin: '2px 0', color: '#e2e8f0' }}>HUBSPOT_ENCRYPTION_KEY=gere-com-openssl-rand-hex-32</p>
          </div>
        </div>
      )}
    </div>
  )
}
