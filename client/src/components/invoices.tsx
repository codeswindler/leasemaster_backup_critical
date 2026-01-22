import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { 
  Eye, 
  Edit, 
  Send, 
  Check, 
  X, 
  Filter,
  Search,
  Mail,
  Smartphone,
  FileText,
  Download,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useFilter } from "@/contexts/FilterContext"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function Invoices() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const { toast } = useToast()
  const { selectedPropertyId, selectedLandlordId } = useFilter()

  // Edit invoice mutation
  const editInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: string, data: any }) => {
      return await apiRequest('PUT', `/api/invoices/${invoiceId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-items'] })
      toast({
        title: "Invoice Updated",
        description: "Invoice has been successfully updated.",
      })
      setEditDialogOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update invoice. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return await apiRequest('POST', `/api/invoices/${invoiceId}/send-email`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      toast({
        title: "Email Sent",
        description: `Invoice ${selectedInvoice?.id} has been sent via email.`,
      })
      setSendDialogOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Send Failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Send SMS mutation
  const sendSMSMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return await apiRequest('POST', `/api/invoices/${invoiceId}/send-sms`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      toast({
        title: "SMS Sent",
        description: `Invoice ${selectedInvoice?.id} notification has been sent via SMS.`,
      })
      setSendDialogOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Send Failed",
        description: "Failed to send SMS. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Fetch all required data with complete status tracking
  const invoicesQuery = useQuery({ 
    queryKey: ['/api/invoices', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoices${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })
  const invoiceItemsQuery = useQuery({ queryKey: ['/api/invoice-items'] })
  const tenantsQuery = useQuery({ 
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
  const unitsQuery = useQuery({ 
    queryKey: ['/api/units', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })
  const propertiesQuery = useQuery({ 
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
  const leasesQuery = useQuery({ 
    queryKey: ['/api/leases', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Extract data with fallbacks
  const invoicesData = invoicesQuery.data || []
  const invoiceItemsData = invoiceItemsQuery.data || []
  const tenantsData = tenantsQuery.data || []
  const unitsData = unitsQuery.data || []
  const propertiesData = propertiesQuery.data || []
  const leasesData = leasesQuery.data || []

  // Check for complete success - all queries must have succeeded
  const allQueriesSuccessful = [
    invoicesQuery.status === 'success',
    invoiceItemsQuery.status === 'success',
    tenantsQuery.status === 'success', 
    unitsQuery.status === 'success',
    propertiesQuery.status === 'success',
    leasesQuery.status === 'success'
  ].every(Boolean)

  // Check for any loading or pending states
  const isLoadingAny = [
    invoicesQuery.isLoading,
    invoiceItemsQuery.isLoading,
    tenantsQuery.isLoading,
    unitsQuery.isLoading, 
    propertiesQuery.isLoading,
    leasesQuery.isLoading
  ].some(Boolean)

  // Check for any errors
  const hasAnyError = [
    invoicesQuery.error,
    invoiceItemsQuery.error,
    tenantsQuery.error,
    unitsQuery.error,
    propertiesQuery.error,
    leasesQuery.error
  ].some(Boolean)

  // Show error state FIRST if ANY data failed to load
  if (hasAnyError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="invoices-title">Invoices</h1>
            <p className="text-muted-foreground">Error loading invoice data</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <div className="text-destructive">Failed to load invoice data</div>
              <div className="text-sm">
                {invoicesQuery.error && "• Invoices data failed"}
                {invoiceItemsQuery.error && "• Invoice items data failed"}
                {tenantsQuery.error && "• Tenants data failed"}
                {unitsQuery.error && "• Units data failed"}
                {propertiesQuery.error && "• Properties data failed"}
                {leasesQuery.error && "• Leases data failed"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state while ANY data is loading OR not all queries successful
  if (isLoadingAny || !allQueriesSuccessful) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="invoices-title">Invoices</h1>
            <p className="text-muted-foreground">Loading invoice data and related information...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <div>Loading invoices data...</div>
              <div className="text-sm text-muted-foreground">
                {invoicesQuery.isLoading && "• Loading invoices..."}
                {invoiceItemsQuery.isLoading && "• Loading invoice items..."}
                {tenantsQuery.isLoading && "• Loading tenants..."}
                {unitsQuery.isLoading && "• Loading units..."}
                {propertiesQuery.isLoading && "• Loading properties..."}
                {leasesQuery.isLoading && "• Loading leases..."}
                {!isLoadingAny && !allQueriesSuccessful && "• Waiting for all data to be ready..."}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Enrich invoices with related data (only after all data is loaded)
  const enrichedInvoices = Array.isArray(invoicesData) ? invoicesData.map((invoice: any) => {
    const lease = leasesData.find((l: any) => l.id === invoice.leaseId)
    const tenant = lease && lease.tenantId ? tenantsData.find((t: any) => t.id === lease.tenantId) : null
    const unit = lease && lease.unitId ? unitsData.find((u: any) => u.id === lease.unitId) : null
    const property = unit && unit.propertyId ? propertiesData.find((p: any) => p.id === unit.propertyId) : null
    const charges = invoiceItemsData.filter((item: any) => item.invoiceId === invoice.id)

    return {
      ...invoice,
      tenant: tenant?.fullName || 'Direct Billing',
      unit: unit?.unitNumber || 'N/A',
      property: property?.name || 'N/A',
      tenantData: tenant,
      unitData: unit,
      propertyData: property,
      leaseData: lease,
      charges: charges.map((charge: any) => ({
        name: charge.description,
        amount: parseFloat(charge.amount)
      }))
    }
  }) : []

  const filteredInvoices = enrichedInvoices.filter((invoice: any) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm || (
      (invoice.id || '').toLowerCase().includes(searchLower) ||
      (invoice.tenant || '').toLowerCase().includes(searchLower) ||
      (invoice.unit || '').toLowerCase().includes(searchLower) ||
      (invoice.property || '').toLowerCase().includes(searchLower)
    )
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Action handlers
  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setViewDialogOpen(true)
  }

  const handleEditInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setEditDialogOpen(true)
  }

  const handleSendInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setSendDialogOpen(true)
  }

  const handleDownloadInvoice = (invoice: any) => {
    try {
      const doc = new jsPDF()
      
      // Header
      doc.setFontSize(20)
      doc.text('INVOICE', 20, 30)
      
      // Invoice details
      doc.setFontSize(12)
      doc.text(`Invoice ID: ${invoice.id}`, 20, 50)
      doc.text(`Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}`, 20, 60)
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 20, 70)
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, 80)
      
      // Tenant information
      doc.text('BILL TO:', 20, 100)
      doc.text(`${invoice.tenant}`, 20, 110)
      if (invoice.tenantData?.email) doc.text(`${invoice.tenantData.email}`, 20, 120)
      if (invoice.tenantData?.phone) doc.text(`${invoice.tenantData.phone}`, 20, 130)
      
      // Property information
      doc.text('PROPERTY:', 120, 100)
      doc.text(`${invoice.property}`, 120, 110)
      doc.text(`Unit: ${invoice.unit}`, 120, 120)
      
      // Charges table
      const tableData = invoice.charges.map((charge: any) => [
        charge.name,
        `KSh ${charge.amount.toLocaleString()}`
      ])
      
      autoTable(doc, {
        head: [['Description', 'Amount']],
        body: tableData,
        startY: 150,
        theme: 'striped'
      })
      
      // Total
      const finalY = (doc as any).lastAutoTable?.finalY || 200
      doc.setFontSize(14)
      doc.text(`TOTAL: KSh ${invoice.amount.toLocaleString()}`, 20, finalY + 20)
      
      // Save the PDF
      doc.save(`invoice-${invoice.id}.pdf`)
      
      toast({
        title: "Invoice Downloaded",
        description: `Invoice ${invoice.id} has been downloaded as PDF.`,
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSendEmail = async (invoice: any) => {
    sendEmailMutation.mutate(invoice.id)
  }

  const handleSendSMS = async (invoice: any) => {
    sendSMSMutation.mutate(invoice.id)
  }

  const handleEditSubmit = (invoice: any) => {
    
    // Get form element
    const form = document.getElementById('edit-invoice-form') as HTMLFormElement
    if (!form) {
      console.error('🔧 Frontend: Form not found!')
      return
    }
    
    // Extract data using form elements directly (works better with React components)
    const descriptionElement = form.querySelector('[name="description"]') as HTMLTextAreaElement
    const amountElement = form.querySelector('[name="amount"]') as HTMLInputElement
    const dueDateElement = form.querySelector('[name="dueDate"]') as HTMLInputElement
    const statusElement = form.querySelector('[name="status"]') as HTMLSelectElement
    
    
    const updatedData = {
      description: descriptionElement?.value || invoice.description,
      amount: String(amountElement?.value || invoice.amount),
      dueDate: dueDateElement?.value || invoice.dueDate,
      status: statusElement?.value || invoice.status
    }
    
    console.log('🔧 Frontend: Sending update data:', updatedData)
    console.log('🔧 Frontend: Invoice ID:', invoice.id)
    editInvoiceMutation.mutate({ invoiceId: invoice.id, data: updatedData })
  }

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices([...selectedInvoices, invoiceId])
    } else {
      setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId))
    }
  }

  const handleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id))
    }
  }

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on invoices:`, selectedInvoices)
    switch (action) {
      case "approve":
        alert(`${selectedInvoices.length} invoices approved!`)
        break
      case "send-email":
        alert(`Email sent for ${selectedInvoices.length} invoices!`)
        break
      case "send-sms":
        alert(`SMS sent for ${selectedInvoices.length} invoices!`)
        break
      default:
        break
    }
    setSelectedInvoices([])
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>
      case "approved":
        return <Badge variant="default">Approved</Badge>
      case "sent":
        return <Badge variant="outline">Sent</Badge>
      case "paid":
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const statusCounts = {
    all: enrichedInvoices.length,
    draft: enrichedInvoices.filter((inv: any) => inv.status === "draft").length,
    approved: enrichedInvoices.filter((inv: any) => inv.status === "approved").length,
    sent: enrichedInvoices.filter((inv: any) => inv.status === "sent").length,
    paid: enrichedInvoices.filter((inv: any) => inv.status === "paid").length,
    overdue: enrichedInvoices.filter((inv: any) => inv.status === "overdue").length
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="invoices-title">Invoices</h1>
          <p className="text-muted-foreground">Review, approve and send invoices to tenants</p>
        </div>
        {selectedInvoices.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("approve")}
              data-testid="button-bulk-approve"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve ({selectedInvoices.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("send-email")}
              data-testid="button-bulk-email"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("send-sms")}
              data-testid="button-bulk-sms"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              SMS
            </Button>
          </div>
        )}
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card 
            key={status}
            className={`cursor-pointer hover-elevate ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {status === "all" ? "Total" : status}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-invoices"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Invoices List
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </CardTitle>
          <CardDescription>
            Showing {filteredInvoices.length} of {enrichedInvoices.length} invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover-elevate">
                  <TableCell>
                    <Checkbox
                      checked={selectedInvoices.includes(invoice.id)}
                      onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                      data-testid={`checkbox-${invoice.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{invoice.id}</TableCell>
                  <TableCell className="font-medium">{invoice.tenant}</TableCell>
                  <TableCell>{invoice.unit}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.property}</TableCell>
                  <TableCell className="font-mono">KSh {invoice.amount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewInvoice(invoice)}
                        data-testid={`button-view-${invoice.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {invoice.status === "draft" && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditInvoice(invoice)}
                          data-testid={`button-edit-${invoice.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {(invoice.status === "approved" || invoice.status === "draft") && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSendInvoice(invoice)}
                          data-testid={`button-send-${invoice.id}`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownloadInvoice(invoice)}
                        data-testid={`button-download-${invoice.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No invoices found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : "Create your first invoice to get started"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Complete details for invoice {selectedInvoice?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Invoice Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Invoice ID:</strong> {selectedInvoice.id}</div>
                    <div><strong>Date:</strong> {new Date(selectedInvoice.createdAt || Date.now()).toLocaleDateString()}</div>
                    <div><strong>Due Date:</strong> {new Date(selectedInvoice.dueDate).toLocaleDateString()}</div>
                    <div><strong>Status:</strong> {getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Tenant Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {selectedInvoice.tenant}</div>
                    {selectedInvoice.tenantData?.email && (
                      <div><strong>Email:</strong> {selectedInvoice.tenantData.email}</div>
                    )}
                    {selectedInvoice.tenantData?.phone && (
                      <div><strong>Phone:</strong> {selectedInvoice.tenantData.phone}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Property Information */}
              <div>
                <h3 className="font-semibold mb-2">Property Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Property:</strong> {selectedInvoice.property}</div>
                  <div><strong>Unit:</strong> {selectedInvoice.unit}</div>
                </div>
              </div>

              {/* Charges */}
              <div>
                <h3 className="font-semibold mb-2">Charges</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.charges.map((charge: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{charge.name}</TableCell>
                        <TableCell className="text-right font-mono">KSh {charge.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-right mt-4 text-lg font-semibold">
                  Total: KSh {selectedInvoice.amount.toLocaleString()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => handleDownloadInvoice(selectedInvoice)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {(selectedInvoice.status === "approved" || selectedInvoice.status === "draft") && (
                  <Button variant="outline" onClick={() => { setViewDialogOpen(false); handleSendInvoice(selectedInvoice) }}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invoice
                  </Button>
                )}
                {selectedInvoice.status === "draft" && (
                  <Button variant="outline" onClick={() => { setViewDialogOpen(false); handleEditInvoice(selectedInvoice) }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Invoice
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Invoice Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              Send invoice {selectedInvoice?.id} to {selectedInvoice?.tenant}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Invoice will be sent to:
                <div className="mt-2 p-3 bg-muted rounded">
                  <div><strong>Tenant:</strong> {selectedInvoice.tenant}</div>
                  {selectedInvoice.tenantData?.email && (
                    <div><strong>Email:</strong> {selectedInvoice.tenantData.email}</div>
                  )}
                  {selectedInvoice.tenantData?.phone && (
                    <div><strong>Phone:</strong> {selectedInvoice.tenantData.phone}</div>
                  )}
                  <div><strong>Amount:</strong> KSh {selectedInvoice.amount.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleSendEmail(selectedInvoice)} 
                  className="flex-1"
                  disabled={sendEmailMutation.isPending}
                >
                  {sendEmailMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send via Email
                </Button>
                <Button 
                  onClick={() => handleSendSMS(selectedInvoice)} 
                  variant="outline" 
                  className="flex-1"
                  disabled={sendSMSMutation.isPending}
                >
                  {sendSMSMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" />
                  )}
                  Send via SMS
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Edit invoice {selectedInvoice?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <form id="edit-invoice-form" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={selectedInvoice.description}
                    className="min-h-20"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (KSh)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    defaultValue={selectedInvoice.amount}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    defaultValue={selectedInvoice.dueDate}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedInvoice.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Current charges display */}
              <div>
                <Label>Current Charges</Label>
                <div className="mt-2 p-3 bg-muted rounded text-sm">
                  {selectedInvoice.charges.map((charge: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span>{charge.name}</span>
                      <span>KSh {charge.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 font-semibold flex justify-between">
                    <span>Total</span>
                    <span>KSh {selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  To modify charges, use the invoice items management section.
                </p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button"
                  onClick={() => handleEditSubmit(selectedInvoice)}
                  disabled={editInvoiceMutation.isPending}
                >
                  {editInvoiceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}