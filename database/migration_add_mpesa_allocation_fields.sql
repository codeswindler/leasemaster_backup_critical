ALTER TABLE mpesa_stk_requests
  ADD COLUMN IF NOT EXISTS allocation_status VARCHAR(30) NULL;

ALTER TABLE mpesa_stk_requests
  ADD COLUMN IF NOT EXISTS payment_id VARCHAR(36) NULL;

ALTER TABLE mpesa_stk_requests
  ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMP NULL DEFAULT NULL;
