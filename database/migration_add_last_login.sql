-- Add last_login column to users table for tracking last successful login
-- MariaDB/MySQL compatible

ALTER TABLE users 
  ADD COLUMN last_login TIMESTAMP NULL COMMENT 'Timestamp of last successful login';
