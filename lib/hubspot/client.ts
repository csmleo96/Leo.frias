/**
 * HubSpot CRM API Client
 * Handles OAuth token refresh, paginated fetching, and all CRM object operations.
 */
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from './crypto'

const HS_BASE = 'https://api.hubapi.com'
const TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token'

export const SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.companies.read',
  'crm.objects.companies.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'crm.objects.tickets.read',
  'crm.objects.tickets.write',
  'crm.objects.owners.read',
].join(' ')

// ── Token management ──────────────────────────────────────────────────────

export async function getAccount() {
  const sb = await createClient()
  const { data } = await sb.from('hubspot_accounts').select('*').eq('is_active', true).single()
  return data ?? null
}

export async function getValidToken(): Promise<string | null> {
  const sb = await createClient()
  const account = await getAccount()
  if (!account) return null

  const expiresAt = new Date(account.token_expires_at).getTime()
  const now = Date.now()

  // Refresh if expires in less than 5 minutes
  if (now >= expiresAt - 5 * 60 * 1000) {
    try {
      const refreshToken = decrypt(account.refresh_token_enc)
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        refresh_token: refreshToken,
      })
      const res = await fetch(TOKEN_URL, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
      const tokens = await res.json()

      await sb.from('hubspot_accounts').update({
        access_token_enc: encrypt(tokens.access_token),
        refresh_token_enc: encrypt(tokens.refresh_token || refreshToken),
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('portal_id', account.portal_id)

      return tokens.access_token
    } catch (err) {
      console.error('HubSpot token refresh error:', err)
      return null
    }
  }

  return decrypt(account.access_token_enc)
}

// ── API fetch wrapper ─────────────────────────────────────────────────────

async function hsFetch(path: string, opts: RequestInit = {}) {
  // API key takes priority over OAuth (OAuth token may lack scopes)
  const apiKey = process.env.HUBSPOT_API_KEY
  let authHeader: Record<string, string> = {}

  if (apiKey) {
    authHeader = { Authorization: `Bearer ${apiKey}` }
  } else {
    const oauthToken = await getValidToken().catch(() => null)
    if (!oauthToken) throw new Error('HubSpot não conectado — configure HUBSPOT_API_KEY ou reconecte via OAuth')
    authHeader = { Authorization: `Bearer ${oauthToken}` }
  }

  const url = path.startsWith('http') ? path : `${HS_BASE}${path}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (res.status === 401) throw new Error('Token HubSpot inválido — verifique a API key ou reconecte via OAuth')
  if (res.status === 429) throw new Error('Rate limit HubSpot atingido — aguarde e tente novamente')
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HubSpot API ${res.status}: ${err.substring(0, 200)}`)
  }
  return res.json()
}

// ── Paginated list fetcher ────────────────────────────────────────────────

export async function fetchAllPages(
  path: string,
  params: Record<string, string>,
  maxPages = 20,
): Promise<any[]> {
  const results: any[] = []
  let after: string | undefined

  for (let page = 0; page < maxPages; page++) {
    const qs = new URLSearchParams({ ...params, limit: '100', ...(after ? { after } : {}) })
    const data = await hsFetch(`${path}?${qs}`)
    results.push(...(data.results ?? []))
    after = data.paging?.next?.after
    if (!after) break
  }

  return results
}

// ── CRM Objects ───────────────────────────────────────────────────────────

export const CONTACT_PROPS = [
  'firstname', 'lastname', 'email', 'phone', 'company',
  'hubspot_owner_id', 'lifecyclestage', 'hs_lead_status',
  'createdate', 'lastmodifieddate', 'jobtitle', 'city', 'country',
].join(',')

export const COMPANY_PROPS = [
  'name', 'domain', 'phone', 'industry', 'numberofemployees',
  'hubspot_owner_id', 'city', 'country', 'annualrevenue',
  'createdate', 'lastmodifieddate', 'hs_lastactivitydate',
].join(',')

export const DEAL_PROPS = [
  'dealname', 'amount', 'pipeline', 'dealstage', 'hubspot_owner_id',
  'closedate', 'hs_is_closed', 'hs_is_closed_won',
  'createdate', 'lastmodifieddate', 'hs_deal_stage_probability',
].join(',')

