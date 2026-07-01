'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, Activity, Zap, Settings, Shield,
  ChevronDown, ChevronRight, Gauge,
  Eye, ClipboardList, FolderOpen, FileText, HardDrive,
  Plug, Brain, Lock, Wrench, BarChart3, Building2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

interface NavGroup {
  key: string
  label: string
  icon: React.ElementType
  href: string
  children: NavItem[]
}

// ── Navigation Structure ──────────────────────────────────────────────────────

const MAIN_NAV: NavItem[] = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/crm',       label: 'CRM',       icon: Users },
  { href: '/operacoes', label: 'Operações', icon: Activity },
  { href: '/datadog',   label: 'Datadog',   icon: Gauge },
  { href: '/automacao', label: 'Automação', icon: Zap },
]

const VAULT_NAV: NavGroup = {
  key:   'vault',
  label: 'Vault',
  icon:  Shield,
  href:  '/vault',
  children: [
    { href: '/vault',              label: 'Visão Geral',  icon: Eye },
    { href: '/vault/audit',        label: 'Auditoria',    icon: ClipboardList },
    { href: '/vault/customers',    label: 'Clientes',     icon: Building2 },
    { href: '/vault/reports',      label: 'Relatórios',   icon: FileText },
    { href: '/vault/backups',      label: 'Backups',      icon: HardDrive },
    { href: '/vault/integrations', label: 'Integrações',  icon: Plug },
    { href: '/vault/ai',           label: 'IA',           icon: Brain },
    { href: '/vault/security',     label: 'Segurança',    icon: Lock },
    { href: '/vault/storage',      label: 'Storage',      icon: BarChart3 },
    { href: '/vault/config',       label: 'Configuração', icon: Wrench },
  ],
}

const CUSTOMER_NAV: NavItem[] = [
  { href: '/vault/customers/connectpsp',   label: 'ConnectPSP',   icon: FolderOpen },
  { href: '/vault/customers/csce',         label: 'CSCE',         icon: FolderOpen },
  { href: '/vault/customers/hospitalabc',  label: 'Hospital ABC', icon: FolderOpen },
  { href: '/vault/customers/ticketsports', label: 'Ticket Sports',icon: FolderOpen },
  { href: '/vault/customers/lotus',        label: 'Lotus',        icon: FolderOpen },
]

// ── Style tokens ──────────────────────────────────────────────────────────────

