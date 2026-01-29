import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertTenantSchema, insertLeaseSchema } from "@shared/schema"
import type { Tenant, Property, Unit, Lease } from "@shared/schema"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useFilter } from "@/contexts/FilterContext"
import { Plus, User, Phone, Loader2, AlertTriangle, Download, Upload, Trash2, Undo2, Send } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ToastAction } from "@/components/ui/toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import ExcelJS from "exceljs"

export function Tenants() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState("")
  const [selectedUnitCharges, setSelectedUnitCharges] = useState<Record<string, string>>({})
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingDeleteRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const { selectedPropertyId, selectedLandlordId, setSelectedPropertyId } = useFilter()
  const actionsDisabled = !selectedPropertyId

  useEffect(() => {
    if (!selectedPropertyId) return
    if (selectedProperty !== selectedPropertyId) {
      setSelectedProperty(selectedPropertyId)
    }
  }, [selectedPropertyId, selectedProperty])

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/check")
      return await response.json()
    },
  })
  const currentUser = authData?.authenticated ? authData.user : null
  const isAdminUser = currentUser && (currentUser.role === "admin" || currentUser.role === "super_admin")
  const userPermissions = (() => {
    if (!currentUser?.permissions) return []
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions
    if (typeof currentUser.permissions === "string") {
      try {
        const parsed = JSON.parse(currentUser.permissions)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  })()
  const canSendTenantLogin =
    isAdminUser ||
    userPermissions.includes("tenants.send_login") ||
    userPermissions.includes("tenants.bulk_send_login")

  const parseCsvToJson = (csvText: string) => {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentValue = ""
    let inQuotes = false

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i]
      const nextChar = csvText[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (char === "," && !inQuotes) {
        currentRow.push(currentValue)
        currentValue = ""
        continue
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++
        }
        currentRow.push(currentValue)
        if (currentRow.some((value) => value.trim() !== "")) {
          rows.push(currentRow)
        }
        currentRow = []
        currentValue = ""
        continue
      }

      currentValue += char
    }

    if (currentValue.length > 0 || currentRow.length > 0) {
      currentRow.push(currentValue)
      if (currentRow.some((value) => value.trim() !== "")) {
        rows.push(currentRow)
      }
    }

    const headers = rows.shift()?.map((header) => header.trim()) || []
    return rows.map((row) => {
      const record: Record<string, string> = {}
      headers.forEach((header, index) => {
        if (!header) return
        record[header] = row[index]?.trim() ?? ""
      })
      return record
    })
  }

  const parseExcelToJson = async (file: File) => {
    const workbook = new ExcelJS.Workbook()
    const data = await file.arrayBuffer()
    await workbook.xlsx.load(data)
    const worksheet = workbook.worksheets[0]
    if (!worksheet) return []

    const headerRow = worksheet.getRow(1)
    const headerValues = Array.isArray(headerRow.values) ? headerRow.values : []
    const headers = headerValues
      .slice(1)
      .map((header) => String(header ?? "").trim())

    const rows: Record<string, string>[] = []
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const record: Record<string, string> = {}
      headers.forEach((header: string, index: number) => {
        if (!header) return
        record[header] = row.getCell(index + 1).text?.trim() ?? ""
      })
      if (Object.values(record).some((value) => value !== "")) {
        rows.push(record)
      }
    })

    return rows
  }

  // Enhanced tenant Excel import function with validation
  const handleFileImport = async (event: any) => {
    if (actionsDisabled) {
      toast({
        title: "Property Required",
        description: "Select a property in the header before importing tenants.",
        variant: "destructive",
      })
      return
    }
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xlsx) or CSV file.",
        variant: "destructive",
      })
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB.",
        variant: "destructive",
      })
      return
    }

    try {
      const isCsv = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")
      const jsonData = isCsv
        ? parseCsvToJson(await file.text())
        : await parseExcelToJson(file)

      if (jsonData.length === 0) {
        toast({
          title: "Empty File",
          description: "The uploaded file contains no data.",
          variant: "destructive",
        })
        return
      }

      let successCount = 0
      let errorCount = 0
      const validationErrors: string[] = []
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        const rowNumber = i + 2 // Excel row number (1-indexed + header)
        
        try {
          const tenantData = {
            fullName: (row as any)["Full Name"] || (row as any)["fullName"] || "",
            email: (row as any)["Email"] || (row as any)["email"] || "",
            phone: (row as any)["Phone"] || (row as any)["phone"] || "",
            idNumber: (row as any)["ID Number"] || (row as any)["idNumber"] || "",
            emergencyContact: (row as any)["Emergency Contact"] || "",
            emergencyPhone: (row as any)["Emergency Phone"] || "",
          }

          // Enhanced validation
          const errors: string[] = []
          if (!tenantData.fullName?.trim()) errors.push("Full Name is required")
          if (!tenantData.email?.trim()) errors.push("Email is required")
          if (!tenantData.phone?.trim()) errors.push("Phone is required")
          if (!tenantData.idNumber?.trim()) errors.push("ID Number is required")
          
          // Email format validation
          if (tenantData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantData.email)) {
            errors.push("Invalid email format")
          }
          
          // Phone format validation (basic)
          if (tenantData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(tenantData.phone)) {
            errors.push("Invalid phone format")
          }

          if (errors.length > 0) {
            validationErrors.push(`Row ${rowNumber}: ${errors.join(', ')}`)
            errorCount++
            continue
          }

          // Clean up data
          tenantData.fullName = tenantData.fullName.trim()
          tenantData.email = tenantData.email.trim().toLowerCase()
          tenantData.phone = tenantData.phone.trim()
          tenantData.idNumber = tenantData.idNumber.trim()
          tenantData.emergencyContact = tenantData.emergencyContact?.trim() || ''
          tenantData.emergencyPhone = tenantData.emergencyPhone?.trim() || ''

          await apiRequest("POST", "/api/tenants", tenantData)
          successCount++
        } catch (error: any) {
          validationErrors.push(`Row ${rowNumber}: ${error.message || 'Unknown error'}`)
          errorCount++
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] })
      
      // Show detailed results
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${successCount} tenants.`,
        })
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: "Partial Import",
          description: `Imported ${successCount} tenants. ${errorCount} entries failed. Check console for details.`,
          variant: "destructive",
        })
        console.error("Import validation errors:", validationErrors)
      } else {
        toast({
          title: "Import Failed",
          description: `No tenants imported. ${errorCount} entries failed validation.`,
          variant: "destructive",
        })
        console.error("Import validation errors:", validationErrors)
      }
      
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to read Excel file. Please check format and try again.",
        variant: "destructive",
      })
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Fetch tenants data
  const { data: tenants = [], isLoading: tenantsLoading, error: tenantsError } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch properties for lease creation
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties", selectedLandlordId, selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch units (we'll filter by property selection)
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch house types to show type names for units
  const { data: houseTypes = [] } = useQuery({
    queryKey: ["/api/house-types", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/house-types${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch leases to get tenant-unit relationships
  const { data: leases = [] } = useQuery<Lease[]>({
    queryKey: ["/api/leases", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoices${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: payments = [] } = useQuery({
    queryKey: ["/api/payments", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/payments${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: chargeCodes = [] } = useQuery({
    queryKey: ["/api/charge-codes", selectedProperty],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedProperty) params.append("propertyId", selectedProperty)
      const url = `/api/charge-codes${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: !!selectedProperty,
  })

  // Tenant form
  const tenantForm = useForm({
    resolver: zodResolver(insertTenantSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      idNumber: "",
      emergencyContact: "",
      emergencyPhone: "",
      secondaryContactName: "",
      secondaryContactPhone: "",
      secondaryContactEmail: "",
      notifySecondary: "false",
    },
  })

  // Lease form  
  const leaseForm = useForm({
    resolver: zodResolver(insertLeaseSchema),
    defaultValues: {
      unitId: "",
      tenantId: "",
      startDate: "",
      endDate: "",
      rentAmount: "",
      depositAmount: "",
      waterRatePerUnit: "15.50",
    },
  })

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: any) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header to create tenants.")
      }
      return apiRequest("POST", "/api/tenants", data)
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] })
      toast({
        title: "Success",
        description: "Tenant created successfully. Assign a unit to show under property filters.",
      })
      // Store created tenant ID for lease creation
      const newTenant = await response.json()
      setCreatedTenantId(newTenant.id)
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      })
    },
  })

  // Create lease mutation
  const createLeaseMutation = useMutation({
    mutationFn: async (data: any) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header to create leases.")
      }
      return apiRequest("POST", "/api/leases", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] })
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      toast({
        title: "Success",
        description: "Lease created successfully",
      })
      // Reset forms and close dialog
      setIsAddDialogOpen(false)
      setFormStep(1)
      setCreatedTenantId(null)
      setSelectedProperty("")
      tenantForm.reset()
      leaseForm.reset()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lease",
        variant: "destructive",
      })
    },
  })

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header to delete tenants.")
      }
      return apiRequest("DELETE", `/api/tenants/${tenantId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] })
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tenant",
        variant: "destructive",
      })
    },
  })

  // Enhanced tenants with lease and unit information
  const parseAmount = (value: any) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const normalizeChargeAmounts = (value: any) => {
    if (!value || value === 'null') return {}
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch {
        return {}
      }
    }
    return typeof value === 'object' ? value : {}
  }

  const normalizedUnits = Array.isArray(units)
    ? units.map((unit: any) => ({
      id: unit.id,
      propertyId: unit.propertyId ?? unit.property_id,
      houseTypeId: unit.houseTypeId ?? unit.house_type_id,
      unitNumber: unit.unitNumber ?? unit.unit_number,
      rentAmount: unit.rentAmount ?? unit.rent_amount,
      rentDepositAmount: unit.rentDepositAmount ?? unit.rent_deposit_amount,
      waterRateAmount: unit.waterRateAmount ?? unit.water_rate_amount ?? unit.water_rate_per_unit,
      chargeAmounts: normalizeChargeAmounts(unit.chargeAmounts ?? unit.charge_amounts),
      status: unit.status,
    }))
    : []

  const normalizedHouseTypes = Array.isArray(houseTypes)
    ? houseTypes.map((houseType: any) => ({
      id: houseType.id,
      propertyId: houseType.propertyId ?? houseType.property_id,
      name: houseType.name,
      baseRentAmount: houseType.baseRentAmount ?? houseType.base_rent_amount,
      rentDepositAmount: houseType.rentDepositAmount ?? houseType.rent_deposit_amount,
      waterRateType: houseType.waterRateType ?? houseType.water_rate_type,
      waterRatePerUnit: houseType.waterRatePerUnit ?? houseType.water_rate_per_unit,
      waterFlatRate: houseType.waterFlatRate ?? houseType.water_flat_rate,
      chargeAmounts: normalizeChargeAmounts(houseType.chargeAmounts ?? houseType.charge_amounts),
    }))
    : []

  const normalizedLeases = Array.isArray(leases)
    ? leases.map((lease: any) => ({
      id: lease.id,
      unitId: lease.unitId ?? lease.unit_id,
      tenantId: lease.tenantId ?? lease.tenant_id,
      startDate: lease.startDate ?? lease.start_date,
      endDate: lease.endDate ?? lease.end_date,
      rentAmount: lease.rentAmount ?? lease.rent_amount,
      depositAmount: lease.depositAmount ?? lease.deposit_amount,
      waterRatePerUnit: lease.waterRatePerUnit ?? lease.water_rate_per_unit,
      status: lease.status,
    }))
    : []

  const activeLeaseUnitIds = new Set(
    normalizedLeases
      .filter((lease) => String(lease.status || "").toLowerCase() === "active")
      .map((lease) => String(lease.unitId))
  )

  const normalizedProperties = Array.isArray(properties)
    ? properties.map((property: any) => ({
      id: property.id,
      name: property.name,
      address: property.address,
      status: property.status,
      landlordId: property.landlordId ?? property.landlord_id,
    }))
    : []

  const normalizedInvoices = Array.isArray(invoices)
    ? invoices.map((invoice: any) => ({
      id: invoice.id,
      leaseId: invoice.leaseId ?? invoice.lease_id,
      amount: invoice.amount,
      issueDate: invoice.issueDate ?? invoice.issue_date,
      dueDate: invoice.dueDate ?? invoice.due_date,
      status: invoice.status,
      description: invoice.description,
      invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number,
    }))
    : []

  const normalizedPayments = Array.isArray(payments)
    ? payments.map((payment: any) => ({
      id: payment.id,
      leaseId: payment.leaseId ?? payment.lease_id,
      invoiceId: payment.invoiceId ?? payment.invoice_id,
      amount: payment.amount,
      paymentDate: payment.paymentDate ?? payment.payment_date,
      paymentMethod: payment.paymentMethod ?? payment.payment_method,
      reference: payment.reference,
    }))
    : []

  const chargeCodeMap = Array.isArray(chargeCodes)
    ? chargeCodes.reduce((acc: Record<string, any>, code: any) => {
      acc[code.id] = code
      return acc
    }, {})
    : {}

  const normalizedTenants = Array.isArray(tenants)
    ? tenants.map((tenant: any) => ({
      id: tenant.id,
      fullName: tenant.fullName ?? tenant.full_name,
      email: tenant.email,
      phone: tenant.phone,
      idNumber: tenant.idNumber ?? tenant.id_number,
      emergencyContact: tenant.emergencyContact ?? tenant.emergency_contact,
      emergencyPhone: tenant.emergencyPhone ?? tenant.emergency_phone,
      secondaryContactName: tenant.secondaryContactName ?? tenant.secondary_contact_name,
      secondaryContactPhone: tenant.secondaryContactPhone ?? tenant.secondary_contact_phone,
      secondaryContactEmail: tenant.secondaryContactEmail ?? tenant.secondary_contact_email,
      notifySecondary: tenant.notifySecondary ?? tenant.notify_secondary,
      createdAt: tenant.createdAt ?? tenant.created_at,
    }))
    : []

  const enhancedTenants = Array.isArray(normalizedTenants) ? normalizedTenants.map(tenant => {
    const tenantLeases = Array.isArray(normalizedLeases) ? normalizedLeases.filter(lease => lease.tenantId === tenant.id) : []
    const activeLease = tenantLeases.find(lease => lease.status === 'active')
    
    if (activeLease) {
      const unit = Array.isArray(normalizedUnits) ? normalizedUnits.find(unit => unit.id === activeLease.unitId) : null
      const property = Array.isArray(normalizedProperties) ? normalizedProperties.find(prop => prop.id === unit?.propertyId) : null
      
      return {
        ...tenant,
        lease: activeLease,
        unit: unit,
        property: property,
        status: activeLease.status,
        rentAmount: activeLease.rentAmount,
      }
    }
    
    return {
      ...tenant,
      lease: null,
      unit: null,
      property: null,
      status: 'inactive',
      rentAmount: '0',
    }
  }) : []

  const leaseById = normalizedLeases.reduce((acc: Record<string, any>, lease: any) => {
    acc[lease.id] = lease
    return acc
  }, {})

  const tenantBalanceMap = enhancedTenants.reduce((acc: Record<string, { invoices: number; payments: number }>, tenant: any) => {
    acc[tenant.id] = { invoices: 0, payments: 0 }
    return acc
  }, {})

  normalizedInvoices.forEach((invoice: any) => {
    const lease = leaseById[invoice.leaseId]
    if (!lease) return
    const tenantId = lease.tenantId
    if (!tenantBalanceMap[tenantId]) tenantBalanceMap[tenantId] = { invoices: 0, payments: 0 }
    tenantBalanceMap[tenantId].invoices += parseAmount(invoice.amount)
  })

  normalizedPayments.forEach((payment: any) => {
    const lease = leaseById[payment.leaseId]
    if (!lease) return
    const tenantId = lease.tenantId
    if (!tenantBalanceMap[tenantId]) tenantBalanceMap[tenantId] = { invoices: 0, payments: 0 }
    tenantBalanceMap[tenantId].payments += parseAmount(payment.amount)
  })

  const downloadWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  // Excel template download function
  const downloadTemplate = async () => {
    const templateData = [
      {
        "Full Name": "John Doe",
        "Email": "john.doe@email.com", 
        "Phone": "+254700000000",
        "ID Number": "12345678",
        "Emergency Contact": "Jane Doe",
        "Emergency Phone": "+254700000001"
      },
      {
        "Full Name": "Mary Smith",
        "Email": "mary.smith@email.com",
        "Phone": "+254700000002", 
        "ID Number": "87654321",
        "Emergency Contact": "John Smith",
        "Emergency Phone": "+254700000003"
      }
    ]
    
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Tenant Template")
    worksheet.columns = [
      { header: "Full Name", key: "Full Name", width: 20 },
      { header: "Email", key: "Email", width: 25 },
      { header: "Phone", key: "Phone", width: 15 },
      { header: "ID Number", key: "ID Number", width: 12 },
      { header: "Emergency Contact", key: "Emergency Contact", width: 20 },
      { header: "Emergency Phone", key: "Emergency Phone", width: 15 },
    ]
    worksheet.addRows(templateData)

    const filename = "tenant_import_template.xlsx"
    await downloadWorkbook(workbook, filename)
    
    toast({
      title: "Template Downloaded",
      description: `Template downloaded as ${filename}. Fill in your tenant data and import it back.`,
    })
  }

  // Excel export function
  const exportToExcel = async () => {
    const exportData = enhancedTenants.map(tenant => ({
      "Full Name": tenant.fullName,
      "Email": tenant.email,
      "Phone": tenant.phone,
      "ID Number": tenant.idNumber,
      "Emergency Contact": tenant.emergencyContact || "",
      "Emergency Phone": tenant.emergencyPhone || "",
      "Created Date": tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "",
      "Lease Status": tenant.status || "Inactive",
      "Property": tenant.property?.name || "Not Assigned",
      "Unit Number": tenant.unit?.unitNumber || "Not Assigned",
      "Unit Type": (tenant.unit as any)?.type || (tenant.unit as any)?.unitType || (tenant.unit as any)?.houseType || "",
      "Rent Amount (KSH)": tenant.lease?.rentAmount || "0",
      "Deposit Amount (KSH)": tenant.lease?.depositAmount || "0",
      "Water Rate per Unit (KSH)": tenant.lease?.waterRatePerUnit || "15.50",
      "Lease Start Date": tenant.lease?.startDate || "",
      "Lease End Date": tenant.lease?.endDate || "",
      "Property Address": tenant.property?.address || "",
      "Property Status": tenant.property?.status || "",
    }))
    
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Tenants Data")
    const headers = Object.keys(exportData[0] ?? {})
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: 15,
    }))
    worksheet.addRows(exportData)

    const currentDate = new Date().toISOString().split('T')[0]
    const filename = `tenants_export_${currentDate}.xlsx`
    await downloadWorkbook(workbook, filename)
    
    toast({
      title: "Export Successful",
      description: `Tenants data exported to ${filename}`,
    })
  }

  const filteredTenants = enhancedTenants.filter((tenant: any) =>
    tenant.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.unit?.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.property?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const ensurePropertySelected = () => {
    if (selectedPropertyId) return true
    toast({
      title: "Property Required",
      description: "Please select a property before creating a tenant.",
      variant: "destructive",
    })
    return false
  }

  const handleCreateTenant = (data: any) => {
    if (!ensurePropertySelected()) return false
    const payload = {
      ...data,
      propertyId: selectedPropertyId,
    }
    const normalizedEmail = String(data.email || "").toLowerCase().trim()
    const normalizedPhone = String(data.phone || "").replace(/\D+/g, "")
    const duplicate = tenants.find((tenant: any) => {
      const tenantEmail = String(tenant.email || "").toLowerCase().trim()
      const tenantPhone = String(tenant.phone || "").replace(/\D+/g, "")
      return (normalizedEmail && tenantEmail === normalizedEmail) ||
        (normalizedPhone && tenantPhone === normalizedPhone)
    })
    if (duplicate) {
      toast({
        title: "Duplicate Tenant",
        description: "A tenant with this email or phone number already exists.",
        variant: "destructive",
      })
      return false
    }
    createTenantMutation.mutate(payload)
    return true
  }

  const handleSaveAndAddLease = async () => {
    const isValid = await tenantForm.trigger()
    if (isValid) {
      const tenantData = tenantForm.getValues()
      const created = handleCreateTenant(tenantData)
      if (created) {
        setFormStep(2)
      }
    }
  }

  const handleCreateLease = async () => {
    const isValid = await leaseForm.trigger()
    if (isValid && createdTenantId) {
      const leaseData = {
        ...leaseForm.getValues(),
        tenantId: createdTenantId,
      }
      createLeaseMutation.mutate(leaseData)
    }
  }

  // Handle tenant selection
  const handleToggleTenant = (tenantId: string) => {
    setSelectedTenants((prev) =>
      prev.includes(tenantId)
        ? prev.filter((id) => id !== tenantId)
        : [...prev, tenantId]
    )
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedTenants.length === filteredTenants.length) {
      setSelectedTenants([])
    } else {
      setSelectedTenants(filteredTenants.map((t: any) => t.id))
    }
  }

  // Handle bulk delete
  const handleBulkDelete = () => {
    // Check if any selected tenant has active leases
    const tenantsWithActiveLeases = selectedTenants.filter((tenantId) => {
      const tenant = filteredTenants.find((t: any) => t.id === tenantId)
      return tenant?.lease && tenant.lease.status === 'active'
    })

    if (tenantsWithActiveLeases.length > 0) {
      toast({
        title: "Cannot Delete",
        description: "Some selected tenants have active leases and cannot be deleted.",
        variant: "destructive",
      })
      return
    }

    // Delete all selected tenants with undo window
    selectedTenants.forEach((id) => {
      const tenant = filteredTenants.find((t: any) => t.id === id)
      if (!tenant) return
      scheduleTenantDelete(tenant)
    })
    setSelectedTenants([])
  }

  const sendTenantLoginMutation = useMutation({
    mutationFn: async (tenantIds: string[]) => {
      const response = await apiRequest("POST", "/api/tenants/bulk-send-login-details", {
        tenantIds,
        generateNewAccessCode: true,
        sendSms: true,
        sendEmail: true,
      })
      return await response.json()
    },
    onSuccess: (data) => {
      toast({
        title: "Tenant login details sent",
        description: `Sent: ${data.sent || 0}, Failed: ${data.failed || 0}`,
      })
      setSelectedTenants([])
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send tenant login details",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    },
  })

  const handleBulkSendLoginDetails = () => {
    if (!selectedTenants.length) {
      toast({
        title: "No tenants selected",
        description: "Select at least one tenant to send login details.",
        variant: "destructive",
      })
      return
    }
    sendTenantLoginMutation.mutate(selectedTenants)
  }

  const scheduleTenantDelete = (tenant: any) => {
    if (pendingDeleteRef.current[tenant.id]) {
      clearTimeout(pendingDeleteRef.current[tenant.id])
    }
    const timeoutId = setTimeout(() => {
      deleteTenantMutation.mutate(tenant.id)
      delete pendingDeleteRef.current[tenant.id]
    }, 5000)
    pendingDeleteRef.current[tenant.id] = timeoutId

    toast({
      title: "Delete scheduled",
      description: `${tenant.fullName} will be deleted in 5 seconds.`,
      action: (
        <ToastAction
          altText="Undo delete"
          onClick={() => {
            clearTimeout(timeoutId)
            delete pendingDeleteRef.current[tenant.id]
            toast({
              title: "Delete canceled",
              description: `${tenant.fullName} was not deleted.`,
            })
          }}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo
        </ToastAction>
      ),
    })
  }

  // Filter available units by selected property and only show vacant units
  const availableUnits = normalizedUnits.filter(unit => {
    const isCorrectProperty = selectedProperty
      ? String(unit.propertyId) === String(selectedProperty)
      : true
    const statusLower = String(unit.status || "").toLowerCase()
    const isVacantStatus =
      statusLower === "" ||
      statusLower === "vacant" ||
      statusLower === "available" ||
      statusLower === "unoccupied" ||
      statusLower === "empty"
    const hasActiveLease = activeLeaseUnitIds.has(String(unit.id))
    return isCorrectProperty && isVacantStatus && !hasActiveLease
  }).map(unit => {
    // Add house type name to each unit
    const houseType = normalizedHouseTypes.find((ht: any) => ht.id === unit.houseTypeId)
    return {
      ...unit,
      type: houseType?.name || 'Unknown Type',
      houseType,
    }
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="tenants-title">Tenants</h1>
          <p className="text-muted-foreground">Manage tenant information and lease agreements</p>
        </div>
        <div className="flex gap-2">
          {selectedTenants.length > 0 && canSendTenantLogin && (
            <Button
              variant="outline"
              onClick={handleBulkSendLoginDetails}
              disabled={sendTenantLoginMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Logins ({selectedTenants.length})
            </Button>
          )}
          {selectedTenants.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteTenantMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedTenants.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Tenants</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedTenants.length} tenant(s)? 
                    Tenants with active leases cannot be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            data-testid="button-download-template"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button 
            variant="outline" 
            onClick={exportToExcel}
            data-testid="button-export-tenants"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileImport}
            style={{ display: 'none' }}
            ref={fileInputRef}
            data-testid="input-file-import"
          />
          <Button 
            variant="outline" 
            onClick={() => setLocation('/upload-data')}
            data-testid="button-upload-data"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Data
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            {actionsDisabled ? (
              <Button
                data-testid="button-add-tenant"
                onClick={() => {
                  toast({
                    title: "Property Required",
                    description: "Select a property in the header before adding tenants.",
                    variant: "destructive",
                  })
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            ) : (
              <DialogTrigger asChild>
                <Button data-testid="button-add-tenant">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tenant
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {formStep === 1 ? "Add New Tenant" : "Allocate Unit"}
              </DialogTitle>
              <DialogDescription>
                {formStep === 1 
                  ? "Enter tenant contact information and details."
                  : "Assign a unit and create lease agreement."
                }
              </DialogDescription>
            </DialogHeader>
            
            {formStep === 1 ? (
              <Form {...tenantForm}>
                <form
                  onSubmit={tenantForm.handleSubmit(handleCreateTenant)}
                  className="grid gap-4 py-4 md:grid-cols-2"
                >
                  <FormItem className="md:col-span-2">
                    <FormLabel>Property</FormLabel>
                    <FormControl>
                      <Select
                        value={selectedPropertyId ? String(selectedPropertyId) : ""}
                        onValueChange={(value) => {
                          setSelectedProperty(value)
                          setSelectedPropertyId(value || null)
                          leaseForm.setValue("unitId", "")
                          setSelectedUnitCharges({})
                        }}
                        data-testid="select-tenant-property"
                        disabled={!!selectedPropertyId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property: any) => (
                            <SelectItem key={property.id} value={String(property.id)}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                  <FormField
                    control={tenantForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., John Doe"
                            data-testid="input-tenant-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tenantForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john.doe@email.com"
                            data-testid="input-tenant-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tenantForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+254 712 345 678"
                            data-testid="input-tenant-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tenantForm.control}
                    name="idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID/Passport Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="12345678"
                            data-testid="input-tenant-id"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tenantForm.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Jane Doe"
                            data-testid="input-emergency-contact"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tenantForm.control}
                    name="emergencyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+254 700 000 001"
                            data-testid="input-emergency-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="border-t pt-3 text-sm text-muted-foreground md:col-span-2">Secondary Contact</div>
                  <FormField
                    control={tenantForm.control}
                    name="secondaryContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Contact Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., John Smith"
                            data-testid="input-secondary-contact-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tenantForm.control}
                    name="secondaryContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Contact Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+254 700 000 002"
                            data-testid="input-secondary-contact-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tenantForm.control}
                    name="secondaryContactEmail"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Secondary Contact Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="secondary@email.com"
                            data-testid="input-secondary-contact-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tenantForm.control}
                    name="notifySecondary"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between border rounded-md p-3 md:col-span-2">
                        <div>
                          <FormLabel>Send Notifications to Secondary Contact</FormLabel>
                          <p className="text-xs text-muted-foreground">Enable updates for the secondary contact</p>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value === "true"}
                            onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 md:col-span-2">
                    <Button 
                      variant="outline" 
                      type="submit"
                      disabled={createTenantMutation.isPending}
                    >
                      {createTenantMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save & Close
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleSaveAndAddLease} 
                      data-testid="button-save-add-lease"
                      disabled={createTenantMutation.isPending}
                    >
                      {createTenantMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save & Add Lease
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Form {...leaseForm}>
                <form className="grid gap-4 py-4">
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <FormControl>
                      <Select
                        value={selectedPropertyId ? String(selectedPropertyId) : selectedProperty}
                        onValueChange={(value) => {
                          setSelectedProperty(value)
                          setSelectedPropertyId(value || null)
                          leaseForm.setValue("unitId", "")
                          setSelectedUnitCharges({})
                        }}
                        data-testid="select-property"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property: any) => (
                            <SelectItem key={property.id} value={String(property.id)}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                  
                  <FormField
                    control={leaseForm.control}
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Unit</FormLabel>
                        <FormControl>
                          <Select {...field} onValueChange={(value) => {
                            field.onChange(value)
                            const selectedUnit = availableUnits.find(unit => String(unit.id) === value)
                            if (selectedUnit) {
                              const unitRent = selectedUnit.rentAmount ?? selectedUnit.houseType?.baseRentAmount ?? ""
                              const unitDeposit = selectedUnit.rentDepositAmount ?? selectedUnit.houseType?.rentDepositAmount ?? ""
                              const unitWaterRate = selectedUnit.waterRateAmount
                                ?? (selectedUnit.houseType?.waterRateType === "unit_based"
                                  ? selectedUnit.houseType?.waterRatePerUnit
                                  : selectedUnit.houseType?.waterFlatRate)
                                ?? "15.50"
                              leaseForm.setValue("rentAmount", unitRent)
                              leaseForm.setValue("depositAmount", unitDeposit)
                              leaseForm.setValue("waterRatePerUnit", unitWaterRate)
                              setSelectedUnitCharges(selectedUnit.chargeAmounts || {})
                            } else {
                              setSelectedUnitCharges({})
                            }
                          }} data-testid="select-unit">
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUnits.map((unit) => (
                                <SelectItem key={unit.id} value={String(unit.id)}>
                                  {unit.unitNumber} - {unit.type} (KSH {parseAmount(unit.rentAmount).toLocaleString()})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={leaseForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lease Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-lease-start" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={leaseForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lease End Date</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-lease-end" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={leaseForm.control}
                      name="rentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent (KSH)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 20000" 
                              data-testid="input-rent-amount" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={leaseForm.control}
                      name="depositAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit (KSH)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 40000" 
                              data-testid="input-deposit-amount" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={leaseForm.control}
                    name="waterRatePerUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Water Rate per Unit (KSH per m³)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="e.g., 15.50" 
                            data-testid="input-water-rate" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {Object.keys(selectedUnitCharges).length > 0 && (
                    <div className="space-y-2 border rounded-lg p-3">
                      <div className="text-sm font-medium">Unit Charge Codes</div>
                      <div className="space-y-1 text-sm">
                        {Object.entries(selectedUnitCharges).map(([chargeCodeId, amount]) => {
                          const code = chargeCodeMap[chargeCodeId]
                          return (
                            <div key={chargeCodeId} className="flex items-center justify-between">
                              <span className="text-muted-foreground">{code?.name || "Charge"}</span>
                              <span className="font-mono">KSh {parseAmount(amount).toLocaleString()}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setFormStep(1)}>
                      Back
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleCreateLease} 
                      data-testid="button-create-lease"
                      disabled={createLeaseMutation.isPending}
                    >
                      {createLeaseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Lease
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search tenants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
          data-testid="input-search-tenants"
        />
        {filteredTenants.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedTenants.length === filteredTenants.length && filteredTenants.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label className="text-sm text-muted-foreground cursor-pointer" onClick={handleSelectAll}>
              Select All
            </label>
          </div>
        )}
      </div>

      {/* Loading State */}
      {tenantsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tenants...</span>
        </div>
      )}

      {/* Error State */}
      {tenantsError && (
        <div className="flex items-center justify-center py-12">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <span className="ml-2 text-destructive">Failed to load tenants</span>
        </div>
      )}

      {/* Tenants List */}
      {!tenantsLoading && !tenantsError && (
        <Card>
          <CardContent className="p-0">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-64">Tenant</TableHead>
                  <TableHead className="w-36">Phone</TableHead>
                  <TableHead className="w-48">Property</TableHead>
                  <TableHead className="w-32">Active Leases</TableHead>
                  <TableHead className="w-48 text-right pr-6">Balance</TableHead>
                  <TableHead className="w-40 pl-6">Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant: any) => {
                  const isSelected = selectedTenants.includes(tenant.id)
                  const totals = tenantBalanceMap[tenant.id] || { invoices: 0, payments: 0 }
                  const tenantActiveLeases = normalizedLeases.filter(
                    (lease: any) => lease.tenantId === tenant.id && lease.status === "active"
                  ).length
                  const balance = totals.invoices - totals.payments
                  const balanceClass = balance < 0 ? "text-green-600" : balance > 0 ? "text-red-500" : "text-muted-foreground"
                  const balanceDisplay = balance < 0
                    ? `-KSh ${Math.abs(balance).toLocaleString()}`
                    : `KSh ${balance.toLocaleString()}`

                  return (
                    <TableRow
                      key={tenant.id}
                      className={`hover-elevate cursor-pointer ${isSelected ? "bg-muted/30" : ""}`}
                      onClick={() => setLocation(`/tenants/${tenant.id}`)}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleTenant(tenant.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {tenant.fullName?.split(" ").map((n: any) => n[0]).join("") || "T"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{tenant.fullName}</div>
                            <div className="text-xs text-muted-foreground">{tenant.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {tenant.phone || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tenant.property?.name || "No property"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tenantActiveLeases}
                      </TableCell>
                      <TableCell className={`text-right font-mono pr-6 ${balanceClass}`}>
                        {balanceDisplay}
                      </TableCell>
                      <TableCell className="pl-6">
                        <Badge
                          variant={
                            tenant.status === "active" ? "default" :
                            tenant.status === "overdue" ? "destructive" : "secondary"
                          }
                        >
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/tenants/${tenant.id}`)}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!tenantsLoading && !tenantsError && filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No tenants found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first tenant"}
          </p>
          <Button
            onClick={() => {
              if (!selectedPropertyId) {
                toast({
                  title: "Property Required",
                  description: "Select a property in the header before adding tenants.",
                  variant: "destructive",
                })
                return
              }
              setIsAddDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>
      )}

    </div>
  )
}