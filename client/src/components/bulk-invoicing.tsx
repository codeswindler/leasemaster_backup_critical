import { useState, useEffect, useMemo } from "react"
import { useLocation } from "wouter"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useFilter } from "@/contexts/FilterContext"
import { Calendar, Building2, Receipt, Send } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type TenantAccount = {
  id: string
  unit: string
  lease?: { id: string } | null
  charges: Record<string, number>
  tenant?: string
  isVacant?: boolean
  waterUnits?: number
  waterRate?: number
  lastReadingDate?: string | null
}

type PropertySummary = {
  id: string
  name: string
}

const bulkInvoiceVariants = [
  "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-blue-900/50",
  "bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-emerald-900/50",
  "bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-rose-900/50",
  "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-amber-900/50",
  "bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-violet-900/50",
  "bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-cyan-900/50",
]

export function BulkInvoicing() {
  const [selectedProperty, setSelectedProperty] = useState("")
  const [selectedChargeCodes, setSelectedChargeCodes] = useState<string[]>([])
  const bulkInvoiceSeed = useMemo(
    () => Math.floor(Math.random() * bulkInvoiceVariants.length),
    []
  )
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState("")
  const [tenantAccounts, setTenantAccounts] = useState<TenantAccount[]>([])
  const [showAccounts, setShowAccounts] = useState(false)
  const [editingCharges, setEditingCharges] = useState<{[key: string]: {[key: string]: number}}>({})
  const [missingWaterAccounts, setMissingWaterAccounts] = useState<TenantAccount[]>([])
  const [isWaterPromptOpen, setIsWaterPromptOpen] = useState(false)
  const { toast } = useToast()
  const { selectedPropertyId, selectedLandlordId, setSelectedPropertyId } = useFilter()
  const [, setLocation] = useLocation()

  useEffect(() => {
    if (selectedPropertyId) {
      setSelectedProperty(selectedPropertyId)
    } else {
      setSelectedProperty("")
      setShowAccounts(false)
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


  // Fetch properties from API
  const { data: properties = [] } = useQuery<PropertySummary[]>({
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

  const normalizedProperties = Array.isArray(properties)
    ? properties.map((property: any) => ({
      id: property.id,
      name: property.name,
      landlordId: property.landlordId ?? property.landlord_id,
    }))
    : []

  const normalizedUnits = Array.isArray(units)
    ? units.map((unit: any) => ({
      id: unit.id,
      propertyId: unit.propertyId ?? unit.property_id,
      unitNumber: unit.unitNumber ?? unit.unit_number,
      status: unit.status,
      chargeAmounts: normalizeChargeAmounts(unit.chargeAmounts ?? unit.charge_amounts),
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

  useEffect(() => {
    if (!selectedPropertyId) return
    if (selectedChargeCodes.length === 0 && chargeOptions.length > 0) {
      setSelectedChargeCodes(chargeOptions.map((charge) => charge.id))
    }
  }, [selectedPropertyId, chargeOptions.length])

  const uniqueLandlordIds = new Set(normalizedProperties.map((property) => property.landlordId).filter(Boolean))
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

  // Generate tenant accounts based on selected property and active leases
  const generateTenantAccounts = () => {
    if (!selectedPropertyId) return []

    const propertyUnits = normalizedUnits.filter((unit) => unit.propertyId === selectedPropertyId)
    const activeLeases = normalizedLeases.filter((lease) => lease.status === "active")

    return propertyUnits.flatMap((unit) => {
      const unitLease = activeLeases.find((lease) => lease.unitId === unit.id)
      const tenant = unitLease ? normalizedTenants.find((t) => t.id === unitLease.tenantId) : null
      if (!unitLease || !tenant) {
        return []
      }

      const latestReading = latestWaterByUnit.get(unit.id)
      const consumption = latestReading ? getReadingConsumption(latestReading) : 0
      const waterUnits = Number.isFinite(consumption) && consumption > 0 ? consumption : 0
      const waterRate = unitLease ? parseAmount(unitLease.waterRatePerUnit) : 0
      const waterCharge = waterUnits * waterRate

      const baseCharges: Record<string, number> = {}
      selectedChargeCodes.forEach((chargeId) => {
        if (chargeId === "rent") {
          baseCharges[chargeId] = unitLease ? parseAmount(unitLease.rentAmount) : 0
          return
        }
        if (chargeId === "water") {
          baseCharges[chargeId] = unitLease ? waterCharge : 0
          return
        }
        baseCharges[chargeId] = unitLease ? parseAmount(unit.chargeAmounts?.[chargeId] ?? 0) : 0
      })

      return [{
        id: unit.id,
        unit: unit.unitNumber,
        tenant: tenant?.fullName || "Unknown tenant",
        lease: unitLease,
        isVacant: false,
        waterUnits,
        waterRate,
        lastReadingDate: latestReading?.readingDate ?? latestReading?.reading_date ?? latestReading?.createdAt ?? latestReading?.created_at,
        charges: {
          ...baseCharges,
          ...editingCharges[unit.id],
        },
      }]
    })
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
    if (requiresLandlordSelection) {
      toast({
        title: "Landlord Required",
        description: "Select a landlord in the header before loading accounts.",
        variant: "destructive"
      })
      return
    }
    if (actionsDisabled) {
      toast({
        title: "Property Required",
        description: "Select a property in the header before loading accounts.",
        variant: "destructive"
      })
      return
    }
    if (!selectedPropertyId || selectedChargeCodes.length === 0) {
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
    const account = tenantAccounts.find((item) => item.id === unitId)
    if (account?.isVacant) {
      return
    }
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
      const targetAccounts: TenantAccount[] = invoiceData.accounts ?? tenantAccounts
      const results = []
      
      for (const account of targetAccounts) {
        if (!account.lease) continue

        // Calculate total amount
        const charges = account.charges || {}
        const totalAmount = Object.values(charges).reduce((sum, amount) => sum + amount, 0)

        // Create invoice
        const invoiceResponse = await apiRequest("POST", "/api/invoices", {
          leaseId: account.lease.id,
          description: `Monthly charges for ${account.unit}`,
          amount: totalAmount.toString(),
          dueDate: invoiceData.dueDate,
          issueDate: invoiceData.issueDate,
          status: "draft",
        })
        const invoice = await invoiceResponse.json()

        // Create invoice items for each charge
        for (const [chargeCode, amount] of Object.entries(charges)) {
          if (amount > 0) {
            await apiRequest("POST", "/api/invoice-items", {
              invoiceId: invoice.id,
              chargeCode,
              description: chargeOptions.find((c) => c.id === chargeCode)?.name || chargeCode,
              quantity: "1",
              unitPrice: amount.toString(),
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
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] })
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
    if (requiresLandlordSelection) {
      toast({
        title: "Landlord Required",
        description: "Select a landlord in the header before submitting invoices.",
        variant: "destructive"
      })
      return
    }
    if (actionsDisabled) {
      toast({
        title: "Property Required",
        description: "Select a property in the header before submitting invoices.",
        variant: "destructive"
      })
      return
    }
    if (tenantAccounts.length === 0) {
      toast({
        title: "No Accounts",
        description: "Please load tenant accounts first.",
        variant: "destructive"
      })
      return
    }
    if (!invoiceDate || !dueDate) {
      toast({
        title: "Missing Dates",
        description: "Select both invoice and due dates.",
        variant: "destructive"
      })
      return
    }

    const needsWater = selectedChargeCodes.includes("water")
    if (needsWater) {
      const missing = tenantAccounts.filter(
        (account) => account.lease && !latestWaterByUnit.get(account.id)
      )
      if (missing.length > 0) {
        setMissingWaterAccounts(missing)
        setIsWaterPromptOpen(true)
        return
      }
    }

    createBulkInvoices.mutate({
      issueDate: invoiceDate,
      dueDate
    })
  }

  const getTotalAmount = (account: any) => {
    return Object.values(account.charges).reduce((sum: number, amount: any) => sum + parseAmount(amount), 0)
  }

  return (
    <div className="p-6 space-y-6">
      <Dialog open={isWaterPromptOpen} onOpenChange={setIsWaterPromptOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Missing Water Readings</DialogTitle>
            <DialogDescription>
              {missingWaterAccounts.length} accounts do not have updated water readings for this billing period.
              Choose how to proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            {missingWaterAccounts.slice(0, 5).map((account) => (
              <div key={account.id}>
                {account.unit} • {account.tenant}
              </div>
            ))}
            {missingWaterAccounts.length > 5 && (
              <div>+ {missingWaterAccounts.length - 5} more</div>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsWaterPromptOpen(false)
                const excludedIds = new Set(missingWaterAccounts.map((account) => account.id))
                const filteredAccounts = tenantAccounts.filter((account) => !excludedIds.has(account.id))
                createBulkInvoices.mutate({
                  issueDate: invoiceDate,
                  dueDate,
                  accounts: filteredAccounts
                })
              }}
            >
              Exclude Accounts Without Readings
            </Button>
            <Button
              onClick={() => {
                setIsWaterPromptOpen(false)
                if (selectedPropertyId) {
                  setLocation(`/accounting/water-units?property=${selectedPropertyId}`)
                } else {
                  setLocation("/accounting/water-units")
                }
              }}
            >
              Update Water Readings
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsWaterPromptOpen(false)
                createBulkInvoices.mutate({
                  issueDate: invoiceDate,
                  dueDate
                })
              }}
            >
              Proceed Without Readings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div>
        <h1 className="text-3xl font-bold" data-testid="bulk-invoicing-title">Bulk Invoicing</h1>
        <p className="text-muted-foreground">Create invoices for all tenants in a property</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Configuration */}
        <Card className={`vibrant-panel lg:col-span-1 ${bulkInvoiceVariants[bulkInvoiceSeed % bulkInvoiceVariants.length]}`}>
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
                  setShowAccounts(false)
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

            <Button 
              onClick={handleLoadAccounts}
              className="w-full"
              disabled={actionsDisabled || !selectedPropertyId || selectedChargeCodes.length === 0 || !invoiceDate || !dueDate}
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
            <Card className="vibrant-card">
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
                          {account.isVacant && (
                            <div className="text-xs text-muted-foreground">Vacant unit (no invoice will be created)</div>
                          )}
                        </div>
                        <Badge variant="outline" className="font-mono">
                          Total: KSh {getTotalAmount(account).toLocaleString()}
                        </Badge>
                      </div>

                      {selectedChargeCodes.includes("water") && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/50 rounded">
                          <div>
                            <Label className="text-xs">Units Used</Label>
                            <p className="font-mono">{account.waterUnits}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Rate (KSH)</Label>
                            <p className="font-mono">{parseAmount(account.waterRate).toLocaleString()}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Last Reading</Label>
                            <p className="font-mono">
                              {account.lastReadingDate ? new Date(account.lastReadingDate).toLocaleDateString() : "—"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs">Water Charge</Label>
                            <p className="font-mono">KSh {account.charges.water}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {selectedChargeCodes.map((chargeId) => {
                          const charge = chargeOptions.find((c) => c.id === chargeId)
                          if (!charge) return null
                          const value = account.charges[chargeId] ?? 0
                          return (
                            <div key={chargeId} className="flex items-center justify-between gap-3">
                              <span>{charge.name}</span>
                              <Input
                                type="number"
                                value={value}
                                onChange={(event) =>
                                  handleChargeEdit(account.id, chargeId, parseAmount(event.target.value))
                                }
                                className="h-8 w-28 font-mono"
                                disabled={account.isVacant}
                              />
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
                    <Button onClick={handleSubmitInvoices} disabled={actionsDisabled} data-testid="button-submit-invoices">
                      <Send className="h-4 w-4 mr-2" />
                      Submit Invoices
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={`vibrant-card h-full flex items-center justify-center ${bulkInvoiceVariants[(bulkInvoiceSeed + 1) % bulkInvoiceVariants.length]}`}>
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