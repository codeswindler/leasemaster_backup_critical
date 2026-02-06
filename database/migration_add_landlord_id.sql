-- Add landlord_id column to users table if missing
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'landlord_id'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN landlord_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Normalize landlord role
UPDATE users SET role = 'landlord' WHERE role = 'client';

-- Ensure landlords point to themselves
UPDATE users
SET landlord_id = id
WHERE role = 'landlord' AND landlord_id IS NULL;

-- Backfill landlord_id for staff based on primary property_id
UPDATE users u
JOIN properties p ON p.id = u.property_id
SET u.landlord_id = p.landlord_id
WHERE u.landlord_id IS NULL AND u.property_id IS NOT NULL;

-- Backfill landlord_id for staff based on user_properties assignments (if table exists)
SET @up_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE table_schema = DATABASE()
    AND table_name = 'user_properties'
);
SET @sql := IF(
  @up_exists = 0,
  'SELECT 1',
  'UPDATE users u
   JOIN user_properties up ON up.user_id = u.id
   JOIN properties p ON p.id = up.property_id
   SET u.landlord_id = p.landlord_id
   WHERE u.landlord_id IS NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for landlord_id if missing
SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'idx_users_landlord'
);
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_users_landlord ON users(landlord_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
