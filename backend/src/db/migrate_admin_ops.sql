-- Admin Ops Migration
-- Adds audit logs, webhook event tracking, system events, and retention settings

-- Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  metadata JSONB,
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action, created_at DESC);

-- Paystack Webhook Events
CREATE TABLE IF NOT EXISTS paystack_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  reference VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processed, failed
  attempts INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  error TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paystack_webhook_status ON paystack_webhook_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paystack_webhook_reference ON paystack_webhook_events(reference);

-- System Events (AI errors, email failures, job failures)
CREATE TABLE IF NOT EXISTS system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- ai_error, email_error, job_error, webhook_error
  severity VARCHAR(20) NOT NULL DEFAULT 'error', -- info, warning, error
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity, created_at DESC);

-- Platform Settings defaults (retention & anonymization)
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES
  ('data_retention_days', '{"days": 365, "enabled": false}', 'Days to retain reports before deletion'),
  ('anonymize_after_days', '{"days": 30, "enabled": false}', 'Days after which reports are anonymized')
ON CONFLICT (setting_key) DO NOTHING;

