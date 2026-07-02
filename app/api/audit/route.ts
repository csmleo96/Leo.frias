import { NextRequest, NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

function sb() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? 100)
  const level = searchParams.get('level')
  const moduleFilter = searchParams.get('module')

  let q = sb().from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit)
  if (level) q = q.eq('level', level)
  if (moduleFilter) q = q.eq('module', moduleFilter)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, module = 'system', description, metadata, level = 'info' } = body
  if (!action) return NextResponse.json({ error: 'action obrigatório' }, { status: 400 })

  const { error } = await sb().from('audit_log').insert({ action, module, description, metadata, level })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
