-- Migration: Add maintenance_requests table for tenant maintenance workflow
-- Run this on production after backing up your database

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NULL,
    property_id VARCHAR(36) NULL,
    unit_id VARCHAR(36) NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    notes TEXT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    response TEXT NULL,
    responded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_maintenance_requests_tenant (tenant_id),
    INDEX idx_maintenance_requests_property (property_id),
    INDEX idx_maintenance_requests_unit (unit_id),
    INDEX idx_maintenance_requests_status (status),
    INDEX idx_maintenance_requests_created_at (created_at)
);
