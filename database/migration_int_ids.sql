-- Migration: Convert users/properties/tenants IDs to INT auto-increment
-- WARNING: This is a destructive schema migration. Backup first.

SET FOREIGN_KEY_CHECKS = 0;

-- 1) Add auto-increment integer IDs
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_int INT NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS id_int INT NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS id_int INT NOT NULL AUTO_INCREMENT UNIQUE;

-- 2) Create mapping tables from legacy UUID -> INT
CREATE TABLE IF NOT EXISTS user_id_map (
    legacy_id VARCHAR(36) PRIMARY KEY,
    id_int INT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS property_id_map (
    legacy_id VARCHAR(36) PRIMARY KEY,
    id_int INT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS tenant_id_map (
    legacy_id VARCHAR(36) PRIMARY KEY,
    id_int INT NOT NULL UNIQUE
);

REPLACE INTO user_id_map (legacy_id, id_int)
SELECT id, id_int FROM users;

REPLACE INTO property_id_map (legacy_id, id_int)
SELECT id, id_int FROM properties;

REPLACE INTO tenant_id_map (legacy_id, id_int)
SELECT id, id_int FROM tenants;

-- 3) Add new INT foreign key columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS landlord_id_int INT NULL;

-- Ensure legacy UUID columns exist for backfill (if missing)
ALTER TABLE users ADD COLUMN IF NOT EXISTS property_id VARCHAR(36) NULL;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS landlord_id VARCHAR(36) NULL;

-- Optional tables referencing users (if present)
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS user_id_int INT NULL;

ALTER TABLE charge_codes ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE house_types ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE units ADD COLUMN IF NOT EXISTS property_id_int INT NULL;

ALTER TABLE leases ADD COLUMN IF NOT EXISTS tenant_id_int INT NULL;

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_id_int INT NULL;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS property_id_int INT NULL;

ALTER TABLE message_recipients ADD COLUMN IF NOT EXISTS tenant_id_int INT NULL;
ALTER TABLE message_recipients ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE message_recipients ADD COLUMN IF NOT EXISTS sent_by_user_id_int INT NULL;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS tenant_id_int INT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS property_id_int INT NULL;

ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS landlord_id_int INT NULL;
ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS landlord_id_int INT NULL;
ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE mpesa_settings ADD COLUMN IF NOT EXISTS landlord_id_int INT NULL;
ALTER TABLE mpesa_settings ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS landlord_id_int INT NULL;
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS landlord_id_int INT NULL;
ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE mpesa_stk_requests ADD COLUMN IF NOT EXISTS landlord_id_int INT NULL;
ALTER TABLE mpesa_stk_requests ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE mpesa_stk_requests ADD COLUMN IF NOT EXISTS tenant_id_int INT NULL;
ALTER TABLE credit_usage ADD COLUMN IF NOT EXISTS landlord_id_int INT NULL;
ALTER TABLE credit_usage ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS tenant_id_int INT NULL;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE property_sms_settings ADD COLUMN IF NOT EXISTS property_id_int INT NULL;
ALTER TABLE login_otps ADD COLUMN IF NOT EXISTS user_id_int INT NULL;
ALTER TABLE login_otps ADD COLUMN IF NOT EXISTS tenant_id_int INT NULL;

-- 4) Backfill INT foreign keys using maps
UPDATE users u
LEFT JOIN property_id_map p ON u.property_id = p.legacy_id
SET u.property_id_int = p.id_int;

UPDATE properties p
LEFT JOIN user_id_map u ON p.landlord_id = u.legacy_id
SET p.landlord_id_int = u.id_int;

UPDATE charge_codes c
LEFT JOIN property_id_map p ON c.property_id = p.legacy_id
SET c.property_id_int = p.id_int;

UPDATE house_types h
LEFT JOIN property_id_map p ON h.property_id = p.legacy_id
SET h.property_id_int = p.id_int;

UPDATE units u
LEFT JOIN property_id_map p ON u.property_id = p.legacy_id
SET u.property_id_int = p.id_int;

UPDATE leases l
LEFT JOIN tenant_id_map t ON l.tenant_id = t.legacy_id
SET l.tenant_id_int = t.id_int;

