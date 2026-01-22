import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus, Search, Building2, Receipt } from "lucide-react"
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

export function SingleInvoicing() {
  const [selectedProperty, setSelectedProperty] = useState("")
  const [selectedChargeCodes, setSelectedChargeCodes] = useState<string[]>([])
  const [invoiceDate, setInvoiceDate] = useState("")
  const [selectedUnit, setSelectedUnit] = useState("")
  const [unitSearch, setUnitSearch] = useState("")
  const [waterUnits, setWaterUnits] = useState(0)
  const { selectedPropertyId, selectedLandlordId } = useFilter()

  // Fetch real data from API
  const { data: propertiesData = [] } = useQuery({ 
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

  // Transform properties data
  const properties = propertiesData.map((prop: any) => ({
    id: prop.id,
    name: prop.name,
    prefix: prop.name.split(' ').map((word: string) => word[0]).join('').substring(0, 2).toUpperCase()
  }))

  const chargeCodes = [
    { id: "rent", name: "Rent", amount: "KSh 20,000" },
    { id: "water", name: "Water (Unit Based)", type: "variable" },
    { id: "garbage", name: "Garbage Fee", amount: "KSh 500" },
    { id: "security", name: "Security Fee", amount: "KSh 1,000" }
  ]

  // Create real units with tenant information
  const realUnits = units.map((unit: any) => {
    const activeLease = leases.find((lease: any) => lease.unitId === unit.id && lease.status === 'active')
    const tenant = activeLease ? tenants.find((t: any) => t.id === activeLease.tenantId) : null
    
    return {
      id: unit.id,
      unit: unit.unitNumber,
      tenant: tenant ? tenant.fullName : 'Vacant',
      type: unit.type || 'Unknown',
      rent: activeLease ? parseFloat(activeLease.rentAmount) : 0
    }
  })

  const filteredUnits = realUnits.filter((unit: any) => 
    unit.unit.toLowerCase().includes(unitSearch.toLowerCase()) ||
    unit.tenant.toLowerCase().includes(unitSearch.toLowerCase())
  )

  const selectedUnitData = realUnits.find((unit: any) => unit.id === selectedUnit)

  const handleChargeCodeChange = (chargeId: string, checked: boolean) => {
    if (checked) {
      setSelectedChargeCodes([...selectedChargeCodes, chargeId])
    } else {
      setSelectedChargeCodes(selectedChargeCodes.filter(id => id !== chargeId))
    }
  }

  const calculateTotal = () => {
    let total = 0
    if (selectedUnitData) {
      selectedChargeCodes.forEach(chargeId => {
        if (chargeId === "rent") {
          total += selectedUnitData.rent
        } else if (chargeId === "water") {
          total += waterUnits * 50 // KSh 50 per unit
        } else if (chargeId === "garbage") {
          total += 500
        } else if (chargeId === "security") {
          total += 1000
        }
      })
    }
    return total
  }

  const handleSubmitInvoice = () => {
    if (!selectedUnit || selectedChargeCodes.length === 0) {
      alert("Please select a unit and at least one charge code")
      return
    }

    console.log("Creating single invoice:", {
      unit: selectedUnitData,
      charges: selectedChargeCodes,
      waterUnits,
      total: calculateTotal()
    })
    
    alert("Invoice created successfully!")
    // Form stays on the same page for adding another invoice
    setSelectedUnit("")
    setSelectedChargeCodes([])
    setWaterUnits(0)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="single-invoicing-title">Single Invoicing</h1>
        <p className="text-muted-foreground">Create individual invoices for specific tenants</p>
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
          </CardContent>
        </Card>

        {/* Unit Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Unit</CardTitle>
            <CardDescription>Search and select the tenant unit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit-search">Search Units</Label>
              <Input
                id="unit-search"
                placeholder="Type unit or tenant name..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                data-testid="input-unit-search"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredUnits.map((unit) => (
                <div 
                  key={unit.id}
                  className={`p-3 border rounded-lg cursor-pointer hover-elevate ${
                    selectedUnit === unit.id ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedUnit(unit.id)}
                  data-testid={`unit-option-${unit.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{unit.unit}</p>
                      <p className="text-sm text-muted-foreground">{unit.tenant}</p>
                      <p className="text-xs text-muted-foreground">{unit.type}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      KSh {unit.rent.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {filteredUnits.length === 0 && unitSearch && (
              <div className="text-center py-4 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2" />
                <p>No units found matching "{unitSearch}"</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Review and customize the invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedUnitData ? (
              <>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium">{selectedUnitData.unit} - {selectedUnitData.tenant}</h4>
                  <p className="text-sm text-muted-foreground">{selectedUnitData.type}</p>
                </div>

                {selectedChargeCodes.includes("water") && (
                  <div className="space-y-2">
                    <Label htmlFor="water-units">Water Units</Label>
                    <Input
                      id="water-units"
                      type="number"
                      value={waterUnits}
                      onChange={(e) => setWaterUnits(parseInt(e.target.value) || 0)}
                      placeholder="Enter water units used"
                      data-testid="input-water-units"
                    />
                    <p className="text-xs text-muted-foreground">
                      Rate: KSh 50 per unit
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">Invoice Breakdown</h4>
                  <div className="space-y-1 text-sm">
                    {selectedChargeCodes.map(chargeId => {
                      const charge = chargeCodes.find(c => c.id === chargeId)
                      if (!charge) return null
                      
                      let amount = 0
                      if (chargeId === "rent") amount = selectedUnitData.rent
                      else if (chargeId === "water") amount = waterUnits * 50
                      else if (chargeId === "garbage") amount = 500
                      else if (chargeId === "security") amount = 1000

                      return (
                        <div key={chargeId} className="flex justify-between">
                          <span>{charge.name}:</span>
                          <span className="font-mono">KSh {amount.toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>
                  
                  {selectedChargeCodes.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span className="font-mono">KSh {calculateTotal().toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSubmitInvoice}
                  className="w-full"
                  disabled={selectedChargeCodes.length === 0}
                  data-testid="button-submit-invoice"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Submit Invoice
                </Button>
              </>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Unit</h3>
                <p className="text-muted-foreground">
                  Search and select a unit to create an invoice
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}