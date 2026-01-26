-- Migration: Add logo URL to invoice settings
-- Run this on production after backing up your database

ALTER TABLE invoice_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;
