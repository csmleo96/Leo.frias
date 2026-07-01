#!/usr/bin/env tsx
/**
 * vault-cleanup.ts — Retenção automática de backups e logs temporários.
 * Run: npx tsx scripts/vault-cleanup.ts
 * Respects RETENTION_DAYS: daily=30, weekly=90, monthly=365
 */

import { readdirSync, statSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'

const VAULT_ROOT = join(process.cwd(), 'vault')
const NOW_MS = Date.now()

const RETENTION: Record<string, number> = {
  daily:   30,
  weekly:  90,
  monthly: 365,
  temp:    1,
  exports: 7,
}

function olderThanDays(filePath: string, days: number): boolean {
  const stat = statSync(filePath)
  const ageMs = NOW_MS - stat.mtimeMs
  return ageMs > days * 24 * 60 * 60 * 1000
}

function cleanDir(dirPath: string, retentionDays: number): number {
  if (!existsSync(dirPath)) return 0
  let deleted = 0
  for (const file of readdirSync(dirPath, { withFileTypes: true })) {
    if (!file.isFile()) continue
    const full = join(dirPath, file.name)
    if (olderThanDays(full, retentionDays)) {
      unlinkSync(full)
      console.log(`[vault-cleanup] Deleted: ${full}`)
      deleted++
    }
  }
  return deleted
}

let totalDeleted = 0

for (const [section, days] of Object.entries(RETENTION)) {
  const dir = join(VAULT_ROOT, 'backups', section)
  totalDeleted += cleanDir(dir, days)
}

// Temp and exports
totalDeleted += cleanDir(join(VAULT_ROOT, 'temp'),    RETENTION.temp)
totalDeleted += cleanDir(join(VAULT_ROOT, 'exports'), RETENTION.exports)

// Logs older than 90 days
for (const logType of ['system', 'security', 'api', 'integrations', 'errors']) {
  totalDeleted += cleanDir(join(VAULT_ROOT, 'logs', logType), 90)
}

console.log(`[vault-cleanup] ✅ Cleanup complete. ${totalDeleted} files deleted.`)
