import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useFilter } from "@/contexts/FilterContext"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { formatWithOffset, usePropertyTimezoneOffset } from "@/lib/timezone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { getPaletteByIndex } from "@/lib/palette"

export function IncomingPayments() {
  const { selectedAgentId, selectedPropertyId, selectedLandlordId } = useFilter()
  const { toast } = useToast()
  const { timezoneOffsetMinutes } = usePropertyTimezoneOffset()
  const pagePaletteSeed = useMemo(() => Math.floor(Math.random() * 6), [])
  const listPaletteSeed = useMemo(() => Math.floor(Math.random() * 6), [])
  const pagePalette = getPaletteByIndex(pagePaletteSeed)
  const listPalette = getPaletteByIndex(listPaletteSeed)

  const [searchTerm, setSearchTerm] = useState("")
  const [incomingAllocation, setIncomingAllocation] = useState<any>(null)
  const [allocationSearch, setAllocationSearch] = useState("")
  const [allocationLeaseId, setAllocationLeaseId] = useState<string>("")
  const [allocationInvoiceId, setAllocationInvoiceId] = useState<string>("")

  const isLandlordSelected = !!selectedLandlordId && selectedLandlordId !== "all"
  const actionsDisabled = !selectedPropertyId || !isLandlordSelected

  const { data: incomingPayments = [], isLoading: incomingLoading } = useQuery({
    queryKey: ["/api/incoming-payments", selectedPropertyId, selectedLandlordId, selectedAgentId, "all"],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/incoming-payments?${params.toString()}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
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

  const normalizedLeases = Array.isArray(leases)
    ? leases.map((lease: any) => ({
        ...lease,
        tenantId: lease.tenantId ?? lease.tenant_id,
        unitId: lease.unitId ?? lease.unit_id,
      }))
    : []

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
      }))
    : []

  const normalizedInvoices = Array.isArray(invoices)
    ? invoices.map((invoice: any) => ({
        ...invoice,
        leaseId: invoice.leaseId ?? invoice.lease_id,
        invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number,
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

  const filteredIncomingPayments = normalizedIncomingPayments.filter((payment: any) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    const reference =
      payment.mpesa_receipt ||
      payment.mpesaReceipt ||
      payment.reference ||
      payment.account_number ||
      ""
    return (
      String(payment.tenantName || "").toLowerCase().includes(term) ||
      String(payment.unitNumber || "").toLowerCase().includes(term) ||
      String(reference).toLowerCase().includes(term)
    )
  })

  const allocationLeaseOptions = normalizedLeases.map((lease: any) => {
    const tenant = normalizedTenants.find((t: any) => String(t.id) === String(lease.tenantId))
    const unit = normalizedUnits.find((u: any) => String(u.id) === String(lease.unitId))
    const tenantName = tenant?.fullName ?? `${tenant?.firstName || ""} ${tenant?.lastName || ""}`.trim()
    return {
      leaseId: String(lease.id),
      tenantName: tenantName || "Unknown tenant",
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incoming Payments</h1>
          <p className="text-muted-foreground">Integrated M-Pesa/bank transactions</p>
        </div>
      </div>

      <Card className={`vibrant-card border-2 ${pagePalette.border} ${pagePalette.card}`}>
        <CardHeader>
          <CardTitle>Filter Incoming</CardTitle>
          <CardDescription>Search payer, unit, or reference.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="incoming-search">Search</Label>
            <Input
              id="incoming-search"
              placeholder="Search payer, unit, receipt..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="bg-white/70 dark:bg-slate-900/40"
            />
          </div>
          <div className="flex items-end">
            <Badge variant="outline">{filteredIncomingPayments.length}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className={`vibrant-card border-2 ${listPalette.border} ${listPalette.card}`}>
        <CardHeader>
          <CardTitle>All Incoming Transactions</CardTitle>
          <CardDescription>Allocate unallocated payments to tenants.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {actionsDisabled && (
            <div className="text-sm text-muted-foreground">
              Select a client and property in the header to view incoming transactions.
            </div>
          )}
          {incomingLoading ? (
            <div className="text-center py-6 text-muted-foreground">Loading incoming payments...</div>
          ) : filteredIncomingPayments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No incoming payments yet.</div>
          ) : (
            filteredIncomingPayments.map((payment: any) => {
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
              const dateLabel = formatWithOffset(rawDate, timezoneOffsetMinutes)
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
                      <Badge variant="secondary">{payment.status || "received"}</Badge>
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
                        disabled={actionsDisabled}
                      >
                        Allocate
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

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
                onChange={(event) => setAllocationSearch(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Select Tenant/Unit</Label>
              <div className="max-h-52 overflow-auto rounded-md border border-muted p-2 space-y-1">
                {filteredAllocationOptions.map((option) => (
                  <button
                    key={option.leaseId}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
                      allocationLeaseId === String(option.leaseId) ? "bg-muted" : ""
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
                  <div className="text-sm text-muted-foreground px-2 py-3">No matches found.</div>
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
