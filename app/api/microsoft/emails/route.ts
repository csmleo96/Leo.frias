import { NextResponse } from 'next/server'
import { isConfigured, graphFetch } from '@/lib/microsoft-graph'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ notConnected: true })
  }

  const data = await graphFetch(
    '/me/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments,importance'
  )

  if (!data) {
    return NextResponse.json({ notConnected: true })
  }

  const emails = (data.value ?? []).map((m: any) => ({
    id: m.id,
    subject: m.subject ?? '(sem assunto)',
    from: {
      name: m.from?.emailAddress?.name ?? '',
      address: m.from?.emailAddress?.address ?? '',
    },
    receivedAt: m.receivedDateTime,
    preview: m.bodyPreview ?? '',
    isRead: m.isRead ?? false,
    hasAttachments: m.hasAttachments ?? false,
    importance: m.importance ?? 'normal',
  }))

  return NextResponse.json({ emails }, { headers: { 'Cache-Control': 'no-store' } })
}
