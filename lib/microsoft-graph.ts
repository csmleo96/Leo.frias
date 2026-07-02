// Microsoft Graph API helpers — token stored in cookie 'ms_token'
import { cookies } from 'next/headers'

export const GRAPH = 'https://graph.microsoft.com/v1.0'

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET
const TENANT_ID = process.env.MICROSOFT_TENANT_ID
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/microsoft/callback`

export function isConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET && TENANT_ID)
}

export function getAuthUrl(scope: string = 'mail') {
  const scopes = scope === 'teams'
    ? 'openid profile email offline_access Mail.ReadWrite Mail.Send User.Read Chat.ReadWrite ChannelMessage.Read.All Presence.Read.All'
    : 'openid profile email offline_access Mail.ReadWrite Mail.Send User.Read'

  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    response_mode: 'query',
  })
  return `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`
}

export async function exchangeCode(code: string) {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

export async function refreshToken(refresh: string) {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies()
  const token = jar.get('ms_access_token')?.value
  const exp = jar.get('ms_token_exp')?.value
  const refresh = jar.get('ms_refresh_token')?.value

  if (token && exp && Date.now() < Number(exp) - 60000) return token

  if (refresh) {
    const data = await refreshToken(refresh)
    if (data.access_token) {
      const _response_headers = new Headers()
      const _exp = String(Date.now() + data.expires_in * 1000)
      return data.access_token
    }
  }
  return null
}

export async function graphFetch(path: string, options?: RequestInit) {
  const token = await getAccessToken()
  if (!token) return null
  const res = await fetch(`${GRAPH}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}