const S = {
  sidebar:    { width: '240px', background: '#0a1316', borderRight: '1px solid rgba(143,191,194,0.08)' },
  label:      { fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(143,191,194,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, padding: '0 12px', marginBottom: '4px', marginTop: '16px', display: 'block' },
  linkBase:   { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s', cursor: 'pointer', borderLeft: '2px solid transparent' },
  linkActive: { background: 'rgba(143,191,194,0.12)', color: '#8fbfc2', borderLeft: '2px solid #8fbfc2' },
  linkIdle:   { color: 'rgba(243,250,250,0.45)' },
  subLink:    { padding: '7px 12px 7px 28px', fontSize: '12px' },
  subSubLink: { padding: '6px 12px 6px 44px', fontSize: '11px' },
  amber:      { color: '#F5A300', borderLeftColor: '#F5A300', background: 'rgba(245,163,0,0.08)' },
}

// ── NavLink ───────────────────────────────────────────────────────────────────

function NavLink({
  href, label, icon: Icon, pathname,
  style = {},
}: NavItem & { pathname: string; style?: React.CSSProperties }) {
  const isActive = pathname === href
  return (
    <Link
      href={href}
      style={{
        ...S.linkBase,
        ...(isActive ? S.linkActive : S.linkIdle),
        ...style,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          const el = e.currentTarget as HTMLElement
          el.style.color = 'rgba(243,250,250,0.8)'
          el.style.background = 'rgba(255,255,255,0.04)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          const el = e.currentTarget as HTMLElement
          el.style.color = 'rgba(243,250,250,0.45)'
          el.style.background = 'transparent'
        }
      }}
    >
      <Icon size={15} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </Link>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const isOnVault = pathname.startsWith('/vault')
  const isOnCustomers = pathname.startsWith('/vault/customers/')

  const [vaultOpen, setVaultOpen] = useState(isOnVault)
  const [customersOpen, setCustomersOpen] = useState(isOnCustomers)

  // Auto-expand when navigating into vault
  useEffect(() => {
    if (isOnVault) setVaultOpen(true)
    if (isOnCustomers) setCustomersOpen(true)
  }, [isOnVault, isOnCustomers])

  return (
    <aside className="flex flex-col shrink-0 min-h-screen overflow-y-auto" style={S.sidebar}>

      {/* Logo */}
      <div style={{ padding: '20px 20px 12px' }}>
        <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.14em', color: '#f3fafa', display: 'block' }}>
          XTENT
        </span>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 500 }}>Online</span>
        </div>
      </div>

      <nav style={{ padding: '0 8px 24px', flex: 1 }}>

        {/* ── PRINCIPAL ────────────────────────────────────────────────── */}
        <span style={S.label}>Principal</span>
        {MAIN_NAV.map(item => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}

        {/* ── VAULT ────────────────────────────────────────────────────── */}
        <span style={S.label}>Vault</span>

        {/* Vault toggle header */}
        <button
          onClick={() => setVaultOpen(o => !o)}
          style={{
            ...S.linkBase,
            width: '100%',
            background: 'none',
            border: 'none',
            justifyContent: 'space-between',
            ...(isOnVault ? S.amber : S.linkIdle),
          }}
          onMouseEnter={e => {
            if (!isOnVault) {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'rgba(243,250,250,0.8)'
              el.style.background = 'rgba(255,255,255,0.04)'
            }
          }}
          onMouseLeave={e => {
            if (!isOnVault) {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'rgba(243,250,250,0.45)'
              el.style.background = 'transparent'
            }
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={15} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>Vault</span>
          </span>
          {vaultOpen
            ? <ChevronDown size={13} style={{ opacity: 0.5 }} />
            : <ChevronRight size={13} style={{ opacity: 0.5 }} />
          }
        </button>

        {/* Vault sub-items */}
        {vaultOpen && (
          <div style={{ marginTop: 2 }}>
            {VAULT_NAV.children.map(item => {

              // "Clientes" gets its own collapsible
              if (item.href === '/vault/customers') {
                const isCliActive = pathname === '/vault/customers' || isOnCustomers
                return (
                  <div key={item.href}>
                    <button
                      onClick={() => setCustomersOpen(o => !o)}
                      style={{
                        ...S.linkBase,
                        ...S.subLink,
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        justifyContent: 'space-between',
                        ...(isCliActive ? S.linkActive : S.linkIdle),
                      }}
                      onMouseEnter={e => {
                        if (!isCliActive) {
                          const el = e.currentTarget as HTMLElement
                          el.style.color = 'rgba(243,250,250,0.8)'
                          el.style.background = 'rgba(255,255,255,0.04)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isCliActive) {
                          const el = e.currentTarget as HTMLElement
                          el.style.color = 'rgba(243,250,250,0.45)'
                          el.style.background = 'transparent'
                        }
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Building2 size={13} style={{ flexShrink: 0 }} />
                        <span>Clientes</span>
                      </span>
                      {customersOpen
                        ? <ChevronDown size={12} style={{ opacity: 0.5 }} />
                        : <ChevronRight size={12} style={{ opacity: 0.5 }} />
                      }
                    </button>

                    {/* Customer sub-items */}
                    {customersOpen && (
                      <div>
                        {CUSTOMER_NAV.map(c => (
                          <NavLink
                            key={c.href} {...c} pathname={pathname}
                            style={S.subSubLink}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.href} {...item} pathname={pathname}
                  style={S.subLink}
                />
              )
            })}
          </div>
        )}
      </nav>

      {/* Bottom — settings */}
      <div style={{ padding: '0 8px 20px' }}>
        <div style={{ borderTop: '1px solid rgba(143,191,194,0.06)', paddingTop: 16, marginBottom: 8 }} />
        <Link
          href="/hubspot/settings"
          style={{
            display: 'block',
            background: 'rgba(143,191,194,0.04)',
            border: '1px solid rgba(143,191,194,0.08)',
            borderRadius: '10px',
            padding: '10px 12px',
            textDecoration: 'none',
          }}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <Settings size={13} style={{ color: 'rgba(243,250,250,0.3)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(243,250,250,0.3)', fontWeight: 500 }}>Configurações</span>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(243,250,250,0.2)', marginTop: 2 }}>v2.0 · Cockpit</p>
        </Link>
      </div>
    </aside>
  )
}
