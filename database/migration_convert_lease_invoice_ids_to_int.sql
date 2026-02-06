SET FOREIGN_KEY_CHECKS = 0;

-- Preserve existing UUIDs
ALTER TABLE leases ADD COLUMN IF NOT EXISTS lease_uuid VARCHAR(36);
UPDATE leases SET lease_uuid = id WHERE lease_uuid IS NULL;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_uuid VARCHAR(36);
UPDATE invoices SET invoice_uuid = id WHERE invoice_uuid IS NULL;

-- Temporary int IDs
ALTER TABLE leases ADD COLUMN IF NOT EXISTS id_int BIGINT UNSIGNED;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS id_int BIGINT UNSIGNED;

-- Backfill int IDs deterministically
SET @row := 0;
UPDATE leases SET id_int = (@row := @row + 1) ORDER BY created_at, id;

SET @row := 0;
UPDATE invoices SET id_int = (@row := @row + 1) ORDER BY created_at, id;

-- Drop foreign keys dynamically
SET @fk_invoices_lease := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'lease_id'
    AND REFERENCED_TABLE_NAME = 'leases'
  LIMIT 1
);
SET @sql := IF(@fk_invoices_lease IS NULL, 'SELECT 1', CONCAT('ALTER TABLE invoices DROP FOREIGN KEY ', @fk_invoices_lease));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_payments_lease := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND COLUMN_NAME = 'lease_id'
    AND REFERENCED_TABLE_NAME = 'leases'
  LIMIT 1
);
SET @sql := IF(@fk_payments_lease IS NULL, 'SELECT 1', CONCAT('ALTER TABLE payments DROP FOREIGN KEY ', @fk_payments_lease));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_payments_invoice := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND COLUMN_NAME = 'invoice_id'
    AND REFERENCED_TABLE_NAME = 'invoices'
  LIMIT 1
);
SET @sql := IF(@fk_payments_invoice IS NULL, 'SELECT 1', CONCAT('ALTER TABLE payments DROP FOREIGN KEY ', @fk_payments_invoice));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_invoice_items_invoice := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoice_items'
    AND COLUMN_NAME = 'invoice_id'
    AND REFERENCED_TABLE_NAME = 'invoices'
  LIMIT 1
);
SET @sql := IF(@fk_invoice_items_invoice IS NULL, 'SELECT 1', CONCAT('ALTER TABLE invoice_items DROP FOREIGN KEY ', @fk_invoice_items_invoice));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Update child table references to new int IDs
UPDATE invoices i
JOIN leases l ON i.lease_id = l.lease_uuid
SET i.lease_id = l.id_int;

UPDATE payments p
JOIN leases l ON p.lease_id = l.lease_uuid
SET p.lease_id = l.id_int;

UPDATE payments p
JOIN invoices i ON p.invoice_id = i.invoice_uuid
SET p.invoice_id = i.id_int;

UPDATE invoice_items ii
JOIN invoices i ON ii.invoice_id = i.invoice_uuid
SET ii.invoice_id = i.id_int;

-- Change FK column types
ALTER TABLE invoices MODIFY lease_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE payments MODIFY lease_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE payments MODIFY invoice_id BIGINT UNSIGNED;
ALTER TABLE invoice_items MODIFY invoice_id BIGINT UNSIGNED NOT NULL;

-- Swap primary keys to int IDs
ALTER TABLE leases DROP PRIMARY KEY;
ALTER TABLE invoices DROP PRIMARY KEY;

ALTER TABLE leases DROP COLUMN id;
ALTER TABLE invoices DROP COLUMN id;

ALTER TABLE leases CHANGE COLUMN id_int id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE invoices CHANGE COLUMN id_int id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;

-- Drop old sequence columns if they exist
ALTER TABLE leases DROP COLUMN IF EXISTS lease_seq;
ALTER TABLE invoices DROP COLUMN IF EXISTS invoice_seq;

-- Normalize display numbers from int IDs
UPDATE leases SET lease_number = CONCAT('LSE-', LPAD(id, 6, '0')) WHERE lease_number IS NULL OR lease_number = '';
UPDATE invoices SET invoice_number = CONCAT('INV-', LPAD(id, 6, '0'));

-- Re-create primary keys and foreign keys
ALTER TABLE leases ADD PRIMARY KEY (id);
ALTER TABLE invoices ADD PRIMARY KEY (id);

ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_lease_id FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE;
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_lease_id FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE;
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_invoice_id FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE invoice_items
  ADD CONSTRAINT fk_invoice_items_invoice_id FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
