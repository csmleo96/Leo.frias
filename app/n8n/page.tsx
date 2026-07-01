'use client'

import {
  UserPlus,
  TrendingUp,
  AlertTriangle,
  FileText,
  BarChart3,
  Building2,
  Zap,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useState } from 'react'

interface WorkflowCard {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}

const workflows: WorkflowCard[] = [
  {
    id: 1,
    title: 'Novo Lead HubSpot → Dashboard',
    description:
      'Quando um novo contato é criado no HubSpot, atualiza o dashboard automaticamente',
    icon: <UserPlus size={20} />,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    id: 2,
    title: 'Negócio Ganho → Onboarding',
    description:
      'Deal won aciona criação da estrutura de onboarding do cliente',
    icon: <TrendingUp size={20} />,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
  },
  {
    id: 3,
    title: 'Ticket Crítico → Telegram',
    description:
      'GLPI ticket prioridade máxima dispara alerta no Telegram',
    icon: <AlertTriangle size={20} />,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
  },
  {
    id: 4,
    title: 'Relatório Diário → Email + Telegram',
    description:
      '08:00 todos os dias: envia relatório consolidado',
    icon: <FileText size={20} />,
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
  },
  {
    id: 5,
    title: 'Relatório Semanal → Email + Telegram',
    description:
      'Toda segunda-feira: relatório executivo semanal',
    icon: <BarChart3 size={20} />,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
  },
  {
    id: 6,
    title: 'Novo Cliente → Estrutura Operacional',
    description:
      "Lifecycle muda para 'customer': cria projeto no Jira e estrutura no portal",
    icon: <Building2 size={20} />,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
  },
]

export default function N8nPage() {
  const [showApiKey, setShowApiKey] = useState(false)
  const [n8nUrl, setN8nUrl] = useState('')
  const [apiKey, setApiKey] = useState('')

  const isSaveEnabled = n8nUrl.trim() !== '' && apiKey.trim() !== ''

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <Zap size={22} className="text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Automações n8n</h1>
        </div>
        <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-400 border border-orange-500/30">
          Em breve
        </span>
      </div>

      {/* Status / Setup Card */}
      <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-5 flex items-start gap-4">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-800">
            <Zap size={16} className="text-gray-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Status da Integração
            </h2>
            <p className="mt-0.5 text-sm text-gray-400">
              Nenhuma instância n8n configurada.
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-700/60 px-2.5 py-0.5 text-xs font-medium text-gray-300">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              Não configurado
            </span>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-200">
            Guia de Configuração
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* n8n URL */}
            <div>
              <label
                htmlFor="n8n-url"
                className="mb-1.5 block text-xs font-medium text-gray-400"
              >
                URL do n8n
              </label>
              <input
                id="n8n-url"
                type="url"
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="https://n8n.seudominio.com"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30"
              />
            </div>

            {/* API Key */}
            <div>
              <label
                htmlFor="api-key"
                className="mb-1.5 block text-xs font-medium text-gray-400"
              >
                API Key
              </label>
              <div className="relative">
                <input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 pr-10 text-sm text-gray-100 placeholder-gray-500 outline-none transition focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  aria-label={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="mt-5 flex justify-end">
            <button
              disabled={!isSaveEnabled}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                isSaveEnabled
                  ? 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save size={15} />
              Salvar
            </button>
          </div>
        </div>
      </div>

      {/* Workflows Section */}
      <div>
        <h2 className="mb-5 text-lg font-semibold text-white">
          Fluxos de Automação
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="flex flex-col justify-between rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-gray-700"
            >
              {/* Top */}
              <div>
                <div className="mb-3 flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${wf.iconBg}`}
                  >
                    <span className={wf.iconColor}>{wf.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold leading-snug text-white">
                      {wf.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-gray-400">
                  {wf.description}
                </p>
              </div>

              {/* Bottom */}
              <div className="mt-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-700/60 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                  Inativo
                </span>

                <button
                  disabled
                  className="rounded-lg bg-gray-800 px-3.5 py-1.5 text-xs font-semibold text-gray-500 cursor-not-allowed transition"
                >
                  Configurar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
