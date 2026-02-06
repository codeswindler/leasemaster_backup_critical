SET @has_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'id'
);
SET @has_seq := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'invoice_seq'
);
SET @sql := IF(@has_id = 1,
  'UPDATE invoices SET invoice_number = CONCAT(''INV-'', LPAD(id, 6, ''0''))',
  IF(@has_seq = 1,
     'UPDATE invoices SET invoice_number = CONCAT(''INV-'', LPAD(invoice_seq, 6, ''0''))',
     'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