UPDATE activity_logs a
LEFT JOIN user_id_map u ON a.user_id = u.legacy_id
LEFT JOIN property_id_map p ON a.property_id = p.legacy_id
SET a.user_id_int = u.id_int,
    a.property_id_int = p.id_int;

UPDATE message_recipients r
LEFT JOIN tenant_id_map t ON r.tenant_id = t.legacy_id
LEFT JOIN property_id_map p ON r.property_id = p.legacy_id
LEFT JOIN user_id_map u ON r.sent_by_user_id = u.legacy_id
SET r.tenant_id_int = t.id_int,
    r.property_id_int = p.id_int,
    r.sent_by_user_id_int = u.id_int;

UPDATE messages m
LEFT JOIN tenant_id_map t ON m.tenant_id = t.legacy_id
LEFT JOIN property_id_map p ON m.property_id = p.legacy_id
SET m.tenant_id_int = t.id_int,
    m.property_id_int = p.id_int;

UPDATE sms_settings s
LEFT JOIN user_id_map u ON s.landlord_id = u.legacy_id
LEFT JOIN property_id_map p ON s.property_id = p.legacy_id
SET s.landlord_id_int = u.id_int,
    s.property_id_int = p.id_int;

UPDATE email_settings s
LEFT JOIN user_id_map u ON s.landlord_id = u.legacy_id
LEFT JOIN property_id_map p ON s.property_id = p.legacy_id
SET s.landlord_id_int = u.id_int,
    s.property_id_int = p.id_int;

UPDATE mpesa_settings s
LEFT JOIN user_id_map u ON s.landlord_id = u.legacy_id
LEFT JOIN property_id_map p ON s.property_id = p.legacy_id
SET s.landlord_id_int = u.id_int,
    s.property_id_int = p.id_int;

UPDATE invoice_settings s
LEFT JOIN user_id_map u ON s.landlord_id = u.legacy_id
LEFT JOIN property_id_map p ON s.property_id = p.legacy_id
SET s.landlord_id_int = u.id_int,
    s.property_id_int = p.id_int;

UPDATE alert_settings s
LEFT JOIN user_id_map u ON s.landlord_id = u.legacy_id
LEFT JOIN property_id_map p ON s.property_id = p.legacy_id
SET s.landlord_id_int = u.id_int,
    s.property_id_int = p.id_int;

UPDATE mpesa_stk_requests s
LEFT JOIN user_id_map u ON s.landlord_id = u.legacy_id
LEFT JOIN property_id_map p ON s.property_id = p.legacy_id
LEFT JOIN tenant_id_map t ON s.tenant_id = t.legacy_id
SET s.landlord_id_int = u.id_int,
    s.property_id_int = p.id_int,
    s.tenant_id_int = t.id_int;

UPDATE credit_usage s
LEFT JOIN user_id_map u ON s.landlord_id = u.legacy_id
LEFT JOIN property_id_map p ON s.property_id = p.legacy_id
SET s.landlord_id_int = u.id_int,
    s.property_id_int = p.id_int;

UPDATE maintenance_requests r
LEFT JOIN tenant_id_map t ON r.tenant_id = t.legacy_id
LEFT JOIN property_id_map p ON r.property_id = p.legacy_id
SET r.tenant_id_int = t.id_int,
    r.property_id_int = p.id_int;

UPDATE property_sms_settings s
LEFT JOIN property_id_map p ON s.property_id = p.legacy_id
SET s.property_id_int = p.id_int;

UPDATE login_otps o
LEFT JOIN user_id_map u ON o.user_id = u.legacy_id
LEFT JOIN tenant_id_map t ON o.tenant_id = t.legacy_id
SET o.user_id_int = u.id_int,
    o.tenant_id_int = t.id_int;

-- 5) Preserve legacy UUIDs, replace id/foreign key columns with INT versions
ALTER TABLE users ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(36) NULL;
UPDATE users SET legacy_id = id;
SET @has_users_pk := (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND constraint_type = 'PRIMARY KEY'
);
SET @drop_users_pk_sql := IF(@has_users_pk > 0, 'ALTER TABLE users DROP PRIMARY KEY', 'SELECT 1');
PREPARE drop_users_pk_stmt FROM @drop_users_pk_sql;
EXECUTE drop_users_pk_stmt;
DEALLOCATE PREPARE drop_users_pk_stmt;

