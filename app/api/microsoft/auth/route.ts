import { NextRequest, NextResponse } from 'next/server'
import { isConfigured, getAuthUrl } from '@/lib/microsoft-graph'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({
      error: 'Configure MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET e MICROSOFT_TENANT_ID no .env.local'
    }, { status: 500 })
  }
  const scope = request.nextUrl.searchParams.get('scope') ?? 'mail'
  return NextResponse.redirect(getAuthUrl(scope))
}
