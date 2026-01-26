-- Migration: add login_otps table for OTP authentication
CREATE TABLE IF NOT EXISTS login_otps (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    tenant_id VARCHAR(36) NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login_otps_user (user_id),
    INDEX idx_login_otps_tenant (tenant_id),
    INDEX idx_login_otps_expires (expires_at)
);
