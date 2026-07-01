import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, vaultLog, CUSTOMERS, CUSTOMER_SLUGS, listFiles } from '@/lib/vault'
import type { CustomerSlug } from '@/types/vault'

export const GET = withRBAC('customers.read', async (req, { params }) => {
  const slug = params?.slug as CustomerSlug

  if (!CUSTOMER_SLUGS.includes(slug)) {
    return NextResponse.json({ error: 'Customer not found', slug }, { status: 404 })
  }

  const customer = CUSTOMERS[slug]
  const reports  = listFiles(`customers/${slug}/reports`)
  const incidents = listFiles(`customers/${slug}/incidents`)

  await vaultLog({
    action:     'customer.view',
    resource:   `vault:customers`,
    resourceId: slug,
    result:     'success',
    origin:     'api:vault/customers/[slug]',
  })

  return NextResponse.json({
    ok: true,
    slug,
    customer,
    reports:   { count: reports.length,  files: reports.slice(0, 10) },
    incidents: { count: incidents.length, files: incidents.slice(0, 10) },
  })
})
