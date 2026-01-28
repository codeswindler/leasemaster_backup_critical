import { 
  type User, type InsertUser,
  type Property, type InsertProperty,
  type HouseType, type InsertHouseType,
  type Unit, type InsertUnit,
  type Tenant, type InsertTenant,
  type Lease, type InsertLease,
  type Invoice, type InsertInvoice,
  type Payment, type InsertPayment,
  type Message, type InsertMessage,
  type BulkMessage, type InsertBulkMessage,
  type MessageRecipient, type InsertMessageRecipient,
  type InvoiceItem, type InsertInvoiceItem,
  type WaterReading, type InsertWaterReading,
  type ChargeCode, type InsertChargeCode,
  users, properties, houseTypes, units, tenants, leases, invoices, payments, messages, bulkMessages, messageRecipients, invoiceItems, waterReadings, chargeCodes
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, sql, or, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Properties
  getAllProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;
  disableProperty(id: string): Promise<Property | undefined>;
  enableProperty(id: string): Promise<Property | undefined>;
  
  // House Types
  getAllHouseTypes(): Promise<HouseType[]>;
  getHouseType(id: string): Promise<HouseType | undefined>;
  createHouseType(houseType: InsertHouseType): Promise<HouseType>;
  updateHouseType(id: string, houseType: Partial<InsertHouseType>): Promise<HouseType | undefined>;
  deleteHouseType(id: string): Promise<boolean>;
  
  // Units
  getAllUnits(): Promise<Unit[]>;
  getUnit(id: string): Promise<Unit | undefined>;
  getUnitsByProperty(propertyId: string): Promise<Unit[]>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: string, unit: Partial<InsertUnit>): Promise<Unit | undefined>;
  deleteUnit(id: string): Promise<boolean>;
  
  // Tenants
  getAllTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByEmail(email: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: string): Promise<boolean>;
  
  // Leases
  getAllLeases(): Promise<Lease[]>;
  getLease(id: string): Promise<Lease | undefined>;
  getLeasesByTenant(tenantId: string): Promise<Lease[]>;
  getLeasesByUnit(unitId: string): Promise<Lease[]>;
  getActiveLeases(): Promise<Lease[]>;
  createLease(lease: InsertLease): Promise<Lease>;
  updateLease(id: string, lease: Partial<InsertLease>): Promise<Lease | undefined>;
  deleteLease(id: string): Promise<boolean>;
  
  // Invoices
  getAllInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByLease(leaseId: string): Promise<Invoice[]>;
  getOverdueInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  
  // Payments
  getAllPayments(): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByLease(leaseId: string): Promise<Payment[]>;
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: string): Promise<boolean>;
  
  // Messages
  getAllMessages(): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByTenant(tenantId: string): Promise<Message[]>;
  getMessagesByProperty(propertyId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, message: Partial<InsertMessage>): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;
  
  // Bulk Messages
  getAllBulkMessages(): Promise<BulkMessage[]>;
  getBulkMessage(id: string): Promise<BulkMessage | undefined>;
  createBulkMessage(message: InsertBulkMessage): Promise<BulkMessage>;
  updateBulkMessage(id: string, message: Partial<InsertBulkMessage>): Promise<BulkMessage | undefined>;
  deleteBulkMessage(id: string): Promise<boolean>;
  
  // Message Recipients
  getAllMessageRecipients(): Promise<MessageRecipient[]>;
  getMessageRecipient(id: string): Promise<MessageRecipient | undefined>;
  getMessageRecipientsByBulkMessage(bulkMessageId: string): Promise<MessageRecipient[]>;
  getMessageRecipientsByTenant(tenantId: string): Promise<MessageRecipient[]>;
  createMessageRecipient(recipient: InsertMessageRecipient): Promise<MessageRecipient>;
  updateMessageRecipient(id: string, recipient: Partial<InsertMessageRecipient>): Promise<MessageRecipient | undefined>;
  deleteMessageRecipient(id: string): Promise<boolean>;
  
  // Invoice Items
  getAllInvoiceItems(): Promise<InvoiceItem[]>;
  getInvoiceItem(id: string): Promise<InvoiceItem | undefined>;
  getInvoiceItemsByInvoice(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: string): Promise<boolean>;
  
  // Water Readings
  getAllWaterReadings(): Promise<WaterReading[]>;
  getWaterReading(id: string): Promise<WaterReading | undefined>;
  getWaterReadingsByUnit(unitId: string): Promise<WaterReading[]>;
  getWaterReadingsByStatus(status: string): Promise<WaterReading[]>;
  createWaterReading(reading: InsertWaterReading): Promise<WaterReading>;
  updateWaterReading(id: string, reading: Partial<InsertWaterReading>): Promise<WaterReading | undefined>;
  deleteWaterReading(id: string): Promise<boolean>;
  
  // Charge Codes
  getChargeCodesByProperty(propertyId: string): Promise<ChargeCode[]>;
  getChargeCode(id: string): Promise<ChargeCode | undefined>;
  createChargeCode(chargeCode: InsertChargeCode): Promise<ChargeCode>;
  updateChargeCode(id: string, chargeCode: Partial<InsertChargeCode>): Promise<ChargeCode | undefined>;
  deleteChargeCode(id: string): Promise<boolean>;
  
  // Business logic methods
  generateMonthlyInvoices(month: string, year: number): Promise<Invoice[]>;
  calculateLeaseBalance(leaseId: string): Promise<number>;
  getPropertyStats(): Promise<{
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    totalTenants: number;
    monthlyRevenue: number;
    collectionRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  constructor() {}

  // Helper method to update unit status based on active leases
  private async updateUnitStatusFromLeases(unitId: string): Promise<void> {
    const activeLeases = await db.select()
      .from(leases)
      .where(and(
        eq(leases.unitId, unitId),
        lte(leases.startDate, sql`CURRENT_DATE`),
        gte(leases.endDate, sql`CURRENT_DATE`)
      ));
    
    const status = activeLeases.length > 0 ? 'occupied' : 'vacant';
    await db.update(units).set({ status }).where(eq(units.id, unitId));
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const userData = { ...insertUser, id };
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  // Properties
  async getAllProperties(): Promise<Property[]> {
    console.log("📡 Storage: Fetching all properties...")
    try {
      const result = await db.select().from(properties);
      console.log("📡 Storage: Retrieved properties count:", result.length)
      console.log("📡 Storage: Properties data:", result)
      return result;
    } catch (error) {
      console.error("❌ Storage: Error fetching properties:", error)
      throw error
    }
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0];
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    console.log("💾 Storage: Starting property creation")
    console.log("📋 Storage: Input data:", insertProperty)
    
    try {
      const id = randomUUID();
      console.log("🆔 Storage: Generated property ID:", id)
      
      const propertyData = { 
        ...insertProperty, 
        id, 
        status: insertProperty.status || 'active',
        landlordPhone: insertProperty.landlordPhone || null,
        landlordEmail: insertProperty.landlordEmail || null
      };
      
      console.log("📋 Storage: Property data to insert:", propertyData)
      console.log("🔍 Storage: Data validation check:", {
        hasId: !!propertyData.id,
        hasName: !!propertyData.name,
        hasAddress: !!propertyData.address,
        hasStatus: !!propertyData.status
      })
      
      console.log("💾 Storage: Executing database insert...")
      const result = await db.insert(properties).values(propertyData).returning();
      
      console.log("✅ Storage: Property created successfully:", result[0])
      console.log("📊 Storage: Created property details:", {
        id: result[0].id,
        name: result[0].name,
        address: result[0].address,
        status: result[0].status,
        createdAt: result[0].createdAt
      })
      
      return result[0];
    } catch (error) {
      console.error("❌ Storage: Property creation failed:", error)
      console.error("📋 Storage: Error details:", {
        message: (error as any)?.message,
        code: (error as any)?.code,
        detail: (error as any)?.detail,
        constraint: (error as any)?.constraint
      })
      throw error
    }
  }

  async updateProperty(id: string, updateData: Partial<InsertProperty>): Promise<Property | undefined> {
    const result = await db.update(properties)
      .set(updateData)
      .where(eq(properties.id, id))
      .returning();
    return result[0];
  }

  async deleteProperty(id: string): Promise<boolean> {
    // Check if property has any units
    const propertyUnits = await db.select().from(units).where(eq(units.propertyId, id));
    
    if (propertyUnits.length > 0) {
      // Check if any units have active leases
      const unitIds = propertyUnits.map((unit: any) => unit.id);
      const activeLeases = await db.select().from(leases)
        .where(and(
          inArray(leases.unitId, unitIds),
          eq(leases.status, 'active')
        ));
      
      if (activeLeases.length > 0) {
        throw new Error('Cannot delete property with units that have active leases. Please terminate all active leases first.');
      }
      
      // Delete all units of this property first
      await db.delete(units).where(eq(units.propertyId, id));
    }
    
    // Delete all charge codes for this property
    await db.delete(chargeCodes).where(eq(chargeCodes.propertyId, id));
    
    const result = await db.delete(properties).where(eq(properties.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async disableProperty(id: string): Promise<Property | undefined> {
    // Get all units for this property
    const propertyUnits = await db.select().from(units).where(eq(units.propertyId, id));
    
    if (propertyUnits.length > 0) {
      // Suspend all active leases for units in this property
      const unitIds = propertyUnits.map((unit: any) => unit.id);
      await db.update(leases)
        .set({ status: 'suspended' })
        .where(and(
          inArray(leases.unitId, unitIds),
          eq(leases.status, 'active')
        ));
    }
    
    // Update property status to inactive
    const result = await db.update(properties)
      .set({ status: 'inactive' })
      .where(eq(properties.id, id))
      .returning();
    
    return result[0];
  }

  async enableProperty(id: string): Promise<Property | undefined> {
    // Get all units for this property
    const propertyUnits = await db.select().from(units).where(eq(units.propertyId, id));
    
    if (propertyUnits.length > 0) {
      // Resume all suspended leases for units in this property
      const unitIds = propertyUnits.map((unit: any) => unit.id);
      await db.update(leases)
        .set({ status: 'active' })
        .where(and(
          inArray(leases.unitId, unitIds),
          eq(leases.status, 'suspended')
        ));
    }
    
    // Update property status to active
    const result = await db.update(properties)
      .set({ status: 'active' })
      .where(eq(properties.id, id))
      .returning();
    
    return result[0];
  }

  // House Types
  async getAllHouseTypes(): Promise<HouseType[]> {
    return await db.select().from(houseTypes);
  }

  async getHouseType(id: string): Promise<HouseType | undefined> {
    const result = await db.select().from(houseTypes).where(eq(houseTypes.id, id)).limit(1);
    return result[0];
  }

  async createHouseType(insertHouseType: InsertHouseType): Promise<HouseType> {
    const id = randomUUID();
    const houseTypeData = { 
      ...insertHouseType, 
      id, 
      isActive: insertHouseType.isActive || 'true'
    };
    const result = await db.insert(houseTypes).values(houseTypeData).returning();
    return result[0];
  }

  async updateHouseType(id: string, updateData: Partial<InsertHouseType>): Promise<HouseType | undefined> {
    const result = await db.update(houseTypes)
      .set(updateData)
      .where(eq(houseTypes.id, id))
      .returning();
    return result[0];
  }

  async deleteHouseType(id: string): Promise<boolean> {
    // Get all units of this house type
    const houseTypeUnits = await db.select().from(units).where(eq(units.houseTypeId, id));
    
    if (houseTypeUnits.length > 0) {
      // Check if any units have active leases
      const unitIds = houseTypeUnits.map((unit: any) => unit.id);
      const activeLeases = await db.select().from(leases)
        .where(and(
          inArray(leases.unitId, unitIds),
          eq(leases.status, 'active')
        ));
      
      if (activeLeases.length > 0) {
        throw new Error('Cannot delete house type with units that have active leases. Please terminate all active leases first.');
      }
      
      // Delete all units of this house type first
      await db.delete(units).where(eq(units.houseTypeId, id));
    }
    
    const result = await db.delete(houseTypes).where(eq(houseTypes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Units
  async getAllUnits(): Promise<Unit[]> {
    return await db.select().from(units);
  }

  async getUnit(id: string): Promise<Unit | undefined> {
    const result = await db.select().from(units).where(eq(units.id, id)).limit(1);
    return result[0];
  }

  async getUnitsByProperty(propertyId: string): Promise<Unit[]> {
    return await db.select().from(units).where(eq(units.propertyId, propertyId));
  }

  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    // Check if property exists
    const property = await this.getProperty(insertUnit.propertyId);
    if (!property) {
      throw new Error(`Property with id ${insertUnit.propertyId} not found`);
    }
    
    // Check if house type exists
    const houseType = await this.getHouseType(insertUnit.houseTypeId);
    if (!houseType) {
      throw new Error(`House type with id ${insertUnit.houseTypeId} not found`);
    }
    
    const id = randomUUID();
    const unitData = { 
      ...insertUnit, 
      id, 
      status: insertUnit.status || 'vacant'
    };
    const result = await db.insert(units).values(unitData).returning();
    return result[0];
  }

  async updateUnit(id: string, updateData: Partial<InsertUnit>): Promise<Unit | undefined> {
    const result = await db.update(units)
      .set(updateData)
      .where(eq(units.id, id))
      .returning();
    return result[0];
  }

  async deleteUnit(id: string): Promise<boolean> {
    // Check if there are any active leases for this unit
    const activeLeases = await db.select().from(leases)
      .where(and(
        eq(leases.unitId, id),
        eq(leases.status, 'active')
      ));
    
    if (activeLeases.length > 0) {
      throw new Error('Cannot delete unit with active lease. Please terminate the lease first.');
    }
    
    const result = await db.delete(units).where(eq(units.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async bulkDeleteUnits(unitIds: string[]): Promise<{ success: string[], failed: { id: string, error: string }[] }> {
    const success: string[] = [];
    const failed: { id: string, error: string }[] = [];
    
    for (const unitId of unitIds) {
      try {
        await this.deleteUnit(unitId);
        success.push(unitId);
      } catch (error) {
        failed.push({ 
          id: unitId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return { success, failed };
  }

  // Tenants
  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0];
  }

  async getTenantByEmail(email: string): Promise<Tenant | undefined> {
    const result = await db.select().from(tenants).where(eq(tenants.email, email)).limit(1);
    return result[0];
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    // Check for unique email
    const existingTenant = await this.getTenantByEmail(insertTenant.email);
    if (existingTenant) {
      throw new Error(`Tenant with email ${insertTenant.email} already exists`);
    }
    
    const id = randomUUID();
    const tenantData = { 
      ...insertTenant, 
      id, 
      emergencyContact: insertTenant.emergencyContact || null,
      emergencyPhone: insertTenant.emergencyPhone || null
    };
    const result = await db.insert(tenants).values(tenantData).returning();
    return result[0];
  }

  async updateTenant(id: string, updateData: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const result = await db.update(tenants)
      .set(updateData)
      .where(eq(tenants.id, id))
      .returning();
    return result[0];
  }

  async deleteTenant(id: string): Promise<boolean> {
    const result = await db.delete(tenants).where(eq(tenants.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Leases
  async getAllLeases(): Promise<Lease[]> {
    return await db.select().from(leases);
  }

  async getLease(id: string): Promise<Lease | undefined> {
    const result = await db.select().from(leases).where(eq(leases.id, id)).limit(1);
    return result[0];
  }

  async getLeasesByTenant(tenantId: string): Promise<Lease[]> {
    return await db.select().from(leases).where(eq(leases.tenantId, tenantId));
  }

  async getLeasesByUnit(unitId: string): Promise<Lease[]> {
    return await db.select().from(leases).where(eq(leases.unitId, unitId));
  }

  async getActiveLeases(): Promise<Lease[]> {
    return await db.select().from(leases).where(eq(leases.status, 'active'));
  }

  async createLease(insertLease: InsertLease): Promise<Lease> {
    // Check if unit and tenant exist
    const unit = await this.getUnit(insertLease.unitId);
    if (!unit) {
      throw new Error(`Unit with id ${insertLease.unitId} not found`);
    }
    const tenant = await this.getTenant(insertLease.tenantId);
    if (!tenant) {
      throw new Error(`Tenant with id ${insertLease.tenantId} not found`);
    }
    
    // Check for overlapping active leases on this unit
    const unitLeases = await this.getLeasesByUnit(insertLease.unitId);
    const activeUnitLeases = unitLeases.filter(lease => lease.status === 'active');
    
    const startDate = new Date(insertLease.startDate);
    const endDate = new Date(insertLease.endDate);
    
    for (const existingLease of activeUnitLeases) {
      const existingStart = new Date(existingLease.startDate);
      const existingEnd = new Date(existingLease.endDate);
      
      // Check for overlap
      if (startDate <= existingEnd && endDate >= existingStart) {
        throw new Error(`Unit already has an active lease during the specified period`);
      }
    }
    
    const id = randomUUID();
    const leaseData = { 
      ...insertLease, 
      id, 
      status: insertLease.status || 'active'
    };
    const result = await db.insert(leases).values(leaseData).returning();
    const lease = result[0];
    
    // Update unit status to occupied if lease is active
    if (lease.status === 'active') {
      await this.updateUnitStatusFromLeases(insertLease.unitId);
    }
    
    return lease;
  }

  async updateLease(id: string, updateData: Partial<InsertLease>): Promise<Lease | undefined> {
    const existing = await this.getLease(id);
    if (!existing) return undefined;
    
    const result = await db.update(leases)
      .set(updateData)
      .where(eq(leases.id, id))
      .returning();
    
    const updated = result[0];
    
    // Update unit status if lease status changed
    if (updateData.status && updateData.status !== existing.status) {
      await this.updateUnitStatusFromLeases(existing.unitId);
    }
    
    return updated;
  }

  async deleteLease(id: string): Promise<boolean> {
    // Get the lease to find the unitId before deletion (architect fix)
    const lease = await this.getLease(id);
    if (!lease) return false;
    
    const unitId = lease.unitId;
    const result = await db.delete(leases).where(eq(leases.id, id));
    
    if ((result.rowCount ?? 0) > 0) {
      // Update unit status after lease deletion
      await this.updateUnitStatusFromLeases(unitId);
    }
    
    return (result.rowCount ?? 0) > 0;
  }

  // Invoices
  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    return result[0];
  }

  async getInvoicesByLease(leaseId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.leaseId, leaseId));
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices: Invoice[] = [];
    
    const allInvoices = await db.select().from(invoices)
      .where(and(
        lte(invoices.dueDate, today),
        sql`${invoices.status} != 'paid'`
      ));
    
    for (const invoice of allInvoices) {
      // Check actual outstanding amount, not just status
      const payments = await this.getPaymentsByInvoice(invoice.id);
      const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      const outstanding = parseFloat(invoice.amount) - totalPaid;
      
      if (outstanding > 0) {
        overdueInvoices.push(invoice);
      }
    }
    
    return overdueInvoices;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    // Check if lease exists
    const lease = await this.getLease(insertInvoice.leaseId);
    if (!lease) {
      throw new Error(`Lease with id ${insertInvoice.leaseId} not found`);
    }
    
    // Check for unique invoice number
    const existingInvoice = await db.select().from(invoices)
      .where(eq(invoices.invoiceNumber, insertInvoice.invoiceNumber))
      .limit(1);
    if (existingInvoice.length > 0) {
      throw new Error(`Invoice with number ${insertInvoice.invoiceNumber} already exists`);
    }
    
    const id = randomUUID();
    const invoiceData = { 
      ...insertInvoice, 
      id, 
      status: insertInvoice.status || 'pending'
    };
    const result = await db.insert(invoices).values(invoiceData).returning();
    return result[0];
  }

  async updateInvoice(id: string, updateData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const result = await db.update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    return result[0];
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Payments
  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return result[0];
  }

  async getPaymentsByLease(leaseId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.leaseId, leaseId));
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    // Check if lease exists
    const lease = await this.getLease(insertPayment.leaseId);
    if (!lease) {
      throw new Error(`Lease with id ${insertPayment.leaseId} not found`);
    }
    
    // Check if invoice exists (if provided)
    if (insertPayment.invoiceId) {
      const invoice = await this.getInvoice(insertPayment.invoiceId);
      if (!invoice) {
        throw new Error(`Invoice with id ${insertPayment.invoiceId} not found`);
      }
    }
    
    const id = randomUUID();
    const paymentData = { 
      ...insertPayment, 
      id, 
      invoiceId: insertPayment.invoiceId || null,
      reference: insertPayment.reference || null,
      notes: insertPayment.notes || null
    };
    const result = await db.insert(payments).values(paymentData).returning();
    const payment = result[0];
    
    // Update invoice status if payment is against a specific invoice
    if (payment.invoiceId) {
      await this.updateInvoiceStatusAfterPayment(payment.invoiceId);
    }
    
    return payment;
  }

  async updatePayment(id: string, updateData: Partial<InsertPayment>): Promise<Payment | undefined> {
    const result = await db.update(payments)
      .set(updateData)
      .where(eq(payments.id, id))
      .returning();
    return result[0];
  }

  async deletePayment(id: string): Promise<boolean> {
    const result = await db.delete(payments).where(eq(payments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Messages
  async getAllMessages(): Promise<Message[]> {
    return await db.select().from(messages);
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0];
  }

  async getMessagesByTenant(tenantId: string): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.tenantId, tenantId));
  }

  async getMessagesByProperty(propertyId: string): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.propertyId, propertyId));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    // Check if tenant exists (if provided)
    if (insertMessage.tenantId) {
      const tenant = await this.getTenant(insertMessage.tenantId);
      if (!tenant) {
        throw new Error(`Tenant with id ${insertMessage.tenantId} not found`);
      }
    }
    
    // Check if property exists (if provided)
    if (insertMessage.propertyId) {
      const property = await this.getProperty(insertMessage.propertyId);
      if (!property) {
        throw new Error(`Property with id ${insertMessage.propertyId} not found`);
      }
    }
    
    const id = randomUUID();
    const messageData = { 
      ...insertMessage, 
      id, 
      tenantId: insertMessage.tenantId || null,
      propertyId: insertMessage.propertyId || null,
      subject: insertMessage.subject || null,
      status: insertMessage.status || 'sent'
    };
    const result = await db.insert(messages).values(messageData).returning();
    return result[0];
  }

  async updateMessage(id: string, updateData: Partial<InsertMessage>): Promise<Message | undefined> {
    const result = await db.update(messages)
      .set(updateData)
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Bulk Messages
  async getAllBulkMessages(): Promise<BulkMessage[]> {
    return await db.select().from(bulkMessages).orderBy(desc(bulkMessages.sentAt));
  }

  async getBulkMessage(id: string): Promise<BulkMessage | undefined> {
    const result = await db.select().from(bulkMessages).where(eq(bulkMessages.id, id)).limit(1);
    return result[0];
  }

  async createBulkMessage(insertMessage: InsertBulkMessage): Promise<BulkMessage> {
    const id = randomUUID();
    const messageData = { 
      ...insertMessage, 
      id
    };
    const result = await db.insert(bulkMessages).values(messageData).returning();
    return result[0];
  }

  async updateBulkMessage(id: string, updateData: Partial<InsertBulkMessage>): Promise<BulkMessage | undefined> {
    const result = await db.update(bulkMessages)
      .set(updateData)
      .where(eq(bulkMessages.id, id))
      .returning();
    return result[0];
  }

  async deleteBulkMessage(id: string): Promise<boolean> {
    // First delete all message recipients
    await db.delete(messageRecipients).where(eq(messageRecipients.bulkMessageId, id));
    // Then delete the bulk message
    const result = await db.delete(bulkMessages).where(eq(bulkMessages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Message Recipients
  async getAllMessageRecipients(): Promise<MessageRecipient[]> {
    return await db.select().from(messageRecipients).orderBy(desc(messageRecipients.createdAt));
  }

  async getMessageRecipient(id: string): Promise<MessageRecipient | undefined> {
    const result = await db.select().from(messageRecipients).where(eq(messageRecipients.id, id)).limit(1);
    return result[0];
  }

  async getMessageRecipientsByBulkMessage(bulkMessageId: string): Promise<MessageRecipient[]> {
    return await db.select().from(messageRecipients)
      .where(eq(messageRecipients.bulkMessageId, bulkMessageId))
      .orderBy(desc(messageRecipients.createdAt));
  }

  async getMessageRecipientsByTenant(tenantId: string): Promise<MessageRecipient[]> {
    return await db.select().from(messageRecipients)
      .where(eq(messageRecipients.tenantId, tenantId))
      .orderBy(desc(messageRecipients.createdAt));
  }

  async createMessageRecipient(insertRecipient: InsertMessageRecipient): Promise<MessageRecipient> {
    // Check if bulk message exists
    if (!insertRecipient.bulkMessageId) {
      throw new Error("bulkMessageId is required");
    }
    const bulkMessage = await this.getBulkMessage(insertRecipient.bulkMessageId);
    if (!bulkMessage) {
      throw new Error(`Bulk message with id ${insertRecipient.bulkMessageId} not found`);
    }

    // Check if tenant exists
    if (!insertRecipient.tenantId) {
      throw new Error("tenantId is required");
    }
    const tenant = await this.getTenant(insertRecipient.tenantId);
    if (!tenant) {
      throw new Error(`Tenant with id ${insertRecipient.tenantId} not found`);
    }

    const id = randomUUID();
    const recipientData = { 
      ...insertRecipient, 
      id
    };
    const result = await db.insert(messageRecipients).values(recipientData).returning();
    return result[0];
  }

  async updateMessageRecipient(id: string, updateData: Partial<InsertMessageRecipient>): Promise<MessageRecipient | undefined> {
    const result = await db.update(messageRecipients)
      .set(updateData)
      .where(eq(messageRecipients.id, id))
      .returning();
    return result[0];
  }

  async deleteMessageRecipient(id: string): Promise<boolean> {
    const result = await db.delete(messageRecipients).where(eq(messageRecipients.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Invoice Items
  async getAllInvoiceItems(): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems);
  }

  async getInvoiceItem(id: string): Promise<InvoiceItem | undefined> {
    const result = await db.select().from(invoiceItems).where(eq(invoiceItems.id, id)).limit(1);
    return result[0];
  }

  async getInvoiceItemsByInvoice(invoiceId: string): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(insertItem: InsertInvoiceItem): Promise<InvoiceItem> {
    // Check if invoice exists
    const invoice = await this.getInvoice(insertItem.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice with id ${insertItem.invoiceId} not found`);
    }
    
    // Calculate amount server-side (quantity * unitPrice)
    const quantity = parseFloat(insertItem.quantity || "1");
    const unitPrice = parseFloat(insertItem.unitPrice);
    const amount = quantity * unitPrice;
    
    const id = randomUUID();
    const itemData = { 
      ...insertItem, 
      id,
      quantity: quantity.toString(),
      amount: amount.toString()
    };
    const result = await db.insert(invoiceItems).values(itemData).returning();
    const item = result[0];
    
    // Recalculate invoice total
    await this.recalculateInvoiceTotal(insertItem.invoiceId);
    
    return item;
  }

  async updateInvoiceItem(id: string, updateData: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    // Get existing item to check invoice ID
    const existing = await this.getInvoiceItem(id);
    if (!existing) return undefined;
    
    // If quantity or unitPrice are being updated, recalculate amount
    if (updateData.quantity || updateData.unitPrice) {
      const quantity = parseFloat(updateData.quantity || existing.quantity);
      const unitPrice = parseFloat(updateData.unitPrice || existing.unitPrice);
      (updateData as any).amount = (quantity * unitPrice).toString();
    }
    
    const result = await db.update(invoiceItems)
      .set(updateData)
      .where(eq(invoiceItems.id, id))
      .returning();
    
    const updated = result[0];
    if (updated) {
      // Recalculate invoice total
      await this.recalculateInvoiceTotal(existing.invoiceId);
    }
    
    return updated;
  }

  async deleteInvoiceItem(id: string): Promise<boolean> {
    // Get the item first to know which invoice to recalculate
    const item = await this.getInvoiceItem(id);
    if (!item) return false;
    
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
    
    if ((result.rowCount ?? 0) > 0) {
      // Recalculate invoice total after deletion
      await this.recalculateInvoiceTotal(item.invoiceId);
    }
    
    return (result.rowCount ?? 0) > 0;
  }

  // Water Readings
  async getAllWaterReadings(): Promise<WaterReading[]> {
    return await db.select().from(waterReadings);
  }

  async getWaterReading(id: string): Promise<WaterReading | undefined> {
    const result = await db.select().from(waterReadings).where(eq(waterReadings.id, id)).limit(1);
    return result[0];
  }

  async getWaterReadingsByUnit(unitId: string): Promise<WaterReading[]> {
    return await db.select().from(waterReadings)
      .where(eq(waterReadings.unitId, unitId))
      .orderBy(desc(waterReadings.readingDate));
  }

  async getWaterReadingsByStatus(status: string): Promise<WaterReading[]> {
    return await db.select().from(waterReadings).where(eq(waterReadings.status, status));
  }

  async getActiveLease(unitId: string, readingDate?: string): Promise<Lease | undefined> {
    const checkDate = readingDate || new Date().toISOString().split('T')[0];
    
    const result = await db.select().from(leases)
      .where(
        and(
          eq(leases.unitId, unitId),
          eq(leases.status, 'active'),
          lte(leases.startDate, checkDate),
          gte(leases.endDate, checkDate)
        )
      )
      .orderBy(desc(leases.startDate))
      .limit(1);
    
    return result[0];
  }

  async createWaterReading(insertReading: InsertWaterReading): Promise<WaterReading> {
    // Check if unit exists
    const unit = await this.getUnit(insertReading.unitId);
    if (!unit) {
      throw new Error(`Unit with id ${insertReading.unitId} not found`);
    }
    
    // Get water rate from active lease (SERVER-SIDE LOOKUP FOR SECURITY)
    const activeLease = await this.getActiveLease(insertReading.unitId, insertReading.readingDate);
    const ratePerUnit = activeLease ? parseFloat(activeLease.waterRatePerUnit) : 15.50; // fallback to default
    
    // Get latest previous reading from database (SERVER-SIDE LOOKUP FOR SECURITY)
    const previousReadings = await this.getWaterReadingsByUnit(insertReading.unitId);
    const previousReading = previousReadings.length > 0 ? parseFloat(previousReadings[0].currentReading) : 0;
    
    const currentReading = parseFloat(insertReading.currentReading);
    
    if (currentReading < previousReading) {
      throw new Error(`Current reading (${currentReading}) cannot be less than previous reading (${previousReading})`);
    }
    
    const consumption = currentReading - previousReading;
    const totalAmount = consumption * ratePerUnit;
    
    const id = randomUUID();
    const readingData = { 
      unitId: insertReading.unitId,
      readingDate: insertReading.readingDate,
      currentReading: insertReading.currentReading,
      previousReading: previousReading.toString(),
      consumption: consumption.toString(),
      ratePerUnit: ratePerUnit.toString(),
      totalAmount: totalAmount.toString(),
      status: insertReading.status || "pending",
      notes: insertReading.notes,
      lastModifiedAt: new Date(), // Set modification timestamp
      id
    };
    const result = await db.insert(waterReadings).values(readingData).returning();
    return result[0];
  }

  async updateWaterReading(id: string, updateData: Partial<InsertWaterReading>): Promise<WaterReading | undefined> {
    // Get existing reading
    const existing = await this.getWaterReading(id);
    if (!existing) return undefined;
    
    // If any of the calculation fields are being updated, recalculate
    if (updateData.currentReading || (updateData as any).previousReading || (updateData as any).ratePerUnit) {
      const previousReading = parseFloat((updateData as any).previousReading || existing.previousReading || "0");
      const currentReading = parseFloat(updateData.currentReading || existing.currentReading);
      const ratePerUnit = parseFloat((updateData as any).ratePerUnit || existing.ratePerUnit);
      
      if (currentReading < previousReading) {
        throw new Error("Current reading cannot be less than previous reading");
      }
      
      const consumption = currentReading - previousReading;
      const totalAmount = consumption * ratePerUnit;
      
      (updateData as any).consumption = consumption.toString();
      (updateData as any).totalAmount = totalAmount.toString();
    }
    
    // Always update the lastModifiedAt timestamp when updating
    (updateData as any).lastModifiedAt = new Date();
    
    const result = await db.update(waterReadings)
      .set(updateData)
      .where(eq(waterReadings.id, id))
      .returning();
    return result[0];
  }

  async deleteWaterReading(id: string): Promise<boolean> {
    const result = await db.delete(waterReadings).where(eq(waterReadings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Helper method to recalculate invoice total from items
  private async recalculateInvoiceTotal(invoiceId: string): Promise<void> {
    const items = await this.getInvoiceItemsByInvoice(invoiceId);
    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    await this.updateInvoice(invoiceId, { amount: totalAmount.toString() });
  }

  // Helper method to update invoice status after payment
  private async updateInvoiceStatusAfterPayment(invoiceId: string): Promise<void> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) return;
    
    const payments = await this.getPaymentsByInvoice(invoiceId);
    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const invoiceAmount = parseFloat(invoice.amount);
    
    let newStatus: string;
    if (totalPaid >= invoiceAmount) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'pending';
    }
    
    if (newStatus !== invoice.status) {
      await this.updateInvoice(invoiceId, { status: newStatus });
    }
  }


  // Business logic methods
  async generateMonthlyInvoices(month: string, year: number): Promise<Invoice[]> {
    const monthNum = parseInt(month);
    const targetDate = new Date(year, monthNum - 1, 1);
    
    // Get leases that are active during the target month
    const allLeases = await this.getAllLeases();
    const leasesInPeriod = allLeases.filter(lease => {
      const startDate = new Date(lease.startDate);
      const endDate = new Date(lease.endDate);
      return startDate <= targetDate && endDate >= targetDate && lease.status === 'active';
    });
    
    const generatedInvoices: Invoice[] = [];
    
    for (const lease of leasesInPeriod) {
      const invoiceNumber = `INV-${year}-${month.padStart(2, '0')}-${lease.id.slice(-6)}`;
      
      // Check if invoice already exists for this lease and month
      const existingInvoices = await db.select().from(invoices)
        .where(and(
          eq(invoices.leaseId, lease.id),
          eq(invoices.invoiceNumber, invoiceNumber)
        ))
        .limit(1);
      const existingInvoice = existingInvoices[0];
      
      if (existingInvoice) {
        console.log(`Invoice already exists for lease ${lease.id} for ${month}/${year}`);
        continue;
      }
      
      const issueDate = `${year}-${month.padStart(2, '0')}-01`;
      const dueDate = `${year}-${month.padStart(2, '0')}-05`; // Due 5th of month
      
      try {
        const invoice = await this.createInvoice({
          leaseId: lease.id,
          invoiceNumber,
          description: `Monthly Rent - ${new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          amount: lease.rentAmount,
          issueDate,
          dueDate,
        });
        
        generatedInvoices.push(invoice);
      } catch (error) {
        console.error(`Failed to generate invoice for lease ${lease.id}:`, error);
      }
    }
    
    return generatedInvoices;
  }

  async calculateLeaseBalance(leaseId: string): Promise<number> {
    const invoices = await this.getInvoicesByLease(leaseId);
    const payments = await this.getPaymentsByLease(leaseId);
    
    const totalInvoiced = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount), 0);
    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    return totalInvoiced - totalPaid;
  }

  // Charge Codes implementation
  async getChargeCodesByProperty(propertyId: string): Promise<ChargeCode[]> {
    if (!propertyId) return [];
    return await db.select().from(chargeCodes).where(eq(chargeCodes.propertyId, propertyId));
  }

  async getChargeCode(id: string): Promise<ChargeCode | undefined> {
    const result = await db.select().from(chargeCodes).where(eq(chargeCodes.id, id));
    return result[0];
  }

  async createChargeCode(chargeCode: InsertChargeCode): Promise<ChargeCode> {
    const id = randomUUID();
    const chargeCodeData = { ...chargeCode, id };
    const result = await db.insert(chargeCodes).values(chargeCodeData).returning();
    return result[0];
  }

  async updateChargeCode(id: string, chargeCode: Partial<InsertChargeCode>): Promise<ChargeCode | undefined> {
    const result = await db.update(chargeCodes).set(chargeCode).where(eq(chargeCodes.id, id)).returning();
    return result[0];
  }

  async deleteChargeCode(id: string): Promise<boolean> {
    const result = await db.delete(chargeCodes).where(eq(chargeCodes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPropertyStats(): Promise<{
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    totalTenants: number;
    monthlyRevenue: number;
    collectionRate: number;
  }> {
    const properties = await this.getAllProperties();
    const units = await this.getAllUnits();
    const tenants = await this.getAllTenants();
    const activeLeases = await this.getActiveLeases();
    
    // Get current month invoices
    const allInvoices = await this.getAllInvoices();
    const currentMonthInvoices = allInvoices.filter(invoice => {
      const date = new Date(invoice.issueDate);
      const currentDate = new Date();
      return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
    });
    
    const occupiedUnits = units.filter(unit => unit.status === 'occupied').length;
    const vacantUnits = units.filter(unit => unit.status === 'vacant').length;
    
    const monthlyRevenue = activeLeases.reduce((sum, lease) => sum + parseFloat(lease.rentAmount), 0);
    
    // Calculate actual collections for current month
    let totalInvoiced = 0;
    let totalPaid = 0;
    
    for (const invoice of currentMonthInvoices) {
      const invoiceAmount = parseFloat(invoice.amount);
      totalInvoiced += invoiceAmount;
      
      const payments = await this.getPaymentsByInvoice(invoice.id);
      const invoicePaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      totalPaid += invoicePaid;
    }
    
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
    
    return {
      totalProperties: properties.length,
      totalUnits: units.length,
      occupiedUnits,
      vacantUnits,
      totalTenants: tenants.length,
      monthlyRevenue,
      collectionRate,
    };
  }
}

export const storage = new DatabaseStorage();
