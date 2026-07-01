import { NextRequest, NextResponse } from 'next/server'

// ── Global Proxy (Next.js 16 — replaces middleware.ts) ────────────────────────
// Vault RBAC is enforced inside each route handler via withRBAC().
// This proxy adds security headers to all responses.

export function proxy(req: NextRequest) {
  const res = NextResponse.next()

  // ── Security Headers ──────────────────────────────────────────────────────
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  // ── Vault routes — disable cache ──────────────────────────────────────────
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/api/vault') || pathname.startsWith('/vault')) {
    res.headers.set('X-Vault-Version', '1.0.0')
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
