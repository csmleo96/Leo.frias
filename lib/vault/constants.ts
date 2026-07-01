import type { VaultRole, VaultPermission, CustomerSlug } from '@/types/vault'

// ── Permission Matrix ─────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<VaultRole, VaultPermission[]> = {
  admin: [
    'reports.read', 'reports.write',
    'customers.read', 'customers.write',
    'integrations.read', 'integrations.write',
    'monitoring.read',
    'backups.read', 'backups.write',
    'audit.read',
    'logs.read',
    'secrets.read', 'secrets.write',
    'ai.read', 'ai.write',
    'config.read', 'config.write',
    'security.read', 'security.write',
  ],
  customer_success: [
    'reports.read', 'reports.write',
    'customers.read', 'customers.write',
    'monitoring.read',
    'audit.read',
    'ai.read', 'ai.write',
    'config.read',
  ],
  operations: [
    'customers.read',
    'integrations.read',
    'monitoring.read',
    'backups.read', 'backups.write',
    'logs.read',
    'config.read',
  ],
  engineering: [
    'customers.read',
    'integrations.read', 'integrations.write',
    'monitoring.read',
    'backups.read',
    'logs.read',
    'ai.read',
    'config.read', 'config.write',
  ],
  director: [
    'reports.read',
    'customers.read',
    'monitoring.read',
    'audit.read',
    'ai.read',
    'config.read',
  ],
  viewer: [
    'monitoring.read',
    'config.read',
  ],
}

export const ROLE_LABELS: Record<VaultRole, string> = {
  admin: 'Administrador',
  customer_success: 'Customer Success',
  operations: 'Operações',
  engineering: 'Engenharia',
  director: 'Diretoria',
  viewer: 'Visualização',
}

// ── Customers ─────────────────────────────────────────────────────────────────

export const CUSTOMERS: Record<CustomerSlug, { name: string; segment: string }> = {
  connectpsp:   { name: 'ConnectPSP',    segment: 'Fintech · Payment Service Provider' },
  csce:         { name: 'CSCE',          segment: 'Financial · SQL · Storage' },
  hospitalabc:  { name: 'Hospital ABC',  segment: 'Healthcare · Migração S3·MinIO' },
  ticketsports: { name: 'Ticket Sports', segment: 'SaaS · SQL · Email' },
  lotus:        { name: 'Lotus',         segment: 'Technology · MSP' },
}

export const CUSTOMER_SLUGS = Object.keys(CUSTOMERS) as CustomerSlug[]

// ── Vault Paths ───────────────────────────────────────────────────────────────

export const VAULT_ROOT = 'vault'

export const VAULT_PATHS = {
  config:      `${VAULT_ROOT}/config`,
  secrets:     `${VAULT_ROOT}/secrets`,
  security:    `${VAULT_ROOT}/security`,
  integrations: `${VAULT_ROOT}/integrations`,
  reports:     `${VAULT_ROOT}/reports`,
  customers:   `${VAULT_ROOT}/customers`,
  dashboards:  `${VAULT_ROOT}/dashboards`,
  audit:       `${VAULT_ROOT}/audit`,
  backups:     `${VAULT_ROOT}/backups`,
  temp:        `${VAULT_ROOT}/temp`,
  exports:     `${VAULT_ROOT}/exports`,
  documents:   `${VAULT_ROOT}/documents`,
  ai:          `${VAULT_ROOT}/ai`,
  logs:        `${VAULT_ROOT}/logs`,
  monitoring:  `${VAULT_ROOT}/monitoring`,
} as const

// ── Backup Retention ──────────────────────────────────────────────────────────

export const RETENTION_DAYS = {
  daily:   30,
  weekly:  90,
  monthly: 365,
} as const
