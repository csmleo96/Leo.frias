import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

export async function GET() {
  if (!PHONE_ID || !TOKEN || TOKEN === 'seu-access-token') {
    return NextResponse.json({ notConnected: true })
  }

  // WhatsApp Cloud API doesn't provide a conversations list endpoint directly.
  // Messages are received via webhook and should be stored in DB.
  // This endpoint returns stored conversations from Supabase.
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const sb = await createClient()
    const { data } = await sb
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ conversations: data ?? [] })
  } catch {
    return NextResponse.json({ conversations: [] })
  }
}
