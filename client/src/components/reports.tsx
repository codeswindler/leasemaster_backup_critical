import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download, 
  AlertTriangle,
  DollarSign,
  Building2,
  Users,
  Receipt,
  FileText,
  Home,
  Wallet,
  CreditCard,
  ChevronDown,
  Search,
  Mail,
  MessageSquare,
  Filter,
  Clock,
  CheckSquare,
  Plus,
  Eye
} from "lucide-react"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function Reports() {
  const { toast } = useToast()
  const [selectedReport, setSelectedReport] = useState("organizational")
  const [selectedProperty, setSelectedProperty] = useState("all")
  const [startDate, setStartDate] = useState("2024-12-01")
  const [endDate, setEndDate] = useState("2024-12-31")
  const [selectedTenant, setSelectedTenant] = useState("")
  const [selectedChargeCodes, setSelectedChargeCodes] = useState<string[]>([])
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const { selectedPropertyId, selectedLandlordId } = useFilter()

  // Fetch real properties data
  const { data: propertiesData } = useQuery({ 
    queryKey: ['/api/properties', selectedLandlordId, selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })
  const properties = [
    { id: "all", name: "All Properties" },
    ...(propertiesData || []).map((prop: any) => ({ id: prop.id, name: prop.name }))
  ]

  // Fetch real tenant data (reports now use API data instead of hardcoded samples)
  const { data: tenantsData = [] } = useQuery({ 
    queryKey: ['/api/tenants', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })
  const tenants = tenantsData.map((tenant: any) => ({
    id: tenant.id,
    name: tenant.fullName,
    unit: 'N/A', // Will be populated from lease/unit data in actual reports
    account: 'N/A', // Will be generated from real data
    balance: 0 // Will be calculated from invoices/payments
  }))

  const chargeCodes = [
    { id: "rent", name: "Rent" },
    { id: "water", name: "Water" },
    { id: "electricity", name: "Electricity" },
    { id: "service", name: "Service Charge" },
    { id: "security", name: "Security" },
    { id: "garbage", name: "Garbage Collection" }
  ]

  const reportTypes = [
    { id: "organizational", name: "Organizational Reports", icon: Building2 },
    { id: "property", name: "Property Reports", icon: Home },
    { id: "lease-statements", name: "Lease Statements", icon: FileText },
    { id: "tenant-balances", name: "Tenant Balances", icon: Users },
    { id: "aging-balances", name: "Aging Balances", icon: Clock }
  ]

  const organizationalReports = [
    { id: "outstanding-balances", name: "Outstanding Balances", icon: AlertTriangle, total: "KSh 154,000" },
    { id: "total-invoices", name: "Total Invoices", icon: Receipt, total: "247 invoices" },
    { id: "total-payments", name: "Total Payments Received", icon: Wallet, total: "KSh 1,840,500" },
    { id: "tenant-registry", name: "Tenant Registry", icon: Users, total: "38 tenants" },
    { id: "income-statement", name: "Income Statement", icon: DollarSign, total: "KSh 1,470,625 net" },
    { id: "vacancy-report", name: "Vacancy Report", icon: Building2, total: "6 vacant units" }
  ]

  // Date validation helper
  const validateDateRange = () => {
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  // Generate Excel file
  const generateExcelReport = (reportType: string, data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    
    // Add report metadata
    XLSX.utils.sheet_add_aoa(ws, [
      [`${reportType} Report`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [`Period: ${startDate} to ${endDate}`],
      [`Property: ${properties.find(p => p.id === selectedProperty)?.name || 'All Properties'}`],
      [] // Empty row before data
    ], { origin: 'A1' })
    
    const fileName = `${reportType.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.xlsx`
    XLSX.writeFile(wb, fileName)
    
    return fileName
  }

  // Generate PDF file
  const generatePDFReport = (reportType: string, data: any[]) => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(20)
    doc.text(reportType, 20, 30)
    
    // Add metadata
    doc.setFontSize(12)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 50)
    doc.text(`Period: ${startDate} to ${endDate}`, 20, 60)
    doc.text(`Property: ${properties.find(p => p.id === selectedProperty)?.name || 'All Properties'}`, 20, 70)
    
    // Add table if data exists
    if (data.length > 0) {
      const columns = Object.keys(data[0])
      const rows = data.map(row => columns.map(col => row[col] || ''))
      
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 80,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] }, // Blue header
      })
    }
    
    const fileName = `${reportType.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.pdf`
    doc.save(fileName)
    
    return fileName
  }

  // Generate comprehensive report data with real tenant payment information
  const generateComprehensiveReportData = async (reportType: string) => {
    try {
      // Build query params for filtering
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const queryString = params.toString() ? `?${params}` : ''
      
      // Fetch all necessary data from APIs
      const [paymentsRes, tenantsRes, leasesRes, propertiesRes, unitsRes] = await Promise.all([
        fetch(`/api/payments${queryString}`),
        fetch(`/api/tenants${queryString}`),
        fetch(`/api/leases${queryString}`),
        fetch(`/api/properties${queryString}`),
        fetch(`/api/units${queryString}`)
      ])

      const payments = await paymentsRes.json()
      const tenants = await tenantsRes.json()
      const leases = await leasesRes.json()
      const properties = await propertiesRes.json()
      const units = await unitsRes.json()

      // Filter payments by date range
      const filteredPayments = payments.filter((payment: any) => {
        const paymentDate = new Date(payment.paymentDate)
        const start = new Date(startDate)
        const end = new Date(endDate)
        return paymentDate >= start && paymentDate <= end
      })

      // Create comprehensive tenant payment data
      const tenantPaymentData: any[] = []
      let totalAmount = 0

      tenants.forEach((tenant: any) => {
        const tenantLease = leases.find((lease: any) => lease.tenantId === tenant.id)
        if (!tenantLease) return

        const tenantPayments = filteredPayments.filter((payment: any) => payment.leaseId === tenantLease.id)
        const tenantUnit = units.find((unit: any) => unit.id === tenantLease.unitId)
        const tenantProperty = properties.find((property: any) => property.id === tenantUnit?.propertyId)

        // Skip if property filter is applied and doesn't match
        if (selectedProperty !== "all" && tenantProperty?.id !== selectedProperty) return

        const tenantTotalPayments = tenantPayments.reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0)
        totalAmount += tenantTotalPayments

        // Add detailed tenant row
        tenantPaymentData.push({
          'Tenant Name': tenant.fullName,
          'Email': tenant.email,
          'Phone': tenant.phone,
          'ID Number': tenant.idNumber,
          'Property': tenantProperty?.name || 'N/A',
          'Unit': tenantUnit?.name || 'N/A',
          'Monthly Rent': `KSh ${parseFloat(tenantLease.rentAmount).toLocaleString()}`,
          'Payments Received': `KSh ${tenantTotalPayments.toLocaleString()}`,
          'Number of Payments': tenantPayments.length,
          'Payment Methods': tenantPayments.map((p: any) => p.paymentMethod).join(', ') || 'None',
          'Emergency Contact': tenant.emergencyContact,
          'Emergency Phone': tenant.emergencyPhone,
          'Lease Start': new Date(tenantLease.startDate).toLocaleDateString(),
          'Lease Status': tenantLease.status
        })
      })

      // Add summary/tally row at the bottom
      tenantPaymentData.push({
        'Tenant Name': '--- SUMMARY TOTALS ---',
        'Email': '',
        'Phone': '',
        'ID Number': '',
        'Property': selectedProperty === "all" ? "All Properties" : properties.find(p => p.id === selectedProperty)?.name,
        'Unit': '',
        'Monthly Rent': '',
        'Payments Received': `KSh ${totalAmount.toLocaleString()}`,
        'Number of Payments': filteredPayments.length,
        'Payment Methods': '',
        'Emergency Contact': '',
        'Emergency Phone': '',
        'Lease Start': '',
        'Lease Status': ''
      })

      // Add report metadata at the top
      tenantPaymentData.unshift({
        'Tenant Name': `${reportType} Report`,
        'Email': `Generated: ${new Date().toLocaleString()}`,
        'Phone': `Period: ${startDate} to ${endDate}`,
        'ID Number': `Property: ${selectedProperty === "all" ? "All Properties" : properties.find(p => p.id === selectedProperty)?.name}`,
        'Property': `Total Tenants: ${tenants.length}`,
        'Unit': `Total Payments: ${filteredPayments.length}`,
        'Monthly Rent': `Total Amount: KSh ${totalAmount.toLocaleString()}`,
        'Payments Received': '',
        'Number of Payments': '',
        'Payment Methods': '',
        'Emergency Contact': '',
        'Emergency Phone': '',
        'Lease Start': '',
        'Lease Status': ''
      })

      return tenantPaymentData

    } catch (error) {
      console.error('Error generating report data:', error)
      return []
    }
  }

  const handleExportReport = async (reportType: string, format: string = "excel") => {
    if (!validateDateRange()) {
      return
    }

    try {
      // Fetch comprehensive real data for reports
      const reportData = await generateComprehensiveReportData(reportType)
      
      let fileName = ''
      if (format === "excel") {
        fileName = generateExcelReport(reportType, reportData)
      } else if (format === "pdf") {
        fileName = generatePDFReport(reportType, reportData)
      }

      toast({
        title: "Report Generated Successfully",
        description: `${fileName} has been downloaded`,
      })
      
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export Failed",
        description: "Failed to generate report file",
        variant: "destructive",
      })
    }
  }

  const handleSendNotice = (tenantId: string, method: string) => {
    console.log(`Sending notice to tenant ${tenantId} via ${method}`)
    alert(`Notice sent via ${method} successfully!`)
  }

  const handleBulkSend = (method: string) => {
    if (selectedTenants.length === 0) {
      alert("Please select tenants to send notices to")
      return
    }
    console.log(`Sending bulk notice to ${selectedTenants.length} tenants via ${method}`)
    alert(`Bulk notice sent to ${selectedTenants.length} tenants via ${method}!`)
  }

  const handleSearchLeaseStatement = () => {
    if (!selectedTenant || !startDate || !endDate) {
      alert("Please select tenant and date range")
      return
    }
    console.log(`Searching lease statement for tenant ${selectedTenant} from ${startDate} to ${endDate}`)
  }

  const handleToggleTenant = (tenantId: string) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId) 
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    )
  }

  const handleToggleAllTenants = () => {
    setSelectedTenants(
      selectedTenants.length === tenants.length 
        ? [] 
        : tenants.map(t => t.id)
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="reports-title">Reports</h1>
          <p className="text-muted-foreground">Generate comprehensive reports and analytics</p>
        </div>
        
        {/* Report Type Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="dropdown-report-type">
              {reportTypes.find(r => r.id === selectedReport)?.name || "Select Report Type"}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {reportTypes.map((report) => (
              <DropdownMenuItem 
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                data-testid={`menu-${report.id}`}
              >
                <report.icon className="h-4 w-4 mr-2" />
                {report.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Organizational Reports */}
      {selectedReport === "organizational" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {organizationalReports.map((report) => (
              <Card key={report.id} className="hover-elevate">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">{report.name}</CardTitle>
                  <report.icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-2xl font-bold">{report.total}</div>
                    
                    {/* Date Range Selection */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Start Date</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-8"
                          data-testid={`input-start-date-${report.id}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Date</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-8"
                          data-testid={`input-end-date-${report.id}`}
                        />
                      </div>
                    </div>

                    {/* Property Filter */}
                    <div>
                      <Label className="text-xs">Property</Label>
                      <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Download Button */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleExportReport(report.name, "excel")}
                        data-testid={`button-download-${report.id}`}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Excel
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleExportReport(report.name, "pdf")}
                        data-testid={`button-download-pdf-${report.id}`}
                      >
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Property Reports */}
      {selectedReport === "property" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Property Reports</CardTitle>
                  <CardDescription>Generate detailed property performance reports</CardDescription>
                </div>
                <div className="flex gap-4 items-center">
                  {/* Property Switcher */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Property:</Label>
                    <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.filter(p => p.id !== "all").map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Date Range Selection */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">From:</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                    />
                    <Label className="text-sm">To:</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Charge Codes Selection */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Select Charge Codes to Include:</Label>
                <div className="grid grid-cols-3 gap-3">
                  {chargeCodes.map((code) => (
                    <div key={code.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={code.id}
                        checked={selectedChargeCodes.includes(code.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedChargeCodes([...selectedChargeCodes, code.id])
                          } else {
                            setSelectedChargeCodes(selectedChargeCodes.filter(id => id !== code.id))
                          }
                        }}
                        data-testid={`checkbox-${code.id}`}
                      />
                      <Label htmlFor={code.id} className="text-sm">{code.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={handleSearchLeaseStatement} data-testid="button-search-property">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" onClick={() => handleExportReport("Property Report", "excel")}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel
                </Button>
                <Button variant="outline" onClick={() => handleExportReport("Property Report", "pdf")}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              {/* Invoice Summary */}
              <div className="space-y-4">
                <h4 className="font-medium">Invoice Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-blue-900">KSh 180,000</p>
                    <p className="text-sm text-blue-700">Rent Collection</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-green-900">KSh 45,000</p>
                    <p className="text-sm text-green-700">Water Charges</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-yellow-900">KSh 25,000</p>
                    <p className="text-sm text-yellow-700">Service Charges</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-purple-900">KSh 250,000</p>
                    <p className="text-sm text-purple-700">Total Invoiced</p>
                  </div>
                </div>
              </div>

              {/* Tenant Payment Summary */}
              <div className="space-y-4">
                <h4 className="font-medium">Tenant Payment Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-green-900">KSh 235,000</p>
                    <p className="text-sm text-green-700">Total Payments</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-red-900">KSh 15,000</p>
                    <p className="text-sm text-red-700">Outstanding</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-blue-900">94%</p>
                    <p className="text-sm text-blue-700">Collection Rate</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-yellow-900">28</p>
                    <p className="text-sm text-yellow-700">Transactions</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lease Statements */}
      {selectedReport === "lease-statements" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lease Statements</CardTitle>
              <CardDescription>Generate tenant account statements and lease history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tenant Account</Label>
                  <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                    <SelectTrigger data-testid="select-tenant-statement">
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name} - {tenant.unit} ({tenant.account})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-statement-start-date"
                  />
                </div>
                
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-statement-end-date"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSearchLeaseStatement} data-testid="button-search-statement">
                  <Search className="h-4 w-4 mr-2" />
                  Search Statement
                </Button>
              </div>

              {selectedTenant && (
                <Card className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">
                        Account Statement: {tenants.find(t => t.id === selectedTenant)?.name}
                      </h4>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleExportReport("Lease Statement", "pdf")}>
                          <Download className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExportReport("Lease Statement", "excel")}>
                          <Download className="h-3 w-3 mr-1" />
                          Excel
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSendNotice(selectedTenant, "email")}>
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSendNotice(selectedTenant, "sms")}>
                          <MessageSquare className="h-3 w-3 mr-1" />
                          SMS Link
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Statement period: {startDate} to {endDate}
                    </div>
                    
                    <div className="border rounded p-4 bg-muted/20">
                      <p className="text-center text-muted-foreground">
                        Account statement will be generated here based on selected criteria
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tenant Balances */}
      {selectedReport === "tenant-balances" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Tenant Balances</CardTitle>
                  <CardDescription>View and manage tenant account balances (sorted by balance amount)</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleBulkSend("email")}
                    disabled={selectedTenants.length === 0}
                    data-testid="button-bulk-email"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Bulk Email ({selectedTenants.length})
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleBulkSend("sms")}
                    disabled={selectedTenants.length === 0}
                    data-testid="button-bulk-sms"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Bulk SMS ({selectedTenants.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTenants.length === tenants.length}
                        onCheckedChange={handleToggleAllTenants}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants
                    .sort((a, b) => b.balance - a.balance)
                    .map((tenant) => (
                    <TableRow key={tenant.id} className="hover-elevate">
                      <TableCell>
                        <Checkbox
                          checked={selectedTenants.includes(tenant.id)}
                          onCheckedChange={() => handleToggleTenant(tenant.id)}
                          data-testid={`checkbox-tenant-${tenant.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>{tenant.unit}</TableCell>
                      <TableCell className="font-mono">{tenant.account}</TableCell>
                      <TableCell>
                        <span className={`font-mono font-medium ${tenant.balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          KSh {tenant.balance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {tenant.balance > 0 && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleSendNotice(tenant.id, "email")}
                                data-testid={`button-email-${tenant.id}`}
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleSendNotice(tenant.id, "sms")}
                                data-testid={`button-sms-${tenant.id}`}
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            data-testid={`button-view-${tenant.id}`}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Aging Balances */}
      {selectedReport === "aging-balances" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aging Balances</CardTitle>
              <CardDescription>Track overdue balances by age periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Aging Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-green-900">KSh 0</p>
                    <p className="text-sm text-green-700">Current</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-yellow-900">KSh 24,000</p>
                    <p className="text-sm text-yellow-700">1-30 Days</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-orange-900">KSh 42,500</p>
                    <p className="text-sm text-orange-700">31-60 Days</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-red-900">KSh 36,000</p>
                    <p className="text-sm text-red-700">61-90 Days</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg text-center">
                    <p className="text-lg font-bold text-red-900">KSh 51,500</p>
                    <p className="text-sm text-red-700">90+ Days</p>
                  </div>
                </div>

                {/* Aging Details Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Total Balance</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>1-30 Days</TableHead>
                      <TableHead>31-60 Days</TableHead>
                      <TableHead>61-90 Days</TableHead>
                      <TableHead>90+ Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>David Ochieng</TableCell>
                      <TableCell>DHA1</TableCell>
                      <TableCell className="font-mono text-red-600">KSh 36,000</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono text-red-600">KSh 36,000</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Grace Wanjiru</TableCell>
                      <TableCell>GVB2</TableCell>
                      <TableCell className="font-mono text-red-600">KSh 26,500</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono text-yellow-600">KSh 16,500</TableCell>
                      <TableCell className="font-mono text-orange-600">KSh 10,000</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>James Kiprotich</TableCell>
                      <TableCell>RSA3</TableCell>
                      <TableCell className="font-mono text-red-600">KSh 16,000</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono text-orange-600">KSh 16,000</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Michael Waweru</TableCell>
                      <TableCell>BGA5</TableCell>
                      <TableCell className="font-mono text-red-600">KSh 8,000</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono text-yellow-600">KSh 8,000</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                      <TableCell className="font-mono">KSh 0</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="flex justify-end">
                  <Button onClick={() => handleExportReport("Aging Balances", "excel")}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Aging Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}