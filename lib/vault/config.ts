import type { VaultConfig } from '@/types/vault'
import { readJson, writeJson, exists } from './storage'

const CONFIG_PATH = 'config/vault.config.json'

const DEFAULT_CONFIG: VaultConfig = {
  version:   '1.0.0',
  updatedAt: new Date().toISOString(),
  portal: {
    name:     'Leonardo CS Cockpit',
    theme:    'dark',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
  },
  reports: {
    schedules: {
      daily:   '0 7 * * 1-5',
      weekly:  '0 8 * * 1',
      monthly: '0 8 1 * *',
    },
    recipients:    ['leo.frias@xtentgroup.com', 'ribeiro@xtentgroup.com'],
    defaultFormat: 'pdf',
  },
  backups: {
    enabled: true,
    retentionDays: { daily: 30, weekly: 90, monthly: 365 },
    schedule: {
      daily:   '0 2 * * *',
      weekly:  '0 3 * * 0',
      monthly: '0 4 1 * *',
    },
  },
  ai: {
    enabled:            true,
    model:              'gpt-4o',
    maxTokensPerReport: 16000,
  },
  security: {
    sessionTimeoutMinutes: 480,
    requireMfa:            false,
    allowedIpRanges:       [],
  },
}

export function getConfig(): VaultConfig {
  if (!exists(CONFIG_PATH)) {
    writeJson(CONFIG_PATH, DEFAULT_CONFIG)
    return DEFAULT_CONFIG
  }
  return readJson<VaultConfig>(CONFIG_PATH, DEFAULT_CONFIG)
}

export function updateConfig(partial: Partial<VaultConfig>, updatedBy?: string): VaultConfig {
  const current = getConfig()
  const updated: VaultConfig = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
    updatedBy,
  }
  writeJson(CONFIG_PATH, updated)
  return updated
}
