SET FOREIGN_KEY_CHECKS = 0;

-- Preserve existing UUIDs if an id column exists
ALTER TABLE leases ADD COLUMN IF NOT EXISTS lease_uuid VARCHAR(36);
SET @leases_has_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leases'
    AND COLUMN_NAME = 'id'
);
SET @sql := IF(@leases_has_id = 1, 'UPDATE leases SET lease_uuid = id WHERE lease_uuid IS NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_uuid VARCHAR(36);
SET @invoices_has_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'id'
);
SET @sql := IF(@invoices_has_id = 1, 'UPDATE invoices SET invoice_uuid = id WHERE invoice_uuid IS NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Temporary int IDs
ALTER TABLE leases ADD COLUMN IF NOT EXISTS id_int BIGINT UNSIGNED;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS id_int BIGINT UNSIGNED;

-- Backfill int IDs deterministically (prefer existing seq columns when present)
SET @leases_has_seq := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leases'
    AND COLUMN_NAME = 'lease_seq'
);
SET @sql := IF(@leases_has_seq = 1, 'UPDATE leases SET id_int = lease_seq WHERE id_int IS NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @invoices_has_seq := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'invoice_seq'
);
SET @sql := IF(@invoices_has_seq = 1, 'UPDATE invoices SET id_int = invoice_seq WHERE id_int IS NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@leases_has_seq = 0, 'SET @row := 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@leases_has_seq = 0, 'UPDATE leases SET id_int = (@row := @row + 1) WHERE id_int IS NULL ORDER BY created_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@invoices_has_seq = 0, 'SET @row := 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@invoices_has_seq = 0, 'UPDATE invoices SET id_int = (@row := @row + 1) WHERE id_int IS NULL ORDER BY created_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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

-- Update child table references to new int IDs (only when UUIDs exist and FK columns are char)
SET @leases_has_uuid := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leases'
    AND COLUMN_NAME = 'lease_uuid'
);
SET @invoices_lease_is_char := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'lease_id'
    AND DATA_TYPE IN ('varchar','char')
);
SET @sql := IF(@leases_has_uuid = 1 AND @invoices_lease_is_char = 1, 'UPDATE invoices i JOIN leases l ON i.lease_id = l.lease_uuid SET i.lease_id = l.id_int', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @payments_lease_is_char := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND COLUMN_NAME = 'lease_id'
    AND DATA_TYPE IN ('varchar','char')
);
SET @sql := IF(@leases_has_uuid = 1 AND @payments_lease_is_char = 1, 'UPDATE payments p JOIN leases l ON p.lease_id = l.lease_uuid SET p.lease_id = l.id_int', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @invoices_has_uuid := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'invoice_uuid'
);
SET @payments_invoice_is_char := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND COLUMN_NAME = 'invoice_id'
    AND DATA_TYPE IN ('varchar','char')
);
SET @sql := IF(@invoices_has_uuid = 1 AND @payments_invoice_is_char = 1, 'UPDATE payments p JOIN invoices i ON p.invoice_id = i.invoice_uuid SET p.invoice_id = i.id_int', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @invoice_items_invoice_is_char := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoice_items'
    AND COLUMN_NAME = 'invoice_id'
    AND DATA_TYPE IN ('varchar','char')
);
SET @sql := IF(@invoices_has_uuid = 1 AND @invoice_items_invoice_is_char = 1, 'UPDATE invoice_items ii JOIN invoices i ON ii.invoice_id = i.invoice_uuid SET ii.invoice_id = i.id_int', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Change FK column types only if still char
SET @sql := IF(@invoices_lease_is_char = 1, 'ALTER TABLE invoices MODIFY lease_id BIGINT UNSIGNED NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@payments_lease_is_char = 1, 'ALTER TABLE payments MODIFY lease_id BIGINT UNSIGNED NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@payments_invoice_is_char = 1, 'ALTER TABLE payments MODIFY invoice_id BIGINT UNSIGNED', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@invoice_items_invoice_is_char = 1, 'ALTER TABLE invoice_items MODIFY invoice_id BIGINT UNSIGNED NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Swap primary keys to int IDs (only if PK exists)
SET @lease_has_pk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leases'
    AND CONSTRAINT_TYPE = 'PRIMARY KEY'
);
SET @sql := IF(@lease_has_pk = 1, 'ALTER TABLE leases DROP PRIMARY KEY', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @invoice_has_pk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND CONSTRAINT_TYPE = 'PRIMARY KEY'
);
SET @sql := IF(@invoice_has_pk = 1, 'ALTER TABLE invoices DROP PRIMARY KEY', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure id_int is a primary key before adding AUTO_INCREMENT
SET @lease_has_id_int := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leases'
    AND COLUMN_NAME = 'id_int'
);
SET @lease_has_pk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leases'
    AND CONSTRAINT_TYPE = 'PRIMARY KEY'
);
SET @sql := IF(@lease_has_id_int = 1 AND @lease_has_pk = 0, 'ALTER TABLE leases ADD PRIMARY KEY (id_int)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @invoice_has_id_int := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'id_int'
);
SET @invoice_has_pk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND CONSTRAINT_TYPE = 'PRIMARY KEY'
);
SET @sql := IF(@invoice_has_id_int = 1 AND @invoice_has_pk = 0, 'ALTER TABLE invoices ADD PRIMARY KEY (id_int)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @leases_has_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leases'
    AND COLUMN_NAME = 'id'
);
SET @sql := IF(@leases_has_id = 1, 'ALTER TABLE leases DROP COLUMN id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @invoices_has_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'id'
);
SET @sql := IF(@invoices_has_id = 1, 'ALTER TABLE invoices DROP COLUMN id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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
