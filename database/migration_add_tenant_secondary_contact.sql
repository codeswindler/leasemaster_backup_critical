ALTER TABLE tenants
  ADD COLUMN secondary_contact_name TEXT,
  ADD COLUMN secondary_contact_phone VARCHAR(50),
  ADD COLUMN secondary_contact_email VARCHAR(255),
  ADD COLUMN notify_secondary VARCHAR(10) NOT NULL DEFAULT 'false';
