import { NextRequest, NextResponse } from 'next/server'
import { graphFetch } from '@/lib/microsoft-graph'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { teamId, channelId, body } = await request.json()
  if (!channelId || !body) {
    return NextResponse.json({ error: 'channelId e body são obrigatórios' }, { status: 400 })
  }

  const result = await graphFetch(`/teams/${teamId}/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body: { contentType: 'text', content: body } }),
  })

  if (!result) return NextResponse.json({ error: 'Falha ao enviar mensagem' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
