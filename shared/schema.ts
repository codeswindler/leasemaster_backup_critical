import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  idNumber: text("id_number"),
  role: text("role").notNull().default("admin"), // admin, client, super_admin
  mustChangePassword: integer("must_change_password").notNull().default(1), // 1 = must change, 0 = no
  createdAt: timestamp("created_at").defaultNow(),
});

// Properties table
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  landlordName: text("landlord_name").notNull(),
  landlordPhone: text("landlord_phone"),
  landlordEmail: text("landlord_email"),
  status: text("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
});

// House Types (bedsitters, 1B, 2B, etc.)
export const houseTypes = pgTable("house_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  name: text("name").notNull(), // "Bedsitter", "1 Bedroom", "2 Bedroom", etc.
  description: text("description"),
  baseRentAmount: decimal("base_rent_amount", { precision: 12, scale: 2 }).notNull(),
  rentDepositAmount: decimal("rent_deposit_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  waterRatePerUnit: decimal("water_rate_per_unit", { precision: 8, scale: 2 }).notNull().default("15.50"),
  waterRateType: text("water_rate_type").notNull().default("unit_based"), // "unit_based" or "flat_rate"
  waterFlatRate: decimal("water_flat_rate", { precision: 8, scale: 2 }).notNull().default("0.00"),
  chargeAmounts: text("charge_amounts"), // JSON string storing charge code amounts
  isActive: text("is_active").notNull().default("true"), // true, false
  createdAt: timestamp("created_at").defaultNow(),
});

// Charge Codes for properties (Garbage Fee, Security Fee, etc.)
export const chargeCodes = pgTable("charge_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  name: text("name").notNull(), // "Garbage Fee", "Security Fee", "Maintenance Fee"
  description: text("description"),
  isActive: text("is_active").notNull().default("true"), // true, false
  createdAt: timestamp("created_at").defaultNow(),
});

// Units within properties
export const units = pgTable("units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  houseTypeId: varchar("house_type_id").notNull().references(() => houseTypes.id),
  unitNumber: text("unit_number").notNull(),
  rentAmount: decimal("rent_amount", { precision: 12, scale: 2 }).notNull(),
  rentDepositAmount: decimal("rent_deposit_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  waterRateAmount: decimal("water_rate_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  chargeAmounts: text("charge_amounts"), // JSON string storing charge code amounts
  status: text("status").notNull().default("vacant"), // vacant, occupied, maintenance
  createdAt: timestamp("created_at").defaultNow(),
});

