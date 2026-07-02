import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { VaultRole, VaultPermission } from '@/types/vault'
import { ROLE_PERMISSIONS } from './constants'

// ── Role Checks ───────────────────────────────────────────────────────────────

export function hasPermission(role: VaultRole, permission: VaultPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function hasAnyPermission(role: VaultRole, permissions: VaultPermission[]): boolean {
  return permissions.some(p => hasPermission(role, p))
}

export function hasAllPermissions(role: VaultRole, permissions: VaultPermission[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}

// ── Role Resolution ───────────────────────────────────────────────────────────
// Priority: Supabase session metadata > x-vault-role header (dev only)

export async function resolveRole(req: NextRequest): Promise<VaultRole | null> {
  // 1. Try Supabase session (production path)
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.vault_role) {
      return user.user_metadata.vault_role as VaultRole
    }
    // Default authenticated users to viewer
    if (user) return 'viewer'
  } catch {
    // Supabase unavailable — fall through
  }

  // 2. Dev override header (only in non-production)
  if (process.env.NODE_ENV !== 'production') {
    const devRole = req.headers.get('x-vault-role') as VaultRole | null
    if (devRole && devRole in ROLE_PERMISSIONS) return devRole
    // Default to admin in dev so all routes work during development
    return 'admin'
  }

  return null
}

// ── Route Guard ───────────────────────────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  ctx: { role: VaultRole; params?: Record<string, string> }
) => Promise<NextResponse>

export function withRBAC(
  required: VaultPermission | VaultPermission[],
  handler: RouteHandler
) {
  return async (req: NextRequest, ctx?: { params?: Promise<Record<string, string>> }) => {
    const role = await resolveRole(req)

    if (!role) {
      return NextResponse.json({ error: 'Unauthorized', code: 401 }, { status: 401 })
    }

    const permissions = Array.isArray(required) ? required : [required]
    if (!hasAnyPermission(role, permissions)) {
      return NextResponse.json(
        { error: 'Forbidden', code: 403, required: permissions, role },
        { status: 403 }
      )
    }

    const resolvedParams = ctx?.params ? await ctx.params : undefined
    return handler(req, { role, params: resolvedParams })
  }
}
