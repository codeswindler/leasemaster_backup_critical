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
ALTER TABLE users DROP PRIMARY KEY;
ALTER TABLE users DROP COLUMN id;
ALTER TABLE users CHANGE COLUMN id_int id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE users ADD PRIMARY KEY (id);

ALTER TABLE properties ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(36) NULL;
UPDATE properties SET legacy_id = id;
ALTER TABLE properties DROP PRIMARY KEY;
ALTER TABLE properties DROP COLUMN id;
ALTER TABLE properties CHANGE COLUMN id_int id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE properties ADD PRIMARY KEY (id);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(36) NULL;
UPDATE tenants SET legacy_id = id;
ALTER TABLE tenants DROP PRIMARY KEY;
ALTER TABLE tenants DROP COLUMN id;
ALTER TABLE tenants CHANGE COLUMN id_int id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE tenants ADD PRIMARY KEY (id);

-- Swap foreign key columns to INT versions
ALTER TABLE users DROP COLUMN property_id;
ALTER TABLE users CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE properties DROP COLUMN landlord_id;
ALTER TABLE properties CHANGE COLUMN landlord_id_int landlord_id INT NULL;

ALTER TABLE charge_codes DROP COLUMN property_id;
ALTER TABLE charge_codes CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE house_types DROP COLUMN property_id;
ALTER TABLE house_types CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE units DROP COLUMN property_id;
ALTER TABLE units CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE leases DROP COLUMN tenant_id;
ALTER TABLE leases CHANGE COLUMN tenant_id_int tenant_id INT NULL;

ALTER TABLE activity_logs DROP COLUMN user_id;
ALTER TABLE activity_logs DROP COLUMN property_id;
ALTER TABLE activity_logs CHANGE COLUMN user_id_int user_id INT NULL;
ALTER TABLE activity_logs CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE message_recipients DROP COLUMN tenant_id;
ALTER TABLE message_recipients DROP COLUMN property_id;
ALTER TABLE message_recipients DROP COLUMN sent_by_user_id;
ALTER TABLE message_recipients CHANGE COLUMN tenant_id_int tenant_id INT NULL;
ALTER TABLE message_recipients CHANGE COLUMN property_id_int property_id INT NULL;
ALTER TABLE message_recipients CHANGE COLUMN sent_by_user_id_int sent_by_user_id INT NULL;

ALTER TABLE messages DROP COLUMN tenant_id;
ALTER TABLE messages DROP COLUMN property_id;
ALTER TABLE messages CHANGE COLUMN tenant_id_int tenant_id INT NULL;
ALTER TABLE messages CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE sms_settings DROP COLUMN landlord_id;
ALTER TABLE sms_settings DROP COLUMN property_id;
ALTER TABLE sms_settings CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE sms_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE email_settings DROP COLUMN landlord_id;
ALTER TABLE email_settings DROP COLUMN property_id;
ALTER TABLE email_settings CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE email_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE mpesa_settings DROP COLUMN landlord_id;
ALTER TABLE mpesa_settings DROP COLUMN property_id;
ALTER TABLE mpesa_settings CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE mpesa_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE invoice_settings DROP COLUMN landlord_id;
ALTER TABLE invoice_settings DROP COLUMN property_id;
ALTER TABLE invoice_settings CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE invoice_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE alert_settings DROP COLUMN landlord_id;
ALTER TABLE alert_settings DROP COLUMN property_id;
ALTER TABLE alert_settings CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE alert_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE mpesa_stk_requests DROP COLUMN landlord_id;
ALTER TABLE mpesa_stk_requests DROP COLUMN property_id;
ALTER TABLE mpesa_stk_requests DROP COLUMN tenant_id;
ALTER TABLE mpesa_stk_requests CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE mpesa_stk_requests CHANGE COLUMN property_id_int property_id INT NULL;
ALTER TABLE mpesa_stk_requests CHANGE COLUMN tenant_id_int tenant_id INT NULL;

ALTER TABLE credit_usage DROP COLUMN landlord_id;
ALTER TABLE credit_usage DROP COLUMN property_id;
ALTER TABLE credit_usage CHANGE COLUMN landlord_id_int landlord_id INT NULL;
ALTER TABLE credit_usage CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE maintenance_requests DROP COLUMN tenant_id;
ALTER TABLE maintenance_requests DROP COLUMN property_id;
ALTER TABLE maintenance_requests CHANGE COLUMN tenant_id_int tenant_id INT NULL;
ALTER TABLE maintenance_requests CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE property_sms_settings DROP COLUMN property_id;
ALTER TABLE property_sms_settings CHANGE COLUMN property_id_int property_id INT NULL;

ALTER TABLE login_otps DROP COLUMN user_id;
ALTER TABLE login_otps DROP COLUMN tenant_id;
ALTER TABLE login_otps CHANGE COLUMN user_id_int user_id INT NULL;
ALTER TABLE login_otps CHANGE COLUMN tenant_id_int tenant_id INT NULL;

SET FOREIGN_KEY_CHECKS = 1;
