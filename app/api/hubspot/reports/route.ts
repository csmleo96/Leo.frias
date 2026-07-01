import { NextRequest, NextResponse } from 'next/server'
import { fetchAllPages, CONTACT_PROPS, COMPANY_PROPS, DEAL_PROPS } from '@/lib/hubspot/client'
import { getValidToken } from '@/lib/hubspot/client'

export const dynamic = 'force-dynamic'

const HS_BASE = 'https://api.hubapi.com'

async function hsSearch(objectType: string, filterGroups: any[], properties: string[], sorts: any[] = []) {
  const token = await getValidToken()
  if (!token) throw new Error('HubSpot não conectado')
  const res = await fetch(`${HS_BASE}/crm/v3/objects/${objectType}/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterGroups, properties, sorts, limit: 200 }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HubSpot search failed: ${res.status}`)
  return res.json()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reportType = searchParams.get('type') ?? 'contacts-last30'
  const ownerId = searchParams.get('owner') ?? undefined
  const pipeline = searchParams.get('pipeline') ?? undefined
  const dateFrom = searchParams.get('dateFrom') ?? undefined
  const dateTo = searchParams.get('dateTo') ?? undefined

  try {
    let result: any = {}

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString()

    switch (reportType) {

      case 'contacts-last30': {
        const data = await hsSearch('contacts', [{
          filters: [{ propertyName: 'createdate', operator: 'GTE', value: thirtyDaysAgo }]
        }], CONTACT_PROPS.split(','), [{ propertyName: 'createdate', direction: 'DESCENDING' }])
        result = {
          title: 'Contatos criados nos últimos 30 dias',
          count: data.total,
          rows: (data.results ?? []).map((r: any) => ({
            id: r.id,
            name: [r.properties.firstname, r.properties.lastname].filter(Boolean).join(' ') || '—',
            email: r.properties.email ?? '—',
            company: r.properties.company ?? '—',
            lifecycle: r.properties.lifecyclestage ?? '—',
            createdAt: r.properties.createdate,
          })),
        }
        break
      }

      case 'deals-by-stage': {
        const data = await fetchAllPages('/crm/v3/objects/deals', { properties: DEAL_PROPS }, 20)
        const byStage: Record<string, any[]> = {}
        data.forEach((r: any) => {
          const stage = r.properties.dealstage ?? 'unknown'
          if (!byStage[stage]) byStage[stage] = []
          byStage[stage].push(r)
        })
        result = {
          title: 'Negócios por estágio',
          count: data.length,
          stages: Object.entries(byStage).map(([stage, items]) => ({
            stage,
            count: items.length,
            totalAmount: items.reduce((s: number, r: any) => s + (Number(r.properties.amount) || 0), 0),
            rows: items.slice(0, 20).map((r: any) => ({
              id: r.id,
              name: r.properties.dealname,
              amount: Number(r.properties.amount) || 0,
              owner: r.properties.hubspot_owner_id,
              closeDate: r.properties.closedate,
            })),
          })),
        }
        break
      }

      case 'revenue-monthly': {
        const data = await fetchAllPages('/crm/v3/objects/deals', { properties: DEAL_PROPS }, 20)
        const wonDeals = data.filter((r: any) => r.properties.hs_is_closed_won === 'true')
        const byMonth: Record<string, { count: number; revenue: number }> = {}
        wonDeals.forEach((r: any) => {
          const d = new Date(r.properties.closedate || r.properties.createdate)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (!byMonth[key]) byMonth[key] = { count: 0, revenue: 0 }
          byMonth[key].count++
          byMonth[key].revenue += Number(r.properties.amount) || 0
        })
        result = {
          title: 'Receita mensal (negócios ganhos)',
          count: wonDeals.length,
          totalRevenue: wonDeals.reduce((s: number, r: any) => s + (Number(r.properties.amount) || 0), 0),
          months: Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v })),
        }
        break
      }

      case 'conversion-by-owner': {
        const data = await fetchAllPages('/crm/v3/objects/deals', { properties: DEAL_PROPS }, 20)
        const byOwner: Record<string, { won: number; lost: number; open: number; revenue: number }> = {}
        data.forEach((r: any) => {
          const oid = r.properties.hubspot_owner_id ?? 'unassigned'
          if (!byOwner[oid]) byOwner[oid] = { won: 0, lost: 0, open: 0, revenue: 0 }
          if (r.properties.hs_is_closed_won === 'true') { byOwner[oid].won++; byOwner[oid].revenue += Number(r.properties.amount) || 0 }
          else if (r.properties.hs_is_closed === 'true') byOwner[oid].lost++
          else byOwner[oid].open++
        })
        result = {
          title: 'Conversão por vendedor',
          rows: Object.entries(byOwner).map(([oid, v]) => ({
            ownerId: oid,
            ...v,
            total: v.won + v.lost,
            winRate: v.won + v.lost > 0 ? Math.round((v.won / (v.won + v.lost)) * 100) : 0,
          })).sort((a, b) => b.revenue - a.revenue),
        }
        break
      }

      case 'companies-no-activity': {
        const data = await hsSearch('companies', [{
          filters: [
            { propertyName: 'hs_lastactivitydate', operator: 'LTE', value: sixtyDaysAgo },
          ]
        }], COMPANY_PROPS.split(','), [{ propertyName: 'hs_lastactivitydate', direction: 'ASCENDING' }])
        result = {
          title: 'Empresas sem atividade há 60+ dias',
          count: data.total,
          rows: (data.results ?? []).map((r: any) => ({
            id: r.id,
            name: r.properties.name ?? '—',
            domain: r.properties.domain ?? '—',
            industry: r.properties.industry ?? '—',
            lastActivity: r.properties.hs_lastactivitydate,
            daysInactive: r.properties.hs_lastactivitydate
              ? Math.floor((Date.now() - new Date(r.properties.hs_lastactivitydate).getTime()) / 86400000)
              : null,
          })),
        }
        break
      }

      case 'deals-closing-soon': {
        const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString()
        const data = await hsSearch('deals', [{
          filters: [
            { propertyName: 'closedate', operator: 'BETWEEN', value: new Date().toISOString(), highValue: nextMonth },
            { propertyName: 'hs_is_closed', operator: 'EQ', value: 'false' },
          ]
        }], DEAL_PROPS.split(','), [{ propertyName: 'closedate', direction: 'ASCENDING' }])
        result = {
          title: 'Negócios fechando nos próximos 30 dias',
          count: data.total,
          totalPipeline: (data.results ?? []).reduce((s: number, r: any) => s + (Number(r.properties.amount) || 0), 0),
          rows: (data.results ?? []).map((r: any) => ({
            id: r.id,
            name: r.properties.dealname,
            amount: Number(r.properties.amount) || 0,
            stage: r.properties.dealstage,
            closeDate: r.properties.closedate,
            daysUntilClose: Math.ceil((new Date(r.properties.closedate).getTime() - Date.now()) / 86400000),
          })),
        }
        break
      }

      default:
        return NextResponse.json({ error: `Tipo de relatório desconhecido: ${reportType}` }, { status: 400 })
    }

    return NextResponse.json({ type: reportType, generatedAt: new Date().toISOString(), ...result }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
