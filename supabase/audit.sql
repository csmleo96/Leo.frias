-- Auditoria completa do CS Cockpit

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  action      TEXT NOT NULL,
  module      TEXT DEFAULT 'system',
  description TEXT,
  metadata    JSONB,
  level       TEXT DEFAULT 'info',   -- info | warning | error | critical
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_level_idx      ON audit_log (level);
CREATE INDEX IF NOT EXISTS audit_log_module_idx     ON audit_log (module);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON audit_log FOR ALL USING (true) WITH CHECK (true);
