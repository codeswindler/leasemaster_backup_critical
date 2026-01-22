-- Add sender and user tracking to message_recipients
ALTER TABLE message_recipients
  ADD COLUMN IF NOT EXISTS sender_shortcode VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS sent_by_user_id VARCHAR(36) NULL;

-- Indexes for common filters
CREATE INDEX IF NOT EXISTS idx_message_recipients_contact ON message_recipients (recipient_contact);
CREATE INDEX IF NOT EXISTS idx_message_recipients_sender ON message_recipients (sender_shortcode);
CREATE INDEX IF NOT EXISTS idx_message_recipients_created_at ON message_recipients (created_at);
CREATE INDEX IF NOT EXISTS idx_message_recipients_sent_by ON message_recipients (sent_by_user_id);

-- Message templates
CREATE TABLE IF NOT EXISTS message_templates (
  id VARCHAR(36) PRIMARY KEY,
  name TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL,
  subject TEXT NULL,
  content TEXT NOT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  user_id VARCHAR(36) NULL,
  property_id VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs (type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_property ON activity_logs (property_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at);

-- Seed default templates if missing
INSERT INTO message_templates (id, name, channel, subject, content, is_system)
SELECT UUID(), 'Maintenance Notice', 'sms',
       'Scheduled Maintenance',
       'Dear {tenant_name},\n\nWe will be conducting scheduled maintenance on {date}.\n\nPlease expect temporary disruption to services.\n\nWe apologize for any inconvenience.\n\nManagement',
       1
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'Maintenance Notice');

INSERT INTO message_templates (id, name, channel, subject, content, is_system)
SELECT UUID(), 'Balance Reminder', 'sms',
       'Rent Balance Reminder',
       'Dear {tenant_name},\n\nYour rent balance is {amount}. Please clear your balance by {due_date} to avoid penalties.\n\nThank you.',
       1
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'Balance Reminder');