export const TICKET_PROPS = [
  'subject', 'hs_pipeline', 'hs_pipeline_stage', 'hs_ticket_priority',
  'hubspot_owner_id', 'source_type', 'createdate', 'lastmodifieddate',
  'closed_date', 'hs_resolution',
].join(',')

export async function listContacts(opts?: { limit?: number; after?: string; search?: string }) {
  if (opts?.search) {
    return hsFetch('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'CONTAINS_TOKEN', value: opts.search }] }],
        properties: CONTACT_PROPS.split(','),
        limit: opts?.limit ?? 50,
        after: opts?.after,
      }),
    })
  }
  const qs = new URLSearchParams({ properties: CONTACT_PROPS, limit: String(opts?.limit ?? 50), ...(opts?.after ? { after: opts.after } : {}) })
  return hsFetch(`/crm/v3/objects/contacts?${qs}`)
}

export async function listCompanies(opts?: { limit?: number; after?: string; search?: string }) {
  if (opts?.search) {
    return hsFetch('/crm/v3/objects/companies/search', {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'name', operator: 'CONTAINS_TOKEN', value: opts.search }] }],
        properties: COMPANY_PROPS.split(','),
        limit: opts?.limit ?? 50,
        after: opts?.after,
      }),
    })
  }
  const qs = new URLSearchParams({ properties: COMPANY_PROPS, limit: String(opts?.limit ?? 50), ...(opts?.after ? { after: opts.after } : {}) })
  return hsFetch(`/crm/v3/objects/companies?${qs}`)
}

export async function listDeals(opts?: { limit?: number; after?: string; pipeline?: string; stage?: string }) {
  const filters: any[] = []
  if (opts?.pipeline) filters.push({ propertyName: 'pipeline', operator: 'EQ', value: opts.pipeline })
  if (opts?.stage) filters.push({ propertyName: 'dealstage', operator: 'EQ', value: opts.stage })

  if (filters.length) {
    return hsFetch('/crm/v3/objects/deals/search', {
      method: 'POST',
      body: JSON.stringify({ filterGroups: [{ filters }], properties: DEAL_PROPS.split(','), limit: opts?.limit ?? 100, after: opts?.after }),
    })
  }
  const qs = new URLSearchParams({ properties: DEAL_PROPS, limit: String(opts?.limit ?? 100), ...(opts?.after ? { after: opts.after } : {}) })
  return hsFetch(`/crm/v3/objects/deals?${qs}`)
}

export async function listTickets(opts?: { limit?: number; after?: string }) {
  const qs = new URLSearchParams({ properties: TICKET_PROPS, limit: String(opts?.limit ?? 100), ...(opts?.after ? { after: opts.after } : {}) })
  return hsFetch(`/crm/v3/objects/tickets?${qs}`)
}

export async function getDealPipelines() {
  return hsFetch('/crm/v3/pipelines/deals')
}

export async function getTicketPipelines() {
  return hsFetch('/crm/v3/pipelines/tickets')
}

export async function getOwners() {
  return hsFetch('/crm/v3/owners?limit=100')
}

// ── Sync functions ────────────────────────────────────────────────────────

function mapContact(r: any, portalId: string) {
  const p = r.properties
  return {
    hs_id: r.id,
    portal_id: portalId,
    firstname: p.firstname ?? null,
    lastname: p.lastname ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
    company: p.company ?? null,
    owner_id: p.hubspot_owner_id ?? null,
    lifecycle_stage: p.lifecyclestage ?? null,
    lead_status: p.hs_lead_status ?? null,
    created_at_hs: p.createdate ? new Date(p.createdate).toISOString() : null,
    updated_at_hs: p.lastmodifieddate ? new Date(p.lastmodifieddate).toISOString() : null,
    raw: p,
    synced_at: new Date().toISOString(),
  }
}

