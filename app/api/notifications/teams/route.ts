import { NextRequest, NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

function buildAdaptiveCard(data: any) {
  const { summary, metrics, insights } = data
  const critical = insights?.filter((i: any) => ['critical', 'high'].includes(i.severity)) ?? []

  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: '🎯 CS Cockpit — Resumo Executivo',
            weight: 'Bolder', size: 'Large', color: 'Accent',
          },
          {
            type: 'TextBlock',
            text: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
            isSubtle: true, spacing: 'None',
          },
          { type: 'ColumnSet', columns: [
            { type: 'Column', width: 'stretch', items: [{ type: 'TextBlock', text: `**GLPI:** ${metrics?.glpiTotal ?? 0} chamados`, wrap: true }] },
            { type: 'Column', width: 'stretch', items: [{ type: 'TextBlock', text: `**Jira:** ${metrics?.jiraTotal ?? 0} issues`, wrap: true }] },
            { type: 'Column', width: 'stretch', items: [{ type: 'TextBlock', text: `**SLA Vencido:** ${metrics?.breached ?? 0}`, color: (metrics?.breached ?? 0) > 0 ? 'Attention' : 'Good', wrap: true }] },
          ]},
          ...(summary?.slice(0, 2).map((line: string) => ({ type: 'TextBlock', text: line, wrap: true, spacing: 'Small' })) ?? []),
          ...(critical.length > 0 ? [{
            type: 'TextBlock', text: `⚠️ ${critical.length} alerta${critical.length > 1 ? 's' : ''} crítico${critical.length > 1 ? 's' : ''}:`, weight: 'Bolder', color: 'Attention',
          }, ...critical.slice(0, 2).map((i: any) => ({ type: 'TextBlock', text: `• ${i.title}`, wrap: true, spacing: 'None' }))] : []),
        ],
        actions: [{
          type: 'Action.OpenUrl',
          title: 'Abrir CS Cockpit',
          url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        }],
      },
    }],
  }
}

export async function POST(request: NextRequest) {
  const WEBHOOK = process.env.TEAMS_WEBHOOK_URL
  if (!WEBHOOK) {
    return NextResponse.json({ error: 'Configure TEAMS_WEBHOOK_URL no .env.local. Crie um Incoming Webhook no seu canal do Teams.' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const card = buildAdaptiveCard(body)

    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    })

    const responseText = await res.text()
    if (!res.ok) throw new Error(`Teams retornou ${res.status}: ${responseText}`)

    // Audit log
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
    await sb.from('audit_log').insert({ action: 'teams_notification_sent', module: 'notifications', description: 'Resumo executivo enviado ao Teams', level: 'info' }).throwOnError().catch(() => {})

    return NextResponse.json({ ok: true, sentAt: new Date().toISOString() })
  } catch (e: any) {
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
    await sb.from('audit_log').insert({ action: 'teams_notification_failed', module: 'notifications', description: e.message, level: 'error' }).throwOnError().catch(() => {})
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
