#!/usr/bin/env tsx
/**
 * vault-backup.ts
 * Run: npx tsx scripts/vault-backup.ts [daily|weekly|monthly]
 * Or via N8N HTTP webhook: POST /api/vault/backups/run
 */

import { createReadStream, createWriteStream, readdirSync, statSync, existsSync, mkdirSync } from 'fs'
import { join, relative } from 'path'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { randomUUID } from 'crypto'

type Frequency = 'daily' | 'weekly' | 'monthly'

const VAULT_ROOT = join(process.cwd(), 'vault')
const RETENTION_DAYS: Record<Frequency, number> = {
  daily:   30,
  weekly:  90,
  monthly: 365,
}

const EXCLUDE_DIRS = ['secrets', 'temp']

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function timeStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

async function createTarGz(sourceDir: string, destFile: string): Promise<number> {
  // Simple file-by-file compression (no native tar — cross-platform)
  const { createWriteStream: cws } = await import('fs')
  const { createGzip: cg } = await import('zlib')
  const gz = cg({ level: 6 })
  const out = cws(destFile)

  let totalSize = 0
  const files: string[] = []

  function walkDir(dir: string) {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      const rel  = relative(sourceDir, full)
      if (EXCLUDE_DIRS.some(ex => rel.startsWith(ex))) continue
      if (entry.isDirectory()) walkDir(full)
      else files.push(full)
    }
  }
  walkDir(sourceDir)

  // Write manifest header
  const manifest = JSON.stringify({
    createdAt:  new Date().toISOString(),
    fileCount:  files.length,
    sourceDir,
  }) + '\n---\n'

  gz.pipe(out)
  gz.write(manifest)

  for (const f of files) {
    const stat = statSync(f)
    totalSize += stat.size
    const rel = relative(sourceDir, f)
    gz.write(`\n=== FILE: ${rel} (${stat.size} bytes) ===\n`)
    const content = await import('fs').then(m => m.readFileSync(f, 'utf-8').catch?.() ?? '')
    gz.write(String(content))
  }

  gz.end()
  await new Promise((res, rej) => out.on('finish', res).on('error', rej))
  return totalSize
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
          ? require('fs').readFileSync(join(VAULT_ROOT, 'config', 'vault.config.json'), 'utf-8')
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
