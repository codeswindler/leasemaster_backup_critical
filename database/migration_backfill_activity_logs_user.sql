-- Backfill activity logs user attribution and sync permissions into user_permissions

-- Ensure user_name column exists for display
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255) NULL;

-- Backfill activity_logs.user_id_int from users.id (matches legacy_id or numeric string ids)
UPDATE activity_logs al
LEFT JOIN users u ON u.id = al.user_id OR u.legacy_id = al.user_id
SET al.user_id_int = u.id
WHERE al.user_id_int IS NULL AND u.id IS NOT NULL;

-- Backfill activity_logs.user_name from users.full_name/username
UPDATE activity_logs al
LEFT JOIN users u ON u.id = al.user_id_int
SET al.user_name = COALESCE(u.full_name, u.username)
WHERE (al.user_name IS NULL OR al.user_name = '') AND u.id IS NOT NULL;

-- Ensure user_permissions table exists
CREATE TABLE IF NOT EXISTS user_permissions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_permissions_user (user_id)
);

-- Rebuild user_permissions from users.permissions
DELETE FROM user_permissions;

-- JSON array permissions
WITH RECURSIVE seq AS (
  SELECT 0 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 100
)
INSERT INTO user_permissions (id, user_id, permission)
SELECT UUID(), CAST(u.id AS CHAR),
  JSON_UNQUOTE(JSON_EXTRACT(u.permissions, CONCAT('$[', seq.n, ']')))
FROM users u
JOIN seq
WHERE u.permissions IS NOT NULL
  AND JSON_VALID(u.permissions)
  AND JSON_EXTRACT(u.permissions, CONCAT('$[', seq.n, ']')) IS NOT NULL;

-- Comma-separated permissions
WITH RECURSIVE seq AS (
  SELECT 0 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 100
)
INSERT INTO user_permissions (id, user_id, permission)
SELECT UUID(), CAST(u.id AS CHAR),
  TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(u.permissions, ',', seq.n + 1), ',', -1))
FROM users u
JOIN seq
WHERE u.permissions IS NOT NULL
  AND NOT JSON_VALID(u.permissions)
  AND TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(u.permissions, ',', seq.n + 1), ',', -1)) <> '';
