CREATE TABLE IF NOT EXISTS user_properties (
<<<<<<< HEAD
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    property_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_property (user_id, property_id),
    INDEX idx_user_properties_user (user_id),
    INDEX idx_user_properties_property (property_id)
);

INSERT INTO user_properties (user_id, property_id)
SELECT u.id, u.property_id
FROM users u
WHERE u.property_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM user_properties up
    WHERE up.user_id = u.id
      AND up.property_id = u.property_id
  );
=======
    user_id INT NOT NULL,
    property_id INT NOT NULL,
    PRIMARY KEY (user_id, property_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Backfill existing single property assignments (handle existing id column if present)
SET @has_id := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_properties'
    AND column_name = 'id'
);
SET @id_auto := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_properties'
    AND column_name = 'id'
    AND extra LIKE '%auto_increment%'
);
SET @id_type := (
  SELECT DATA_TYPE
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_properties'
    AND column_name = 'id'
  LIMIT 1
);

SET @sql := CASE
  WHEN @has_id = 0 THEN
    'INSERT INTO user_properties (user_id, property_id)
     SELECT u.id, u.property_id
     FROM users u
     WHERE u.property_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM user_properties up
         WHERE up.user_id = u.id AND up.property_id = u.property_id
       )'
  WHEN @id_auto > 0 THEN
    'INSERT INTO user_properties (user_id, property_id)
     SELECT u.id, u.property_id
     FROM users u
     WHERE u.property_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM user_properties up
         WHERE up.user_id = u.id AND up.property_id = u.property_id
       )'
  WHEN @id_type IN (''int'', ''bigint'', ''smallint'', ''mediumint'', ''tinyint'') THEN
    'INSERT INTO user_properties (id, user_id, property_id)
     SELECT (@rownum:=@rownum+1), u.id, u.property_id
     FROM users u
     JOIN (SELECT @rownum:=IFNULL((SELECT MAX(id) FROM user_properties), 0)) r
     WHERE u.property_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM user_properties up
         WHERE up.user_id = u.id AND up.property_id = u.property_id
       )'
  ELSE
    'INSERT INTO user_properties (id, user_id, property_id)
     SELECT UUID(), u.id, u.property_id
     FROM users u
     WHERE u.property_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM user_properties up
         WHERE up.user_id = u.id AND up.property_id = u.property_id
       )'
END;

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
>>>>>>> 29f5c61 (Fix user_properties backfill migration)
