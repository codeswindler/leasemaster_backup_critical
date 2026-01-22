-- Add security columns to users table for account lockout feature
-- Status values: 1=active, 2=blocked, 4=initial (never logged in)

ALTER TABLE users 
  ADD COLUMN status INT NOT NULL DEFAULT 4 COMMENT '1=active, 2=blocked, 4=initial',
  ADD COLUMN login_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN blocked_until TIMESTAMP NULL COMMENT 'Timestamp when block expires (24hrs after 5th failed attempt)',
  ADD COLUMN last_failed_attempt TIMESTAMP NULL COMMENT 'Timestamp of last failed login attempt';

-- Set all existing users to status=1 (active) since they may have logged in before
UPDATE users SET status = 1 WHERE status = 4;

-- Only set status=4 (initial) for newly created users going forward
-- Existing users with no login history remain status=1
