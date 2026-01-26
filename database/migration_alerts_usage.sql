-- Migration: Alert rules extensions, email credits, and credit usage
-- Run this on production after backing up your database

-- Extend SMS settings with balance threshold
ALTER TABLE sms_settings
  ADD COLUMN IF NOT EXISTS balance_threshold DECIMAL(12,2) NULL;

-- Extend email settings with credits and threshold
ALTER TABLE email_settings
  ADD COLUMN IF NOT EXISTS credit_balance INT NULL,
  ADD COLUMN IF NOT EXISTS credit_threshold INT NULL;

-- Extend alert settings with types and channels
ALTER TABLE alert_settings
  ADD COLUMN IF NOT EXISTS alert_type VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS enable_sms TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enable_email TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS threshold_value DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS schedule_json TEXT NULL;

-- Track credit usage (SMS/Email)
CREATE TABLE IF NOT EXISTS credit_usage (
    id VARCHAR(36) PRIMARY KEY,
    landlord_id VARCHAR(36) NULL,
    property_id VARCHAR(36) NULL,
    channel VARCHAR(20) NOT NULL,
    units INT NOT NULL DEFAULT 0,
    unit_cost DECIMAL(12,2) NULL,
    balance_after DECIMAL(12,2) NULL,
    meta TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_credit_usage_property (property_id),
    INDEX idx_credit_usage_landlord (landlord_id),
    INDEX idx_credit_usage_channel (channel),
    INDEX idx_credit_usage_created_at (created_at)
);
