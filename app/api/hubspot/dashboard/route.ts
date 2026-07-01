import { NextResponse } from 'next/server'
import { fetchAllPages, getDealPipelines, getOwners, DEAL_PROPS, CONTACT_PROPS } from '@/lib/hubspot/client'

export const dynamic = 'force-dynamic'

function monthKey(iso: string | null): string {
  if (!iso) return 'unknown'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtMonth(key: string): string {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export async function GET() {
  try {
    const [dealsRaw, contactsRaw, pipelinesData, ownersData] = await Promise.all([
      fetchAllPages('/crm/v3/objects/deals', { properties: DEAL_PROPS }, 20),
      fetchAllPages('/crm/v3/objects/contacts', { properties: CONTACT_PROPS }, 5),
      getDealPipelines(),
      getOwners(),
    ])

    // Owner map
    const ownerNames: Record<string, string> = {}
    for (const o of ownersData.results ?? []) {
      ownerNames[o.id] = `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim() || o.email
    }

    // Stage labels
    const stageLabels: Record<string, string> = {}
    for (const pl of pipelinesData.results ?? []) {
      for (const s of pl.stages ?? []) stageLabels[s.id] = s.label
    }

    const deals = dealsRaw.map((r: any) => ({
      id: r.id,
      amount: r.properties.amount ? Number(r.properties.amount) : 0,
      stage: r.properties.dealstage ?? '',
      stageLabel: stageLabels[r.properties.dealstage] ?? r.properties.dealstage ?? '',
      pipeline: r.properties.pipeline ?? '',
      isClosed: r.properties.hs_is_closed === 'true',
      isWon: r.properties.hs_is_closed_won === 'true',
      ownerId: r.properties.hubspot_owner_id ?? '',
      closeDate: r.properties.closedate ?? null,
      createdAt: r.properties.createdate ?? null,
    }))

    const contacts = contactsRaw.map((r: any) => ({
      id: r.id,
      lifecycle: r.properties.lifecyclestage ?? 'unknown',
      createdAt: r.properties.createdate ?? null,
    }))

    const openDeals = deals.filter(d => !d.isClosed)
    const wonDeals = deals.filter(d => d.isWon)
    const lostDeals = deals.filter(d => d.isClosed && !d.isWon)

    const totalRevenue = wonDeals.reduce((s, d) => s + d.amount, 0)
    const openPipeline = openDeals.reduce((s, d) => s + d.amount, 0)

    // Revenue by month (last 6 months)
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    const revenueByMonth: Record<string, number> = {}
    const dealsWonByMonth: Record<string, number> = {}
    months.forEach(m => { revenueByMonth[m] = 0; dealsWonByMonth[m] = 0 })

    wonDeals.forEach(d => {
      const k = monthKey(d.closeDate ?? d.createdAt)
      if (revenueByMonth[k] !== undefined) {
        revenueByMonth[k] += d.amount
        dealsWonByMonth[k] = (dealsWonByMonth[k] ?? 0) + 1
      }
    })

    // Contacts created by month
    const contactsByMonth: Record<string, number> = {}
    months.forEach(m => { contactsByMonth[m] = 0 })
    contacts.forEach(c => {
      const k = monthKey(c.createdAt)
      if (contactsByMonth[k] !== undefined) contactsByMonth[k]++
    })

    // Deals by stage
    const byStage: Record<string, { label: string; count: number; amount: number }> = {}
    openDeals.forEach(d => {
      if (!byStage[d.stage]) byStage[d.stage] = { label: d.stageLabel, count: 0, amount: 0 }
      byStage[d.stage].count++
      byStage[d.stage].amount += d.amount
    })

    // Owner ranking
    const ownerStats: Record<string, { name: string; won: number; lost: number; revenue: number; open: number }> = {}
    deals.forEach(d => {
      const oid = d.ownerId || 'unassigned'
      if (!ownerStats[oid]) ownerStats[oid] = { name: ownerNames[oid] ?? 'Sem responsável', won: 0, lost: 0, revenue: 0, open: 0 }
      if (d.isWon) { ownerStats[oid].won++; ownerStats[oid].revenue += d.amount }
      else if (d.isClosed) ownerStats[oid].lost++
      else ownerStats[oid].open++
    })

    const ownerRanking = Object.values(ownerStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Lifecycle stage breakdown
    const byLifecycle: Record<string, number> = {}
    contacts.forEach(c => {
      byLifecycle[c.lifecycle] = (byLifecycle[c.lifecycle] ?? 0) + 1
    })

    const leads = contacts.filter(c => c.lifecycle === 'lead').length
    const customers = contacts.filter(c => c.lifecycle === 'customer').length
    const conversionRate = contacts.length > 0 ? Math.round((customers / contacts.length) * 100) : 0

    return NextResponse.json({
      overview: {
        totalContacts: contacts.length,
        totalDeals: deals.length,
        openDeals: openDeals.length,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        totalRevenue,
        openPipeline,
        leads,
        customers,
        conversionRate,
        winRate: deals.filter(d => d.isClosed).length > 0
          ? Math.round((wonDeals.length / deals.filter(d => d.isClosed).length) * 100)
          : 0,
      },
      charts: {
        revenueByMonth: months.map(m => ({ month: fmtMonth(m), revenue: revenueByMonth[m], deals: dealsWonByMonth[m] })),
        contactsByMonth: months.map(m => ({ month: fmtMonth(m), contacts: contactsByMonth[m] })),
        dealsByStage: Object.entries(byStage).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.count - a.count),
        ownerRanking,
        lifecycleBreakdown: Object.entries(byLifecycle).map(([stage, count]) => ({ stage, count })),
      },
      pipelines: (pipelinesData.results ?? []).map((pl: any) => ({ id: pl.id, label: pl.label })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
