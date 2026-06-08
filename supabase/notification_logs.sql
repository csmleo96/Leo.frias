-- Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGSERIAL PRIMARY KEY,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'teams', 'both')),
  delivery_time INTEGER, -- milliseconds
  recipients TEXT[] NOT NULL DEFAULT '{}',
  error_message TEXT,
  kpis JSONB, -- snapshot of the KPIs sent
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX idx_notification_logs_executed_at DESC ON notification_logs (executed_at DESC);
CREATE INDEX idx_notification_logs_status ON notification_logs (status);
CREATE INDEX idx_notification_logs_channel ON notification_logs (channel);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all reads/writes (change as needed)
CREATE POLICY notification_logs_allow_all ON notification_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notification_logs;
ALTER TABLE notification_logs REPLICA IDENTITY FULL;
