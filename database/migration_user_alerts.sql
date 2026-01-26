-- Migration: Add per-user alert toggle
-- Run this on production after backing up your database

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS alerts_enabled TINYINT(1) NOT NULL DEFAULT 1;
