import { useMemo, useState } from "react"
import { 
  Receipt, 
  Search, 
  Filter,
  Eye,
  Download,
  Calendar,
  CheckCircle,
  Trash2,
  Send,
  X
} from "lucide-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { jsPDF } from "jspdf"
import autoTable from 'jspdf-autotable'
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  const receiptCardVariants = [
    "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-blue-900/50",
    "bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-emerald-900/50",
    "bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-rose-900/50",
    "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-amber-900/50",
    "bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-violet-900/50",
    "bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-cyan-900/50",
  ]
  const receiptSeed = useMemo(
    () => Math.floor(Math.random() * receiptCardVariants.length),
    []
  )
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [viewingReceipt, setViewingReceipt] = useState<any>(null)
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([])
  const [allocationPayment, setAllocationPayment] = useState<any>(null)
  const [allocationSearch, setAllocationSearch] = useState("")
  const [allocationLeaseId, setAllocationLeaseId] = useState<string>("")
  const [allocationInvoiceId, setAllocationInvoiceId] = useState<string>("")
  const { toast } = useToast()
  const { selectedAgentId, selectedPropertyId, selectedLandlordId } = useFilter()
  const isLandlordSelected = !!selectedLandlordId && selectedLandlordId !== "all"
  const actionsDisabled = !selectedPropertyId || !isLandlordSelected

  // Fetch all required data with complete status tracking
  const paymentsQuery = useQuery({ 
    queryKey: ['/api/payments', selectedPropertyId, selectedLandlordId, selectedAgentId, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (fromDate) params.append("from", fromDate)
      if (toDate) params.append("to", toDate)
      const url = `/api/payments${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })
  const tenantsQuery = useQuery({ 
    queryKey: ['/api/tenants', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })
  const unitsQuery = useQuery({ 
    queryKey: ['/api/units', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })
  const propertiesQuery = useQuery({ 
    queryKey: ['/api/properties', selectedLandlordId, selectedPropertyId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })
  const invoiceSettingsQuery = useQuery({
    queryKey: ['/api/settings/invoice', selectedLandlordId, selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/settings/invoice${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
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
    enabled: isLandlordSelected,
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
    enabled: isLandlordSelected,
  })

  const confirmReceiptMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      if (actionsDisabled) {
        throw new Error("Select a client and property in the header to confirm receipts.")
      }
      return await apiRequest("PUT", `/api/payments/${paymentId}`, { status: "verified" })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/payments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      toast({
        title: "Receipt Confirmed",
        description: "Payment marked as verified.",
      })
    },
    onError: () => {
      toast({
        title: "Confirmation Failed",
        description: "Unable to confirm receipt. Please try again.",
        variant: "destructive",
      })
    },
  })

  const deleteReceiptMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return await apiRequest("DELETE", `/api/payments/${paymentId}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/payments'] })
    },
  })

  const approveReceiptMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return await apiRequest("PUT", `/api/payments/${paymentId}`, { status: "verified" })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/payments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
    },
  })

  const sendReceiptMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return await apiRequest("POST", `/api/payments/${paymentId}/send-receipt`)
    },
  })

  const allocatePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, leaseId, invoiceId }: { paymentId: string; leaseId: string; invoiceId?: string }) => {
      return await apiRequest("PUT", `/api/payments/${paymentId}?action=allocate`, {
        leaseId,
        invoiceId: invoiceId || null,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/payments'] })
      setAllocationPayment(null)
      setAllocationSearch("")
      setAllocationLeaseId("")
      setAllocationInvoiceId("")
      toast({
        title: "Payment Allocated",
        description: "Payment has been allocated successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Allocation Failed",
        description: error?.message || "Unable to allocate payment.",
        variant: "destructive",
      })
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
    const lease = leasesData.find((l: any) => String(l.id) === String(payment.leaseId ?? payment.lease_id))
    
    // Find tenant from lease relationship
    const tenant = lease && lease.tenantId ? 
      tenantsData.find((t: any) => String(t.id) === String(lease.tenantId)) : null
    const tenantName = tenant
      ? (tenant.fullName ?? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim())
      : ''
    
    // Find unit from lease relationship
    const unit = lease && lease.unitId ? 
      unitsData.find((u: any) => String(u.id) === String(lease.unitId)) : null
    
    // Find property from unit relationship
    const property = unit && unit.propertyId ? 
      propertiesData.find((p: any) => String(p.id) === String(unit.propertyId)) : null
    
    // Find associated invoice
    const invoice = (payment.invoiceId ?? payment.invoice_id)
      ? invoicesData.find((i: any) => String(i.id) === String(payment.invoiceId ?? payment.invoice_id))
      : null
    const allocationStatus = (payment.allocation_status ?? payment.allocationStatus ?? 'allocated').toLowerCase()
    const paymentTimestamp = payment.created_at ?? payment.createdAt ?? payment.paymentDate ?? payment.payment_date
    
    // Create enriched receipt object with better fallbacks
    return {
      id: `RCP-${payment.id.slice(-8).toUpperCase()}`,
      paymentId: payment.id,
      tenant: allocationStatus === 'unallocated' ? 'Unallocated' : (tenantName || 'Direct Payment'),
      unit: allocationStatus === 'unallocated' ? '—' : (unit?.unitNumber || unit?.number || 'N/A'),
      property: property?.name || 'N/A',
      amount: payment.amount || 0,
      paymentDate: paymentTimestamp,
      paymentMethod: payment.paymentMethod || 'Unknown',
      reference: payment.reference || 'N/A',
      status: (payment.status || 'verified').toLowerCase(),
      allocationStatus,
      accountNumber: payment.account_number ?? payment.accountNumber ?? '',
      tenantPhone: tenant?.phone || '',
      tenantEmail: tenant?.email || '',
      unitDetails: unit,
      propertyDetails: property,
      leaseDetails: lease,
      leaseId: payment.leaseId ?? payment.lease_id ?? null,
      invoiceId: payment.invoiceId ?? payment.invoice_id ?? null,
      invoiceNumber: invoice?.invoiceNumber || '',
      description: payment.description || 'Payment received'
    }
  })

  const filteredReceipts = receipts.filter((receipt: any) => {
    // If search term is empty, show all results
    const receiptTime = receipt.paymentDate ? new Date(receipt.paymentDate).getTime() : null
    const fromTime = fromDate ? new Date(fromDate).getTime() : null
    const toTime = toDate ? new Date(toDate).getTime() : null
    const matchesRange =
      (!fromTime || (receiptTime !== null && receiptTime >= fromTime)) &&
      (!toTime || (receiptTime !== null && receiptTime <= toTime))

    if (!searchTerm.trim()) {
      const matchesStatus = statusFilter === "all" || receipt.status === statusFilter
      return matchesStatus && matchesRange
    }
    
    // Safe search with null/undefined checks
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      (receipt.id && receipt.id.toLowerCase().includes(searchLower)) ||
      (receipt.tenant && receipt.tenant.toLowerCase().includes(searchLower)) ||
      (receipt.unit && receipt.unit.toLowerCase().includes(searchLower)) ||
      (receipt.reference && receipt.reference.toLowerCase().includes(searchLower))
    
    const matchesStatus = statusFilter === "all" || receipt.status === statusFilter
    
    return matchesSearch && matchesStatus && matchesRange
  })

  const selectedReceipts = filteredReceipts.filter((receipt: any) => selectedReceiptIds.includes(receipt.paymentId))
  const allSelected = filteredReceipts.length > 0 && selectedReceiptIds.length === filteredReceipts.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedReceiptIds([])
    } else {
      setSelectedReceiptIds(filteredReceipts.map((receipt: any) => receipt.paymentId))
    }
  }

  const toggleSelectReceipt = (paymentId: string) => {
    setSelectedReceiptIds((prev) =>
      prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId]
    )
  }

  const handleBulkDelete = async () => {
    if (actionsDisabled || selectedReceiptIds.length === 0) return
    await Promise.all(selectedReceiptIds.map((id) => deleteReceiptMutation.mutateAsync(id)))
    setSelectedReceiptIds([])
    toast({
      title: "Receipts Deleted",
      description: "Selected receipts have been deleted.",
    })
  }

  const handleBulkApprove = async () => {
    if (actionsDisabled || selectedReceiptIds.length === 0) return
    await Promise.all(selectedReceiptIds.map((id) => approveReceiptMutation.mutateAsync(id)))
    setSelectedReceiptIds([])
    toast({
      title: "Receipts Approved",
      description: "Selected receipts marked as verified.",
    })
  }

  const handleBulkSend = async () => {
    if (actionsDisabled || selectedReceiptIds.length === 0) return
    await Promise.all(selectedReceiptIds.map((id) => sendReceiptMutation.mutateAsync(id)))
    toast({
      title: "Receipts Sent",
      description: "Receipts have been sent to tenants.",
    })
  }

  const handleBulkGenerate = async () => {
    if (selectedReceipts.length === 0) return
    for (const receipt of selectedReceipts) {
      await downloadReceipt(receipt)
    }
  }

  const allocationLeaseOptions = leasesData.map((lease: any) => {
    const tenant = tenantsData.find((t: any) => t.id === lease.tenantId)
    const unit = unitsData.find((u: any) => u.id === lease.unitId)
    const tenantLabel = tenant?.fullName ?? `${tenant?.firstName || ''} ${tenant?.lastName || ''}`.trim()
    return {
      leaseId: lease.id,
      tenantName: tenantLabel || "Unknown tenant",
      unitLabel: unit?.unitNumber || unit?.number || "Unknown unit",
    }
  })

  const filteredAllocationOptions = allocationLeaseOptions.filter((option) => {
    if (!allocationSearch.trim()) return true
    const search = allocationSearch.toLowerCase()
    return (
      option.tenantName.toLowerCase().includes(search) ||
      option.unitLabel.toLowerCase().includes(search)
    )
  })

  const allocationInvoiceOptions = invoicesData.filter((invoice: any) =>
    allocationLeaseId ? String(invoice.leaseId ?? invoice.lease_id) === allocationLeaseId : false
  )

  const downloadReceipt = (receipt: any) => {
    if (actionsDisabled) {
      toast({
        title: "Client Required",
        description: "Select a client and property in the header to download receipts.",
        variant: "destructive",
      })
      return
    }
    try {
      const doc = new jsPDF()
      const paymentDate = receipt.paymentDate || Date.now()
      const formattedDate = new Date(paymentDate).toISOString().slice(0, 10)
      const unitLabel = receipt.unit ? String(receipt.unit).replace(/\s+/g, "-") : "unit"
      const invoiceSettings = invoiceSettingsQuery.data || {}
      const companyName = invoiceSettings.company_name || "Company"
      const companyPhone = invoiceSettings.company_phone || ""
      const companyEmail = invoiceSettings.company_email || ""
      const companyAddress = invoiceSettings.company_address || ""
      const properties = Array.isArray(propertiesQuery.data) ? propertiesQuery.data : []
      const propertyMatch = properties.find((property: any) => property.id === receipt.propertyId || property.name === receipt.property)
      const accountPrefix = propertyMatch?.accountPrefix ?? propertyMatch?.account_prefix ?? ""
      const accountNumber = accountPrefix && receipt.unit ? `${accountPrefix}${receipt.unit}` : ""

      doc.setFontSize(14)
      doc.text(companyName.toUpperCase(), 20, 20)
      doc.setFontSize(9)
      if (companyAddress) doc.text(companyAddress, 20, 26)
      if (companyPhone) doc.text(`Tel: ${companyPhone}`, 20, 31)
      if (companyEmail) doc.text(`Email: ${companyEmail}`, 20, 36)

      doc.setFontSize(11)
      doc.text("RECEIPT", 150, 20)
      doc.setFontSize(9)
      doc.text(`Date: ${new Date(paymentDate).toLocaleDateString()}`, 150, 26)
      doc.text(`Receipt No: ${receipt.reference || receipt.id}`, 150, 31)

      doc.line(20, 42, 190, 42)

      doc.setFontSize(10)
      doc.text("RECEIVED FROM", 20, 52)
      doc.text(String(receipt.tenant || "Tenant"), 20, 58)
      if (receipt.tenantEmail) doc.text(String(receipt.tenantEmail), 20, 63)
      if (receipt.tenantPhone) doc.text(String(receipt.tenantPhone), 20, 68)

      doc.text("PROPERTY", 120, 52)
      doc.text(String(receipt.property || "—"), 120, 58)
      doc.text(`House: ${receipt.unit || "—"}`, 120, 63)
      if (accountNumber) doc.text(`Account: ${accountNumber}`, 120, 68)

      autoTable(doc, {
        head: [["Description", "Amount"]],
        body: [[receipt.description || "Payment", `KES ${Number(receipt.amount || 0).toLocaleString()}`]],
        startY: 78,
        theme: "grid",
        headStyles: { fillColor: [56, 78, 84], textColor: 255 },
        styles: { fontSize: 9 }
      })

      const finalY = (doc as any).lastAutoTable?.finalY || 110
      doc.setFontSize(10)
      doc.text(`Amount Received: KES ${Number(receipt.amount || 0).toLocaleString()}`, 120, finalY + 12)
      if (receipt.balance !== undefined) {
        doc.text(`Current Balance: KES ${Number(receipt.balance || 0).toLocaleString()}`, 120, finalY + 18)
      }

      const fileName = `${unitLabel}-${formattedDate}-receipt.pdf`
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

  const handleGenerateReceipt = () => {
    if (actionsDisabled) {
      toast({
        title: "Client Required",
        description: "Select a client and property to generate receipts.",
        variant: "destructive",
      })
      return
    }
    if (selectedReceipts.length === 0) {
      toast({
        title: "No Receipts Selected",
        description: "Select one or more receipts to generate.",
      })
      return
    }
    handleBulkGenerate()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>
      case "draft":
        return <Badge variant="secondary">Draft</Badge>
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
        <Card className={`vibrant-card ${receiptCardVariants[receiptSeed % receiptCardVariants.length]}`}>
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
        <Card className={`vibrant-card ${receiptCardVariants[(receiptSeed + 1) % receiptCardVariants.length]}`}>
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
          {!isLandlordSelected && (
            <p className="text-xs text-amber-600 mt-1">Select a client to manage receipts.</p>
          )}
        </div>
        <Button data-testid="button-generate-receipt" onClick={handleGenerateReceipt}>
          <Receipt className="h-4 w-4 mr-2" />
          Generate Receipt
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search receipts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-receipts"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="receipt-from">From</Label>
          <Input
            id="receipt-from"
            type="datetime-local"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="min-w-[210px]"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="receipt-to">To</Label>
          <Input
            id="receipt-to"
            type="datetime-local"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="min-w-[210px]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedReceiptIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{selectedReceiptIds.length} selected</Badge>
          <Button size="sm" variant="outline" onClick={handleBulkGenerate}>
            <Download className="h-4 w-4 mr-2" />
            Generate
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkSend}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkApprove}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Trash
          </Button>
        </div>
      )}

      {/* Receipts Table */}
      <Card className={`vibrant-card ${receiptCardVariants[(receiptSeed + 2) % receiptCardVariants.length]}`}>
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
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all receipts"
                  />
                </TableHead>
                <TableHead>Receipt ID</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Time</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt: any) => (
                <TableRow key={receipt.id} className="hover-elevate">
                  <TableCell>
                    <Checkbox
                      checked={selectedReceiptIds.includes(receipt.paymentId)}
                      onCheckedChange={() => toggleSelectReceipt(receipt.paymentId)}
                      aria-label={`Select receipt ${receipt.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{receipt.id}</TableCell>
                  <TableCell className="font-medium">{receipt.tenant}</TableCell>
                  <TableCell>{receipt.unit}</TableCell>
                  <TableCell className="font-mono">KSh {receipt.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    {receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>{receipt.paymentMethod}</TableCell>
                  <TableCell className="font-mono text-sm">{receipt.reference}</TableCell>
                  <TableCell className="space-y-1">
                    {getStatusBadge(receipt.status)}
                    {receipt.allocationStatus === "unallocated" && (
                      <button
                        className="block text-xs text-amber-600 hover:underline"
                        onClick={() => setAllocationPayment(receipt)}
                      >
                        Unallocated
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {receipt.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-confirm-${receipt.id}`}
                          disabled={actionsDisabled || confirmReceiptMutation.isPending}
                          onClick={() => confirmReceiptMutation.mutate(receipt.paymentId)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
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
                        disabled={actionsDisabled}
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
                  disabled={actionsDisabled}
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

      <Dialog open={!!allocationPayment} onOpenChange={(open) => !open && setAllocationPayment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Allocate Payment</DialogTitle>
            <DialogDescription>
              Search by tenant name or unit, then select an invoice if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="allocation-search">Search tenant/unit</Label>
              <Input
                id="allocation-search"
                placeholder="Start typing tenant name or unit..."
                value={allocationSearch}
                onChange={(e) => setAllocationSearch(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Select Tenant/Unit</Label>
              <div className="max-h-52 overflow-auto rounded-md border border-muted p-2 space-y-1">
                {filteredAllocationOptions.map((option) => (
                  <button
                    key={option.leaseId}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
                      allocationLeaseId === String(option.leaseId) ? 'bg-muted' : ''
                    }`}
                    onClick={() => {
                      setAllocationLeaseId(String(option.leaseId))
                      setAllocationInvoiceId("")
                    }}
                  >
                    {option.tenantName} • {option.unitLabel}
                  </button>
                ))}
                {filteredAllocationOptions.length === 0 && (
                  <div className="text-sm text-muted-foreground px-2 py-3">
                    No matches found.
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Invoice (optional)</Label>
              <Select value={allocationInvoiceId} onValueChange={setAllocationInvoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {allocationInvoiceOptions.map((invoice: any) => (
                    <SelectItem key={invoice.id} value={String(invoice.id)}>
                      {invoice.invoiceNumber || invoice.id} • KSh {Number(invoice.amount ?? 0).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAllocationPayment(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!allocationPayment) return
                  if (!allocationLeaseId) {
                    toast({
                      title: "Select Tenant/Unit",
                      description: "Choose a tenant or unit to allocate this payment.",
                      variant: "destructive",
                    })
                    return
                  }
                  allocatePaymentMutation.mutate({
                    paymentId: allocationPayment.paymentId,
                    leaseId: allocationLeaseId,
                    invoiceId: allocationInvoiceId || undefined,
                  })
                }}
                disabled={allocatePaymentMutation.isPending}
              >
                Allocate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}