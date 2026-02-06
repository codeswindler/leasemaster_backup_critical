UPDATE invoices
SET invoice_number = CONCAT('INV-', LPAD(invoice_seq, 6, '0'));
