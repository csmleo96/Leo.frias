'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, DollarSign, Building2, TrendingUp,
  Layers, Headphones, BarChart2, Mail, MessageSquare, MessageCircle, Radio, Server, Brain, Bell, FileText, Clock,
} from 'lucide-react'

const sections = [
  {
    label: 'Gestão',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/tarefas', label: 'Tarefas', icon: CheckSquare },
      { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
      { href: '/clientes-xtent', label: 'Clientes Xtent', icon: Building2 },
      { href: '/prospects', label: 'Prospects', icon: TrendingUp },
    ],
  },
  {
    label: 'Operações',
    items: [
      { href: '/ia',                   label: 'Resumo Executivo',    icon: Brain },
      { href: '/reports/executive-daily', label: 'Daily Report',        icon: FileText },
      { href: '/reports/scheduled', label: 'Agendamento',        icon: Clock },
      { href: '/operacoes',            label: 'Torre de Ops',        icon: Radio },
      { href: '/zabbix',    label: 'Zabbix',       icon: Server },
      { href: '/jira',      label: 'Jira',         icon: Layers },
      { href: '/glpi',      label: 'GLPI',         icon: Headphones },
      { href: '/relatorios', label: 'Relatórios',   icon: BarChart2 },
      { href: '/notifications', label: 'Executive Board', icon: Bell },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { href: '/outlook', label: 'Outlook', icon: Mail },
      { href: '/teams', label: 'Teams', icon: MessageSquare },
      { href: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
    ],
  },
]

const BG = '#0d1a1e'
const BORDER = 'rgba(143,191,194,0.08)'
const TEAL = '#8fbfc2'
const TEAL_DIM = 'rgba(143,191,194,0.12)'
const TEAL_BORDER = 'rgba(143,191,194,0.25)'
const MUTED = 'rgba(243,250,250,0.4)'

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen flex flex-col shrink-0"
      style={{ background: BG, borderRight: `1px solid ${BORDER}` }}>

      {/* Logo */}
      <div className="px-5 py-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <span style={{
          fontFamily: 'var(--font-heading), "Space Grotesk", sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          color: '#f3fafa',
          letterSpacing: '0.08em',
        }}>
          XTENTGROUP
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {sections.map(section => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:text-white"
                    style={active ? {
                      background: TEAL_DIM,
                      color: TEAL,
                      boxShadow: `inset 2px 0 0 ${TEAL}`,
                    } : { color: MUTED }}>
                    <Icon size={15} className="shrink-0" />
                    <span>{label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: TEAL }} />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mx-3 mb-4 rounded-xl p-3" style={{ background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}` }}>
        <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
          CS Cockpit · Xtentgroup
        </p>
      </div>
    </aside>
  )
}
