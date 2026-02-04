CREATE TABLE IF NOT EXISTS user_properties (
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
