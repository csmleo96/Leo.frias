// ─── Vault Leonardo CS Cockpit — Type Definitions ───────────────────────────

// ── RBAC ─────────────────────────────────────────────────────────────────────

export type VaultRole =
  | 'admin'
  | 'customer_success'
  | 'operations'
  | 'engineering'
  | 'director'
  | 'viewer'

export type VaultPermission =
  | 'reports.read'    | 'reports.write'
  | 'customers.read'  | 'customers.write'
  | 'integrations.read' | 'integrations.write'
  | 'monitoring.read'
  | 'backups.read'    | 'backups.write'
  | 'audit.read'
  | 'logs.read'
  | 'secrets.read'    | 'secrets.write'
  | 'ai.read'         | 'ai.write'
  | 'config.read'     | 'config.write'
  | 'security.read'   | 'security.write'

export interface VaultUser {
  id: string
  email: string
  name: string
  role: VaultRole
  createdAt: string
  lastLogin?: string
}

// ── CUSTOMERS ────────────────────────────────────────────────────────────────

export type CustomerSlug =
  | 'xcmg'
  | 'connectpsp'
  | 'csce'
  | 'hospitalabc'
  | 'ticketsports'
  | 'lotus'

export type CustomerStatus = 'active' | 'attention' | 'critical' | 'inactive'
export type TrafficLight = 'green' | 'yellow' | 'red' | 'gray'

export interface Customer {
  slug: CustomerSlug
  name: string
  segment: string
  status: CustomerStatus
  farol: TrafficLight
  score: number
  sla: number
  availability: number
  openTickets: number
  lastReport?: string
  contractStart?: string
  contractEnd?: string
}

// ── INTEGRATIONS ─────────────────────────────────────────────────────────────

export type IntegrationSlug =
  | 'zabbix' | 'grafana' | 'vmware' | 'veeam' | 'sql'
  | 'rabbitmq' | 'kubernetes' | 'datadog' | 'glpi' | 'jira'

export type IntegrationStatus = 'connected' | 'disconnected' | 'degraded' | 'error'

export interface IntegrationConfig {
  slug: IntegrationSlug
  name: string
  status: IntegrationStatus
  url?: string
  lastSync?: string
  errorMessage?: string
  metadata?: Record<string, string>
}

// ── AUDIT ─────────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'login' | 'logout'
  | 'report.view' | 'report.create' | 'report.send' | 'report.delete'
  | 'customer.view' | 'customer.update'
  | 'integration.connect' | 'integration.disconnect' | 'integration.sync'
  | 'backup.create' | 'backup.restore' | 'backup.delete'
  | 'config.update'
  | 'secret.access' | 'secret.rotate'
  | 'ai.generate'
  | 'export.create'

export type AuditResult = 'success' | 'failure' | 'denied'

export interface AuditLog {
  id: string
  userId?: string
  userEmail?: string
  action: AuditAction
  resource: string
  resourceId?: string
  result: AuditResult
  origin: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

// ── REPORTS ──────────────────────────────────────────────────────────────────

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'qbr' | 'executive'
export type ReportFormat = 'pdf' | 'html' | 'markdown'
export type ReportScope = 'portfolio' | CustomerSlug

export interface ReportEntry {
  id: string
  type: ReportType
  format: ReportFormat
  scope: ReportScope
  title: string
  filePath: string
  generatedBy?: string
  generatedAt: string
  sentTo?: string[]
  sentAt?: string
  sizeBytes?: number
}

// ── BACKUPS ──────────────────────────────────────────────────────────────────

export type BackupFrequency = 'daily' | 'weekly' | 'monthly'
export type BackupStatus = 'success' | 'running' | 'failed' | 'pending'

export interface BackupJob {
  id: string
  frequency: BackupFrequency
  status: BackupStatus
  startedAt?: string
  completedAt?: string
  sizeBytes?: number
  filePath?: string
  errorMessage?: string
  retentionDays: number
}

// ── HEALTH ───────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

export interface SystemHealth {
  status: HealthStatus
  checkedAt: string
  disk: {
    totalGb: number
    usedGb: number
    percentUsed: number
    status: HealthStatus
  }
  memory: {
    totalMb: number
    usedMb: number
    percentUsed: number
    status: HealthStatus
  }
  database: {
    status: HealthStatus
    latencyMs?: number
    message?: string
  }
  integrations: Array<{
    slug: IntegrationSlug
    status: IntegrationStatus
    lastSync?: string
  }>
  backups: {
    lastSuccess?: string
    status: HealthStatus
    message?: string
  }
  ai: {
    status: HealthStatus
    lastGeneration?: string
    totalGenerations?: number
  }
}

// ── AI ───────────────────────────────────────────────────────────────────────

export type AIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo'

export interface AIHistory {
  id: string
  model: AIModel
  promptTokens: number
  completionTokens: number
  totalTokens: number
  scope: ReportScope
  reportType?: ReportType
  generatedAt: string
  userId?: string
  costUsd?: number
}

// ── CONFIG ───────────────────────────────────────────────────────────────────

export interface VaultConfig {
  version: string
  updatedAt: string
  updatedBy?: string
  portal: {
    name: string
    theme: 'dark' | 'light' | 'system'
    language: string
    timezone: string
  }
  reports: {
    schedules: {
      daily: string
      weekly: string
      monthly: string
    }
    recipients: string[]
    defaultFormat: ReportFormat
  }
  backups: {
    enabled: boolean
    retentionDays: {
      daily: number
      weekly: number
      monthly: number
    }
    schedule: {
      daily: string
      weekly: string
      monthly: string
    }
  }
  ai: {
    enabled: boolean
    model: AIModel
    maxTokensPerReport: number
  }
  security: {
    sessionTimeoutMinutes: number
    requireMfa: boolean
    allowedIpRanges: string[]
  }
}

// ── VAULT STORAGE ────────────────────────────────────────────────────────────

export interface VaultFile {
  path: string
  name: string
  sizeBytes: number
  createdAt: string
  modifiedAt: string
  encrypted: boolean
  checksum?: string
}

export interface StorageUsage {
  totalGb: number
  usedGb: number
  breakdown: Record<string, number>
}
