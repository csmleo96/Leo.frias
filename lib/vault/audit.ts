import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import type { AuditLog, AuditAction, AuditResult } from '@/types/vault'

// ── Vault Audit Logger ────────────────────────────────────────────────────────
// Writes to Supabase audit_log table (extends the existing schema)

interface LogParams {
  action: AuditAction
  resource: string
  resourceId?: string
  result?: AuditResult
  origin?: string
  userId?: string
  userEmail?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export async function vaultLog(params: LogParams): Promise<void> {
  const entry: AuditLog = {
    id: randomUUID(),
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId,
    result: params.result ?? 'success',
    origin: params.origin ?? 'vault',
    userId: params.userId,
    userEmail: params.userEmail,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: params.metadata,
    createdAt: new Date().toISOString(),
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    await supabase.from('audit_log').insert({
      id:           entry.id,
      action:       entry.action,
      resource:     entry.resource,
      resource_id:  entry.resourceId,
      result:       entry.result,
      origin:       entry.origin,
      user_id:      entry.userId,
      user_email:   entry.userEmail,
      ip_address:   entry.ip,
      user_agent:   entry.userAgent,
      metadata:     entry.metadata,
      created_at:   entry.createdAt,
    })
  } catch (err) {
    // Never let audit failures break the main flow — log to stderr only
    console.error('[vault:audit] Failed to write audit log:', err)
  }
}

// ── Audit Log Reader ──────────────────────────────────────────────────────────

export async function getAuditLogs(options?: {
  limit?: number
  offset?: number
  action?: AuditAction
  resource?: string
  userId?: string
  from?: string
  to?: string
}): Promise<AuditLog[]> {
  const { limit = 50, offset = 0, action, resource, userId, from, to } = options ?? {}

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action)   query = query.eq('action', action)
  if (resource) query = query.eq('resource', resource)
  if (userId)   query = query.eq('user_id', userId)
  if (from)     query = query.gte('created_at', from)
  if (to)       query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) throw new Error(`Audit log read failed: ${error.message}`)

  return (data ?? []).map(row => ({
    id:          row.id,
    userId:      row.user_id,
    userEmail:   row.user_email,
    action:      row.action,
    resource:    row.resource,
    resourceId:  row.resource_id,
    result:      row.result,
    origin:      row.origin,
    ip:          row.ip_address,
    userAgent:   row.user_agent,
    metadata:    row.metadata,
    createdAt:   row.created_at,
  }))
}
