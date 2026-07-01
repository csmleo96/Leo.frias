import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { encrypt, decrypt, hash } from './secrets'
import type { VaultFile, StorageUsage } from '@/types/vault'

// ── Vault Storage ─────────────────────────────────────────────────────────────
// All vault paths are relative to the project root's /vault directory.

function vaultPath(...parts: string[]): string {
  return join(process.cwd(), 'vault', ...parts)
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

// ── JSON Storage ──────────────────────────────────────────────────────────────

export function readJson<T>(relativePath: string, fallback?: T): T {
  const fullPath = vaultPath(relativePath)
  if (!existsSync(fullPath)) {
    if (fallback !== undefined) return fallback
    throw new Error(`Vault file not found: ${relativePath}`)
  }
  const raw = readFileSync(fullPath, 'utf-8')
  return JSON.parse(raw) as T
}

export function writeJson<T>(relativePath: string, data: T): void {
  const fullPath = vaultPath(relativePath)
  ensureDir(fullPath)
  writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8')
}

// ── Encrypted Storage (for sensitive metadata only) ───────────────────────────

export function readEncrypted<T>(relativePath: string, fallback?: T): T {
  const fullPath = vaultPath(relativePath)
  if (!existsSync(fullPath)) {
    if (fallback !== undefined) return fallback
    throw new Error(`Encrypted vault file not found: ${relativePath}`)
  }
  const raw = readFileSync(fullPath, 'utf-8')
  const decrypted = decrypt(raw.trim())
  return JSON.parse(decrypted) as T
}

export function writeEncrypted<T>(relativePath: string, data: T): void {
  const fullPath = vaultPath(relativePath)
  ensureDir(fullPath)
  const json = JSON.stringify(data, null, 2)
  writeFileSync(fullPath, encrypt(json), 'utf-8')
}

// ── File Listing ──────────────────────────────────────────────────────────────

export function listFiles(relativePath: string): VaultFile[] {
  const fullPath = vaultPath(relativePath)
  if (!existsSync(fullPath)) return []

  const entries = readdirSync(fullPath, { withFileTypes: true })
  return entries
    .filter(e => e.isFile())
    .map(e => {
      const filePath = join(fullPath, e.name)
      const stat = statSync(filePath)
      return {
        path: join(relativePath, e.name),
        name: e.name,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
        encrypted: e.name.endsWith('.enc'),
      }
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
}

// ── Storage Usage ─────────────────────────────────────────────────────────────

function dirSize(dirPath: string): number {
  if (!existsSync(dirPath)) return 0
  let total = 0
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const full = join(dirPath, entry.name)
    if (entry.isDirectory()) total += dirSize(full)
    else total += statSync(full).size
  }
  return total
}

export function getStorageUsage(): StorageUsage {
  const vaultRoot = vaultPath('')
  const sections = [
    'config', 'integrations', 'reports', 'customers', 'monitoring',
    'dashboards', 'logs', 'audit', 'backups', 'temp', 'exports',
    'documents', 'ai', 'security',
  ]

  const breakdown: Record<string, number> = {}
  let totalBytes = 0

  for (const section of sections) {
    const sectionBytes = dirSize(join(vaultRoot, section))
    breakdown[section] = sectionBytes
    totalBytes += sectionBytes
  }

  const GB = 1024 ** 3
  return {
    totalGb: 0,   // physical disk — available from OS metrics
    usedGb: parseFloat((totalBytes / GB).toFixed(4)),
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, parseFloat((v / GB).toFixed(6))])
    ),
  }
}

// ── Checksum ──────────────────────────────────────────────────────────────────

export function checksumFile(relativePath: string): string {
  const fullPath = vaultPath(relativePath)
  const content = readFileSync(fullPath, 'utf-8')
  return hash(content)
}

export function exists(relativePath: string): boolean {
  return existsSync(vaultPath(relativePath))
}
