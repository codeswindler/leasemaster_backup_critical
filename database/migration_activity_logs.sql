CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) PRIMARY KEY,
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
