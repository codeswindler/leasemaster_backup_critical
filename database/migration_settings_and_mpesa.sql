-- Migration: Per-client settings, property prefixes, and M-Pesa STK tracking
-- Run this on production after backing up your database

-- Property account prefix
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS account_prefix VARCHAR(20) NULL;

-- SMS settings (per property/client)
CREATE TABLE IF NOT EXISTS sms_settings (
    id VARCHAR(36) PRIMARY KEY,
    landlord_id VARCHAR(36) NULL,
    property_id VARCHAR(36) NULL,
    api_url TEXT NULL,
    api_key TEXT NULL,
    partner_id TEXT NULL,
    shortcode TEXT NULL,
    sender_id TEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sms_settings_landlord (landlord_id),
    INDEX idx_sms_settings_property (property_id)
);

-- Email SMTP settings (per property/client)
CREATE TABLE IF NOT EXISTS email_settings (
    id VARCHAR(36) PRIMARY KEY,
    landlord_id VARCHAR(36) NULL,
    property_id VARCHAR(36) NULL,
    smtp_host TEXT NULL,
    smtp_port INT NULL,
    smtp_user TEXT NULL,
    smtp_pass TEXT NULL,
    smtp_secure VARCHAR(20) NULL,
    from_email TEXT NULL,
    from_name TEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email_settings_landlord (landlord_id),
    INDEX idx_email_settings_property (property_id)
);

-- M-Pesa STK settings (per property/client)
CREATE TABLE IF NOT EXISTS mpesa_settings (
    id VARCHAR(36) PRIMARY KEY,
    landlord_id VARCHAR(36) NULL,
    property_id VARCHAR(36) NULL,
    consumer_key TEXT NULL,
    consumer_secret TEXT NULL,
    passkey TEXT NULL,
    shortcode TEXT NULL,
    account_reference TEXT NULL,
    stk_callback_url TEXT NULL,
    balance_callback_url TEXT NULL,
    initiator_name TEXT NULL,
    security_credential TEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mpesa_settings_landlord (landlord_id),
    INDEX idx_mpesa_settings_property (property_id)
);

-- Invoice settings (per property/client)
CREATE TABLE IF NOT EXISTS invoice_settings (
    id VARCHAR(36) PRIMARY KEY,
    landlord_id VARCHAR(36) NULL,
    property_id VARCHAR(36) NULL,
    company_name TEXT NULL,
    company_phone TEXT NULL,
    company_email TEXT NULL,
    company_address TEXT NULL,
    payment_options TEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_invoice_settings_landlord (landlord_id),
    INDEX idx_invoice_settings_property (property_id)
);

-- Alert settings (per property/client)
CREATE TABLE IF NOT EXISTS alert_settings (
    id VARCHAR(36) PRIMARY KEY,
    landlord_id VARCHAR(36) NULL,
    property_id VARCHAR(36) NULL,
    recipient_type VARCHAR(20) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    frequency VARCHAR(20) NOT NULL DEFAULT 'immediate',
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_alert_settings_landlord (landlord_id),
    INDEX idx_alert_settings_property (property_id)
);

-- M-Pesa STK push tracking
CREATE TABLE IF NOT EXISTS mpesa_stk_requests (
    id VARCHAR(36) PRIMARY KEY,
    landlord_id VARCHAR(36) NULL,
    property_id VARCHAR(36) NULL,
    tenant_id VARCHAR(36) NULL,
    invoice_id VARCHAR(36) NULL,
    phone VARCHAR(30) NULL,
    account_number VARCHAR(50) NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    merchant_request_id TEXT NULL,
    checkout_request_id TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    result_code TEXT NULL,
    result_desc TEXT NULL,
    mpesa_receipt TEXT NULL,
    transaction_date TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mpesa_stk_invoice (invoice_id),
    INDEX idx_mpesa_stk_tenant (tenant_id),
    INDEX idx_mpesa_stk_property (property_id)
);
