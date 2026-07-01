import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/hubspot/crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/hubspot/settings?error=${encodeURIComponent(error)}`, request.url))
  }
  if (!code) {
    return NextResponse.redirect(new URL('/hubspot/settings?error=no_code', request.url))
  }

  const codeVerifier = request.cookies.get('hs_pkce_verifier')?.value

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      redirect_uri: process.env.HUBSPOT_REDIRECT_URI!,
      code,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    })

    const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      throw new Error(`Token exchange failed: ${err}`)
    }

    const tokens = await tokenRes.json()

    const infoRes = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + tokens.access_token)
    const info = infoRes.ok ? await infoRes.json() : {}

    const portalId = String(info.hub_id ?? tokens.hub_id ?? 'unknown')
    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 1800) * 1000).toISOString()

    const sb = await createClient()
    await sb.from('hubspot_accounts').upsert({
      portal_id: portalId,
      hub_domain: info.hub_domain ?? null,
      hub_name: info.app_name ?? null,
      access_token_enc: encrypt(tokens.access_token),
      refresh_token_enc: encrypt(tokens.refresh_token),
      token_expires_at: expiresAt,
      scope: tokens.scope ?? null,
      is_active: true,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'portal_id' })

    await sb.from('audit_log').insert({
      action: 'hubspot_connected',
      module: 'hubspot',
      description: `HubSpot CRM conectado — portal ${portalId} (${info.hub_domain ?? 'desconhecido'})`,
      level: 'info',
    })

    const res = NextResponse.redirect(new URL('/hubspot/settings?connected=true', request.url))
    res.cookies.delete('hs_pkce_verifier')
    res.cookies.delete('hs_oauth_state')
    return res
  } catch (err: any) {
    console.error('HubSpot OAuth callback error:', err)
    return NextResponse.redirect(new URL(`/hubspot/settings?error=${encodeURIComponent(err.message)}`, request.url))
  }
}
