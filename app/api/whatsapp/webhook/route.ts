import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN

// Webhook verification (GET)
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// Incoming messages (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages ?? []

    if (messages.length > 0) {
      const { createClient } = await import('@/lib/supabase/server')
      const sb = await createClient()

      for (const msg of messages) {
        const phone = msg.from
        const text = msg.text?.body ?? msg.type

        // Upsert conversation
        await sb.from('whatsapp_conversations').upsert({
          phone,
          name: value.contacts?.[0]?.profile?.name ?? phone,
          last_message: text,
          last_message_at: new Date(Number(msg.timestamp) * 1000).toISOString(),
          unread: 1,
        }, { onConflict: 'phone' })

        // Insert message
        await sb.from('whatsapp_messages').insert({
          phone,
          message_id: msg.id,
          body: text,
          type: 'received',
          timestamp: Number(msg.timestamp),
        })
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
