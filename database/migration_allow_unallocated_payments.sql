ALTER TABLE payments
DROP FOREIGN KEY fk_payments_lease_id;

ALTER TABLE payments
MODIFY lease_id BIGINT UNSIGNED NULL;

ALTER TABLE payments
ADD CONSTRAINT fk_payments_lease_id
FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE SET NULL;
