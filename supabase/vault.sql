-- ── Vault Leonardo CS Cockpit — Database Schema ─────────────────────────────
-- Run after the existing schema.sql and audit.sql migrations.

-- ── Extend audit_log if not already created ───────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action       TEXT NOT NULL,
  resource     TEXT NOT NULL,
  resource_id  TEXT,
  result       TEXT NOT NULL DEFAULT 'success',
  origin       TEXT NOT NULL DEFAULT 'vault',
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email   TEXT,
  ip_address   TEXT,
  user_agent   TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource   ON audit_log(resource);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ── RBAC User Roles ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN (
               'admin','customer_success','operations','engineering','director','viewer'
             )),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_vault_user_roles_user ON vault_user_roles(user_id);

-- ── Vault Config (persisted in DB as backup to file) ─────────────────────────
CREATE TABLE IF NOT EXISTS vault_configs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Report Registry ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL CHECK (type IN ('daily','weekly','monthly','qbr','executive')),
  format       TEXT NOT NULL CHECK (format IN ('pdf','html','markdown')),
  scope        TEXT NOT NULL,
  title        TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_to      TEXT[],
  sent_at      TIMESTAMPTZ,
  size_bytes   BIGINT
);

CREATE INDEX IF NOT EXISTS idx_vault_reports_type  ON vault_reports(type);
CREATE INDEX IF NOT EXISTS idx_vault_reports_scope ON vault_reports(scope);
CREATE INDEX IF NOT EXISTS idx_vault_reports_date  ON vault_reports(generated_at DESC);

-- ── Backup Registry ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_backups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency      TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  status         TEXT NOT NULL CHECK (status IN ('success','running','failed','pending')),
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  size_bytes     BIGINT,
  file_path      TEXT,
  error_message  TEXT,
  retention_days INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_backups_freq   ON vault_backups(frequency);
CREATE INDEX IF NOT EXISTS idx_vault_backups_status ON vault_backups(status);
CREATE INDEX IF NOT EXISTS idx_vault_backups_date   ON vault_backups(started_at DESC);

-- ── AI History ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_ai_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model             TEXT NOT NULL,
  prompt_tokens     INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens      INT NOT NULL DEFAULT 0,
  scope             TEXT NOT NULL,
  report_type       TEXT,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id           UUID REFERENCES auth.users(id),
  cost_usd          NUMERIC(10, 6)
);

CREATE INDEX IF NOT EXISTS idx_vault_ai_scope ON vault_ai_history(scope);
CREATE INDEX IF NOT EXISTS idx_vault_ai_date  ON vault_ai_history(generated_at DESC);

-- ── RLS Policies (enable row-level security) ──────────────────────────────────
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_user_roles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_configs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_backups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_ai_history   ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by server-side API routes)
-- Application roles defined in vault_user_roles table and enforced at API layer.
