-- Migration: add media_urls to maintenance_requests for tenant uploads
ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS media_urls TEXT NULL;
