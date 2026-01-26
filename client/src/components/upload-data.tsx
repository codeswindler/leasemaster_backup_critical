import { useState, useRef } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useFilter } from "@/contexts/FilterContext"
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Users,
  Building2,
  DollarSign,
  Calendar,
  Info
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import ExcelJS from "exceljs"

interface UploadProgress {
  total: number
  processed: number
  successful: number
  failed: number
  current?: string
}

interface UploadResult {
  successful: Array<{
    row: number
    tenant: string
    unit: string
    rent: string
    balance: number | string
    balanceType: string
  }>
  failed: Array<{
    row: number
    tenant: string
    error: string
  }>
  duplicates: Array<any>
  invalidUnits: Array<{
    row: number
    unitNumber: string
    tenant: string
  }>
}

export function UploadData() {
  const [, setLocation] = useLocation()
  const [selectedProperty, setSelectedProperty] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadResults, setUploadResults] = useState<any>(null)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { selectedPropertyId, selectedLandlordId } = useFilter()

  // Fetch properties for selection
  const { data: properties = [], isLoading: propertiesLoading } = useQuery<any[]>({
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

  // Fetch units for the selected property
  const { data: allUnits = [] } = useQuery<any[]>({
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

  const propertyUnits = selectedProperty 
    ? allUnits.filter((unit: any) => unit.propertyId === selectedProperty)
    : []

  const selectedPropertyData = properties.find((p: any) => p.id === selectedProperty)

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
    const headers = (headerRow.values || [])
      .slice(1)
      .map((header) => String(header ?? "").trim())

    const rows: Record<string, string>[] = []
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const record: Record<string, string> = {}
      headers.forEach((header, index) => {
        if (!header) return
        record[header] = row.getCell(index + 1).text?.trim() ?? ""
      })
      if (Object.values(record).some((value) => value !== "")) {
        rows.push(record)
      }
    })

    return rows
  }

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

  // Download template function with comprehensive structure
  const downloadTemplate = async () => {
    const templateData = [
      {
        "Full Name": "John Doe",
        "Email": "john.doe@email.com",
        "Phone": "+254700000000",
        "ID Number": "12345678",
        "Emergency Contact": "Jane Doe",
        "Emergency Phone": "+254700000001",
        "Unit Number": "A001",
        "Lease Start Date": "2024-01-01",
        "Lease End Date": "2024-12-31",
        "Monthly Rent": "50000",
        "Deposit Amount": "100000",
        "Water Rate Per Unit": "15.50",
        "Opening Balance": "-5000",
        "Balance Type": "arrears",
        "Notes": "2 months arrears from previous property"
      },
      {
        "Full Name": "Mary Smith",
        "Email": "mary.smith@email.com",
        "Phone": "+254700000002",
        "ID Number": "87654321",
        "Emergency Contact": "John Smith",
        "Emergency Phone": "+254700000003",
        "Unit Number": "A002",
        "Lease Start Date": "2024-02-01",
        "Lease End Date": "2025-01-31",
        "Monthly Rent": "45000",
        "Deposit Amount": "90000",
        "Water Rate Per Unit": "15.50",
        "Opening Balance": "2000",
        "Balance Type": "credit",
        "Notes": "Advance payment for next month"
      }
    ]

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Tenant Upload Template")
    worksheet.columns = [
      { header: "Full Name", key: "Full Name", width: 20 },
      { header: "Email", key: "Email", width: 25 },
      { header: "Phone", key: "Phone", width: 15 },
      { header: "ID Number", key: "ID Number", width: 12 },
      { header: "Emergency Contact", key: "Emergency Contact", width: 20 },
      { header: "Emergency Phone", key: "Emergency Phone", width: 15 },
      { header: "Unit Number", key: "Unit Number", width: 12 },
      { header: "Lease Start Date", key: "Lease Start Date", width: 15 },
      { header: "Lease End Date", key: "Lease End Date", width: 15 },
      { header: "Monthly Rent", key: "Monthly Rent", width: 12 },
      { header: "Deposit Amount", key: "Deposit Amount", width: 15 },
      { header: "Water Rate Per Unit", key: "Water Rate Per Unit", width: 15 },
      { header: "Opening Balance", key: "Opening Balance", width: 15 },
      { header: "Balance Type", key: "Balance Type", width: 12 },
      { header: "Notes", key: "Notes", width: 30 },
    ]
    worksheet.addRows(templateData)

    // Add instructions sheet
    const instructionsData = [
      { "Field": "Full Name", "Required": "Yes", "Description": "Complete name of the tenant", "Example": "John Doe" },
      { "Field": "Email", "Required": "Yes", "Description": "Valid email address", "Example": "john.doe@email.com" },
      { "Field": "Phone", "Required": "Yes", "Description": "Phone number with country code", "Example": "+254700000000" },
      { "Field": "ID Number", "Required": "Yes", "Description": "National ID or Passport number", "Example": "12345678" },
      { "Field": "Emergency Contact", "Required": "No", "Description": "Emergency contact person name", "Example": "Jane Doe" },
      { "Field": "Emergency Phone", "Required": "No", "Description": "Emergency contact phone number", "Example": "+254700000001" },
      { "Field": "Unit Number", "Required": "Yes", "Description": "Unit number that exists in the selected property", "Example": "A001" },
      { "Field": "Lease Start Date", "Required": "Yes", "Description": "Lease start date (YYYY-MM-DD)", "Example": "2024-01-01" },
      { "Field": "Lease End Date", "Required": "Yes", "Description": "Lease end date (YYYY-MM-DD)", "Example": "2024-12-31" },
      { "Field": "Monthly Rent", "Required": "Yes", "Description": "Monthly rent amount in KSH (numbers only)", "Example": "50000" },
      { "Field": "Deposit Amount", "Required": "Yes", "Description": "Security deposit amount in KSH", "Example": "100000" },
      { "Field": "Water Rate Per Unit", "Required": "No", "Description": "Water rate per unit (defaults to 15.50)", "Example": "15.50" },
      { "Field": "Opening Balance", "Required": "No", "Description": "Opening balance amount (positive for credit, negative for arrears)", "Example": "-5000" },
      { "Field": "Balance Type", "Required": "No", "Description": "Either 'arrears' for debt or 'credit' for advance payment", "Example": "arrears" },
      { "Field": "Notes", "Required": "No", "Description": "Additional notes about the tenant or lease", "Example": "2 months arrears from previous property" }
    ]

    const instructionsSheet = workbook.addWorksheet("Instructions")
    instructionsSheet.columns = [
      { header: "Field", key: "Field", width: 20 },
      { header: "Required", key: "Required", width: 10 },
      { header: "Description", key: "Description", width: 40 },
      { header: "Example", key: "Example", width: 25 },
    ]
    instructionsSheet.addRows(instructionsData)

    const filename = `tenant_bulk_upload_template_${selectedPropertyData?.name || 'template'}.xlsx`
    await downloadWorkbook(workbook, filename)

    toast({
      title: "Template Downloaded",
      description: `Template downloaded as ${filename}. Fill in your tenant data following the instructions.`,
    })
  }

  // File selection handler
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
    
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

    setSelectedFile(file)
    setUploadResults(null)
  }

  // Main upload processing function
  const processUpload = async () => {
    if (!selectedFile || !selectedProperty) {
      toast({
        title: "Missing Requirements",
        description: "Please select both a property and an Excel file.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress({ total: 0, processed: 0, successful: 0, failed: 0 })
    
    try {
      const isCsv = selectedFile.type === "text/csv" || selectedFile.name.toLowerCase().endsWith(".csv")
      const jsonData = isCsv
        ? parseCsvToJson(await selectedFile.text())
        : await parseExcelToJson(selectedFile)

      if (jsonData.length === 0) {
        throw new Error("The uploaded file contains no data.")
      }

      setUploadProgress({ total: jsonData.length, processed: 0, successful: 0, failed: 0 })

      const results: UploadResult = {
        successful: [],
        failed: [],
        duplicates: [],
        invalidUnits: []
      }

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any
        const rowNumber = i + 2

        setUploadProgress(prev => ({
          ...prev!,
          processed: i + 1,
          current: row['Full Name'] || `Row ${rowNumber}`
        }))

        try {
          // Validate required fields
          const requiredFields = ['Full Name', 'Email', 'Phone', 'ID Number', 'Unit Number', 'Lease Start Date', 'Lease End Date', 'Monthly Rent', 'Deposit Amount']
          const missingFields = requiredFields.filter(field => !row[field]?.toString().trim())
          
          if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
          }

          // Validate unit exists in selected property
          const unitNumber = row['Unit Number'].toString().trim()
          const unit = propertyUnits.find((u: any) => u.unitNumber === unitNumber)
          
          if (!unit) {
            results.invalidUnits.push({ row: rowNumber, unitNumber, tenant: row['Full Name'] })
            setUploadProgress(prev => ({
              ...prev!,
              failed: prev!.failed + 1
            }))
            continue
          }

          // Prepare tenant data
          const tenantData = {
            fullName: row['Full Name'].toString().trim(),
            email: row['Email'].toString().trim().toLowerCase(),
            phone: row['Phone'].toString().trim(),
            idNumber: row['ID Number'].toString().trim(),
            emergencyContact: row['Emergency Contact']?.toString().trim() || '',
            emergencyPhone: row['Emergency Phone']?.toString().trim() || ''
          }

          // Validate email format
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantData.email)) {
            throw new Error('Invalid email format')
          }

          // Create tenant
          const tenantResponse = await apiRequest("POST", "/api/tenants", tenantData)
          const tenant = await tenantResponse.json()

          // Helper function to convert Excel date to ISO string
          const formatDate = (dateValue: any): string => {
            if (!dateValue) return ''
            
            // If it's already a Date object
            if (dateValue instanceof Date) {
              return dateValue.toISOString().split('T')[0]
            }
            
            // If it's a string in YYYY-MM-DD format
            if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
              return dateValue
            }
            
            // If it's a string that can be parsed as a date
            if (typeof dateValue === 'string') {
              const parsed = new Date(dateValue)
              if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0]
              }
            }
            
            // If it's an Excel serial number (numeric)
            if (typeof dateValue === 'number') {
              // Excel date serial number: days since 1900-01-01 (with leap year bug)
              const excelDate = new Date((dateValue - 25569) * 86400 * 1000)
              return excelDate.toISOString().split('T')[0]
            }
            
            return dateValue.toString()
          }

          // Prepare lease data with proper date formatting
          const leaseData = {
            unitId: unit.id,
            tenantId: tenant.id,
            startDate: formatDate(row['Lease Start Date']),
            endDate: formatDate(row['Lease End Date']),
            rentAmount: row['Monthly Rent'].toString(),
            depositAmount: row['Deposit Amount'].toString(),
            waterRatePerUnit: row['Water Rate Per Unit']?.toString() || '15.50',
            status: 'active'
          }

          // Create lease
          await apiRequest("POST", "/api/leases", leaseData)

          // Handle opening balance if provided
          const openingBalance = row['Opening Balance']
          const balanceType = row['Balance Type']?.toString().toLowerCase()
          const notes = row['Notes']?.toString() || ''

          if (openingBalance && (balanceType === 'arrears' || balanceType === 'credit')) {
            // Create an invoice or payment record based on balance type
            const balanceAmount = Math.abs(parseFloat(openingBalance.toString()))
            
            if (balanceType === 'arrears' && balanceAmount > 0) {
              // Create arrears invoice
              const invoiceData = {
                tenantId: tenant.id,
                propertyId: selectedProperty,
                unitId: unit.id,
                dueDate: formatDate(row['Lease Start Date']),
                totalAmount: balanceAmount.toString(),
                status: 'overdue',
                description: `Opening arrears balance - ${notes}`.trim(),
                invoiceNumber: `ARR-${Date.now()}-${tenant.id.slice(-4)}`
              }
              await apiRequest("POST", "/api/invoices", invoiceData)
            } else if (balanceType === 'credit' && balanceAmount > 0) {
              // Create advance payment record
              const paymentData = {
                tenantId: tenant.id,
                propertyId: selectedProperty,
                amount: balanceAmount.toString(),
                paymentDate: formatDate(row['Lease Start Date']),
                paymentMethod: 'Bank Transfer',
                description: `Opening credit balance - ${notes}`.trim(),
                receiptNumber: `CR-${Date.now()}-${tenant.id.slice(-4)}`
              }
              await apiRequest("POST", "/api/payments", paymentData)
            }
          }

          results.successful.push({
            row: rowNumber,
            tenant: tenantData.fullName,
            unit: unitNumber,
            rent: leaseData.rentAmount,
            balance: openingBalance || 0,
            balanceType: balanceType || 'none'
          })

          setUploadProgress(prev => ({
            ...prev!,
            successful: prev!.successful + 1
          }))

        } catch (error: any) {
          results.failed.push({
            row: rowNumber,
            tenant: row['Full Name'] || 'Unknown',
            error: error.message
          })
          
          setUploadProgress(prev => ({
            ...prev!,
            failed: prev!.failed + 1
          }))
        }

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] })
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] })
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] })

      setUploadResults(results)

      // Show summary toast
      if (results.successful.length > 0 && results.failed.length === 0) {
        toast({
          title: "Upload Successful",
          description: `Successfully processed ${results.successful.length} tenants with leases and balances.`,
        })
        
        // Redirect to tenants after 3 seconds
        setTimeout(() => {
          setLocation('/tenants')
        }, 3000)
      } else if (results.successful.length > 0) {
        toast({
          title: "Partial Upload",
          description: `${results.successful.length} successful, ${results.failed.length} failed. Check results below.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Upload Failed",
          description: "No tenants were processed successfully. Check the file format and data.",
          variant: "destructive",
        })
      }

    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to process the uploaded file.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation('/tenants')}
          data-testid="button-back-to-tenants"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="upload-data-title">
            <Upload className="h-8 w-8" />
            Bulk Data Upload
          </h1>
          <p className="text-muted-foreground">Upload tenant data with lease agreements and opening balances</p>
        </div>
      </div>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Important Instructions</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Select the property where tenants will be assigned</li>
            <li>Download the template and fill in tenant information</li>
            <li>Ensure all unit numbers exist in the selected property</li>
            <li>Include opening balances for tenants with arrears or credits</li>
            <li>Upload the completed file to automatically create tenants, leases, and balances</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Step 1: Property Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Step 1: Select Property
          </CardTitle>
          <CardDescription>
            Choose the property where the tenants will be assigned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="property-select">Property</Label>
              <Select 
                value={selectedProperty} 
                onValueChange={setSelectedProperty}
                disabled={propertiesLoading}
              >
                <SelectTrigger className="w-full" data-testid="select-property">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property: any) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name} - {property.address} ({property.totalUnits} units)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedProperty && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Selected Property Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span> {selectedPropertyData?.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address:</span> {selectedPropertyData?.address}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Units:</span> {selectedPropertyData?.totalUnits}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Available Units:</span> {propertyUnits.filter((u: any) => u.status === 'vacant').length}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Step 2: Download Template
          </CardTitle>
          <CardDescription>
            Download the Excel template and fill in your tenant data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Template Requirements</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="space-y-2">
                  <p><strong>Required Fields:</strong> Full Name, Email, Phone, ID Number, Unit Number, Lease Start Date, Lease End Date, Monthly Rent, Deposit Amount</p>
                  <p><strong>Balance Types:</strong> Use "arrears" for outstanding debt or "credit" for advance payments</p>
                  <p><strong>Unit Numbers:</strong> Must match existing units in the selected property</p>
                  <p><strong>Date Format:</strong> Use YYYY-MM-DD format (e.g., 2024-01-01)</p>
                </div>
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={downloadTemplate}
              disabled={!selectedProperty}
              data-testid="button-download-template"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel Template
            </Button>
            
            {!selectedProperty && (
              <p className="text-sm text-muted-foreground text-center">
                Select a property first to download the template
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 3: File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Step 3: Upload Completed File
          </CardTitle>
          <CardDescription>
            Upload your completed Excel file to create tenants and leases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Excel File</Label>
              <Input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileSelection}
                disabled={!selectedProperty || isUploading}
                ref={fileInputRef}
                data-testid="input-upload-file"
                className="cursor-pointer"
              />
            </div>

            {selectedFile && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Selected File</h4>
                <div className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Name:</span> {selectedFile.name}</div>
                  <div><span className="text-muted-foreground">Size:</span> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  <div><span className="text-muted-foreground">Type:</span> {selectedFile.type}</div>
                </div>
              </div>
            )}

            <Button
              onClick={processUpload}
              disabled={!selectedProperty || !selectedFile || isUploading}
              className="w-full"
              data-testid="button-process-upload"
            >
              {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isUploading ? "Processing Upload..." : "Process Upload"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Upload Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress 
                value={(uploadProgress.processed / uploadProgress.total) * 100} 
                className="w-full"
              />
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{uploadProgress.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{uploadProgress.processed}</div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{uploadProgress.successful}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{uploadProgress.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
              {uploadProgress.current && (
                <p className="text-center text-sm text-muted-foreground">
                  Currently processing: {uploadProgress.current}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Results */}
      {uploadResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{uploadResults.successful.length}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{uploadResults.failed.length}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{uploadResults.invalidUnits.length}</div>
                  <div className="text-sm text-muted-foreground">Invalid Units</div>
                </div>
              </div>

              {uploadResults.successful.length > 0 && (
                <div>
                  <Button 
                    onClick={() => setLocation('/tenants')}
                    className="w-full"
                    data-testid="button-view-tenants"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Created Tenants
                  </Button>
                </div>
              )}

              {/* Successful Records */}
              {uploadResults.successful.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-600 mb-2">✓ Successfully Created ({uploadResults.successful.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {uploadResults.successful.map((item: any, index: number) => (
                      <div key={index} className="text-sm p-2 bg-green-50 rounded">
                        <strong>Row {item.row}:</strong> {item.tenant} → Unit {item.unit} 
                        (Rent: KSh {parseFloat(item.rent).toLocaleString()})
                        {item.balance !== 0 && (
                          <span className="ml-2 text-xs">
                            [{item.balanceType}: KSh {Math.abs(item.balance).toLocaleString()}]
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Records */}
              {uploadResults.failed.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-2">✗ Failed Records ({uploadResults.failed.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {uploadResults.failed.map((item: any, index: number) => (
                      <div key={index} className="text-sm p-2 bg-red-50 rounded">
                        <strong>Row {item.row}:</strong> {item.tenant} - {item.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invalid Units */}
              {uploadResults.invalidUnits.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-600 mb-2">⚠ Invalid Unit Numbers ({uploadResults.invalidUnits.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {uploadResults.invalidUnits.map((item: any, index: number) => (
                      <div key={index} className="text-sm p-2 bg-orange-50 rounded">
                        <strong>Row {item.row}:</strong> {item.tenant} - Unit "{item.unitNumber}" does not exist in selected property
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}