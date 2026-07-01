'use client'

import { useState } from 'react'

const notifications = [
  {
    id: 'new-lead',
    icon: '👤',
    title: 'Novo Lead HubSpot detectado',
    description: 'Alerta quando um novo lead é criado no HubSpot CRM.',
  },
  {
    id: 'deal-won',
    icon: '🏆',
    title: 'Negócio Ganho — alerta imediato',
    description: 'Notificação instantânea quando um negócio é marcado como ganho.',
  },
  {
    id: 'critical-ticket',
    icon: '🚨',
    title: 'Ticket Crítico no GLPI',
    description: 'Alerta para tickets com prioridade crítica ou urgente no GLPI.',
  },
  {
    id: 'daily-report',
    icon: '📊',
    title: 'Relatório Diário (08:00)',
    description: 'Resumo diário de métricas e atividades enviado às 08h.',
  },
  {
    id: 'sla-expiring',
    icon: '⏰',
    title: 'SLA Vencendo em 1h',
    description: 'Aviso quando um ticket está a 1 hora de violar o SLA.',
  },
  {
    id: 'new-onboarding',
    icon: '🚀',
    title: 'Novo Cliente em Onboarding',
    description: 'Notificação quando um cliente entra na fase de onboarding.',
  },
]

const steps = [
  'Abra o Telegram e procure @BotFather',
  'Envie /newbot e siga as instruções',
  'Copie o Bot Token gerado',
  'Adicione o bot a um grupo ou canal',
  'Envie uma mensagem no grupo e acesse: api.telegram.org/bot{TOKEN}/getUpdates',
  'Copie o Chat ID da resposta',
  'Adicione ao .env.local: TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID',
]

