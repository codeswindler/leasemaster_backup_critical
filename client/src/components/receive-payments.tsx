import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { formatDateWithOffset, formatWithOffset, usePropertyTimezoneOffset } from "@/lib/timezone"
import { 
  Wallet, 
  Search, 
  CreditCard,
  Smartphone,
  Building,
  Plus
} from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function ReceivePayments() {
  const paymentsCardVariants = [
    "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-blue-900/50",
    "bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-emerald-900/50",
    "bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-rose-900/50",
    "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-amber-900/50",
    "bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-violet-900/50",
    "bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-cyan-900/50",
  ]
  const paymentsCardSeed = useMemo(
    () => Math.floor(Math.random() * paymentsCardVariants.length),
    []
  )
  const [selectedLeaseId, setSelectedLeaseId] = useState("")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [paymentSearch, setPaymentSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [incomingAllocation, setIncomingAllocation] = useState<any>(null)
  const [allocationSearch, setAllocationSearch] = useState("")
  const [allocationLeaseId, setAllocationLeaseId] = useState<string>("")
  const [allocationInvoiceId, setAllocationInvoiceId] = useState<string>("")
  const { selectedAgentId, selectedPropertyId, selectedLandlordId } = useFilter()
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const { timezoneOffsetMinutes } = usePropertyTimezoneOffset()

  const isLandlordSelected = !!selectedLandlordId && selectedLandlordId !== "all"
  const actionsDisabled = !selectedPropertyId || !isLandlordSelected

  // Fetch real tenant data
  const { data: tenants = [] } = useQuery({ 
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
  const { data: units = [] } = useQuery({ 
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
  const { data: properties = [] } = useQuery({ 
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
  const { data: leases = [] } = useQuery({ 
    queryKey: ['/api/leases', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })
  const { data: invoices = [] } = useQuery({
    queryKey: ['/api/invoices', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoices${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })

  const { data: incomingPayments = [], isLoading: incomingLoading } = useQuery({
    queryKey: ['/api/incoming-payments', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      params.append("limit", "10")
      const url = `/api/incoming-payments?${params.toString()}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: isLandlordSelected,
  })

  // Fetch real payment data from API
  const { data: recentPayments = [] } = useQuery({ 
    queryKey: ['/api/payments', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/payments${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })

  const normalizedTenants = Array.isArray(tenants)
    ? tenants.map((tenant: any) => ({
        ...tenant,
        fullName: tenant.fullName ?? `${tenant.firstName ?? ""} ${tenant.lastName ?? ""}`.trim(),
      }))
    : []
  const normalizedUnits = Array.isArray(units)
    ? units.map((unit: any) => ({
        ...unit,
        unitNumber: unit.unitNumber ?? unit.number,
        propertyId: unit.propertyId ?? unit.property_id,
      }))
    : []
  const normalizedProperties = Array.isArray(properties)
    ? properties.map((property: any) => ({
        ...property,
        propertyId: property.propertyId ?? property.id,
        accountPrefix: property.accountPrefix ?? property.account_prefix ?? "",
      }))
    : []
  const normalizedLeases = Array.isArray(leases)
    ? leases.map((lease: any) => ({
        ...lease,
        tenantId: lease.tenantId ?? lease.tenant_id,
        unitId: lease.unitId ?? lease.unit_id,
      }))
    : []
  const normalizedInvoices = Array.isArray(invoices)
    ? invoices.map((invoice: any) => ({
        ...invoice,
        leaseId: invoice.leaseId ?? invoice.lease_id,
        unitId: invoice.unitId ?? invoice.unit_id,
        propertyId: invoice.propertyId ?? invoice.property_id,
        invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number,
        dueDate: invoice.dueDate ?? invoice.due_date,
        issueDate: invoice.issueDate ?? invoice.issue_date,
        amount: invoice.amount ?? invoice.totalAmount ?? 0,
        status: (invoice.status ?? "pending").toLowerCase(),
      }))
    : []
  const normalizedPayments = Array.isArray(recentPayments)
    ? recentPayments.map((payment: any) => ({
        ...payment,
        leaseId: payment.leaseId ?? payment.lease_id,
        invoiceId: payment.invoiceId ?? payment.invoice_id,
        paymentDate: payment.paymentDate ?? payment.payment_date,
        paymentMethod: payment.paymentMethod ?? payment.payment_method,
        reference: payment.reference ?? payment.reference_number,
        status: (payment.status ?? "verified").toLowerCase(),
        createdByName:
          payment.created_by_name ??
          payment.createdByName ??
          payment.created_by_username ??
          payment.createdByUsername ??
          null,
      }))
    : []

  const normalizedIncomingPayments = Array.isArray(incomingPayments)
    ? incomingPayments.map((payment: any) => {
        const allocationStatusRaw =
          payment.allocation_status ??
          payment.allocationStatus ??
          (payment.payment_id || payment.paymentId ? "allocated" : "unallocated")
        return {
          ...payment,
          allocationStatus: String(allocationStatusRaw || "").toLowerCase(),
          tenantName: payment.tenant_name ?? payment.tenantName ?? null,
          unitNumber: payment.unit_number ?? payment.unitNumber ?? null,
        }
      })
    : []

  const paymentsByInvoiceId = normalizedPayments.reduce<Record<string, number>>((acc, payment) => {
    if (payment.invoiceId && payment.status === "verified") {
      const key = String(payment.invoiceId)
      acc[key] = (acc[key] ?? 0) + Number(payment.amount ?? 0)
    }
    return acc
  }, {})

  const outstandingInvoices = normalizedInvoices
    .map((invoice: any) => {
      const lease = normalizedLeases.find((l: any) => String(l.id) === String(invoice.leaseId))
      const tenantId = invoice.tenantId ?? lease?.tenantId
      const tenant = tenantId ? normalizedTenants.find((t: any) => String(t.id) === String(tenantId)) : null
      const unitId = invoice.unitId ?? lease?.unitId
      const unit = normalizedUnits.find((u: any) => String(u.id) === String(unitId))
      const propertyId = invoice.propertyId ?? unit?.propertyId
      const property = normalizedProperties.find((p: any) => String(p.id) === String(propertyId))
      const invoiceAmount = Number(invoice.amount ?? 0)
      const amountPaid = paymentsByInvoiceId[String(invoice.id)] ?? 0
      const balance = Math.max(0, invoiceAmount - amountPaid)

      return {
        ...invoice,
        tenantName: tenant?.fullName || "Unknown tenant",
        unitLabel: unit?.unitNumber || "No unit",
        propertyName: property?.name || "No property",
        amountPaid,
        balance,
      }
    })
    .filter((invoice: any) => invoice.balance > 0)

  const leaseOptions = normalizedLeases.map((lease: any) => {
    const tenant = normalizedTenants.find((t: any) => String(t.id) === String(lease.tenantId))
    const unit = normalizedUnits.find((u: any) => String(u.id) === String(lease.unitId))
    const tenantName = tenant?.fullName ?? `${tenant?.firstName || ''} ${tenant?.lastName || ''}`.trim()
    return {
      leaseId: String(lease.id),
      tenantName: tenantName || "Unknown tenant",
      unitLabel: unit?.unitNumber || unit?.number || "Unknown unit",
      phone: tenant?.phone || "",
      propertyId: unit?.propertyId ?? null,
    }
  })

  const selectedLeaseOption = leaseOptions.find((option) => String(option.leaseId) === selectedLeaseId)
  const selectedLeaseProperty = selectedLeaseOption
    ? normalizedProperties.find((property: any) => String(property.id) === String(selectedLeaseOption.propertyId))
    : null
  const computedAccountNumber = selectedLeaseProperty?.accountPrefix && selectedLeaseOption?.unitLabel
    ? `${selectedLeaseProperty.accountPrefix}${selectedLeaseOption.unitLabel}`
    : ""
  const filteredLeaseOptions = leaseOptions.filter((option) => {
    if (!paymentSearch.trim()) return true
    const term = paymentSearch.toLowerCase()
    return (
      option.tenantName.toLowerCase().includes(term) ||
      option.unitLabel.toLowerCase().includes(term) ||
      option.phone.toLowerCase().includes(term)
    )
  })

  const recentPaymentRows = normalizedPayments.slice(0, 8).map((payment: any) => {
    const lease = normalizedLeases.find((l: any) => String(l.id) === String(payment.leaseId))
    const tenantId = lease?.tenantId
    const tenant = tenantId ? normalizedTenants.find((t: any) => String(t.id) === String(tenantId)) : null
    const unit = normalizedUnits.find((u: any) => String(u.id) === String(lease?.unitId))

    return {
      id: payment.id,
      amount: Number(payment.amount ?? 0),
      paymentMethod: payment.paymentMethod || "Unknown",
      paymentDate: payment.paymentDate,
      status: payment.status || "verified",
      createdByName: payment.createdByName || "System",
      tenantName: tenant?.fullName || "Direct Payment",
      unitLabel: unit?.unitNumber || "N/A",
    }
  })

  const allocationLeaseOptions = leaseOptions
  const filteredAllocationOptions = allocationLeaseOptions.filter((option) => {
    if (!allocationSearch.trim()) return true
    const search = allocationSearch.toLowerCase()
    return (
      option.tenantName.toLowerCase().includes(search) ||
      option.unitLabel.toLowerCase().includes(search) ||
      option.phone.toLowerCase().includes(search)
    )
  })

  const allocationInvoiceOptions = normalizedInvoices.filter((invoice: any) =>
    allocationLeaseId ? String(invoice.leaseId) === allocationLeaseId : false
  )

  const allocateIncomingMutation = useMutation({
    mutationFn: async ({ incomingId, leaseId, invoiceId }: { incomingId: string; leaseId: string; invoiceId?: string }) => {
      return await apiRequest("PUT", `/api/incoming-payments/${incomingId}?action=allocate`, {
        leaseId,
        invoiceId: invoiceId || null,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/incoming-payments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/payments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      toast({
        title: "Incoming Payment Allocated",
        description: "Payment allocated and receipted.",
      })
      setIncomingAllocation(null)
      setAllocationLeaseId("")
      setAllocationInvoiceId("")
      setAllocationSearch("")
    },
    onError: (error: any) => {
      toast({
        title: "Allocation Failed",
        description: error?.message || "Unable to allocate incoming payment.",
        variant: "destructive",
      })
    },
  })

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (actionsDisabled) {
        throw new Error("Select a client and property in the header before recording payments.")
      }
      if (!selectedLeaseId) {
        throw new Error("Select a tenant or unit before recording payments.")
      }
      if (!amount || !paymentMethod) {
        throw new Error("Please fill in all required fields.")
      }
      if (!computedAccountNumber) {
        throw new Error("Unable to compute account number for this tenant/unit.")
      }

      const resolvedPaymentDate = paymentDate || new Date().toISOString().slice(0, 10)
      const payload: any = {
        amount: parseFloat(amount),
        paymentDate: resolvedPaymentDate,
        paymentMethod,
        reference: reference || null,
        notes: notes || null,
        status: "draft",
        accountNumber: computedAccountNumber || null,
      }

      payload.leaseId = selectedLeaseId
      if (selectedInvoiceId) {
        payload.invoiceId = selectedInvoiceId
      }

      return await apiRequest("POST", "/api/payments", payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/payments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      toast({
        title: "Payment Drafted",
        description: "Payment saved as draft in receipts for confirmation.",
      })
      setAmount("")
      setPaymentDate("")
      setPaymentMethod("")
      setReference("")
      setNotes("")
      setPaymentSearch("")
      setIsDialogOpen(false)
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error?.message || "Failed to record payment. Please try again.",
        variant: "destructive",
      })
    },
  })

  const handleRecordPayment = () => {
    recordPaymentMutation.mutate()
  }

  if (actionsDisabled) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="receive-payments-title">Receive Payments</h1>
            <p className="text-muted-foreground">Record tenant payments and manage transactions</p>
          </div>
        </div>
        <Card className={`vibrant-card ${paymentsCardVariants[(paymentsCardSeed + 2) % paymentsCardVariants.length]}`}>
          <CardContent className="p-6">
            <div className="rounded-xl border border-white/5 bg-slate-900/30 px-6 py-8">
              <div className="mx-auto max-w-xl text-center space-y-2">
                <div className="flex items-center justify-center">
                  <span
                    className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold shadow-sm animate-pulse ${
                      paymentsCardVariants[paymentsCardSeed % paymentsCardVariants.length]
                    }`}
                  >
                    Please select a client and property filter first.
                  </span>
                </div>
                <div className="text-sm text-muted-foreground animate-[pulse_2.2s_ease-in-out_infinite]">
                  Apply filters in the top nav so I can fetch payments.
                </div>
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
          <h1 className="text-3xl font-bold" data-testid="receive-payments-title">Receive Payments</h1>
          <p className="text-muted-foreground">Record tenant payments and manage transactions</p>
          {!isLandlordSelected && (
            <p className="text-xs text-amber-600 mt-1">Select a client to manage payments.</p>
          )}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="button-record-payment"
              onClick={() => {
                setSelectedInvoiceId("")
                setAmount("")
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent
            className={`sm:max-w-[500px] vibrant-card ${paymentsCardVariants[(paymentsCardSeed + 1) % paymentsCardVariants.length]}`}
          >
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>
                Enter payment details to record a tenant payment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  data-testid="input-payment-date"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="search-tenant">Search tenant/unit/mobile</Label>
                <Input
                  id="search-tenant"
                  placeholder="Type tenant name, unit, or mobile number"
                  value={paymentSearch}
                  onChange={(e) => {
                    setPaymentSearch(e.target.value)
                    setSelectedLeaseId("")
                  }}
                />
                {paymentSearch.trim() && (
                  <div className="max-h-52 overflow-auto rounded-md border border-muted p-2 space-y-1">
                    {filteredLeaseOptions.map((option) => (
                      <button
                        key={option.leaseId}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
                          selectedLeaseId === String(option.leaseId) ? "bg-muted" : ""
                        }`}
                        onClick={() => {
                          setSelectedLeaseId(String(option.leaseId))
                          setPaymentSearch(`${option.tenantName} • ${option.unitLabel}`)
                        }}
                      >
                        {option.tenantName} • {option.unitLabel}
                        {option.phone ? ` • ${option.phone}` : ""}
                      </button>
                    ))}
                    {filteredLeaseOptions.length === 0 && (
                      <div className="text-sm text-muted-foreground px-2 py-3">
                        No matches found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedLeaseOption && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Tenant/Unit</p>
                      <p className="font-mono">{selectedLeaseOption?.tenantName} • {selectedLeaseOption?.unitLabel}</p>
                    </div>
                    <div>
                      <p className="font-medium">Account Number</p>
                      <p className="font-mono">{computedAccountNumber || "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter payment amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="input-amount"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  placeholder="Transaction reference (optional)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  data-testid="input-reference"
                />
              </div>


              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRecordPayment}
                disabled={actionsDisabled || recordPaymentMutation.isPending || !selectedLeaseId}
                data-testid="button-submit-payment"
              >
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Invoices */}
        <Card className={`vibrant-card ${paymentsCardVariants[paymentsCardSeed % paymentsCardVariants.length]}`}>
          <CardHeader>
            <CardTitle>Outstanding Invoices</CardTitle>
            <CardDescription>Invoices awaiting payment confirmation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {outstandingInvoices.length === 0 && (
              <div className="text-sm text-muted-foreground">No outstanding invoices.</div>
            )}
            {outstandingInvoices.map((invoice: any) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                <div>
                  <p className="font-medium">{invoice.tenantName}</p>
                  <p className="text-sm text-muted-foreground">{invoice.unitLabel} - {invoice.propertyName}</p>
                  <p className="text-xs font-mono text-muted-foreground">Invoice: {invoice.invoiceNumber || invoice.id}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-red-600">KSh {invoice.balance.toLocaleString()}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1"
                    onClick={() => {
                      if (actionsDisabled) return
                      if (invoice.leaseId) {
                        setSelectedLeaseId(String(invoice.leaseId))
                        setPaymentSearch(`${invoice.tenantName} • ${invoice.unitLabel}`)
                      }
                      setSelectedInvoiceId(String(invoice.id))
                      setAmount(invoice.balance.toString())
                      setIsDialogOpen(true)
                    }}
                    disabled={actionsDisabled}
                  >
                    Record Payment
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className={`vibrant-card ${paymentsCardVariants[(paymentsCardSeed + 1) % paymentsCardVariants.length]}`}>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest payment transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPaymentRows.length === 0 && (
              <div className="text-sm text-muted-foreground">No payments recorded yet.</div>
            )}
            {recentPaymentRows.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {payment.paymentMethod === "M-Pesa" ? (
                    <Smartphone className="h-5 w-5 text-green-600" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  )}
                  <div>
                    <p className="font-medium">{payment.tenantName}</p>
                    <p className="text-sm text-muted-foreground">{payment.unitLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.paymentDate ? formatDateWithOffset(payment.paymentDate, timezoneOffsetMinutes) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">by {payment.createdByName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono">KSh {payment.amount.toLocaleString()}</p>
                  <Badge variant={payment.status === "verified" ? "default" : "secondary"} className="text-xs">
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card
          id="incoming-payments"
          className={`vibrant-card ${paymentsCardVariants[(paymentsCardSeed + 3) % paymentsCardVariants.length]}`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Incoming Payments</CardTitle>
                <CardDescription>Integrated M-Pesa/bank transactions</CardDescription>
              </div>
              <Badge variant="outline">{normalizedIncomingPayments.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {incomingLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                Loading incoming payments...
              </div>
            ) : normalizedIncomingPayments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No incoming payments yet.
              </div>
            ) : (
              <div className="space-y-2">
                {normalizedIncomingPayments.slice(0, 6).map((payment: any) => {
                  const reference =
                    payment.mpesa_receipt ||
                    payment.mpesaReceipt ||
                    payment.reference ||
                    payment.account_number ||
                    "Incoming payment"
                  const rawDate =
                    payment.transaction_date ||
                    payment.transactionDate ||
                    payment.created_at ||
                    payment.createdAt
                  const parsedDate = rawDate ? new Date(rawDate) : null
                  const dateLabel =
                    parsedDate && !Number.isNaN(parsedDate.getTime())
                      ? formatWithOffset(parsedDate, timezoneOffsetMinutes)
                      : rawDate || "—"
                  const methodLabel = payment.payment_method || payment.paymentMethod || "M-Pesa"
                  const payerLabel = payment.tenantName || "Unallocated payer"
                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border bg-white/60 px-3 py-2 text-sm"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{payerLabel}</div>
                        <div className="text-xs text-muted-foreground">{payment.unitNumber || "—"}</div>
                        <div className="text-xs text-muted-foreground">{reference}</div>
                        <div className="text-xs text-muted-foreground">
                          {methodLabel} • {dateLabel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold">
                          KSh {Number(payment.amount || 0).toLocaleString()}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <Badge variant="secondary">
                            {payment.status || "received"}
                          </Badge>
                          {payment.allocationStatus === "unallocated" && (
                            <Badge variant="destructive">Unallocated</Badge>
                          )}
                        </div>
                        {payment.allocationStatus === "unallocated" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              setIncomingAllocation(payment)
                              setAllocationLeaseId("")
                              setAllocationInvoiceId("")
                              setAllocationSearch("")
                            }}
                          >
                            Allocate
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => setLocation("/accounting/incoming-payments")}
            >
              View All Incoming Transactions
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!incomingAllocation} onOpenChange={(open) => !open && setIncomingAllocation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Allocate Incoming Payment</DialogTitle>
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
              <Button variant="outline" onClick={() => setIncomingAllocation(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!incomingAllocation) return
                  if (!allocationLeaseId) {
                    toast({
                      title: "Select Tenant/Unit",
                      description: "Choose a tenant or unit to allocate this payment.",
                      variant: "destructive",
                    })
                    return
                  }
                  allocateIncomingMutation.mutate({
                    incomingId: incomingAllocation.id,
                    leaseId: allocationLeaseId,
                    invoiceId: allocationInvoiceId || undefined,
                  })
                }}
                disabled={allocateIncomingMutation.isPending}
              >
                Allocate & Receipt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}