function mapCompany(r: any, portalId: string) {
  const p = r.properties
  return {
    hs_id: r.id,
    portal_id: portalId,
    name: p.name ?? null,
    domain: p.domain ?? null,
    phone: p.phone ?? null,
    industry: p.industry ?? null,
    num_employees: p.numberofemployees ? Number(p.numberofemployees) : null,
    owner_id: p.hubspot_owner_id ?? null,
    city: p.city ?? null,
    country: p.country ?? null,
    annual_revenue: p.annualrevenue ? Number(p.annualrevenue) : null,
    last_activity_at: p.hs_lastactivitydate ? new Date(p.hs_lastactivitydate).toISOString() : null,
    created_at_hs: p.createdate ? new Date(p.createdate).toISOString() : null,
    updated_at_hs: p.lastmodifieddate ? new Date(p.lastmodifieddate).toISOString() : null,
    raw: p,
    synced_at: new Date().toISOString(),
  }
}

function mapDeal(r: any, portalId: string, stageLabels: Record<string, string> = {}) {
  const p = r.properties
  return {
    hs_id: r.id,
    portal_id: portalId,
    name: p.dealname ?? null,
    amount: p.amount ? Number(p.amount) : null,
    pipeline: p.pipeline ?? null,
    stage: p.dealstage ?? null,
    stage_label: stageLabels[p.dealstage] ?? p.dealstage ?? null,
    owner_id: p.hubspot_owner_id ?? null,
    close_date: p.closedate ? p.closedate.split('T')[0] : null,
    is_closed: p.hs_is_closed === 'true',
    is_won: p.hs_is_closed_won === 'true',
    created_at_hs: p.createdate ? new Date(p.createdate).toISOString() : null,
    updated_at_hs: p.lastmodifieddate ? new Date(p.lastmodifieddate).toISOString() : null,
    raw: p,
    synced_at: new Date().toISOString(),
  }
}

function mapTicket(r: any, portalId: string) {
  const p = r.properties
  return {
    hs_id: r.id,
    portal_id: portalId,
    subject: p.subject ?? null,
    pipeline: p.hs_pipeline ?? null,
    stage: p.hs_pipeline_stage ?? null,
    priority: p.hs_ticket_priority ?? null,
    owner_id: p.hubspot_owner_id ?? null,
    source: p.source_type ?? null,
    closed_at: p.closed_date ? new Date(p.closed_date).toISOString() : null,
    created_at_hs: p.createdate ? new Date(p.createdate).toISOString() : null,
    updated_at_hs: p.lastmodifieddate ? new Date(p.lastmodifieddate).toISOString() : null,
    raw: p,
    synced_at: new Date().toISOString(),
  }
}

export async function syncObject(
  objectType: 'contacts' | 'companies' | 'deals' | 'tickets',
  portalId: string,
  fullSync = true,
): Promise<{ synced: number; errors: number }> {
  const sb = await createClient()
  const table = `hubspot_${objectType}`

  let props = ''
  if (objectType === 'contacts') props = CONTACT_PROPS
  else if (objectType === 'companies') props = COMPANY_PROPS
  else if (objectType === 'deals') props = DEAL_PROPS
  else props = TICKET_PROPS

  // Build stage labels map for deals
  const stageLabels: Record<string, string> = {}
  if (objectType === 'deals') {
    try {
      const pipelines = await getDealPipelines()
      for (const pl of pipelines.results ?? []) {
        for (const stage of pl.stages ?? []) {
          stageLabels[stage.id] = stage.label
        }
      }
    } catch {}
  }

  const records = await fetchAllPages(`/crm/v3/objects/${objectType}`, { properties: props }, 50)

  let synced = 0
  let errors = 0

  const batch = records.map(r => {
    if (objectType === 'contacts') return mapContact(r, portalId)
    if (objectType === 'companies') return mapCompany(r, portalId)
    if (objectType === 'deals') return mapDeal(r, portalId, stageLabels)
    return mapTicket(r, portalId)
  })

  // Upsert in chunks of 200
  for (let i = 0; i < batch.length; i += 200) {
    const chunk = batch.slice(i, i + 200)
    const { error } = await sb.from(table).upsert(chunk, { onConflict: 'hs_id' })
    if (error) { console.error(`Sync ${objectType} error:`, error); errors += chunk.length }
    else synced += chunk.length
  }

  return { synced, errors }
}
