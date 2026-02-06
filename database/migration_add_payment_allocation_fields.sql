ALTER TABLE payments
ADD COLUMN account_number VARCHAR(50) NULL,
ADD COLUMN allocation_status VARCHAR(20) NOT NULL DEFAULT 'allocated';

CREATE INDEX idx_payments_account_number ON payments(account_number);
