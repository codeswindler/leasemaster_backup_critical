import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useFilter } from "@/contexts/FilterContext"
import { Calendar, Building2, Receipt, Send, Edit, Trash2 } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

export function BulkInvoicing() {
  const [selectedProperty, setSelectedProperty] = useState("")
  const [selectedChargeCodes, setSelectedChargeCodes] = useState<string[]>([])
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [tenantAccounts, setTenantAccounts] = useState<any[]>([])
  const [showAccounts, setShowAccounts] = useState(false)
  const [editingCharges, setEditingCharges] = useState<{[key: string]: {[key: string]: number}}>({})
  const { toast } = useToast()
  const { selectedPropertyId, selectedLandlordId } = useFilter()

  // Fetch properties from API
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

  // Fetch tenants from API
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

  // Fetch units from API
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

  // Fetch leases from API
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

  // Standard charge codes for invoicing
  const chargeCodes = [
    { id: "rent", name: "Rent", type: "fixed" },
    { id: "water", name: "Water (Unit Based)", type: "variable" },
    { id: "garbage", name: "Garbage Fee", type: "fixed", amount: 500 },
    { id: "security", name: "Security Fee", type: "fixed", amount: 1000 },
    { id: "service", name: "Service Charge", type: "fixed", amount: 300 },
    { id: "electricity", name: "Electricity", type: "variable" }
  ]

  // Generate tenant accounts based on selected property and active leases
  const generateTenantAccounts = () => {
    if (!selectedProperty) return []

    const propertyUnits = units.filter((unit: any) => unit.propertyId === selectedProperty)
    const activeLeases = leases.filter((lease: any) => lease.status === 'active')
    
    return propertyUnits.map((unit: any) => {
      const unitLease = activeLeases.find((lease: any) => lease.unitId === unit.id)
      const tenant = unitLease ? tenants.find((t: any) => t.id === unitLease.tenantId) : null
      
      if (!unitLease || !tenant) return null
      
      const baseCharges: {[key: string]: number} = {}
      
      // Calculate charges based on selected charge codes
      selectedChargeCodes.forEach(chargeId => {
        const chargeCode = chargeCodes.find(c => c.id === chargeId)
        if (chargeCode) {
          switch (chargeId) {
            case 'rent':
              baseCharges[chargeId] = parseFloat(unitLease.rentAmount || '0')
              break
            case 'water':
              baseCharges[chargeId] = 0 // Will be calculated based on consumption
              break
            case 'garbage':
              baseCharges[chargeId] = chargeCode.amount || 500
              break
            case 'security':
              baseCharges[chargeId] = chargeCode.amount || 1000
              break
            case 'service':
              baseCharges[chargeId] = chargeCode.amount || 300
              break
            case 'electricity':
              baseCharges[chargeId] = 0 // Will be calculated based on consumption
              break
            default:
              baseCharges[chargeId] = chargeCode.amount || 0
          }
        }
      })

      return {
        id: unit.id,
        unit: unit.unitNumber,
        tenant: tenant.fullName,
        lease: unitLease,
        previousWater: 0,
        currentWater: 0,
        waterUnits: 0,
        charges: {
          ...baseCharges,
          ...editingCharges[unit.id] // Apply any manual edits
        }
      }
    }).filter(Boolean)
  }

  const handleChargeCodeChange = (chargeId: string, checked: boolean) => {
    if (checked) {
      setSelectedChargeCodes([...selectedChargeCodes, chargeId])
    } else {
      setSelectedChargeCodes(selectedChargeCodes.filter(id => id !== chargeId))
    }
  }

  // Load tenant accounts based on selected property and charge codes
  const handleLoadAccounts = () => {
    if (!selectedProperty || selectedChargeCodes.length === 0) {
      toast({
        title: "Missing Selection",
        description: "Please select a property and at least one charge code.",
        variant: "destructive"
      })
      return
    }

    const accounts = generateTenantAccounts()
    setTenantAccounts(accounts)
    setShowAccounts(true)
    
    toast({
      title: "Accounts Loaded",
      description: `Loaded ${accounts.length} tenant accounts for invoicing.`
    })
  }

  // Handle editing individual charge amounts
  const handleChargeEdit = (unitId: string, chargeCode: string, amount: number) => {
    setEditingCharges(prev => ({
      ...prev,
      [unitId]: {
        ...prev[unitId],
        [chargeCode]: amount
      }
    }))

    // Update tenant accounts with edited charge
    setTenantAccounts(prev => prev.map(account => {
      if (account.id === unitId) {
        return {
          ...account,
          charges: {
            ...account.charges,
            [chargeCode]: amount
          }
        }
      }
      return account
    }))
  }

  // Bulk invoice creation mutation
  const createBulkInvoices = useMutation({
    mutationFn: async (invoiceData: any) => {
      const results = []
      
      for (const account of tenantAccounts) {
        if (!account.lease) continue

        // Generate unique invoice number
        const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now()}-${account.id.slice(0, 8)}`
        
        // Calculate total amount
        const totalAmount = Object.values(account.charges).reduce((sum: number, amount: number) => sum + amount, 0)

        // Create invoice
        const invoice = await apiRequest(`/api/invoices`, {
          method: 'POST',
          body: JSON.stringify({
            leaseId: account.lease.id,
            invoiceNumber,
            description: `Monthly charges for ${account.unit}`,
            amount: totalAmount.toString(),
            dueDate: invoiceData.dueDate,
            issueDate: invoiceData.issueDate,
            status: 'draft'
          })
        })

        // Create invoice items for each charge
        for (const [chargeCode, amount] of Object.entries(account.charges)) {
          if (amount > 0) {
            await apiRequest(`/api/invoice-items`, {
              method: 'POST',
              body: JSON.stringify({
                invoiceId: invoice.id,
                chargeCode,
                description: chargeCodes.find(c => c.id === chargeCode)?.name || chargeCode,
                quantity: "1",
                unitPrice: amount.toString()
              })
            })
          }
        }

        results.push(invoice)
      }

      return results
    },
    onSuccess: (results) => {
      toast({
        title: "Invoices Created",
        description: `Successfully created ${results.length} invoices in draft status.`
      })
      
      // Reset form
      setTenantAccounts([])
      setShowAccounts(false)
      setEditingCharges({})
      
      // Invalidate invoice cache
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-items'] })
    },
    onError: (error) => {
      toast({
        title: "Error Creating Invoices",
        description: "There was an error creating the bulk invoices. Please try again.",
        variant: "destructive"
      })
      console.error('Bulk invoice creation error:', error)
    }
  })

  const handleSubmitInvoices = () => {
    if (tenantAccounts.length === 0) {
      toast({
        title: "No Accounts",
        description: "Please load tenant accounts first.",
        variant: "destructive"
      })
      return
    }

    const dueDate = new Date(invoiceDate)
    dueDate.setMonth(dueDate.getMonth() + 1) // Due date is one month from invoice date

    createBulkInvoices.mutate({
      issueDate: invoiceDate,
      dueDate: dueDate.toISOString().split('T')[0]
    })
  }

  const handleWaterUnitsChange = (accountId: string, newUnits: number) => {
    setTenantAccounts(accounts => 
      accounts.map(account => 
        account.id === accountId 
          ? { 
              ...account, 
              currentWater: account.previousWater + newUnits,
              waterUnits: newUnits,
              charges: {
                ...account.charges,
                water: newUnits * 50 // KSh 50 per unit
              }
            }
          : account
      )
    )
  }

  const getTotalAmount = (account: any) => {
    return Object.values(account.charges).reduce((sum: number, amount: any) => sum + (amount || 0), 0)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="bulk-invoicing-title">Bulk Invoicing</h1>
        <p className="text-muted-foreground">Create invoices for all tenants in a property</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Invoice Configuration</CardTitle>
            <CardDescription>Select property, charges, and date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger data-testid="select-property">
                  <SelectValue placeholder="Select property" />
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

            <div className="space-y-2">
              <Label>Charge Codes</Label>
              <div className="space-y-2">
                {chargeCodes.map((charge) => (
                  <div key={charge.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={charge.id}
                      checked={selectedChargeCodes.includes(charge.id)}
                      onCheckedChange={(checked) => handleChargeCodeChange(charge.id, !!checked)}
                      data-testid={`checkbox-${charge.id}`}
                    />
                    <Label htmlFor={charge.id} className="flex-1 cursor-pointer">
                      <div className="flex justify-between">
                        <span>{charge.name}</span>
                        {charge.amount && (
                          <span className="text-muted-foreground font-mono text-sm">
                            {charge.amount}
                          </span>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-date">Invoice Date</Label>
              <Input
                id="invoice-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                data-testid="input-invoice-date"
              />
            </div>

            <Button 
              onClick={handleLoadAccounts}
              className="w-full"
              disabled={!selectedProperty || selectedChargeCodes.length === 0 || !invoiceDate}
              data-testid="button-load-accounts"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Load Accounts
            </Button>
          </CardContent>
        </Card>

        {/* Tenant Accounts */}
        <div className="lg:col-span-2">
          {showAccounts ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Tenant Accounts
                  <Badge variant="secondary">
                    {tenantAccounts.length} accounts loaded
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Update water units and review charges before submitting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenantAccounts.map((account) => (
                    <div key={account.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{account.unit} - {account.tenant}</h4>
                        </div>
                        <Badge variant="outline" className="font-mono">
                          Total: KSh {getTotalAmount(account).toLocaleString()}
                        </Badge>
                      </div>

                      {selectedChargeCodes.includes("water") && (
                        <div className="grid grid-cols-4 gap-4 p-3 bg-muted/50 rounded">
                          <div>
                            <Label className="text-xs">Previous Units</Label>
                            <p className="font-mono">{account.previousWater}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Current Units</Label>
                            <Input
                              type="number"
                              value={account.currentWater}
                              onChange={(e) => {
                                const inputValue = e.target.value
                                if (inputValue === '') {
                                  // Allow empty input, but don't calculate units yet
                                  setTenantAccounts(accounts => 
                                    accounts.map(acc => 
                                      acc.id === account.id 
                                        ? { ...acc, currentWater: account.previousWater }
                                        : acc
                                    )
                                  )
                                } else {
                                  const newCurrent = parseInt(inputValue)
                                  if (!isNaN(newCurrent) && newCurrent >= account.previousWater) {
                                    const units = newCurrent - account.previousWater
                                    handleWaterUnitsChange(account.id, units)
                                  }
                                }
                              }}
                              min={account.previousWater}
                              className="h-8"
                              data-testid={`input-water-${account.unit}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Units Used</Label>
                            <p className="font-mono">{account.waterUnits}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Water Charge</Label>
                            <p className="font-mono">KSh {account.charges.water}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {selectedChargeCodes.map(chargeId => {
                          const charge = chargeCodes.find(c => c.id === chargeId)
                          if (!charge) return null
                          return (
                            <div key={chargeId} className="flex justify-between">
                              <span>{charge.name}:</span>
                              <span className="font-mono">KSh {account.charges[chargeId]?.toLocaleString() || 0}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowAccounts(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitInvoices} data-testid="button-submit-invoices">
                      <Send className="h-4 w-4 mr-2" />
                      Submit Invoices
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Configure Invoice Settings</h3>
                <p className="text-muted-foreground">
                  Select property, charge codes, and date to load tenant accounts
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}