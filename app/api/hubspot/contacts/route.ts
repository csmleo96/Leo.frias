import { NextRequest, NextResponse } from 'next/server'
import { listContacts } from '@/lib/hubspot/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? '50')
  const after = searchParams.get('after') ?? undefined
  const search = searchParams.get('search') ?? undefined

  try {
    const data = await listContacts({ limit, after, search })
    const contacts = (data.results ?? []).map((r: any) => {
      const p = r.properties
      return {
        id: r.id,
        name: [p.firstname, p.lastname].filter(Boolean).join(' ') || '(sem nome)',
        email: p.email ?? null,
        phone: p.phone ?? null,
        company: p.company ?? null,
        jobTitle: p.jobtitle ?? null,
        lifecycleStage: p.lifecyclestage ?? null,
        leadStatus: p.hs_lead_status ?? null,
        ownerId: p.hubspot_owner_id ?? null,
        city: p.city ?? null,
        country: p.country ?? null,
        createdAt: p.createdate ?? null,
        updatedAt: p.lastmodifieddate ?? null,
      }
    })

    return NextResponse.json({
      contacts,
      total: data.total ?? contacts.length,
      paging: data.paging ?? null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message.includes('não conectado') ? 401 : 500 })
  }
}