-- Drop foreign key from export_jobs if it exists (before dropping users.id)
SET @has_export_jobs := (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'export_jobs'
);
SET @has_export_jobs_fk := (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'export_jobs'
      AND constraint_name = 'fk_export_jobs_user'
      AND constraint_type = 'FOREIGN KEY'
);
SET @drop_fk_sql := IF(@has_export_jobs_fk > 0, 'ALTER TABLE export_jobs DROP FOREIGN KEY fk_export_jobs_user', 'SELECT 1');
PREPARE drop_fk_stmt FROM @drop_fk_sql;
EXECUTE drop_fk_stmt;
DEALLOCATE PREPARE drop_fk_stmt;

-- Drop foreign key from login_otps if it exists (before dropping users.id)
SET @has_login_otps_fk := (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'login_otps'
      AND constraint_name = 'fk_login_otps_user'
      AND constraint_type = 'FOREIGN KEY'
);
SET @drop_login_otps_fk_sql := IF(@has_login_otps_fk > 0, 'ALTER TABLE login_otps DROP FOREIGN KEY fk_login_otps_user', 'SELECT 1');
PREPARE drop_login_otps_fk_stmt FROM @drop_login_otps_fk_sql;
EXECUTE drop_login_otps_fk_stmt;
DEALLOCATE PREPARE drop_login_otps_fk_stmt;

ALTER TABLE users DROP COLUMN id;
ALTER TABLE users CHANGE COLUMN id_int id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE users ADD PRIMARY KEY (id);

ALTER TABLE properties ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(36) NULL;
UPDATE properties SET legacy_id = id;
SET @has_properties_pk := (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'properties'
      AND constraint_type = 'PRIMARY KEY'
);
SET @drop_properties_pk_sql := IF(@has_properties_pk > 0, 'ALTER TABLE properties DROP PRIMARY KEY', 'SELECT 1');
PREPARE drop_properties_pk_stmt FROM @drop_properties_pk_sql;
EXECUTE drop_properties_pk_stmt;
DEALLOCATE PREPARE drop_properties_pk_stmt;
ALTER TABLE properties DROP COLUMN id;
ALTER TABLE properties CHANGE COLUMN id_int id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE properties ADD PRIMARY KEY (id);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(36) NULL;
UPDATE tenants SET legacy_id = id;
SET @has_tenants_pk := (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'tenants'
      AND constraint_type = 'PRIMARY KEY'
);
SET @drop_tenants_pk_sql := IF(@has_tenants_pk > 0, 'ALTER TABLE tenants DROP PRIMARY KEY', 'SELECT 1');
PREPARE drop_tenants_pk_stmt FROM @drop_tenants_pk_sql;
EXECUTE drop_tenants_pk_stmt;
DEALLOCATE PREPARE drop_tenants_pk_stmt;
ALTER TABLE tenants DROP COLUMN id;
ALTER TABLE tenants CHANGE COLUMN id_int id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE tenants ADD PRIMARY KEY (id);

-- Swap foreign key columns to INT versions
ALTER TABLE users DROP COLUMN IF EXISTS property_id;
ALTER TABLE users CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE properties DROP COLUMN IF EXISTS landlord_id;
ALTER TABLE properties CHANGE COLUMN landlord_id_int landlord_id INT NULL;

ALTER TABLE charge_codes DROP COLUMN IF EXISTS property_id;
ALTER TABLE charge_codes CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE house_types DROP COLUMN IF EXISTS property_id;
ALTER TABLE house_types CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE units DROP COLUMN IF EXISTS property_id;
ALTER TABLE units CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE leases DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE leases CHANGE COLUMN tenant_id_int tenant_id INT NULL;

