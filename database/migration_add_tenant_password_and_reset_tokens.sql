-- Add tenant password hash and password reset tokens table

ALTER TABLE tenants
  ADD COLUMN tenant_password_hash VARCHAR(255) NULL AFTER portal_access_code_hash;

-- Backfill tenant password hash from existing portal access code hash
UPDATE tenants
SET tenant_password_hash = portal_access_code_hash
WHERE tenant_password_hash IS NULL AND portal_access_code_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NULL,
  tenant_id INT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  channel VARCHAR(20) NULL,
  contact VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_reset_user (user_id),
  INDEX idx_password_reset_tenant (tenant_id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash)
);
