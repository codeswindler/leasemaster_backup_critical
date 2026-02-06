CREATE TABLE IF NOT EXISTS bills (
  id varchar(36) NOT NULL DEFAULT uuid(),
  landlord_id varchar(36) DEFAULT NULL,
  property_id varchar(36) DEFAULT NULL,
  vendor_name varchar(255) NOT NULL,
  category varchar(100) NOT NULL,
  amount decimal(12,2) NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft',
  account_number varchar(100) DEFAULT NULL,
  description text DEFAULT NULL,
  created_at timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_bills_landlord_id (landlord_id),
  KEY idx_bills_property_id (property_id),
  KEY idx_bills_status (status),
  KEY idx_bills_due_date (due_date),
  CONSTRAINT fk_bills_property_id FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bill_payments (
  id varchar(36) NOT NULL DEFAULT uuid(),
  bill_id varchar(36) NOT NULL,
  amount decimal(12,2) NOT NULL,
  payment_date date NOT NULL,
  method varchar(50) NOT NULL,
  reference varchar(255) DEFAULT NULL,
  created_at timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_bill_payments_bill_id (bill_id),
  CONSTRAINT fk_bill_payments_bill_id FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
