import { NextRequest, NextResponse } from 'next/server'
import { listTickets, getTicketPipelines, getOwners } from '@/lib/hubspot/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? '100')
  const after = searchParams.get('after') ?? undefined

  try {
    const [ticketsData, pipelinesData, ownersData] = await Promise.all([
      listTickets({ limit, after }),
      getTicketPipelines(),
      getOwners(),
    ])

    const stageLabels: Record<string, string> = {}
    const pipelineLabels: Record<string, string> = {}
    for (const pl of pipelinesData.results ?? []) {
      pipelineLabels[pl.id] = pl.label
      for (const s of pl.stages ?? []) stageLabels[s.id] = s.label
    }

    const ownerNames: Record<string, string> = {}
    for (const o of ownersData.results ?? []) {
      ownerNames[o.id] = `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim() || o.email
    }

    const tickets = (ticketsData.results ?? []).map((r: any) => {
      const p = r.properties
      return {
        id: r.id,
        subject: p.subject ?? '(sem assunto)',
        pipeline: p.hs_pipeline ?? null,
        pipelineLabel: pipelineLabels[p.hs_pipeline] ?? null,
        stage: p.hs_pipeline_stage ?? null,
        stageLabel: stageLabels[p.hs_pipeline_stage] ?? null,
        priority: p.hs_ticket_priority ?? null,
        ownerId: p.hubspot_owner_id ?? null,
        ownerName: ownerNames[p.hubspot_owner_id] ?? null,
        source: p.source_type ?? null,
        closedAt: p.closed_date ?? null,
        createdAt: p.createdate ?? null,
        updatedAt: p.lastmodifieddate ?? null,
      }
    })

    return NextResponse.json({
      tickets,
      total: ticketsData.total ?? tickets.length,
      paging: ticketsData.paging ?? null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
