ALTER TABLE leases
ADD COLUMN lease_seq BIGINT UNSIGNED AUTO_INCREMENT UNIQUE,
ADD COLUMN lease_number VARCHAR(50) UNIQUE;

UPDATE leases
SET lease_number = CONCAT('LSE-', LPAD(lease_seq, 6, '0'))
WHERE lease_number IS NULL;
