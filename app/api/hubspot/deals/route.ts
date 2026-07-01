import { NextRequest, NextResponse } from 'next/server'
import { listDeals, getDealPipelines, getOwners } from '@/lib/hubspot/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? '100')
  const after = searchParams.get('after') ?? undefined
  const pipeline = searchParams.get('pipeline') ?? undefined
  const stage = searchParams.get('stage') ?? undefined

  try {
    const [dealsData, pipelinesData, ownersData] = await Promise.all([
      listDeals({ limit, after, pipeline, stage }),
      getDealPipelines(),
      getOwners(),
    ])

    // Build lookup maps
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

    const deals = (dealsData.results ?? []).map((r: any) => {
      const p = r.properties
      return {
        id: r.id,
        name: p.dealname ?? '(sem nome)',
        amount: p.amount ? Number(p.amount) : null,
        pipeline: p.pipeline ?? null,
        pipelineLabel: pipelineLabels[p.pipeline] ?? p.pipeline ?? null,
        stage: p.dealstage ?? null,
        stageLabel: stageLabels[p.dealstage] ?? p.dealstage ?? null,
        ownerId: p.hubspot_owner_id ?? null,
        ownerName: ownerNames[p.hubspot_owner_id] ?? null,
        closeDate: p.closedate ?? null,
        isClosed: p.hs_is_closed === 'true',
        isWon: p.hs_is_closed_won === 'true',
        probability: p.hs_deal_stage_probability ? Number(p.hs_deal_stage_probability) : null,
        createdAt: p.createdate ?? null,
        updatedAt: p.lastmodifieddate ?? null,
      }
    })

    return NextResponse.json({
      deals,
      total: dealsData.total ?? deals.length,
      paging: dealsData.paging ?? null,
      pipelines: (pipelinesData.results ?? []).map((pl: any) => ({
        id: pl.id,
        label: pl.label,
        stages: (pl.stages ?? []).map((s: any) => ({ id: s.id, label: s.label, probability: s.metadata?.probability })),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
