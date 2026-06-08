import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

export async function POST(request: NextRequest) {
  const { to, message } = await request.json()

  if (!PHONE_ID || !TOKEN) {
    return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 500 })
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: message },
      }),
    }
  )

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.error?.message ?? 'Erro ao enviar' }, { status: 500 })

  // Log sent message
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const sb = await createClient()
    await sb.from('whatsapp_messages').insert({
      phone: to,
      message_id: data.messages?.[0]?.id,
      body: message,
      type: 'sent',
      timestamp: Math.floor(Date.now() / 1000),
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
