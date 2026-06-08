import { NextResponse } from 'next/server'
import { isConfigured, graphFetch } from '@/lib/microsoft-graph'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ notConnected: true })
  }

  const token = await import('@/lib/microsoft-graph').then(m => m.getAccessToken())
  if (!token) return NextResponse.json({ notConnected: true })

  const [teamsData, presenceData] = await Promise.allSettled([
    graphFetch('/me/joinedTeams'),
    graphFetch('/users?$select=id,displayName,mail&$top=20'),
  ])

  const teams = teamsData.status === 'fulfilled' ? (teamsData.value?.value ?? []) : []
  const users = presenceData.status === 'fulfilled' ? (presenceData.value?.value ?? []) : []

  // Fetch channels and recent messages from first team
  const channels: any[] = []
  const messages: any[] = []

  for (const team of teams.slice(0, 3)) {
    const chData = await graphFetch(`/teams/${team.id}/channels`)
    const teamChannels = chData?.value ?? []

    for (const ch of teamChannels.slice(0, 5)) {
      channels.push({ id: ch.id, name: ch.displayName, teamName: team.displayName, teamId: team.id })

      const msgData = await graphFetch(
        `/teams/${team.id}/channels/${ch.id}/messages?$top=20&$orderby=createdDateTime desc`
      )
      const msgs = (msgData?.value ?? []).map((m: any) => ({
        id: m.id,
        sender: m.from?.user?.displayName ?? 'Desconhecido',
        senderEmail: m.from?.user?.id ?? '',
        body: m.body?.content?.replace(/<[^>]+>/g, '') ?? '',
        createdAt: m.createdDateTime,
        channelName: ch.displayName,
      }))
      messages.push(...msgs)
    }
  }

  messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const formattedUsers = users.map((u: any) => ({
    id: u.id,
    name: u.displayName,
    email: u.mail,
    status: 'Unknown',
  }))

  return NextResponse.json({ channels, messages, users: formattedUsers }, { headers: { 'Cache-Control': 'no-store' } })
}
