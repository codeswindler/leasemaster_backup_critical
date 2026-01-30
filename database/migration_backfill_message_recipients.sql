-- Backfill message_recipients to enforce strict outbox fields
-- Review and update the default shortcode before running if needed.

SET @default_shortcode = 'AdvantaSMS';

-- Ensure sent_at is populated using created_at when missing
UPDATE message_recipients
SET sent_at = created_at
WHERE sent_at IS NULL
  AND created_at IS NOT NULL;

-- Ensure sender shortcode is populated
UPDATE message_recipients
SET sender_shortcode = @default_shortcode
WHERE sender_shortcode IS NULL
  OR sender_shortcode = '';

-- Backfill message category from content/subject when missing
UPDATE message_recipients
SET message_category = CASE
  WHEN message_category IS NOT NULL AND message_category <> '' THEN message_category
  WHEN LOWER(IFNULL(subject, '')) LIKE '%otp%' OR LOWER(IFNULL(content, '')) LIKE '%otp%' THEN 'otp'
  WHEN LOWER(IFNULL(subject, '')) LIKE '%password reset%' OR LOWER(IFNULL(content, '')) LIKE '%password reset%' THEN 'password_reset'
  WHEN LOWER(IFNULL(subject, '')) LIKE '%login credentials%'
    OR LOWER(IFNULL(content, '')) LIKE '%login credentials%'
    OR LOWER(IFNULL(content, '')) LIKE '%tenant portal login%'
    OR LOWER(IFNULL(content, '')) LIKE '%access code%' THEN 'login_credentials'
  ELSE 'manual'
END
WHERE message_category IS NULL
   OR message_category = '';

-- Backfill recipient type for missing rows
UPDATE message_recipients mr
LEFT JOIN tenants t
  ON t.id = mr.tenant_id
  OR t.phone = mr.recipient_contact
  OR t.email = mr.recipient_contact
LEFT JOIN users u
  ON u.username = mr.recipient_contact
  OR u.phone = mr.recipient_contact
SET mr.recipient_type = CASE
  WHEN mr.tenant_id IS NOT NULL OR t.id IS NOT NULL THEN 'tenant'
  WHEN u.role IN ('admin', 'super_admin') THEN 'admin'
  WHEN u.role = 'client' THEN 'landlord'
  ELSE 'manual'
END
WHERE mr.recipient_type IS NULL
   OR mr.recipient_type = '';
