import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/microsoft-graph'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/outlook?error=no_code', request.url))
  }

  const data = await exchangeCode(code)
  if (!data.access_token) {
    return NextResponse.redirect(new URL('/outlook?error=token_exchange_failed', request.url))
  }

  const exp = String(Date.now() + (data.expires_in ?? 3600) * 1000)
  const res = NextResponse.redirect(new URL('/outlook', request.url))

  const cookieOpts = { httpOnly: true, secure: false, path: '/', maxAge: 60 * 60 * 24 * 30 } as const
  res.cookies.set('ms_access_token', data.access_token, { ...cookieOpts, maxAge: data.expires_in ?? 3600 })
  res.cookies.set('ms_refresh_token', data.refresh_token ?? '', cookieOpts)
  res.cookies.set('ms_token_exp', exp, cookieOpts)

  return res
}
