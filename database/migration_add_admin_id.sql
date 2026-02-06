-- Add admin_id column to users table if missing
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'admin_id'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN admin_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Determine a default admin owner for legacy data
SET @default_admin_id := (
  SELECT MIN(id) FROM users WHERE role IN ('admin', 'super_admin', 'administrator')
);

-- Backfill admin_id for landlords (legacy data)
UPDATE users
SET admin_id = @default_admin_id
WHERE role IN ('landlord', 'client') AND admin_id IS NULL;

-- Backfill admin_id for staff based on landlord owner
UPDATE users u
JOIN users l ON l.id = u.landlord_id
SET u.admin_id = l.admin_id
WHERE u.admin_id IS NULL AND u.landlord_id IS NOT NULL;

-- Add index for admin_id if missing
SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'idx_users_admin'
);
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_users_admin ON users(admin_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
