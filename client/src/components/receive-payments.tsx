import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { useToast } from "@/hooks/use-toast"
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
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { selectedPropertyId, selectedLandlordId } = useFilter()
  const { toast } = useToast()

  const isLandlordSelected = !!selectedLandlordId && selectedLandlordId !== "all"
  const actionsDisabled = !selectedPropertyId || !isLandlordSelected

  // Fetch real tenant data
  const { data: tenants = [] } = useQuery({ 
    queryKey: ['/api/tenants', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })
  const { data: units = [] } = useQuery({ 
    queryKey: ['/api/units', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })
  const { data: properties = [] } = useQuery({ 
    queryKey: ['/api/properties', selectedLandlordId, selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })
  const { data: leases = [] } = useQuery({ 
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
  const { data: invoices = [] } = useQuery({
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

  // Fetch real payment data from API
  const { data: recentPayments = [] } = useQuery({ 
    queryKey: ['/api/payments', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
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
      }))
    : []

  const paymentsByInvoiceId = normalizedPayments.reduce<Record<string, number>>((acc, payment) => {
    if (payment.invoiceId && payment.status === "verified") {
      acc[payment.invoiceId] = (acc[payment.invoiceId] ?? 0) + Number(payment.amount ?? 0)
    }
    return acc
  }, {})

  const outstandingInvoices = normalizedInvoices
    .map((invoice: any) => {
      const lease = normalizedLeases.find((l: any) => l.id === invoice.leaseId)
      const tenantId = invoice.tenantId ?? lease?.tenantId
      const tenant = tenantId ? normalizedTenants.find((t: any) => t.id === tenantId) : null
      const unit = normalizedUnits.find((u: any) => u.id === (invoice.unitId ?? lease?.unitId))
      const property = normalizedProperties.find((p: any) => p.id === (invoice.propertyId ?? unit?.propertyId))
      const invoiceAmount = Number(invoice.amount ?? 0)
      const amountPaid = paymentsByInvoiceId[invoice.id] ?? 0
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
    .filter((invoice: any) => invoice.balance > 0 && invoice.status !== "paid")

  const selectedInvoiceData = outstandingInvoices.find((invoice: any) => invoice.id === selectedInvoiceId)

  const recentPaymentRows = normalizedPayments.slice(0, 8).map((payment: any) => {
    const lease = normalizedLeases.find((l: any) => l.id === payment.leaseId)
    const tenantId = lease?.tenantId
    const tenant = tenantId ? normalizedTenants.find((t: any) => t.id === tenantId) : null
    const unit = normalizedUnits.find((u: any) => u.id === lease?.unitId)

    return {
      id: payment.id,
      amount: Number(payment.amount ?? 0),
      paymentMethod: payment.paymentMethod || "Unknown",
      paymentDate: payment.paymentDate,
      status: payment.status || "verified",
      tenantName: tenant?.fullName || "Direct Payment",
      unitLabel: unit?.unitNumber || "N/A",
    }
  })

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (actionsDisabled) {
        throw new Error("Select a client and property in the header before recording payments.")
      }
      if (!selectedInvoiceData) {
        throw new Error("Select an outstanding invoice before recording payments.")
      }
      if (!amount || !paymentMethod) {
        throw new Error("Please fill in all required fields.")
      }

      const payload = {
        leaseId: selectedInvoiceData.leaseId,
        invoiceId: selectedInvoiceData.id,
        amount: parseFloat(amount),
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod,
        reference: reference || null,
        notes: notes || null,
        status: "draft",
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
      setSelectedInvoiceId("")
      setAmount("")
      setPaymentMethod("")
      setReference("")
      setNotes("")
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
            <Button data-testid="button-record-payment">
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>
                Enter payment details to record a tenant payment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invoice">Outstanding Invoice</Label>
                <Select
                  value={selectedInvoiceId}
                  onValueChange={(value) => {
                    setSelectedInvoiceId(value)
                    const invoice = outstandingInvoices.find((item: any) => item.id === value)
                    if (invoice) {
                      setAmount(invoice.balance.toString())
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-invoice">
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {outstandingInvoices.length === 0 && (
                      <SelectItem value="none" disabled>
                        No outstanding invoices
                      </SelectItem>
                    )}
                    {outstandingInvoices.map((invoice: any) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber || invoice.id} - {invoice.tenantName} ({invoice.unitLabel}) • KSh {invoice.balance.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedInvoiceData && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Invoice</p>
                      <p className="font-mono">{selectedInvoiceData.invoiceNumber || selectedInvoiceData.id}</p>
                    </div>
                    <div>
                      <p className="font-medium">Outstanding Balance</p>
                      <p className="font-mono text-red-600">
                        KSh {selectedInvoiceData.balance.toLocaleString()}
                      </p>
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
                disabled={actionsDisabled || recordPaymentMutation.isPending || !selectedInvoiceId}
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
                      setSelectedInvoiceId(invoice.id)
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
                      {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : "—"}
                    </p>
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
      </div>
    </div>
  )
}