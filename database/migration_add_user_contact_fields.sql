-- Add contact fields to users table for landlords/customers
-- MariaDB/MySQL compatible

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS id_number VARCHAR(50) NULL;

-- Backfill from properties where available
UPDATE users u
JOIN properties p ON p.landlord_id = u.id
SET 
  u.full_name = COALESCE(u.full_name, p.landlord_name),
  u.phone = COALESCE(u.phone, p.landlord_phone)
WHERE u.role = 'client';
