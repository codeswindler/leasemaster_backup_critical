-- Backfill tenants.property_id from existing leases/units
-- Run after migration_add_tenant_property.sql has been applied.

-- Prefer active leases
UPDATE tenants t
JOIN leases l ON l.tenant_id = t.id AND l.status = 'active'
JOIN units u ON u.id = l.unit_id
SET t.property_id = u.property_id
WHERE t.property_id IS NULL;

-- Fallback to most recent lease when no active lease exists
UPDATE tenants t
JOIN (
  SELECT l.tenant_id, u.property_id
  FROM leases l
  JOIN units u ON u.id = l.unit_id
  JOIN (
    SELECT tenant_id, MAX(start_date) AS max_start_date
    FROM leases
    GROUP BY tenant_id
  ) latest ON latest.tenant_id = l.tenant_id AND latest.max_start_date = l.start_date
) recent ON recent.tenant_id = t.id
SET t.property_id = recent.property_id
WHERE t.property_id IS NULL;