ALTER TABLE activity_logs DROP COLUMN IF EXISTS user_id;
ALTER TABLE activity_logs DROP COLUMN IF EXISTS property_id;
ALTER TABLE activity_logs CHANGE COLUMN user_id_int user_id INT NULL;
ALTER TABLE activity_logs CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE message_recipients DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE message_recipients DROP COLUMN IF EXISTS property_id;
ALTER TABLE message_recipients DROP COLUMN IF EXISTS sent_by_user_id;
ALTER TABLE message_recipients CHANGE COLUMN tenant_id_int tenant_id INT NULL;
ALTER TABLE message_recipients CHANGE COLUMN property_id_int property_id INT NULL;
ALTER TABLE message_recipients CHANGE COLUMN sent_by_user_id_int sent_by_user_id INT NULL;

ALTER TABLE messages DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE messages DROP COLUMN IF EXISTS property_id;
ALTER TABLE messages CHANGE COLUMN tenant_id_int tenant_id INT NULL;
ALTER TABLE messages CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE sms_settings DROP COLUMN IF EXISTS landlord_id;
ALTER TABLE sms_settings DROP COLUMN IF EXISTS property_id;
ALTER TABLE sms_settings CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE sms_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE email_settings DROP COLUMN IF EXISTS landlord_id;
ALTER TABLE email_settings DROP COLUMN IF EXISTS property_id;
ALTER TABLE email_settings CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE email_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE mpesa_settings DROP COLUMN IF EXISTS landlord_id;
ALTER TABLE mpesa_settings DROP COLUMN IF EXISTS property_id;
ALTER TABLE mpesa_settings CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE mpesa_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE invoice_settings DROP COLUMN IF EXISTS landlord_id;
ALTER TABLE invoice_settings DROP COLUMN IF EXISTS property_id;
ALTER TABLE invoice_settings CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE invoice_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE alert_settings DROP COLUMN IF EXISTS landlord_id;
ALTER TABLE alert_settings DROP COLUMN IF EXISTS property_id;
ALTER TABLE alert_settings CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE alert_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE mpesa_stk_requests DROP COLUMN IF EXISTS landlord_id;
ALTER TABLE mpesa_stk_requests DROP COLUMN IF EXISTS property_id;
ALTER TABLE mpesa_stk_requests DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE mpesa_stk_requests CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE mpesa_stk_requests CHANGE COLUMN property_id_int property_id INT NULL;
ALTER TABLE mpesa_stk_requests CHANGE COLUMN tenant_id_int tenant_id INT NULL;

ALTER TABLE credit_usage DROP COLUMN IF EXISTS landlord_id;
ALTER TABLE credit_usage DROP COLUMN IF EXISTS property_id;
ALTER TABLE credit_usage CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE credit_usage CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS property_id;
ALTER TABLE maintenance_requests CHANGE COLUMN tenant_id_int tenant_id INT NULL;
ALTER TABLE maintenance_requests CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE property_sms_settings DROP COLUMN IF EXISTS property_id;
ALTER TABLE property_sms_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE login_otps DROP COLUMN IF EXISTS user_id;
ALTER TABLE login_otps DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE login_otps CHANGE COLUMN user_id_int user_id INT NULL;
ALTER TABLE login_otps CHANGE COLUMN tenant_id_int tenant_id INT NULL;

-- Rewire export_jobs to new INT users if table exists
SET @has_export_jobs_col := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'export_jobs' AND column_name = 'user_id'
);
SET @drop_export_user_sql := IF(@has_export_jobs_col > 0, 'ALTER TABLE export_jobs DROP COLUMN user_id', 'SELECT 1');
PREPARE drop_export_user_stmt FROM @drop_export_user_sql;
EXECUTE drop_export_user_stmt;
DEALLOCATE PREPARE drop_export_user_stmt;

SET @has_export_jobs := (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'export_jobs'
);
SET @swap_export_user_sql := IF(@has_export_jobs > 0, 'ALTER TABLE export_jobs CHANGE COLUMN user_id_int user_id INT NULL', 'SELECT 1');
PREPARE swap_export_user_stmt FROM @swap_export_user_sql;
EXECUTE swap_export_user_stmt;
DEALLOCATE PREPARE swap_export_user_stmt;

SET FOREIGN_KEY_CHECKS = 1;
