CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  user_id VARCHAR(36),
  username TEXT,
  entity_type VARCHAR(50),
  entity_id VARCHAR(36),
  property_id VARCHAR(36),
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_created_at (created_at),
  INDEX idx_activity_user_id (user_id),
  INDEX idx_activity_property_id (property_id)
);
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  entity_id VARCHAR(36),
  entity_type VARCHAR(50),
  property_id VARCHAR(36),
  user_id VARCHAR(36),
  user_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'success',
  amount DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_property ON activity_logs (property_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs (type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs (created_at);
