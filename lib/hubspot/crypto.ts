import crypto from 'crypto'

const KEY_HEX = process.env.HUBSPOT_ENCRYPTION_KEY ?? ''

function getKey(): Buffer {
  if (KEY_HEX.length === 64) return Buffer.from(KEY_HEX, 'hex')
  // Fallback: derive 32-byte key from any string
  return crypto.createHash('sha256').update(KEY_HEX || 'hubspot-fallback-key-change-me').digest()
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

export function decrypt(encoded: string): string {
  try {
    const key = getKey()
    const buf = Buffer.from(encoded, 'base64url')
    const iv = buf.subarray(0, 16)
    const tag = buf.subarray(16, 32)
    const encrypted = buf.subarray(32)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  } catch {
    throw new Error('Falha ao descriptografar token HubSpot — verifique HUBSPOT_ENCRYPTION_KEY')
  }
}
