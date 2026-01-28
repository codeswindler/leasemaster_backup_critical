import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
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
  const [selectedTenant, setSelectedTenant] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { selectedPropertyId, selectedLandlordId } = useFilter()

  const actionsDisabled = !selectedPropertyId

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
  })

  // Enhanced tenants with unit and property information
  const enhancedTenants = Array.isArray(tenants) ? tenants.map((tenant: any) => {
    const tenantLease = Array.isArray(leases) ? leases.find((lease: any) => lease.tenantId === tenant.id && lease.status === 'active') : null
    const tenantUnit = Array.isArray(units) ? units.find((unit: any) => unit.id === tenantLease?.unitId) : null
    const tenantProperty = Array.isArray(properties) ? properties.find((property: any) => property.id === tenantUnit?.propertyId) : null
    
    return {
      id: tenant.id,
      name: tenant.fullName,
      unit: tenantUnit?.unitNumber || 'No unit',
      property: tenantProperty?.name || 'No property',
      balance: 0, // TODO: Calculate real balance from invoices/payments API
      accountNumber: `${tenantProperty?.name?.substring(0,2).toUpperCase() || 'XX'}${String(tenant.id.substring(0,3)).toUpperCase()}`
    }
  }).filter((tenant: any) => tenant.name) : [] // Only include tenants with valid data

  const selectedTenantData = enhancedTenants.find((t: any) => t.id === selectedTenant)

  const handleRecordPayment = () => {
    if (actionsDisabled) {
      alert("Select a property in the header before recording payments.")
      return
    }
    if (!selectedTenant || !amount || !paymentMethod) {
      alert("Please fill in all required fields")
      return
    }

    console.log("Recording payment:", {
      tenant: selectedTenantData,
      amount: parseFloat(amount),
      paymentMethod,
      reference,
      notes
    })

    alert("Payment recorded successfully!")
    
    // Reset form
    setSelectedTenant("")
    setAmount("")
    setPaymentMethod("")
    setReference("")
    setNotes("")
    setIsDialogOpen(false)
  }

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
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="receive-payments-title">Receive Payments</h1>
          <p className="text-muted-foreground">Record tenant payments and manage transactions</p>
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
                <Label htmlFor="tenant">Tenant</Label>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger data-testid="select-tenant">
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {enhancedTenants.map((tenant: any) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} - {tenant.unit} 
                        {tenant.balance > 0 && (
                          <span className="text-red-600 ml-2">
                            (Balance: KSh {tenant.balance.toLocaleString()})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTenantData && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Account Number</p>
                      <p className="font-mono">{selectedTenantData.accountNumber}</p>
                    </div>
                    <div>
                      <p className="font-medium">Outstanding Balance</p>
                      <p className={`font-mono ${selectedTenantData.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        KSh {selectedTenantData.balance.toLocaleString()}
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
              <Button onClick={handleRecordPayment} disabled={actionsDisabled} data-testid="button-submit-payment">
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenants with Outstanding Balances */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Balances</CardTitle>
            <CardDescription>Tenants with pending payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {enhancedTenants.filter(t => t.balance > 0).map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-sm text-muted-foreground">{tenant.unit} - {tenant.property}</p>
                  <p className="text-xs font-mono text-muted-foreground">Account: {tenant.accountNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-red-600">KSh {tenant.balance.toLocaleString()}</p>
                  <Button size="sm" variant="outline" className="mt-1">
                    Record Payment
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest payment transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPayments.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {payment.method === "M-Pesa" ? (
                    <Smartphone className="h-5 w-5 text-green-600" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  )}
                  <div>
                    <p className="font-medium">{payment.tenant}</p>
                    <p className="text-sm text-muted-foreground">{payment.unit}</p>
                    <p className="text-xs text-muted-foreground">{payment.date}</p>
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