import { NextResponse } from 'next/server'
import { SCOPES } from '@/lib/hubspot/client'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function GET() {
  const clientId = process.env.HUBSPOT_CLIENT_ID
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Configure HUBSPOT_CLIENT_ID e HUBSPOT_REDIRECT_URI no .env.local' }, { status: 500 })
  }

  const codeVerifier = base64url(crypto.randomBytes(32))
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest())
  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const authUrl = `https://app.hubspot.com/oauth/authorize?${params}`
  const response = NextResponse.redirect(authUrl)

  response.cookies.set('hs_pkce_verifier', codeVerifier, {
    httpOnly: true, secure: false, sameSite: 'lax', maxAge: 600,
  })
  response.cookies.set('hs_oauth_state', state, {
    httpOnly: true, secure: false, sameSite: 'lax', maxAge: 600,
  })

  return response
}
