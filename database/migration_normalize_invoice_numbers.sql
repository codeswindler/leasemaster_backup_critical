UPDATE invoices
SET invoice_number = CONCAT('INV-', LPAD(id, 6, '0'));
