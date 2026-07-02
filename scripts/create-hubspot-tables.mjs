/**
 * Cria as tabelas do módulo HubSpot CRM no Supabase.
 * Uso: node scripts/create-hubspot-tables.mjs
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
)

const SQL = `
-- ── HubSpot Accounts (OAuth tokens) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS hubspot_accounts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id          text UNIQUE NOT NULL,
  hub_domain         text,
  hub_name           text,
  access_token_enc   text NOT NULL,
  refresh_token_enc  text NOT NULL,
  token_expires_at   timestamptz NOT NULL,
  scope              text,
  is_active          boolean DEFAULT true,
  connected_at       timestamptz DEFAULT now(),
  last_sync_at       timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- ── HubSpot Contacts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hubspot_contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hs_id           text UNIQUE NOT NULL,
  portal_id       text REFERENCES hubspot_accounts(portal_id) ON DELETE CASCADE,
  firstname       text,
  lastname        text,
  email           text,
  phone           text,
  company         text,
  owner_id        text,
  owner_name      text,
  lifecycle_stage text,
  lead_status     text,
  created_at_hs   timestamptz,
  updated_at_hs   timestamptz,
  raw             jsonb,
  synced_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hs_contacts_portal  ON hubspot_contacts(portal_id);
CREATE INDEX IF NOT EXISTS idx_hs_contacts_email   ON hubspot_contacts(email);
CREATE INDEX IF NOT EXISTS idx_hs_contacts_updated ON hubspot_contacts(updated_at_hs DESC);

-- ── HubSpot Companies ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hubspot_companies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hs_id            text UNIQUE NOT NULL,
  portal_id        text REFERENCES hubspot_accounts(portal_id) ON DELETE CASCADE,
  name             text,
  domain           text,
  phone            text,
  industry         text,
  num_employees    int,
  owner_id         text,
  owner_name       text,
  city             text,
  country          text,
  annual_revenue   numeric,
  last_activity_at timestamptz,
  created_at_hs    timestamptz,
  updated_at_hs    timestamptz,
  raw              jsonb,
  synced_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hs_companies_portal ON hubspot_companies(portal_id);
CREATE INDEX IF NOT EXISTS idx_hs_companies_domain ON hubspot_companies(domain);

-- ── HubSpot Deals ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hubspot_deals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hs_id           text UNIQUE NOT NULL,
  portal_id       text REFERENCES hubspot_accounts(portal_id) ON DELETE CASCADE,
  name            text,
  amount          numeric,
  pipeline        text,
  pipeline_label  text,
  stage           text,
  stage_label     text,
  owner_id        text,
  owner_name      text,
  close_date      date,
  is_closed       boolean DEFAULT false,
  is_won          boolean DEFAULT false,
  created_at_hs   timestamptz,
  updated_at_hs   timestamptz,
  raw             jsonb,
  synced_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hs_deals_portal  ON hubspot_deals(portal_id);
CREATE INDEX IF NOT EXISTS idx_hs_deals_stage   ON hubspot_deals(stage);
CREATE INDEX IF NOT EXISTS idx_hs_deals_owner   ON hubspot_deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_hs_deals_closed  ON hubspot_deals(is_closed, is_won);

-- ── HubSpot Tickets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hubspot_tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hs_id         text UNIQUE NOT NULL,
  portal_id     text REFERENCES hubspot_accounts(portal_id) ON DELETE CASCADE,
  subject       text,
  status        text,
  priority      text,
  owner_id      text,
  owner_name    text,
  source        text,
  pipeline      text,
  stage         text,
  closed_at     timestamptz,
  created_at_hs timestamptz,
  updated_at_hs timestamptz,
  raw           jsonb,
  synced_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hs_tickets_portal ON hubspot_tickets(portal_id);
CREATE INDEX IF NOT EXISTS idx_hs_tickets_status ON hubspot_tickets(status);

-- ── HubSpot Sync Log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hubspot_sync_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id       text,
  sync_type       text,   -- full | incremental | webhook
  object_type     text,   -- contacts | companies | deals | tickets | all
  status          text,   -- running | success | error
  records_synced  int DEFAULT 0,
  error_message   text,
  started_at      timestamptz DEFAULT now(),
  finished_at     timestamptz,
  duration_ms     int
);
CREATE INDEX IF NOT EXISTS idx_hs_sync_log_portal ON hubspot_sync_log(portal_id, started_at DESC);
`

// Tenta executar via supabase-js (funciona apenas com service role key)
try {
  const { error } = await supabase.rpc('exec_sql', { sql: SQL })
  if (!error) {
    console.log('✅ Tabelas criadas via Supabase RPC!')
    process.exit(0)
  }
} catch {}

// Fallback: imprime o SQL para execução manual
console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Execute o SQL abaixo no Supabase Dashboard → SQL Editor         ║
║  https://app.supabase.com → leonardo-cs-cockpit → SQL Editor     ║
╚══════════════════════════════════════════════════════════════════╝

${SQL}

-- Fim do SQL --
`)
console.log('📋 Copie o SQL acima, abra o Supabase Dashboard → SQL Editor e execute.')
