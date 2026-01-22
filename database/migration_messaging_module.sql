-- Migration: Messaging Module Restructure
-- Adds property SMS settings, extends message_recipients, and adds must_change_password to users
-- Run this on production after backing up your database

-- ========== 1. Add must_change_password to users table ==========
-- This flag forces password change on first login for landlords
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) DEFAULT 1;

-- Set existing users to not require password change (they're already active)
UPDATE users SET must_change_password = 0 WHERE must_change_password IS NULL;

-- ========== 2. Create property_sms_settings table ==========
-- Stores per-property AdvantaSMS credentials for landlord-to-tenant communications
CREATE TABLE IF NOT EXISTS property_sms_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    property_id VARCHAR(36) NOT NULL UNIQUE,
    api_url VARCHAR(500) DEFAULT 'https://quicksms.advantasms.com/api/services/sendsms/',
    api_key VARCHAR(255),
    partner_id VARCHAR(100),
    shortcode VARCHAR(100),
    enabled TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_property_sms_settings_property_id ON property_sms_settings(property_id);

-- ========== 3. Extend message_recipients table ==========
-- Make bulk_message_id nullable (system messages don't have a bulk parent)
ALTER TABLE message_recipients 
MODIFY COLUMN bulk_message_id VARCHAR(36) NULL;

-- Make tenant_id nullable (landlords are not tenants)
ALTER TABLE message_recipients 
MODIFY COLUMN tenant_id VARCHAR(36) NULL;

-- Add new columns for enhanced tracking
ALTER TABLE message_recipients 
ADD COLUMN IF NOT EXISTS message_category VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(20) DEFAULT 'tenant',
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS property_id VARCHAR(36);

-- Add index for message category queries
CREATE INDEX IF NOT EXISTS idx_message_recipients_category ON message_recipients(message_category);
CREATE INDEX IF NOT EXISTS idx_message_recipients_recipient_type ON message_recipients(recipient_type);
CREATE INDEX IF NOT EXISTS idx_message_recipients_property_id ON message_recipients(property_id);

-- ========== 4. Add role column to users if not exists ==========
-- This is for backward compatibility check
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';

-- ========== 5. Add landlord_id to properties if not exists ==========
-- Links properties to their landlord user account
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS landlord_id VARCHAR(36);

-- Add index for landlord queries
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);

-- ========== VERIFICATION QUERIES ==========
-- Run these after migration to verify success:
-- SELECT COLUMN_NAME FROM information_schema.columns WHERE table_name = 'users' AND table_schema = DATABASE();
-- SELECT COLUMN_NAME FROM information_schema.columns WHERE table_name = 'message_recipients' AND table_schema = DATABASE();
-- SELECT COLUMN_NAME FROM information_schema.columns WHERE table_name = 'property_sms_settings' AND table_schema = DATABASE();
