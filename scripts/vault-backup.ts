#!/usr/bin/env tsx
/**
 * vault-backup.ts
 * Run: npx tsx scripts/vault-backup.ts [daily|weekly|monthly]
 * Or via N8N HTTP webhook: POST /api/vault/backups/run
 */

import { existsSync, mkdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

type Frequency = 'daily' | 'weekly' | 'monthly'

const VAULT_ROOT = join(process.cwd(), 'vault')

function timeStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

async function runBackup(frequency: Frequency): Promise<void> {
  const backupDir = join(VAULT_ROOT, 'backups', frequency)
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })

  const backupId   = randomUUID()
  const fileName   = `vault-${frequency}-${timeStamp()}.json.gz`
  const destFile   = join(backupDir, fileName)

  console.log(`[vault-backup] Starting ${frequency} backup → ${destFile}`)
  const start = Date.now()

  try {
    // Export vault config + reports registry as JSON (not binary files)
    const snapshot = {
      id:        backupId,
      frequency,
      createdAt: new Date().toISOString(),
      config:    JSON.parse(
        existsSync(join(VAULT_ROOT, 'config', 'vault.config.json'))
          ? readFileSync(join(VAULT_ROOT, 'config', 'vault.config.json'), 'utf-8')
          : '{}'
      ),
    }

    const { writeFileSync } = await import('fs')
    const { gzipSync } = await import('zlib')
    const compressed = gzipSync(JSON.stringify(snapshot, null, 2))
    writeFileSync(destFile, compressed)

    const duration = ((Date.now() - start) / 1000).toFixed(1)
    const size = statSync(destFile).size
    console.log(`[vault-backup] ✅ Done in ${duration}s — ${(size / 1024).toFixed(1)}KB → ${fileName}`)
  } catch (err) {
    console.error(`[vault-backup] ❌ Failed:`, err)
    process.exit(1)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const freq = (process.argv[2] ?? 'daily') as Frequency
if (!['daily', 'weekly', 'monthly'].includes(freq)) {
  console.error('Usage: vault-backup.ts [daily|weekly|monthly]')
  process.exit(1)
}

runBackup(freq)
