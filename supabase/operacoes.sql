-- Torre de Operações — Supabase schema

CREATE TABLE IF NOT EXISTS glpi_tickets (
  id          INTEGER PRIMARY KEY,
  title       TEXT,
  status      INTEGER,
  status_label TEXT,
  priority    INTEGER,
  priority_label TEXT,
  type_id     INTEGER,
  type_label  TEXT,
  assignee    TEXT,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ,
  sla_hours   INTEGER,
  sla_deadline TIMESTAMPTZ,
  sla_status  TEXT DEFAULT 'ok',   -- ok | at_risk | breached | resolved
  synced_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jira_tickets (
  key           TEXT PRIMARY KEY,
  summary       TEXT,
  status        TEXT,
  status_category TEXT,
  priority      TEXT,
  priority_num  INTEGER,
  assignee      TEXT,
  project_key   TEXT,
  project_name  TEXT,
  issue_type    TEXT,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  url           TEXT,
  sla_hours     INTEGER,
  sla_deadline  TIMESTAMPTZ,
  sla_status    TEXT DEFAULT 'ok',
  synced_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_log (
  id              SERIAL PRIMARY KEY,
  source          TEXT,
  glpi_synced     INTEGER DEFAULT 0,
  jira_synced     INTEGER DEFAULT 0,
  error           TEXT,
  synced_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime support
ALTER TABLE glpi_tickets REPLICA IDENTITY FULL;
ALTER TABLE jira_tickets REPLICA IDENTITY FULL;

-- RLS
ALTER TABLE glpi_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON glpi_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON jira_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON sync_log     FOR ALL USING (true) WITH CHECK (true);
