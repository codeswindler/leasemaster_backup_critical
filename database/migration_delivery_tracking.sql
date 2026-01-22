-- Migration: Add delivery tracking columns to message_recipients table
-- Date: 2026-01-18
-- Purpose: Support AdvantaSMS DLR callbacks and delivery status tracking

-- Add columns for delivery tracking
ALTER TABLE message_recipients 
ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(100) NULL COMMENT 'AdvantaSMS message_id for DLR matching',
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) NULL COMMENT 'Raw delivery status from AdvantaSMS',
ADD COLUMN IF NOT EXISTS delivery_timestamp DATETIME NULL COMMENT 'When delivery status was received';

-- Add index for callback lookups (faster DLR matching)
CREATE INDEX IF NOT EXISTS idx_external_message_id ON message_recipients(external_message_id);

-- Add index for delivery status queries
CREATE INDEX IF NOT EXISTS idx_delivery_status ON message_recipients(delivery_status);
