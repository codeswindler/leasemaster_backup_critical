import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Search, Receipt, Building2 } from "lucide-react"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { useToast } from "@/hooks/use-toast"
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
  const [dueDate, setDueDate] = useState("")
  const [selectedUnit, setSelectedUnit] = useState("")
  const [unitSearch, setUnitSearch] = useState("")
  const [chargeAmounts, setChargeAmounts] = useState<Record<string, number>>({})
  const { selectedPropertyId, selectedLandlordId, setSelectedPropertyId } = useFilter()
  const { toast } = useToast()

  useEffect(() => {
    if (selectedPropertyId) {
      setSelectedProperty(selectedPropertyId)
    } else {
      setSelectedProperty("")
      setSelectedUnit("")
      setSelectedChargeCodes([])
    }
  }, [selectedPropertyId])

  useEffect(() => {
    if (!invoiceDate) {
      setDueDate("")
      return
    }
    if (!dueDate) {
      const nextDue = new Date(invoiceDate)
      nextDue.setMonth(nextDue.getMonth() + 1)
      setDueDate(nextDue.toISOString().split("T")[0])
    }
  }, [invoiceDate, dueDate])

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

  const { data: chargeCodes = [] } = useQuery({
    queryKey: ["/api/charge-codes", selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/charge-codes${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: !!selectedPropertyId,
  })

  const { data: waterReadings = [] } = useQuery({
    queryKey: ["/api/water-readings", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/water-readings${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: !!selectedPropertyId,
  })

  const parseAmount = (value: any) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const getReadingTimestamp = (reading: any) => {
    const timestampValue =
      reading.lastModifiedAt ||
      reading.createdAt ||
      reading.last_modified_at ||
      reading.created_at ||
      reading.readingDate ||
      reading.reading_date
    const timestamp = timestampValue ? new Date(timestampValue).getTime() : 0
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  const getReadingConsumption = (reading: any) => {
    const currentValue = parseAmount(reading?.current_reading ?? reading?.currentReading)
    const previousValue = parseAmount(reading?.previous_reading ?? reading?.previousReading)
    if (Number.isFinite(currentValue) && Number.isFinite(previousValue)) {
      return Math.max(0, currentValue - previousValue)
    }
    return parseAmount(reading?.consumption)
  }

  const normalizeChargeAmounts = (value: any) => {
    if (!value || value === "null") return {}
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === "object" ? parsed : {}
      } catch {
        return {}
      }
    }
    return typeof value === "object" ? value : {}
  }

  // Transform properties data
  const properties = propertiesData.map((prop: any) => ({
    id: prop.id,
    name: prop.name,
    landlordId: prop.landlordId ?? prop.landlord_id,
  }))

  const normalizedUnits = Array.isArray(units)
    ? units.map((unit: any) => ({
      id: unit.id,
      unitNumber: unit.unitNumber ?? unit.unit_number,
      propertyId: unit.propertyId ?? unit.property_id,
      chargeAmounts: normalizeChargeAmounts(unit.chargeAmounts ?? unit.charge_amounts),
      status: unit.status,
    }))
    : []

  const normalizedLeases = Array.isArray(leases)
    ? leases.map((lease: any) => ({
      id: lease.id,
      unitId: lease.unitId ?? lease.unit_id,
      tenantId: lease.tenantId ?? lease.tenant_id,
      rentAmount: lease.rentAmount ?? lease.rent_amount,
      waterRatePerUnit: lease.waterRatePerUnit ?? lease.water_rate_per_unit,
      status: lease.status,
    }))
    : []

  const normalizedTenants = Array.isArray(tenants)
    ? tenants.map((tenant: any) => ({
      id: tenant.id,
      fullName: tenant.fullName ?? tenant.full_name,
    }))
    : []

  const propertyChargeCodes = Array.isArray(chargeCodes)
    ? chargeCodes.map((code: any) => ({
      id: code.id,
      name: code.name,
      description: code.description,
    }))
    : []

  const chargeOptions = [
    { id: "rent", name: "Rent" },
    { id: "water", name: "Water (Metered)" },
    ...propertyChargeCodes,
  ]

  const uniqueLandlordIds = new Set(properties.map((property) => property.landlordId).filter(Boolean))
  const requiresLandlordSelection = uniqueLandlordIds.size > 1 && (!selectedLandlordId || selectedLandlordId === "all")
  const actionsDisabled = !selectedPropertyId || requiresLandlordSelection

  const getConsumptionMonthKey = (dateValue: string) => {
    if (!dateValue) return ""
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return ""
    const consumptionDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)
    return `${consumptionDate.getFullYear()}-${String(consumptionDate.getMonth() + 1).padStart(2, "0")}`
  }

  const consumptionMonthKey = useMemo(() => getConsumptionMonthKey(invoiceDate), [invoiceDate])

  const latestWaterByUnit = useMemo(() => {
    const map = new Map<string, any>()
    waterReadings.forEach((reading: any) => {
      const unitId = reading.unitId ?? reading.unit_id
      if (!unitId) return
      const readingDateValue = reading.readingDate ?? reading.reading_date ?? reading.createdAt ?? reading.created_at
      const readingDate = new Date(readingDateValue)
      if (!consumptionMonthKey || Number.isNaN(readingDate.getTime())) return
      const monthKey = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, "0")}`
      if (monthKey !== consumptionMonthKey) return
      const dateValue = getReadingTimestamp(reading)
      const existing = map.get(unitId)
      if (!existing || dateValue > existing.dateValue) {
        map.set(unitId, { ...reading, dateValue })
      }
    })
    return map
  }, [waterReadings, consumptionMonthKey])

  useEffect(() => {
    if (!selectedPropertyId) return
    if (selectedChargeCodes.length === 0 && chargeOptions.length > 0) {
      setSelectedChargeCodes(chargeOptions.map((charge) => charge.id))
    }
  }, [selectedPropertyId, chargeOptions.length])

  // Create real units with tenant information
  const realUnits = normalizedUnits.map((unit: any) => {
    const activeLease = normalizedLeases.find((lease: any) => lease.unitId === unit.id && lease.status === "active")
    const tenant = activeLease ? normalizedTenants.find((t: any) => t.id === activeLease.tenantId) : null

    return {
      id: unit.id,
      unit: unit.unitNumber,
      tenant: tenant ? tenant.fullName : "Vacant",
      rent: activeLease ? parseAmount(activeLease.rentAmount) : 0,
      lease: activeLease,
      chargeAmounts: unit.chargeAmounts,
      status: unit.status,
    }
  })

  const filteredUnits = realUnits.filter((unit: any) => 
    unit.unit.toLowerCase().includes(unitSearch.toLowerCase()) ||
    unit.tenant.toLowerCase().includes(unitSearch.toLowerCase())
  )

  const selectedUnitData = realUnits.find((unit: any) => unit.id === selectedUnit)
  const selectedLease = selectedUnitData?.lease
  const latestReading = selectedUnitData ? latestWaterByUnit.get(selectedUnitData.id) : null
  const waterUnits = latestReading ? getReadingConsumption(latestReading) : 0
  const waterRate = parseAmount(selectedLease?.waterRatePerUnit)
  const waterCharge = Number.isFinite(waterUnits) && waterUnits > 0 ? waterUnits * waterRate : 0

  const handleChargeCodeChange = (chargeId: string, checked: boolean) => {
    if (checked) {
      setSelectedChargeCodes([...selectedChargeCodes, chargeId])
    } else {
      setSelectedChargeCodes(selectedChargeCodes.filter(id => id !== chargeId))
    }
  }

  useEffect(() => {
    if (!selectedUnitData) {
      setChargeAmounts({})
      return
    }
    const baseCharges: Record<string, number> = {}
    selectedChargeCodes.forEach((chargeId) => {
      if (chargeId === "rent") {
        baseCharges[chargeId] = parseAmount(selectedLease?.rentAmount)
        return
      }
      if (chargeId === "water") {
        baseCharges[chargeId] = waterCharge
        return
      }
      baseCharges[chargeId] = parseAmount(selectedUnitData.chargeAmounts?.[chargeId] ?? 0)
    })
    setChargeAmounts(baseCharges)
  }, [selectedUnitData?.id, selectedChargeCodes.join(","), waterCharge])

  const calculateTotal = () => {
    return Object.values(chargeAmounts).reduce((sum, amount) => sum + parseAmount(amount), 0)
  }

  const createSingleInvoice = useMutation({
    mutationFn: async () => {
      if (!selectedLease) {
        throw new Error("Selected unit has no active lease.")
      }
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now()}-${selectedLease.id.slice(0, 8)}`
      const totalAmount = calculateTotal()
      const invoiceResponse = await apiRequest("POST", "/api/invoices", {
        leaseId: selectedLease.id,
        invoiceNumber,
        description: `Monthly charges for ${selectedUnitData?.unit}`,
        amount: totalAmount.toString(),
        dueDate,
        issueDate: invoiceDate,
        status: "draft",
      })
      const invoice = await invoiceResponse.json()

      for (const [chargeCode, amount] of Object.entries(chargeAmounts)) {
        if (parseAmount(amount) > 0) {
          await apiRequest("POST", "/api/invoice-items", {
            invoiceId: invoice.id,
            chargeCode,
            description: chargeOptions.find((c) => c.id === chargeCode)?.name || chargeCode,
            quantity: "1",
            unitPrice: parseAmount(amount).toString(),
          })
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "Invoice created",
        description: "The invoice was saved in draft status.",
      })
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] })
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-items"] })
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
      setSelectedUnit("")
      setSelectedChargeCodes([])
      setChargeAmounts({})
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create invoice",
        description: error.message || "Please check the invoice details.",
        variant: "destructive",
      })
    },
  })

  const handleSubmitInvoice = () => {
    if (requiresLandlordSelection) {
      toast({
        title: "Landlord Required",
        description: "Select a landlord in the header before submitting invoices.",
        variant: "destructive",
      })
      return
    }
    if (actionsDisabled) {
      toast({
        title: "Property Required",
        description: "Select a property in the header before submitting invoices.",
        variant: "destructive",
      })
      return
    }
    if (!selectedUnit || selectedChargeCodes.length === 0) {
      toast({
        title: "Missing Selection",
        description: "Please select a unit and at least one charge code.",
        variant: "destructive",
      })
      return
    }
    if (!invoiceDate || !dueDate) {
      toast({
        title: "Missing Dates",
        description: "Select both invoice and due dates.",
        variant: "destructive",
      })
      return
    }
    createSingleInvoice.mutate()
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
            {requiresLandlordSelection && (
              <div className="text-sm text-muted-foreground">
                Select a landlord in the header to continue.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Select
                value={selectedProperty}
                onValueChange={(value) => {
                  setSelectedProperty(value)
                  setSelectedPropertyId(value || null)
                  setSelectedUnit("")
                }}
                disabled={actionsDisabled}
              >
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
                {chargeOptions.map((charge) => (
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
                        {charge.id !== "rent" && charge.id !== "water" && (
                          <span className="text-muted-foreground font-mono text-sm">Property charge</span>
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
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="input-due-date"
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
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded">
                    <div>
                      <Label className="text-xs">Units Used</Label>
                      <p className="font-mono">{waterUnits || 0}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Rate (KSH)</Label>
                      <p className="font-mono">{waterRate.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Last Reading</Label>
                      <p className="font-mono">
                        {latestReading?.readingDate || latestReading?.reading_date
                          ? new Date(latestReading?.readingDate ?? latestReading?.reading_date).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs">Water Charge</Label>
                      <p className="font-mono">KSh {parseAmount(chargeAmounts.water).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">Invoice Breakdown</h4>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    {selectedChargeCodes.map((chargeId) => {
                      const charge = chargeOptions.find((c) => c.id === chargeId)
                      if (!charge) return null
                      const value = chargeAmounts[chargeId] ?? 0
                      return (
                        <div key={chargeId} className="flex items-center justify-between gap-3">
                          <span>{charge.name}</span>
                          <Input
                            type="number"
                            value={value}
                            onChange={(event) =>
                              setChargeAmounts((prev) => ({
                                ...prev,
                                [chargeId]: parseAmount(event.target.value),
                              }))
                            }
                            className="h-8 w-28 font-mono"
                          />
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
                  disabled={actionsDisabled || selectedChargeCodes.length === 0 || createSingleInvoice.isPending}
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