export default function TelegramPage() {
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div
      style={{ backgroundColor: '#0a1316', minHeight: '100vh', color: '#e2e8f0' }}
      className="p-6 md:p-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: '#0d2137' }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          >
            ✈️
          </div>
          <h1 className="text-2xl font-bold text-white">Telegram</h1>
        </div>
        <span
          style={{
            backgroundColor: 'rgba(251, 146, 60, 0.15)',
            color: '#fb923c',
            border: '1px solid rgba(251, 146, 60, 0.3)',
          }}
          className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide"
        >
          Em breve
        </span>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Status Card */}
        <div
          style={{ backgroundColor: '#0d1f26', border: '1px solid #1e3a47' }}
          className="rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
              >
                <span style={{ color: '#ef4444' }} className="text-sm">✗</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Status da integração</p>
                <p style={{ color: '#94a3b8' }} className="text-xs">Nenhum bot configurado</p>
              </div>
            </div>
            <span
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)' }}
              className="px-2.5 py-1 rounded-full text-xs font-medium"
            >
              Não configurado
            </span>
          </div>

          {/* Setup Guide Toggle */}
          <button
            onClick={() => setGuideOpen(!guideOpen)}
            style={{
              backgroundColor: 'rgba(251, 146, 60, 0.08)',
              border: '1px solid rgba(251, 146, 60, 0.2)',
              color: '#fb923c',
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-orange-500/10"
          >
            <span className="flex items-center gap-2">
              <span>📋</span>
              Guia de Configuração
            </span>
            <span
              style={{ transition: 'transform 0.2s', transform: guideOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              ▾
            </span>
          </button>

          {guideOpen && (
            <div
              style={{ backgroundColor: '#091419', border: '1px solid #1a3040' }}
              className="mt-3 rounded-lg p-4"
            >
              <p style={{ color: '#94a3b8' }} className="text-xs font-semibold uppercase tracking-wider mb-3">
                Passo a passo
              </p>
              <ol className="space-y-2.5">
                {steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span
                      style={{
                        backgroundColor: 'rgba(251, 146, 60, 0.15)',
                        color: '#fb923c',
                        border: '1px solid rgba(251, 146, 60, 0.25)',
                        minWidth: '22px',
                        height: '22px',
                      }}
                      className="rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    >
                      {index + 1}
                    </span>
                    <span style={{ color: '#cbd5e1' }} className="text-sm leading-relaxed">
                      {step.includes('api.telegram.org') ? (
                        <>
                          Envie uma mensagem no grupo e acesse:{' '}
                          <code
                            style={{ backgroundColor: '#0d2137', color: '#38bdf8' }}
                            className="px-1.5 py-0.5 rounded text-xs font-mono"
                          >
                            api.telegram.org/bot&#123;TOKEN&#125;/getUpdates
                          </code>
                        </>
                      ) : step.includes('TELEGRAM_BOT_TOKEN') ? (
                        <>
                          Adicione ao{' '}
                          <code
                            style={{ backgroundColor: '#0d2137', color: '#38bdf8' }}
                            className="px-1.5 py-0.5 rounded text-xs font-mono"
                          >
                            .env.local
                          </code>
                          :{' '}
                          <code
                            style={{ backgroundColor: '#0d2137', color: '#a78bfa' }}
                            className="px-1.5 py-0.5 rounded text-xs font-mono"
                          >
                            TELEGRAM_BOT_TOKEN
                          </code>{' '}
                          e{' '}
                          <code
                            style={{ backgroundColor: '#0d2137', color: '#a78bfa' }}
                            className="px-1.5 py-0.5 rounded text-xs font-mono"
                          >
                            TELEGRAM_CHAT_ID
                          </code>
                        </>
                      ) : (
                        step
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Config Form */}
        <div
          style={{ backgroundColor: '#0d1f26', border: '1px solid #1e3a47' }}
          className="rounded-xl p-5"
        >
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span>⚙️</span>
            Configuração do Bot
          </h2>

          <div className="space-y-4">
            <div>
              <label style={{ color: '#94a3b8' }} className="block text-xs font-medium mb-1.5 uppercase tracking-wide">
                Bot Token
              </label>
              <input
                type="password"
                disabled
                placeholder="Aguardando configuração"
                style={{
                  backgroundColor: '#091419',
                  border: '1px solid #1a3040',
                  color: '#475569',
                  cursor: 'not-allowed',
                }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none placeholder:text-slate-600"
              />
              <p style={{ color: '#475569' }} className="text-xs mt-1">
                Obtido via @BotFather no Telegram
              </p>
            </div>

            <div>
              <label style={{ color: '#94a3b8' }} className="block text-xs font-medium mb-1.5 uppercase tracking-wide">
                Chat ID
              </label>
              <input
                type="text"
                disabled
                placeholder="Ex: -100123456789"
                style={{
                  backgroundColor: '#091419',
                  border: '1px solid #1a3040',
                  color: '#475569',
                  cursor: 'not-allowed',
                }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none placeholder:text-slate-600"
              />
              <p style={{ color: '#475569' }} className="text-xs mt-1">
                ID do grupo ou canal onde as notificacoes serao enviadas
              </p>
            </div>

            <button
              disabled
              style={{
                backgroundColor: '#1a3040',
                color: '#475569',
                cursor: 'not-allowed',
                border: '1px solid #1e3a47',
              }}
              className="w-full py-2.5 rounded-lg text-sm font-medium"
            >
              Salvar Configuracao
            </button>
          </div>
        </div>

        {/* Notification Cards */}
        <div
          style={{ backgroundColor: '#0d1f26', border: '1px solid #1e3a47' }}
          className="rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <span>🔔</span>
              Notificacoes Configuradas
            </h2>
            <span
              style={{ backgroundColor: '#1a3040', color: '#475569', border: '1px solid #1e3a47' }}
              className="px-2 py-0.5 rounded text-xs"
            >
              {notifications.length} notificacoes
            </span>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  backgroundColor: '#091419',
                  border: '1px solid #1a3040',
                  opacity: 0.6,
                }}
                className="rounded-lg px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    style={{ backgroundColor: '#0d1f26', border: '1px solid #1a3040' }}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  >
                    {notif.icon}
                  </span>
                  <div className="min-w-0">
                    <p style={{ color: '#64748b' }} className="text-sm font-medium truncate">
                      {notif.title}
                    </p>
                    <p style={{ color: '#334155' }} className="text-xs mt-0.5 truncate">
                      {notif.description}
                    </p>
                  </div>
                </div>

                {/* Toggle (disabled, off state) */}
                <div className="flex-shrink-0">
                  <div
                    style={{
                      width: '40px',
                      height: '22px',
                      backgroundColor: '#1a3040',
                      border: '1px solid #1e3a47',
                      borderRadius: '9999px',
                      position: 'relative',
                      cursor: 'not-allowed',
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: '#334155',
                        borderRadius: '9999px',
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        transition: 'left 0.2s',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p style={{ color: '#334155' }} className="text-xs text-center mt-4">
            As notificacoes serao habilitadas apos a configuracao do bot
          </p>
        </div>
      </div>
    </div>
  )
}
