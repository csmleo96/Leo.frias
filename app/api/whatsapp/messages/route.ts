import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json({ messages: [] })

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const sb = await createClient()
    const { data } = await sb
      .from('whatsapp_messages')
      .select('*')
      .eq('phone', phone)
      .order('timestamp', { ascending: true })
      .limit(100)

    return NextResponse.json({ messages: data ?? [] })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}
