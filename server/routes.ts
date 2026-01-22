import type { Express } from "express";
import { createServer, type Server } from "http";
import { Readable } from "stream";
import { storage } from "./storage";
import { 
  insertPropertySchema, insertUnitSchema, insertTenantSchema, 
  insertLeaseSchema, insertInvoiceSchema, insertPaymentSchema, 
  insertMessageSchema,
  insertBulkMessageSchema,
  insertMessageRecipientSchema, insertInvoiceItemSchema, insertWaterReadingSchema,
  insertHouseTypeSchema, updateHouseTypeSchema, 
  insertChargeCodeSchema, updateChargeCodeSchema
} from "@shared/schema";

// Helper function for error handling
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Fallback mode: If ROUTES_FALLBACK env var is set to "fallback", skip new routes
  const useFallback = process.env.ROUTES_FALLBACK === "fallback";
  
  // Public utility routes (no auth)
  // Proxy Google Drive-hosted images so <img> always receives image bytes
  app.get("/api/public/drive-image/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
        return res.status(400).json({ error: "Invalid file id" });
      }

      // Try Drive "download" endpoint and follow redirects.
      // Using a server-side proxy avoids Drive HTML interstitials/CORS/hotlink blocking.
      const driveUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
      const upstream = await fetch(driveUrl, {
        redirect: "follow",
        headers: {
          // Encourage an image response; Drive may still redirect.
          "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent": "LeaseMasterImageProxy/1.0",
        },
      });

      if (!upstream.ok || !upstream.body) {
        return res.status(502).json({ error: "Failed to fetch image" });
      }

      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      const contentLength = upstream.headers.get("content-length");

      res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      res.setHeader("Cache-Control", "public, max-age=86400");

      // Stream bytes to client
      const body: any = upstream.body;
      if (typeof body.pipe === "function") {
        body.pipe(res);
        return;
      }

      // Node's built-in fetch returns a Web ReadableStream
      Readable.fromWeb(body).pipe(res);
    } catch (error) {
      console.error("Error proxying drive image:", error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Check password - support both hashed and plain text for development
      const bcrypt = await import("bcryptjs");
      let isValid = false;
      
      // Check if password is bcrypt hashed (starts with $2a$, $2b$, or $2y$)
      if (user.password.startsWith("$2")) {
        isValid = await bcrypt.compare(password, user.password);
      } else {
        // Plain text password (for development/testing)
        isValid = user.password === password;
      }

      if (!isValid) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Set session
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;

      res.json({ 
        success: true, 
        user: { id: user.id, username: user.username } 
      });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/auth/check", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          return res.json({ 
            authenticated: true, 
            user: { id: user.id, username: user.username } 
          });
        }
      }
      res.status(401).json({ authenticated: false });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Properties routes
  app.get("/api/properties", async (req, res) => {
    try {
      console.log("Fetching all properties...")
      const properties = await storage.getAllProperties();
      console.log("Retrieved properties:", properties)
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error)
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      console.log("🚀 POST /api/properties - Request received")
      console.log("📋 Request body:", req.body)
      console.log("📋 Request headers:", req.headers)
      
      // Validate the request body
      console.log("🔍 Validating request data...")
      const validatedData = insertPropertySchema.parse(req.body);
      console.log("✅ Validation passed:", validatedData)
      
      // Create the property
      console.log("💾 Creating property in database...")
      const property = await storage.createProperty(validatedData);
      console.log("✅ Property created successfully:", property)
      
      res.status(201).json(property);
      console.log("📡 Response sent successfully")
    } catch (error) {
      console.error("❌ Property creation error:", error)
      console.error("📋 Error details:", {
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name
      })
      
      const errorMessage = getErrorMessage(error)
      console.error("📋 Formatted error message:", errorMessage)
      
      res.status(400).json({ error: errorMessage });
    }
  });

  app.put("/api/properties/:id", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(req.params.id, validatedData);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const success = await storage.deleteProperty(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/properties/:id/disable", async (req, res) => {
    try {
      const property = await storage.disableProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/properties/:id/enable", async (req, res) => {
    try {
      const property = await storage.enableProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // House Types routes
  app.get("/api/house-types", async (req, res) => {
    try {
      const { propertyId } = req.query;
      const houseTypes = await storage.getAllHouseTypes();
      
      // Filter by property if propertyId is provided
      if (propertyId) {
        const filtered = houseTypes.filter(ht => ht.propertyId === propertyId);
        return res.json(filtered);
      }
      
      res.json(houseTypes);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/house-types/:id", async (req, res) => {
    try {
      const houseType = await storage.getHouseType(req.params.id);
      if (!houseType) {
        return res.status(404).json({ error: "House type not found" });
      }
      res.json(houseType);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/house-types", async (req, res) => {
    try {
      // Handle chargeAmounts field separately since it might not be in the schema
      const { chargeAmounts, ...otherData } = req.body
      
      let validatedData
      if (chargeAmounts !== undefined) {
        // If chargeAmounts is provided, include it in the creation
        validatedData = { ...insertHouseTypeSchema.parse(otherData), chargeAmounts }
      } else {
        // Otherwise, use normal validation
        validatedData = insertHouseTypeSchema.parse(req.body)
      }
      
      const houseType = await storage.createHouseType(validatedData);
      res.status(201).json(houseType);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/house-types/:id", async (req, res) => {
    try {
      await storage.deleteHouseType(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Units routes
  app.get("/api/units", async (req, res) => {
    try {
      const { propertyId } = req.query;
      let units;
      if (propertyId) {
        units = await storage.getUnitsByProperty(propertyId as string);
      } else {
        units = await storage.getAllUnits();
      }
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/units/:id", async (req, res) => {
    try {
      const unit = await storage.getUnit(req.params.id);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/units", async (req, res) => {
    try {
      const validatedData = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(validatedData);
      res.status(201).json(unit);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/units/:id", async (req, res) => {
    try {
      const validatedData = insertUnitSchema.partial().parse(req.body);
      const unit = await storage.updateUnit(req.params.id, validatedData);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    try {
      const success = await storage.deleteUnit(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Tenants routes
  app.get("/api/tenants", async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/tenants", async (req, res) => {
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      const tenant = await storage.createTenant(validatedData);
      res.status(201).json(tenant);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/tenants/:id", async (req, res) => {
    try {
      const validatedData = insertTenantSchema.partial().parse(req.body);
      const tenant = await storage.updateTenant(req.params.id, validatedData);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/tenants/:id", async (req, res) => {
    try {
      const success = await storage.deleteTenant(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Leases routes
  app.get("/api/leases", async (req, res) => {
    try {
      const { tenantId, unitId, active } = req.query;
      let leases;
      
      if (tenantId) {
        leases = await storage.getLeasesByTenant(tenantId as string);
      } else if (unitId) {
        leases = await storage.getLeasesByUnit(unitId as string);
      } else if (active === 'true') {
        leases = await storage.getActiveLeases();
      } else {
        leases = await storage.getAllLeases();
      }
      
      res.json(leases);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/leases/:id", async (req, res) => {
    try {
      const lease = await storage.getLease(req.params.id);
      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }
      res.json(lease);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/leases", async (req, res) => {
    try {
      const validatedData = insertLeaseSchema.parse(req.body);
      const lease = await storage.createLease(validatedData);
      res.status(201).json(lease);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/leases/:id", async (req, res) => {
    try {
      const validatedData = insertLeaseSchema.partial().parse(req.body);
      const lease = await storage.updateLease(req.params.id, validatedData);
      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }
      res.json(lease);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/leases/:id", async (req, res) => {
    try {
      const success = await storage.deleteLease(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Lease not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Invoices routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const { leaseId, overdue } = req.query;
      let invoices;
      
      if (leaseId) {
        invoices = await storage.getInvoicesByLease(leaseId as string);
      } else if (overdue === 'true') {
        invoices = await storage.getOverdueInvoices();
      } else {
        invoices = await storage.getAllInvoices();
      }
      
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    console.log(`🔧 PUT /api/invoices/${req.params.id} - Request received`);
    console.log(`🔧 Request body:`, req.body);
    try {
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      console.log(`🔧 Validated data:`, validatedData);
      const invoice = await storage.updateInvoice(req.params.id, validatedData);
      console.log(`🔧 Update result:`, invoice);
      if (!invoice) {
        console.log(`🔧 Invoice not found: ${req.params.id}`);
        return res.status(404).json({ error: "Invoice not found" });
      }
      console.log(`🔧 Successfully updated invoice: ${req.params.id}`);
      res.json(invoice);
    } catch (error) {
      console.log(`🔧 Error updating invoice:`, error);
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const success = await storage.deleteInvoice(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Send invoice via email
  app.post("/api/invoices/:id/send-email", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // TODO: Implement actual email sending using SendGrid integration
      // For now, simulate email sending and update invoice status
      
      // Update invoice status to 'sent' if it was draft or approved
      if (invoice.status === 'draft' || invoice.status === 'approved') {
        await storage.updateInvoice(req.params.id, { status: 'sent' });
      }

      res.json({ 
        success: true, 
        message: `Invoice ${invoice.invoiceNumber} sent via email` 
      });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Send invoice via SMS
  app.post("/api/invoices/:id/send-sms", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // TODO: Implement actual SMS sending using Twilio or other SMS service
      // For now, simulate SMS sending and update invoice status
      
      // Update invoice status to 'sent' if it was draft or approved
      if (invoice.status === 'draft' || invoice.status === 'approved') {
        await storage.updateInvoice(req.params.id, { status: 'sent' });
      }

      res.json({ 
        success: true, 
        message: `Invoice ${invoice.invoiceNumber} notification sent via SMS` 
      });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Payments routes
  app.get("/api/payments", async (req, res) => {
    try {
      const { leaseId, invoiceId } = req.query;
      let payments;
      
      if (leaseId) {
        payments = await storage.getPaymentsByLease(leaseId as string);
      } else if (invoiceId) {
        payments = await storage.getPaymentsByInvoice(invoiceId as string);
      } else {
        payments = await storage.getAllPayments();
      }
      
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/payments/:id", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(req.params.id, validatedData);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      const success = await storage.deletePayment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    try {
      const { tenantId, propertyId } = req.query;
      let messages;
      
      if (tenantId) {
        messages = await storage.getMessagesByTenant(tenantId as string);
      } else if (propertyId) {
        messages = await storage.getMessagesByProperty(propertyId as string);
      } else {
        messages = await storage.getAllMessages();
      }
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/messages/:id", async (req, res) => {
    try {
      const message = await storage.getMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/messages/:id", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.partial().parse(req.body);
      const message = await storage.updateMessage(req.params.id, validatedData);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const success = await storage.deleteMessage(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Bulk Messages routes
  app.get("/api/bulk-messages", async (req, res) => {
    try {
      const messages = await storage.getAllBulkMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/bulk-messages/:id", async (req, res) => {
    try {
      const message = await storage.getBulkMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Bulk message not found" });
      }
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/bulk-messages", async (req, res) => {
    try {
      const validatedData = insertBulkMessageSchema.parse(req.body);
      const message = await storage.createBulkMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/bulk-messages/:id", async (req, res) => {
    try {
      const validatedData = insertBulkMessageSchema.partial().parse(req.body);
      const message = await storage.updateBulkMessage(req.params.id, validatedData);
      if (!message) {
        return res.status(404).json({ error: "Bulk message not found" });
      }
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/bulk-messages/:id", async (req, res) => {
    try {
      const success = await storage.deleteBulkMessage(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Bulk message not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Message Recipients routes
  app.get("/api/message-recipients", async (req, res) => {
    try {
      const { bulkMessageId, tenantId } = req.query;
      let recipients;
      
      if (bulkMessageId) {
        recipients = await storage.getMessageRecipientsByBulkMessage(bulkMessageId as string);
      } else if (tenantId) {
        recipients = await storage.getMessageRecipientsByTenant(tenantId as string);
      } else {
        recipients = await storage.getAllMessageRecipients();
      }
      
      res.json(recipients);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/message-recipients/:id", async (req, res) => {
    try {
      const recipient = await storage.getMessageRecipient(req.params.id);
      if (!recipient) {
        return res.status(404).json({ error: "Message recipient not found" });
      }
      res.json(recipient);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/message-recipients", async (req, res) => {
    try {
      const validatedData = insertMessageRecipientSchema.parse(req.body);
      const recipient = await storage.createMessageRecipient(validatedData);
      res.status(201).json(recipient);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/message-recipients/:id", async (req, res) => {
    try {
      const validatedData = insertMessageRecipientSchema.partial().parse(req.body);
      const recipient = await storage.updateMessageRecipient(req.params.id, validatedData);
      if (!recipient) {
        return res.status(404).json({ error: "Message recipient not found" });
      }
      res.json(recipient);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/message-recipients/:id", async (req, res) => {
    try {
      const success = await storage.deleteMessageRecipient(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Message recipient not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Invoice Items routes
  app.get("/api/invoice-items", async (req, res) => {
    try {
      const items = await storage.getAllInvoiceItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/invoice-items/:id", async (req, res) => {
    try {
      const item = await storage.getInvoiceItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Invoice item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/invoices/:invoiceId/items", async (req, res) => {
    try {
      const items = await storage.getInvoiceItemsByInvoice(req.params.invoiceId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/invoice-items", async (req, res) => {
    try {
      const validatedData = insertInvoiceItemSchema.parse(req.body);
      const item = await storage.createInvoiceItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/invoice-items/:id", async (req, res) => {
    try {
      const validatedData = insertInvoiceItemSchema.partial().parse(req.body);
      const item = await storage.updateInvoiceItem(req.params.id, validatedData);
      if (!item) {
        return res.status(404).json({ error: "Invoice item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/invoice-items/:id", async (req, res) => {
    try {
      const success = await storage.deleteInvoiceItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Invoice item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Water Readings routes
  app.get("/api/water-readings", async (req, res) => {
    try {
      const readings = await storage.getAllWaterReadings();
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/water-readings/:id", async (req, res) => {
    try {
      const reading = await storage.getWaterReading(req.params.id);
      if (!reading) {
        return res.status(404).json({ error: "Water reading not found" });
      }
      res.json(reading);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/units/:unitId/water-readings", async (req, res) => {
    try {
      const readings = await storage.getWaterReadingsByUnit(req.params.unitId);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/water-readings/status/:status", async (req, res) => {
    try {
      const readings = await storage.getWaterReadingsByStatus(req.params.status);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/water-readings", async (req, res) => {
    try {
      const validatedData = insertWaterReadingSchema.parse(req.body);
      const reading = await storage.createWaterReading(validatedData);
      res.status(201).json(reading);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/water-readings/:id", async (req, res) => {
    try {
      const validatedData = insertWaterReadingSchema.partial().parse(req.body);
      const reading = await storage.updateWaterReading(req.params.id, validatedData);
      if (!reading) {
        return res.status(404).json({ error: "Water reading not found" });
      }
      res.json(reading);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/water-readings/:id", async (req, res) => {
    try {
      const success = await storage.deleteWaterReading(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Water reading not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Business logic routes
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getPropertyStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/invoices/generate", async (req, res) => {
    try {
      const { month, year } = req.body;
      if (!month || !year) {
        return res.status(400).json({ error: "Month and year are required" });
      }
      
      const invoices = await storage.generateMonthlyInvoices(month.toString(), parseInt(year));
      res.json({ 
        message: `Generated ${invoices.length} invoices for ${month}/${year}`,
        invoices 
      });
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/leases/:id/balance", async (req, res) => {
    try {
      const balance = await storage.calculateLeaseBalance(req.params.id);
      res.json({ leaseId: req.params.id, balance });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Users API
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // NEW ROUTES SECTION - Only registered if not in fallback mode
  if (!useFallback) {
    // Landlords API - Returns all users with role 'client'
    app.get("/api/landlords", async (req, res) => {
      try {
        const allUsers = await storage.getUsers();
        // Filter for users with role 'client' (landlords)
        const landlords = allUsers.filter(user => user.role === 'client');
        res.json(landlords);
      } catch (error) {
        console.error("Error fetching landlords:", error);
        res.status(500).json({ error: "Failed to fetch landlords" });
      }
    });
  }

  // SMS Balance API (stub - returns default balance if not implemented)
  app.get("/api/sms-balance", async (req, res) => {
    try {
      // TODO: Implement actual SMS balance fetching if needed
      // For now, return a default response to prevent 404 errors
      res.json({ 
        balance: 0,
        currency: "KES",
        message: "SMS balance feature not yet implemented"
      });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Units routes
  app.get("/api/units", async (req, res) => {
    try {
      const units = await storage.getAllUnits();
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/units/:id", async (req, res) => {
    try {
      const unit = await storage.getUnit(req.params.id);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/units", async (req, res) => {
    try {
      const validatedData = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(validatedData);
      res.status(201).json(unit);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/units/:id", async (req, res) => {
    try {
      const validatedData = insertUnitSchema.partial().parse(req.body);
      const unit = await storage.updateUnit(req.params.id, validatedData);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    try {
      const success = await storage.deleteUnit(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/units/bulk-delete", async (req, res) => {
    try {
      const { unitIds } = req.body;
      if (!Array.isArray(unitIds) || unitIds.length === 0) {
        return res.status(400).json({ error: "unitIds must be a non-empty array" });
      }
      
      const result = await storage.bulkDeleteUnits(unitIds);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/house-types/:id", async (req, res) => {
    try {
      console.log('House type update request body:', req.body)
      
      // Handle chargeAmounts field separately since it might not be in the schema
      const { chargeAmounts, ...otherData } = req.body
      
      let validatedData
      if (chargeAmounts !== undefined) {
        // If chargeAmounts is provided, include it in the update
        validatedData = { ...updateHouseTypeSchema.parse(otherData), chargeAmounts }
      } else {
        // Otherwise, use normal validation
        validatedData = updateHouseTypeSchema.parse(req.body)
      }
      
      console.log('Validated data:', validatedData)
      
      const houseType = await storage.updateHouseType(req.params.id, validatedData);
      if (!houseType) {
        return res.status(404).json({ error: "House type not found" });
      }
      res.json(houseType);
    } catch (error) {
      console.error('House type update error:', error)
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  // Charge Codes routes
  app.get("/api/charge-codes", async (req, res) => {
    try {
      const { propertyId } = req.query;
      const chargeCodes = await storage.getChargeCodesByProperty(propertyId as string);
      res.json(chargeCodes);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post("/api/charge-codes", async (req, res) => {
    try {
      const validatedData = insertChargeCodeSchema.parse(req.body);
      const chargeCode = await storage.createChargeCode(validatedData);
      res.status(201).json(chargeCode);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.put("/api/charge-codes/:id", async (req, res) => {
    try {
      const validatedData = updateChargeCodeSchema.parse(req.body);
      const chargeCode = await storage.updateChargeCode(req.params.id, validatedData);
      if (!chargeCode) {
        return res.status(404).json({ error: "Charge code not found" });
      }
      res.json(chargeCode);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  app.delete("/api/charge-codes/:id", async (req, res) => {
    try {
      const success = await storage.deleteChargeCode(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Charge code not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
