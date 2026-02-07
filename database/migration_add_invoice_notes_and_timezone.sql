-- Add account timezone offset to invoice settings
ALTER TABLE invoice_settings
  ADD COLUMN IF NOT EXISTS timezone_offset VARCHAR(10) NULL;

-- Invoice notes/audit history
CREATE TABLE IF NOT EXISTS invoice_notes (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  note TEXT NOT NULL,
  created_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_notes_invoice (invoice_id),
  INDEX idx_invoice_notes_created_by (created_by),
  INDEX idx_invoice_notes_created_at (created_at),
  CONSTRAINT fk_invoice_notes_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Ensure activity log columns exist for user tracking
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS action TEXT NULL,
  ADD COLUMN IF NOT EXISTS details TEXT NULL,
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS user_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS property_id VARCHAR(36) NULL;
