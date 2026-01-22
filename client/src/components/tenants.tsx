import { useState, useRef } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertTenantSchema, insertLeaseSchema } from "@shared/schema"
import type { Tenant, Property, Unit, Lease } from "@shared/schema"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useFilter } from "@/contexts/FilterContext"
import { Plus, User, Phone, Mail, Home, Calendar, DollarSign, Loader2, AlertTriangle, Download, Upload, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
import * as XLSX from 'xlsx'

export function Tenants() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState("")
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { selectedPropertyId, selectedLandlordId } = useFilter()

  // Enhanced tenant Excel import function with validation
  const handleFileImport = async (event: any) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xlsx, .xls) or CSV file.",
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
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

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
            fullName: (row as any)['Full Name'] || (row as any)['fullName'] || '',
            email: (row as any)['Email'] || (row as any)['email'] || '',
            phone: (row as any)['Phone'] || (row as any)['phone'] || '',
            idNumber: (row as any)['ID Number'] || (row as any)['idNumber'] || '',
            emergencyContact: (row as any)['Emergency Contact'] || '',
            emergencyPhone: (row as any)['Emergency Phone'] || ''
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
      return apiRequest("POST", "/api/tenants", data)
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] })
      toast({
        title: "Success",
        description: "Tenant created successfully",
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
  const enhancedTenants = Array.isArray(tenants) ? tenants.map(tenant => {
    const tenantLeases = Array.isArray(leases) ? leases.filter(lease => lease.tenantId === tenant.id) : []
    const activeLease = tenantLeases.find(lease => lease.status === 'active')
    
    if (activeLease) {
      const unit = Array.isArray(units) ? units.find(unit => unit.id === activeLease.unitId) : null
      const property = Array.isArray(properties) ? properties.find(prop => prop.id === unit?.propertyId) : null
      
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

  // Excel template download function
  const downloadTemplate = () => {
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
    
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    worksheet['!cols'] = [
      { wch: 20 }, // Full Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 12 }, // ID Number
      { wch: 20 }, // Emergency Contact
      { wch: 15 }  // Emergency Phone
    ]
    
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tenant Template")
    
    const filename = "tenant_import_template.xlsx"
    XLSX.writeFile(workbook, filename)
    
    toast({
      title: "Template Downloaded",
      description: `Template downloaded as ${filename}. Fill in your tenant data and import it back.`,
    })
  }

  // Excel export function
  const exportToExcel = () => {
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
      "Unit Type": tenant.unit?.type || "",
      "Rent Amount (KSH)": tenant.lease?.rentAmount || "0",
      "Deposit Amount (KSH)": tenant.lease?.depositAmount || "0",
      "Water Rate per Unit (KSH)": tenant.lease?.waterRatePerUnit || "15.50",
      "Lease Start Date": tenant.lease?.startDate || "",
      "Lease End Date": tenant.lease?.endDate || "",
      "Property Address": tenant.property?.address || "",
      "Property Status": tenant.property?.status || "",
    }))
    
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    worksheet['!cols'] = Array(18).fill({ wch: 15 })
    
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tenants Data")
    
    const currentDate = new Date().toISOString().split('T')[0]
    const filename = `tenants_export_${currentDate}.xlsx`
    
    XLSX.writeFile(workbook, filename)
    
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

  const handleSaveAndAddLease = async () => {
    const isValid = await tenantForm.trigger()
    if (isValid) {
      const tenantData = tenantForm.getValues()
      createTenantMutation.mutate(tenantData)
      setFormStep(2)
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

    // Delete all selected tenants
    selectedTenants.forEach((id) => {
      deleteTenantMutation.mutate(id)
    })
    setSelectedTenants([])
  }

  // Filter available units by selected property and only show vacant units
  const availableUnits = units.filter(unit => {
    const isCorrectProperty = selectedProperty ? unit.propertyId === selectedProperty : true
    const isVacant = unit.status === 'vacant'
    return isCorrectProperty && isVacant
  }).map(unit => {
    // Add house type name to each unit
    const houseType = houseTypes.find((ht: any) => ht.id === unit.houseTypeId)
    return {
      ...unit,
      type: houseType?.name || 'Unknown Type'
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
            accept=".xlsx,.xls,.csv"
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
            <DialogTrigger asChild>
              <Button data-testid="button-add-tenant">
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
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
                <form className="grid gap-4 py-4">
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
                  <div className="flex justify-end gap-2">
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
                  <FormField
                    control={leaseForm.control}
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property</FormLabel>
                        <FormControl>
                          <Select value={selectedProperty} onValueChange={setSelectedProperty} data-testid="select-property">
                            <SelectTrigger>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                              {properties.map((property: any) => (
                                <SelectItem key={property.id} value={property.id}>
                                  {property.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={leaseForm.control}
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Unit</FormLabel>
                        <FormControl>
                          <Select {...field} onValueChange={(value) => {
                            field.onChange(value)
                            // Auto-populate rent amount from selected unit
                            const selectedUnit = availableUnits.find(unit => unit.id === value)
                            if (selectedUnit) {
                              leaseForm.setValue("rentAmount", selectedUnit.rentAmount)
                            }
                          }} data-testid="select-unit">
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUnits.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {unit.unitNumber} - {unit.type} (KSH {parseFloat(unit.rentAmount).toLocaleString()})
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

      {/* Tenants Grid */}
      {!tenantsLoading && !tenantsError && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant: any) => {
            const isSelected = selectedTenants.includes(tenant.id)
            return (
            <Card key={tenant.id} className={`hover-elevate ${isSelected ? "ring-2 ring-primary" : ""}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleTenant(tenant.id)}
                  />
                  <Avatar>
                    <AvatarFallback>
                      {tenant.fullName?.split(" ").map((n: any) => n[0]).join("") || "T"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{tenant.fullName}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      {tenant.unit?.unitNumber || "No unit"} - {tenant.property?.name || "No property"}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={
                      tenant.status === "active" ? "default" : 
                      tenant.status === "overdue" ? "destructive" : "secondary"
                    }
                    data-testid={`status-${tenant.fullName?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}
                  >
                    {tenant.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{tenant.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{tenant.phone}</span>
                  </div>
                  {tenant.lease && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Lease: {new Date(tenant.lease.startDate).toLocaleDateString()} - {new Date(tenant.lease.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="font-medium font-mono">KSh {Number(tenant.rentAmount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="font-medium font-mono text-green-600">
                      KSh 0
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedTenant(tenant)
                      setIsViewDialogOpen(true)
                    }}
                    data-testid={`button-view-${tenant.fullName?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    data-testid={`button-invoice-${tenant.fullName?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}

      {!tenantsLoading && !tenantsError && filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No tenants found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first tenant"}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedTenant?.fullName}
            </DialogTitle>
            <DialogDescription>
              Detailed tenant information
            </DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Full Name</Label>
                  <p className="text-sm">{selectedTenant.fullName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={selectedTenant.status === "active" ? "default" : "secondary"}>
                    {selectedTenant.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm">{selectedTenant.email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm">{selectedTenant.phone}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">ID Number</Label>
                  <p className="text-sm">{selectedTenant.idNumber}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Emergency Contact</Label>
                  <p className="text-sm">{selectedTenant.emergencyContact || "Not provided"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Emergency Phone</Label>
                  <p className="text-sm">{selectedTenant.emergencyPhone || "Not provided"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Property</Label>
                  <p className="text-sm">{selectedTenant.property?.name || "Not assigned"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Unit</Label>
                  <p className="text-sm">{selectedTenant.unit?.unitNumber || "Not assigned"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Monthly Rent</Label>
                  <p className="text-sm font-mono">KSh {Number(selectedTenant.rentAmount || 0).toLocaleString()}</p>
                </div>
              </div>
              
              {selectedTenant.lease && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Lease Information</Label>
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-md">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Start Date</Label>
                      <p className="text-sm">{new Date(selectedTenant.lease.startDate).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">End Date</Label>
                      <p className="text-sm">{new Date(selectedTenant.lease.endDate).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Deposit Amount</Label>
                      <p className="text-sm font-mono">KSh {Number(selectedTenant.lease.depositAmount || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Water Rate</Label>
                      <p className="text-sm font-mono">KSh {selectedTenant.lease.waterRatePerUnit || 15.50}/m³</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}