import { useState } from "react"
import { 
  Receipt, 
  Search, 
  Filter,
  Eye,
  Download,
  Calendar,
  X
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function Receipts() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewingReceipt, setViewingReceipt] = useState<any>(null)
  const { toast } = useToast()
  const { selectedPropertyId, selectedLandlordId } = useFilter()

  // Fetch all required data with complete status tracking
  const paymentsQuery = useQuery({ 
    queryKey: ['/api/payments', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/payments${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })
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

  // Extract data with fallbacks
  const paymentsData = paymentsQuery.data || []
  const tenantsData = tenantsQuery.data || []
  const unitsData = unitsQuery.data || []
  const propertiesData = propertiesQuery.data || []
  const leasesData = leasesQuery.data || []
  const invoicesData = invoicesQuery.data || []

  // Check for complete success - all queries must have succeeded
  const allQueriesSuccessful = [
    paymentsQuery.status === 'success',
    tenantsQuery.status === 'success', 
    unitsQuery.status === 'success',
    propertiesQuery.status === 'success',
    leasesQuery.status === 'success',
    invoicesQuery.status === 'success'
  ].every(Boolean)

  // Check for any loading or pending states
  const isLoadingAny = [
    paymentsQuery.isLoading,
    tenantsQuery.isLoading,
    unitsQuery.isLoading, 
    propertiesQuery.isLoading,
    leasesQuery.isLoading,
    invoicesQuery.isLoading
  ].some(Boolean)

  // Check for any errors
  const hasAnyError = [
    paymentsQuery.error,
    tenantsQuery.error,
    unitsQuery.error,
    propertiesQuery.error,
    leasesQuery.error,
    invoicesQuery.error
  ].some(Boolean)

  // Enrich payments with related data to create receipts
  // Data is now guaranteed to be loaded due to combined loading state above
  const receipts = paymentsData.map((payment: any) => {
    // Find lease associated with this payment
    const lease = leasesData.find((l: any) => l.id === payment.leaseId)
    
    // Find tenant from lease relationship
    const tenant = lease && lease.tenantId ? 
      tenantsData.find((t: any) => t.id === lease.tenantId) : null
    
    // Find unit from lease relationship
    const unit = lease && lease.unitId ? 
      unitsData.find((u: any) => u.id === lease.unitId) : null
    
    // Find property from unit relationship
    const property = unit && unit.propertyId ? 
      propertiesData.find((p: any) => p.id === unit.propertyId) : null
    
    // Find associated invoice
    const invoice = payment.invoiceId ? 
      invoicesData.find((i: any) => i.id === payment.invoiceId) : null
    
    // Create enriched receipt object with better fallbacks
    return {
      id: `RCP-${payment.id.slice(-8).toUpperCase()}`,
      paymentId: payment.id,
      tenant: tenant ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() : 'Direct Payment',
      unit: unit?.number || 'N/A',
      property: property?.name || 'N/A',
      amount: payment.amount || 0,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod || 'Unknown',
      reference: payment.reference || 'N/A',
      status: payment.status || 'verified',
      tenantPhone: tenant?.phone || '',
      tenantEmail: tenant?.email || '',
      unitDetails: unit,
      propertyDetails: property,
      leaseDetails: lease,
      invoiceNumber: invoice?.invoiceNumber || '',
      description: payment.description || 'Payment received'
    }
  })

  const filteredReceipts = receipts.filter(receipt => {
    // If search term is empty, show all results
    if (!searchTerm.trim()) {
      const matchesStatus = statusFilter === "all" || receipt.status === statusFilter
      return matchesStatus
    }
    
    // Safe search with null/undefined checks
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      (receipt.id && receipt.id.toLowerCase().includes(searchLower)) ||
      (receipt.tenant && receipt.tenant.toLowerCase().includes(searchLower)) ||
      (receipt.unit && receipt.unit.toLowerCase().includes(searchLower)) ||
      (receipt.reference && receipt.reference.toLowerCase().includes(searchLower))
    
    const matchesStatus = statusFilter === "all" || receipt.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const downloadReceipt = (receipt: any) => {
    try {
      const doc = new jsPDF()
      
      // Header
      doc.setFontSize(20)
      doc.text('PAYMENT RECEIPT', 20, 30)
      
      // Receipt details
      doc.setFontSize(12)
      doc.text(`Receipt ID: ${receipt.id}`, 20, 50)
      doc.text(`Date: ${new Date(receipt.paymentDate).toLocaleDateString()}`, 20, 60)
      doc.text(`Reference: ${receipt.reference}`, 20, 70)
      
      // Tenant and property information
      doc.text('TENANT INFORMATION:', 20, 90)
      doc.text(`Name: ${receipt.tenant}`, 30, 100)
      doc.text(`Phone: ${receipt.tenantPhone}`, 30, 110)
      doc.text(`Email: ${receipt.tenantEmail}`, 30, 120)
      
      doc.text('PROPERTY INFORMATION:', 20, 140)
      doc.text(`Property: ${receipt.property}`, 30, 150)
      doc.text(`Unit: ${receipt.unit}`, 30, 160)
      
      // Payment details
      doc.text('PAYMENT DETAILS:', 20, 180)
      doc.text(`Amount: KSh ${receipt.amount.toLocaleString()}`, 30, 190)
      doc.text(`Method: ${receipt.paymentMethod}`, 30, 200)
      doc.text(`Status: ${receipt.status.toUpperCase()}`, 30, 210)
      doc.text(`Description: ${receipt.description}`, 30, 220)
      
      // Invoice reference if available
      if (receipt.invoiceNumber) {
        doc.text(`Invoice: ${receipt.invoiceNumber}`, 30, 230)
      }
      
      // Footer
      doc.text('Thank you for your payment!', 20, 260)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 270)
      
      const fileName = `Receipt_${receipt.id}_${receipt.tenant.replace(/\s+/g, '_')}.pdf`
      doc.save(fileName)
      
      toast({
        title: "Receipt Downloaded",
        description: `${fileName} has been downloaded successfully`,
      })
      
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Download Failed",
        description: "Failed to generate receipt PDF",
        variant: "destructive",
      })
    }
  }

  const viewReceipt = (receipt: any) => {
    setViewingReceipt(receipt)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Show error state FIRST if ANY data failed to load
  if (hasAnyError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="receipts-title">Receipts</h1>
            <p className="text-muted-foreground">Error loading receipt data</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500 space-y-2">
              <div>Failed to load receipts data. Please try again.</div>
              <div className="text-sm">
                {paymentsQuery.error && "• Payments data failed"}
                {tenantsQuery.error && "• Tenants data failed"}
                {unitsQuery.error && "• Units data failed"}
                {propertiesQuery.error && "• Properties data failed"}
                {leasesQuery.error && "• Leases data failed"}
                {invoicesQuery.error && "• Invoices data failed"}
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
            <h1 className="text-3xl font-bold" data-testid="receipts-title">Receipts</h1>
            <p className="text-muted-foreground">Loading payment receipts and related data...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <div>Loading receipts data...</div>
              <div className="text-sm text-muted-foreground">
                {paymentsQuery.isLoading && "• Loading payments..."}
                {tenantsQuery.isLoading && "• Loading tenants..."}
                {unitsQuery.isLoading && "• Loading units..."}
                {propertiesQuery.isLoading && "• Loading properties..."}
                {leasesQuery.isLoading && "• Loading leases..."}
                {invoicesQuery.isLoading && "• Loading invoices..."}
                {!isLoadingAny && !allQueriesSuccessful && "• Waiting for all data to be ready..."}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="receipts-title">Receipts</h1>
          <p className="text-muted-foreground">View and manage payment receipts</p>
        </div>
        <Button data-testid="button-generate-receipt">
          <Receipt className="h-4 w-4 mr-2" />
          Generate Receipt
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search receipts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-receipts"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Receipts</CardTitle>
          <CardDescription>
            Showing {filteredReceipts.length} of {receipts.length} receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt ID</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt) => (
                <TableRow key={receipt.id} className="hover-elevate">
                  <TableCell className="font-mono text-sm">{receipt.id}</TableCell>
                  <TableCell className="font-medium">{receipt.tenant}</TableCell>
                  <TableCell>{receipt.unit}</TableCell>
                  <TableCell className="font-mono">KSh {receipt.amount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(receipt.paymentDate).toLocaleDateString()}</TableCell>
                  <TableCell>{receipt.paymentMethod}</TableCell>
                  <TableCell className="font-mono text-sm">{receipt.reference}</TableCell>
                  <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        data-testid={`button-view-${receipt.id}`}
                        onClick={() => viewReceipt(receipt)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        data-testid={`button-download-${receipt.id}`}
                        onClick={() => downloadReceipt(receipt)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Receipt Modal */}
      <Dialog open={!!viewingReceipt} onOpenChange={(open) => !open && setViewingReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Receipt Details
            </DialogTitle>
            <DialogDescription>
              Payment receipt information
            </DialogDescription>
          </DialogHeader>
          
          {viewingReceipt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Receipt ID</Label>
                  <p className="font-mono text-sm">{viewingReceipt.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <p className="text-sm">{new Date(viewingReceipt.paymentDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tenant</Label>
                <p className="font-medium">{viewingReceipt.tenant}</p>
                {viewingReceipt.tenantPhone && (
                  <p className="text-sm text-muted-foreground">{viewingReceipt.tenantPhone}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Property</Label>
                  <p className="text-sm">{viewingReceipt.property}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Unit</Label>
                  <p className="text-sm">{viewingReceipt.unit}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                <p className="text-lg font-mono font-bold">KSh {viewingReceipt.amount.toLocaleString()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Payment Method</Label>
                  <p className="text-sm">{viewingReceipt.paymentMethod}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Reference</Label>
                  <p className="font-mono text-sm">{viewingReceipt.reference}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(viewingReceipt.status)}</div>
                </div>
                {viewingReceipt.invoiceNumber && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Invoice</Label>
                    <p className="font-mono text-sm">{viewingReceipt.invoiceNumber}</p>
                  </div>
                )}
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-sm">{viewingReceipt.description}</p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => downloadReceipt(viewingReceipt)} 
                  className="flex-1"
                  data-testid="button-download-from-modal"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setViewingReceipt(null)}
                  data-testid="button-close-modal"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}