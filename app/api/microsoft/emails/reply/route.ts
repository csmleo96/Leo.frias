import { NextRequest, NextResponse } from 'next/server'
import { graphFetch } from '@/lib/microsoft-graph'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { emailId, body } = await request.json()
  if (!emailId || !body) {
    return NextResponse.json({ error: 'emailId e body são obrigatórios' }, { status: 400 })
  }

  const result = await graphFetch(`/me/messages/${emailId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ comment: body }),
  })

  if (result === null) {
    return NextResponse.json({ error: 'Falha ao enviar resposta' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
