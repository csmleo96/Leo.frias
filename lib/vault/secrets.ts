import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

// ── AES-256-GCM Encryption ────────────────────────────────────────────────────
// Credentials NEVER leave .env.local.
// This module only encrypts/decrypts metadata stored in vault files.
// Raw secrets (tokens, passwords, API keys) are read exclusively from env vars.

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32  // 256 bits
const IV_LENGTH  = 12  // 96 bits — recommended for GCM
const TAG_LENGTH = 16  // 128 bits — GCM auth tag

function deriveKey(): Buffer {
  const raw = process.env.VAULT_ENCRYPTION_KEY
  if (!raw) {
    // Derive a deterministic key from app secret for non-sensitive metadata.
    // Sensitive data (credentials) always stays in env vars — never encrypted here.
    const fallback = process.env.NEXTAUTH_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || 'vault-dev-key'
    return createHash('sha256').update(fallback).digest()
  }
  if (raw.length < KEY_LENGTH) {
    return createHash('sha256').update(raw).digest()
  }
  return Buffer.from(raw.slice(0, KEY_LENGTH * 2), 'hex')
}

export function encrypt(plaintext: string): string {
  const key = deriveKey()
  const iv  = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Format: iv(hex):tag(hex):ciphertext(hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':')
  if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid ciphertext format')

  const key       = deriveKey()
  const iv        = Buffer.from(ivHex, 'hex')
  const tag       = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(dataHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(tag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8')
}

export function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

// ── Safe env reader — never exposes values, only presence ─────────────────────

export function getEnvKeys(): Record<string, boolean> {
  const sensitiveKeys = [
    'SMTP_PASS', 'RESEND_API_KEY', 'HUBSPOT_API_KEY', 'HUBSPOT_CLIENT_SECRET',
    'JIRA_API_TOKEN', 'MICROSOFT_CLIENT_SECRET', 'GLPI_USER_TOKEN', 'GLPI_APP_TOKEN',
    'ZABBIX_PASS', 'WHATSAPP_ACCESS_TOKEN', 'HUBSPOT_ENCRYPTION_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]
  return Object.fromEntries(
    sensitiveKeys.map(k => [k, !!process.env[k]])
  )
}

export function getIntegrationStatus(slug: string): 'configured' | 'missing' {
  const required: Record<string, string[]> = {
    zabbix:     ['ZABBIX_API_URL', 'ZABBIX_USER', 'ZABBIX_PASS'],
    glpi:       ['GLPI_URL', 'GLPI_APP_TOKEN', 'GLPI_USER_TOKEN'],
    jira:       ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'],
    hubspot:    ['HUBSPOT_API_KEY'],
    microsoft:  ['MICROSOFT_CLIENT_ID', 'MICROSOFT_TENANT_ID', 'MICROSOFT_CLIENT_SECRET'],
    smtp:       ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'],
    whatsapp:   ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
    supabase:   ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
  }
  const keys = required[slug] ?? []
  return keys.every(k => !!process.env[k]) ? 'configured' : 'missing'
}
