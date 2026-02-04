-- LeaseMaster Production Database Setup for MariaDB
-- Run this script on your Contabo server to create all necessary tables
-- This is a clean production setup with NO mock data

-- Create database (run this separately if database doesn't exist)
-- CREATE DATABASE leasemaster_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE leasemaster_db;

-- Drop existing tables if they exist (for fresh start)
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS water_readings;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS leases;
DROP TABLE IF EXISTS message_recipients;
DROP TABLE IF EXISTS bulk_messages;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS house_types;
DROP TABLE IF EXISTS charge_codes;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- Create users table (for admin authentication)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    status INT DEFAULT 1,
    login_attempts INT DEFAULT 0,
    last_login TIMESTAMP NULL,
    last_failed_attempt TIMESTAMP NULL,
    blocked_until TIMESTAMP NULL,
    must_change_password TINYINT(1) DEFAULT 0,
    property_id INT,
    property_limit INT DEFAULT NULL,
    permissions TEXT,
    otp_enabled TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_property (property_id)
);

CREATE TABLE user_properties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    property_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_property (user_id, property_id),
    INDEX idx_user_properties_user (user_id),
    INDEX idx_user_properties_property (property_id)
);

-- Create properties table
CREATE TABLE properties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    landlord_name TEXT NOT NULL,
    landlord_phone VARCHAR(50),
    landlord_email VARCHAR(255),
    landlord_id INT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tenants table
CREATE TABLE tenants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name TEXT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    id_number VARCHAR(50) NOT NULL UNIQUE,
    emergency_contact TEXT,
    emergency_phone VARCHAR(50),
    secondary_contact_name TEXT,
    secondary_contact_phone VARCHAR(50),
    secondary_contact_email VARCHAR(255),
    notify_secondary VARCHAR(10) DEFAULT 'false' NOT NULL,
    tenant_password_hash VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NULL,
  tenant_id INT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  channel VARCHAR(20) NULL,
  contact VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_reset_user (user_id),
  INDEX idx_password_reset_tenant (tenant_id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash)
);

-- Create charge_codes table (Garbage Fee, Security Fee, etc.)
CREATE TABLE charge_codes (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    property_id INT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active VARCHAR(10) DEFAULT 'true' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Create house_types table (bedsitters, 1B, 2B, etc.)
CREATE TABLE house_types (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    property_id INT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_rent_amount DECIMAL(12, 2) NOT NULL,
    rent_deposit_amount DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    water_rate_per_unit DECIMAL(8, 2) DEFAULT 15.50 NOT NULL,
    water_rate_type VARCHAR(20) DEFAULT 'unit_based' NOT NULL,
    water_flat_rate DECIMAL(8, 2) DEFAULT 0.00 NOT NULL,
    charge_amounts TEXT,
    is_active VARCHAR(10) DEFAULT 'true' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Create units table
CREATE TABLE units (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    property_id INT NOT NULL,
    house_type_id VARCHAR(36) NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    rent_amount DECIMAL(12, 2) NOT NULL,
    rent_deposit_amount DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    water_rate_amount DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    charge_amounts TEXT,
    status VARCHAR(20) DEFAULT 'vacant' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (house_type_id) REFERENCES house_types(id) ON DELETE CASCADE
);

-- Create leases table
CREATE TABLE leases (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    unit_id VARCHAR(36) NOT NULL,
    tenant_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(12, 2) NOT NULL,
    deposit_amount DECIMAL(12, 2) NOT NULL,
    water_rate_per_unit DECIMAL(8, 2) DEFAULT 15.50 NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create invoices table
CREATE TABLE invoices (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lease_id VARCHAR(36) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    issue_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);

-- Create invoice_items table
CREATE TABLE invoice_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    invoice_id VARCHAR(36) NOT NULL,
    charge_code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1 NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Create water_readings table
CREATE TABLE water_readings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    unit_id VARCHAR(36) NOT NULL,
    reading_date DATE NOT NULL,
    previous_reading DECIMAL(10, 2),
    current_reading DECIMAL(10, 2) NOT NULL,
    consumption DECIMAL(10, 2) NOT NULL,
    rate_per_unit DECIMAL(8, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    notes TEXT,
    last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- Create payments table
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lease_id VARCHAR(36) NOT NULL,
    invoice_id VARCHAR(36),
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

-- Create activity_logs table (operational log)
CREATE TABLE activity_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    action TEXT NOT NULL,
    details TEXT,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    user_id INT,
    property_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_logs_type (type),
    INDEX idx_activity_logs_user (user_id),
    INDEX idx_activity_logs_property (property_id),
    INDEX idx_activity_logs_created_at (created_at)
);

-- Create bulk_messages table
CREATE TABLE bulk_messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    message_type VARCHAR(20) NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    total_recipients INT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create message_recipients table
CREATE TABLE message_recipients (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    bulk_message_id VARCHAR(36) NOT NULL,
    tenant_id INT NOT NULL,
    channel VARCHAR(20) NOT NULL,
    recipient_contact VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bulk_message_id) REFERENCES bulk_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create messages table (for backward compatibility)
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id INT,
    property_id INT,
    channel VARCHAR(20) NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

-- Create activity logs table
CREATE TABLE activity_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    action TEXT NOT NULL,
    details TEXT,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    user_id VARCHAR(36),
    property_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_logs_type (type),
    INDEX idx_activity_logs_user (user_id),
    INDEX idx_activity_logs_property (property_id),
    INDEX idx_activity_logs_created_at (created_at)
);

-- Create indexes for better performance
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_leases_unit_id ON leases(unit_id);
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_invoices_lease_id ON invoices(lease_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_payments_lease_id ON payments(lease_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_water_readings_unit_id ON water_readings(unit_id);
CREATE INDEX idx_water_readings_status ON water_readings(status);

-- Note: Admin user will be created separately using create-admin-user.php script
-- This ensures password is properly hashed before insertion


-- Create password_reset_tokens table
CREATE TABLE password_reset_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NULL,
    tenant_id INT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    channel VARCHAR(20) NULL,
    contact VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_reset_user (user_id),
    INDEX idx_password_reset_tenant (tenant_id),
    UNIQUE KEY uq_password_reset_token_hash (token_hash)
);