// Tenants
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  idNumber: text("id_number").notNull().unique(),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lease agreements
export const leases = pgTable("leases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unitId: varchar("unit_id").notNull().references(() => units.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  rentAmount: decimal("rent_amount", { precision: 12, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 12, scale: 2 }).notNull(),
  waterRatePerUnit: decimal("water_rate_per_unit", { precision: 8, scale: 2 }).notNull().default("15.50"),
  status: text("status").notNull().default("active"), // active, terminated, expired
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leaseId: varchar("lease_id").notNull().references(() => leases.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  issueDate: date("issue_date").notNull(),
  status: text("status").notNull().default("draft"), // draft, approved, pending, paid, overdue, partial
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoice Items (detailed line items for invoices)
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  chargeCode: text("charge_code").notNull(), // rent, water, electricity, service, security, garbage
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Water Readings (for water units module)
export const waterReadings = pgTable("water_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unitId: varchar("unit_id").notNull().references(() => units.id),
  readingDate: date("reading_date").notNull(),
  previousReading: decimal("previous_reading", { precision: 10, scale: 2 }),
  currentReading: decimal("current_reading", { precision: 10, scale: 2 }).notNull(),
  consumption: decimal("consumption", { precision: 10, scale: 2 }).notNull(), // calculated: current - previous
  ratePerUnit: decimal("rate_per_unit", { precision: 8, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, invoiced, paid
  notes: text("notes"),
  lastModifiedAt: timestamp("last_modified_at").defaultNow(), // persistent timestamp for UI display
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leaseId: varchar("lease_id").notNull().references(() => leases.id),
  invoiceId: varchar("invoice_id").references(() => invoices.id), // optional - payments can be made without specific invoice
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, bank_transfer, mpesa, check
  reference: text("reference"), // transaction reference/receipt number
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bulk Messages (main message record)
export const bulkMessages = pgTable("bulk_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageType: text("message_type").notNull(), // sms, email, both
  subject: text("subject"), // for emails
  content: text("content").notNull(),
  totalRecipients: integer("total_recipients").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Individual message recipients (tracks each recipient separately)
export const messageRecipients = pgTable("message_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bulkMessageId: varchar("bulk_message_id").references(() => bulkMessages.id), // nullable for system messages
  tenantId: varchar("tenant_id").references(() => tenants.id), // nullable for landlord messages
  channel: text("channel").notNull(), // sms, email
  recipientContact: text("recipient_contact").notNull(), // phone number or email
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),
  // New fields for enhanced tracking
  messageCategory: text("message_category").notNull().default("manual"), // manual, otp, login_credentials, password_reset, welcome_email
  recipientType: text("recipient_type").notNull().default("tenant"), // tenant, landlord
  recipientName: text("recipient_name"), // for display purposes
  subject: text("subject"), // for system emails
  content: text("content"), // message content for system messages
  propertyId: varchar("property_id").references(() => properties.id), // tracks which property's landlord pays for SMS
  externalMessageId: varchar("external_message_id"), // AdvantaSMS message_id for DLR matching
  deliveryStatus: text("delivery_status"), // raw delivery status from AdvantaSMS
  deliveryTimestamp: timestamp("delivery_timestamp"),
  senderShortcode: text("sender_shortcode"),
  sentByUserId: varchar("sent_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Message templates for compose
export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  channel: text("channel").notNull(), // sms, email, both
  subject: text("subject"),
  content: text("content").notNull(),
  isSystem: integer("is_system").notNull().default(0), // 0 = editable, 1 = system
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  details: text("details"),
  type: text("type").notNull(), // messaging, invoice, payment, etc.
  status: text("status").notNull().default("success"), // success, pending, warning, error
  userId: varchar("user_id").references(() => users.id),
  propertyId: varchar("property_id").references(() => properties.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Property SMS Settings (per-property AdvantaSMS credentials)
export const propertySmsSettings = pgTable("property_sms_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().unique().references(() => properties.id),
  apiUrl: text("api_url").notNull().default("https://quicksms.advantasms.com/api/services/sendsms/"),
  apiKey: text("api_key"),
  partnerId: text("partner_id"),
  shortcode: text("shortcode"),
  enabled: integer("enabled").notNull().default(0), // 0 = disabled, 1 = enabled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages/Communications (keeping for backward compatibility)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  propertyId: varchar("property_id").references(() => properties.id),
  channel: text("channel").notNull(), // sms, email, in_person
  subject: text("subject"),
  content: text("content").notNull(),
  direction: text("direction").notNull(), // inbound, outbound
  status: text("status").notNull().default("sent"), // sent, delivered, failed, read
  sentAt: timestamp("sent_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

// Base schema without validation (for updates with .partial())
const baseHouseTypeSchema = createInsertSchema(houseTypes).omit({
  id: true,
  createdAt: true,
});

export const insertHouseTypeSchema = baseHouseTypeSchema.refine((data) => data.name && data.name.trim().length > 0, {
  message: "House type name is required",
  path: ["name"],
}).refine((data) => data.baseRentAmount && parseFloat(data.baseRentAmount as string) > 0, {
  message: "Base rent amount must be greater than 0",
  path: ["baseRentAmount"],
}).refine((data) => data.rentDepositAmount && parseFloat(data.rentDepositAmount as string) >= 0, {
  message: "Rent deposit amount is required and must be 0 or greater",
  path: ["rentDepositAmount"],
});

// Form validation schema for house types (client-side, without propertyId)
export const houseTypeFormSchema = createInsertSchema(houseTypes).omit({
  id: true,
  createdAt: true,
  propertyId: true,
}).refine((data) => data.name && data.name.trim().length > 0, {
  message: "House type name is required",
  path: ["name"],
}).refine((data) => data.baseRentAmount && parseFloat(data.baseRentAmount as string) > 0, {
  message: "Base rent amount must be greater than 0",
  path: ["baseRentAmount"],
}).refine((data) => data.rentDepositAmount && parseFloat(data.rentDepositAmount as string) >= 0, {
  message: "Rent deposit amount is required and must be 0 or greater",
  path: ["rentDepositAmount"],
});

// Update schema for house types (allows partial updates)
export const updateHouseTypeSchema = baseHouseTypeSchema.partial();

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export const insertLeaseSchema = createInsertSchema(leases).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertBulkMessageSchema = createInsertSchema(bulkMessages).omit({
  id: true,
  sentAt: true,
  createdAt: true,
});

export const insertMessageRecipientSchema = createInsertSchema(messageRecipients).omit({
  id: true,
  sentAt: true,
  deliveredAt: true,
  createdAt: true,
});

export const insertPropertySmsSettingsSchema = createInsertSchema(propertySmsSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true,
  amount: true, // Calculated server-side from quantity * unitPrice
});

export const insertWaterReadingSchema = createInsertSchema(waterReadings).omit({
  id: true,
  createdAt: true,
  lastModifiedAt: true, // Set server-side when saving/updating
  consumption: true, // Calculated server-side from current - previous
  totalAmount: true, // Calculated server-side from consumption * ratePerUnit
  ratePerUnit: true, // Looked up server-side from active lease for security
  previousReading: true, // Looked up server-side from database for security
});

// Base schema for charge codes without validation (for updates with .partial())
const baseChargeCodeSchema = createInsertSchema(chargeCodes).omit({
  id: true,
  createdAt: true,
});

export const insertChargeCodeSchema = baseChargeCodeSchema.refine((data) => data.name && data.name.trim().length > 0, {
  message: "Charge code name is required",
  path: ["name"],
});

// Update schema for charge codes (allows partial updates)
export const updateChargeCodeSchema = baseChargeCodeSchema.partial();

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export type InsertHouseType = z.infer<typeof insertHouseTypeSchema>;
export type HouseType = typeof houseTypes.$inferSelect;

export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertLease = z.infer<typeof insertLeaseSchema>;
export type Lease = typeof leases.$inferSelect;

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertBulkMessage = z.infer<typeof insertBulkMessageSchema>;
export type InsertMessageRecipient = z.infer<typeof insertMessageRecipientSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertPropertySmsSettings = z.infer<typeof insertPropertySmsSettingsSchema>;
export type BulkMessage = typeof bulkMessages.$inferSelect;
export type MessageRecipient = typeof messageRecipients.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type PropertySmsSettings = typeof propertySmsSettings.$inferSelect;

export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

export type InsertWaterReading = z.infer<typeof insertWaterReadingSchema>;
export type WaterReading = typeof waterReadings.$inferSelect;

export type InsertChargeCode = z.infer<typeof insertChargeCodeSchema>;
export type ChargeCode = typeof chargeCodes.$inferSelect;
