import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { Plus, Save, Eye, FileText, Calculator, Droplets, History } from "lucide-react"
import type { Unit, WaterReading } from "@shared/schema"

export function WaterUnits() {
  const { toast } = useToast()
  const { selectedPropertyId: globalSelectedPropertyId, selectedLandlordId } = useFilter()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all-properties")
  const [currentReading, setCurrentReading] = useState<{ unitId: string; reading: string }>({ unitId: "", reading: "" })
  
  // Bulk editing state
  const [bulkReadings, setBulkReadings] = useState<Record<string, string>>({})
  const [savingUnits, setSavingUnits] = useState<Set<string>>(new Set())
  const [savedUnits, setSavedUnits] = useState<Set<string>>(new Set())
  // Removed unitSaveTimes - now using database timestamps from water readings

  // Fetch units for dropdown
  const { data: units = [], isLoading: isLoadingUnits } = useQuery<Unit[]>({
    queryKey: ["/api/units", globalSelectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (globalSelectedPropertyId) params.append("propertyId", globalSelectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch properties for filtering
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/properties", selectedLandlordId, globalSelectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (globalSelectedPropertyId) params.append("propertyId", globalSelectedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch water readings with consumption data
  const { data: waterReadings = [], isLoading: isLoadingReadings } = useQuery<WaterReading[]>({
    queryKey: ["/api/water-readings", globalSelectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (globalSelectedPropertyId) params.append("propertyId", globalSelectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/water-readings${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch leases to get water rates per unit
  const { data: leases = [] } = useQuery<Array<{ id: string; unitId: string; waterRatePerUnit: string }>>({
    queryKey: ["/api/leases", globalSelectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (globalSelectedPropertyId) params.append("propertyId", globalSelectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Create new water reading mutation
  const createReadingMutation = useMutation({
    mutationFn: async (data: { unitId: string; currentReading: string; readingDate: string }) => {
      return await apiRequest("POST", "/api/water-readings", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/water-readings"] })
      setCurrentReading({ unitId: "", reading: "" })
      toast({
        title: "Success",
        description: "Water reading saved successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save water reading",
        variant: "destructive",
      })
    },
  })

  // Bulk save single reading mutation
  const bulkSaveReadingMutation = useMutation({
    mutationFn: async (data: { unitId: string; currentReading: string; readingDate: string }) => {
      console.log("🚀 Bulk save mutation starting for unit:", data.unitId)
      return await apiRequest("POST", "/api/water-readings", data)
    },
    onSuccess: (_, variables) => {
      console.log("✅ Bulk save SUCCESS for unit:", variables.unitId)
      
      // Update state to show saved status
      setSavingUnits(prev => {
        const newSet = new Set(prev)
        newSet.delete(variables.unitId)
        console.log("🔄 Removing from savingUnits:", variables.unitId, "New set:", newSet)
        return newSet
      })
      
      setSavedUnits(prev => {
        const newSet = new Set(prev).add(variables.unitId)
        console.log("✅ Adding to savedUnits:", variables.unitId, "New set:", newSet)
        return newSet
      })
      
      // Invalidate queries after state updates to refresh database timestamps
      queryClient.invalidateQueries({ queryKey: ["/api/water-readings"] })
      
      // Remove saved status after 3 seconds
      setTimeout(() => {
        setSavedUnits(prev => {
          const newSet = new Set(prev)
          newSet.delete(variables.unitId)
          console.log("🔄 Auto-removing from savedUnits:", variables.unitId, "New set:", newSet)
          return newSet
        })
      }, 3000)
    },
    onError: (error: any, variables) => {
      console.log("❌ Bulk save ERROR for unit:", variables.unitId, error)
      setSavingUnits(prev => {
        const newSet = new Set(prev)
        newSet.delete(variables.unitId)
        return newSet
      })
      toast({
        title: "Error",
        description: `Failed to save reading for ${getUnitName(variables.unitId)}: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  // Store timeout refs for each unit
  const [timeoutRefs, setTimeoutRefs] = useState<Record<string, NodeJS.Timeout>>({})

  // Handle bulk reading input change with immediate state management
  const handleBulkReadingChange = (unitId: string, value: string) => {
    console.log("📝 Input change for unit:", unitId, "value:", value)
    setBulkReadings(prev => ({ ...prev, [unitId]: value }))
    
    // Clear any existing saved status for this unit
    setSavedUnits(prev => {
      const newSet = new Set(prev)
      newSet.delete(unitId)
      console.log("🧹 Clearing saved status for:", unitId)
      return newSet
    })
    
    // Clear existing timeout for this unit
    if (timeoutRefs[unitId]) {
      console.log("⏰ Clearing existing timeout for:", unitId)
      clearTimeout(timeoutRefs[unitId])
    }
    
    // Only proceed if the value is valid
    if (value && value.trim() !== "" && !isNaN(Number(value))) {
      console.log("✅ Valid value, setting timeout for:", unitId)
      // Set new timeout for auto-save
      const timeoutId = setTimeout(() => {
        console.log("⏱️ Timeout triggered for unit:", unitId, "Setting saving state...")
        // Show saving state
        setSavingUnits(prev => {
          const newSet = new Set(prev).add(unitId)
          console.log("💾 Adding to savingUnits:", unitId, "New set:", newSet)
          return newSet
        })
        
        const readingDate = new Date().toISOString().split('T')[0]
        bulkSaveReadingMutation.mutate({
          unitId,
          currentReading: value,
          readingDate,
        })
      }, 1500) // Save after 1.5 seconds of no changes
      
      // Store timeout reference
      setTimeoutRefs(prev => ({ ...prev, [unitId]: timeoutId }))
    }
  }

  // Filter units by selected property (show all if "all" is selected)
  const filteredUnits = selectedPropertyId === "all"
    ? units
    : units.filter(unit => unit.propertyId === selectedPropertyId)

  // Get unit IDs for the selected property filter
  const filteredUnitIds = new Set(filteredUnits.map(unit => unit.id))

  // Filter water readings to match the filtered units
  const filteredWaterReadings = waterReadings.filter(reading => 
    filteredUnitIds.has(reading.unitId)
  )

  // Get water readings summary for dashboard cards (scoped to selected property)
  const readingsThisMonth = filteredWaterReadings.filter(reading => {
    const readingDate = new Date(reading.readingDate)
    const currentDate = new Date()
    return readingDate.getMonth() === currentDate.getMonth() && 
           readingDate.getFullYear() === currentDate.getFullYear()
  })

  // Count unique units with readings this month
  const unitsWithReadingsThisMonth = new Set(readingsThisMonth.map(reading => reading.unitId)).size

  const readingsSummary = {
    totalUnits: filteredUnits.length,
    unitsWithReadingsThisMonth,
    readingsThisMonth: readingsThisMonth.length,
    totalConsumption: filteredWaterReadings.reduce((sum, reading) => sum + parseFloat(reading.consumption), 0),
    totalAmountConsumed: filteredWaterReadings.reduce((sum, reading) => sum + parseFloat(reading.totalAmount), 0),
  }

  const handleSaveReading = () => {
    if (!currentReading.unitId || !currentReading.reading) {
      toast({
        title: "Error",
        description: "Please select a unit and enter a reading",
        variant: "destructive",
      })
      return
    }

    // Validate reading is a positive number
    const readingValue = parseFloat(currentReading.reading)
    if (isNaN(readingValue) || readingValue < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid positive number for the reading",
        variant: "destructive",
      })
      return
    }

    // Find the latest reading for this unit to validate against previous reading
    const unitReadings = waterReadings
      .filter(reading => reading.unitId === currentReading.unitId)
      .sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime())
    
    const latestReading = unitReadings[0]
    if (latestReading && readingValue < parseFloat(latestReading.currentReading)) {
      toast({
        title: "Error",
        description: `Current reading (${readingValue}) cannot be less than the previous reading (${latestReading.currentReading})`,
        variant: "destructive",
      })
      return
    }

    const selectedUnit = units.find(unit => unit.id === currentReading.unitId)
    if (!selectedUnit) return

    // Get water rate from the unit's lease
    const waterRate = getWaterRateForUnit(currentReading.unitId)

    // Get current date for reading
    const readingDate = new Date().toISOString().split('T')[0]

    createReadingMutation.mutate({
      unitId: currentReading.unitId,
      currentReading: readingValue.toString(),
      readingDate,
    })
  }

  const getUnitName = (unitId: string) => {
    const unit = units.find(u => u.id === unitId)
    return unit ? unit.unitNumber : "Unknown"
  }

  const getPropertyName = (unitId: string) => {
    const unit = units.find(u => u.id === unitId)
    if (!unit) return "Unknown"
    const property = properties.find((p: any) => p.id === unit.propertyId)
    return property ? property.name : "Unknown"
  }

  const getWaterRateForUnit = (unitId: string) => {
    const lease = leases.find(lease => lease.unitId === unitId)
    return lease ? parseFloat(lease.waterRatePerUnit) : 15.50 // fallback to default
  }

  const getLastReadingForUnit = (unitId: string) => {
    const unitReadings = waterReadings
      .filter(reading => reading.unitId === unitId)
      .sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime())
    return unitReadings[0] || null
  }

  // Get the last modification timestamp for a unit from database (persistent across page reloads)
  const getLastModifiedTime = (unitId: string) => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    // Find the most recent reading for this unit from the current month
    const recentReading = waterReadings
      .filter(reading => {
        const timestampValue = reading.lastModifiedAt || reading.createdAt
        if (!timestampValue) return false
        const readingDate = new Date(timestampValue)
        return reading.unitId === unitId && 
               readingDate.getMonth() === currentMonth && 
               readingDate.getFullYear() === currentYear
      })
      .sort((a, b) => {
        const aTimestamp = a.lastModifiedAt || a.createdAt
        const bTimestamp = b.lastModifiedAt || b.createdAt
        if (!aTimestamp || !bTimestamp) return 0
        const aTime = new Date(aTimestamp).getTime()
        const bTime = new Date(bTimestamp).getTime()
        return bTime - aTime
      })[0]

    if (recentReading) {
      const timestampValue = recentReading.lastModifiedAt || recentReading.createdAt
      if (timestampValue) {
        const modifiedTime = new Date(timestampValue)
        return modifiedTime.toLocaleString()
      }
    }
    
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-water-units">Water Units</h1>
          <p className="text-muted-foreground">
            Record water meter readings and track consumption across all properties
          </p>
        </div>
      </div>

      {/* Property Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="property-filter">Filter by Property:</Label>
          <Select 
            value={selectedPropertyId} 
            onValueChange={setSelectedPropertyId}
          >
            <SelectTrigger className="w-64" data-testid="select-property-filter">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-properties">All Properties</SelectItem>
              {Array.isArray(properties) ? properties.map((property: any) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              )) : null}
            </SelectContent>
          </Select>
        </div>
        {selectedPropertyId !== "all-properties" && (
          <p className="text-sm text-muted-foreground">
            Showing water readings for {Array.isArray(properties) ? properties.find((p: any) => p.id === selectedPropertyId)?.name : "Unknown"} ({filteredUnits.length} units)
          </p>
        )}
        {selectedPropertyId === "all-properties" && (
          <p className="text-sm text-muted-foreground">
            Showing water readings for all properties ({filteredUnits.length} units)
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-units">{readingsSummary.totalUnits}</div>
            <p className="text-xs text-muted-foreground">Units with water meters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-readings-this-month">{readingsSummary.unitsWithReadingsThisMonth}/{readingsSummary.totalUnits}</div>
            <p className="text-xs text-muted-foreground">Recorded units/Total units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consumption</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-consumption">{readingsSummary.totalConsumption.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Cubic meters (m³)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount Consumed</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-amount-consumed">KSH {readingsSummary.totalAmountConsumed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total monetary value</p>
          </CardContent>
        </Card>
      </div>

      {/* Property Filter */}
      <Card>
        <CardHeader>
          <CardTitle>All Property Accounts</CardTitle>
          <CardDescription>Showing water readings for all properties and units</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Property filtering removed - displaying all accounts by default as requested
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="bulk-entry" className="space-y-6">
        <TabsList>
          <TabsTrigger value="bulk-entry">Bulk Entry</TabsTrigger>
          <TabsTrigger value="readings-history">Readings History</TabsTrigger>
          <TabsTrigger value="consumption-analysis">Consumption Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="add-reading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Water Reading</CardTitle>
              <CardDescription>
                Enter current meter readings for units. Click Save Reading to record the data. The system will automatically calculate consumption and costs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit-select">Unit</Label>
                  <Select 
                    value={currentReading.unitId} 
                    onValueChange={(value) => setCurrentReading(prev => ({ ...prev, unitId: value }))}
                    data-testid="select-unit"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUnits.map(unit => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.unitNumber} - {getPropertyName(unit.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current-reading">Current Reading (m³)</Label>
                  <Input
                    id="current-reading"
                    type="number"
                    placeholder="Enter meter reading"
                    value={currentReading.reading}
                    onChange={(e) => setCurrentReading(prev => ({ ...prev, reading: e.target.value }))}
                    data-testid="input-current-reading"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rate per Unit</Label>
                  <Input 
                    value={currentReading.unitId 
                      ? `KSH ${getWaterRateForUnit(currentReading.unitId).toFixed(2)} per m³` 
                      : "Select unit to see rate"
                    } 
                    disabled 
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={handleSaveReading}
                  disabled={createReadingMutation.isPending || !currentReading.unitId || !currentReading.reading}
                  data-testid="button-save-reading"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createReadingMutation.isPending ? "Saving..." : "Save Reading"}
                </Button>
                
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-entry" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Water Reading Entry</CardTitle>
              <CardDescription>
                Enter readings for multiple units at once. Changes are automatically saved after you stop typing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUnits ? (
                <div className="text-center py-8">Loading units...</div>
              ) : filteredUnits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No units available for bulk entry.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    💡 Tip: Enter readings and they'll save automatically. Green checkmarks show saved readings.
                  </div>
                  
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32">Unit</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead className="w-40">Water Rate</TableHead>
                          <TableHead className="w-40">Last Reading</TableHead>
                          <TableHead className="w-48">New Reading (m³)</TableHead>
                          <TableHead className="w-32 text-right">Amount</TableHead>
                          <TableHead className="w-40 text-center">Date Modified</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUnits.map(unit => {
                          const lastReading = getLastReadingForUnit(unit.id)
                          const waterRate = getWaterRateForUnit(unit.id)
                          const currentValue = bulkReadings[unit.id] || ""
                          const isSaving = savingUnits.has(unit.id)
                          const isSaved = savedUnits.has(unit.id)
                          
                          // Debug logging for rendering
                          console.log("🎨 RENDER unit:", unit.id, "isSaving:", isSaving, "isSaved:", isSaved, "savedUnits:", Array.from(savedUnits), "savingUnits:", Array.from(savingUnits))
                          
                          return (
                            <TableRow key={unit.id} data-testid={`row-bulk-unit-${unit.id}`}>
                              <TableCell className="font-medium">
                                {unit.unitNumber}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {getPropertyName(unit.id)}
                              </TableCell>
                              <TableCell className="text-sm">
                                KSH {waterRate.toFixed(2)} per m³
                              </TableCell>
                              <TableCell className="text-sm">
                                {lastReading ? `${lastReading.currentReading} m³` : "No previous reading"}
                              </TableCell>
                              <TableCell>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder="Enter reading"
                                    value={currentValue}
                                    onChange={(e) => handleBulkReadingChange(unit.id, e.target.value)}
                                    className={`pr-8 ${isSaved ? 'border-green-500' : ''}`}
                                    data-testid={`input-bulk-reading-${unit.id}`}
                                  />
                                  {isSaving && (
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {currentValue && (
                                  <div className="font-medium text-primary">
                                    KSH {(parseFloat(currentValue) * waterRate).toFixed(2)}
                                  </div>
                                )}
                                {!currentValue && (
                                  <div className="text-muted-foreground text-sm">
                                    -
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isSaving && (
                                  <div className="flex items-center justify-center">
                                    <Badge variant="secondary">
                                      Saving...
                                    </Badge>
                                  </div>
                                )}
                                {!isSaving && getLastModifiedTime(unit.id) && (
                                  <div className="flex items-center justify-center">
                                    <Badge variant="secondary" className={`text-xs ${isSaved ? 'bg-green-100 text-green-800 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                                      ✓ {getLastModifiedTime(unit.id)}
                                    </Badge>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Showing {filteredUnits.length} units
                    {/* Showing all units from all properties */}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readings-history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Water Readings History</CardTitle>
              <CardDescription>View all recorded water meter readings and calculated consumption</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReadings ? (
                <div className="text-center py-8">Loading readings...</div>
              ) : filteredWaterReadings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No water readings recorded yet. Use bulk entry to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Reading Date</TableHead>
                      <TableHead>Current Reading</TableHead>
                      <TableHead>Previous Reading</TableHead>
                      <TableHead>Consumption (m³)</TableHead>
                      <TableHead>Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWaterReadings.map(reading => (
                      <TableRow key={reading.id} data-testid={`row-reading-${reading.id}`}>
                        <TableCell className="font-medium">
                          {getUnitName(reading.unitId)}
                        </TableCell>
                        <TableCell>
                          {getPropertyName(reading.unitId)}
                        </TableCell>
                        <TableCell>
                          {new Date(reading.readingDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{reading.currentReading}</TableCell>
                        <TableCell>{reading.previousReading}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {parseFloat(reading.consumption).toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          KSH {parseFloat(reading.totalAmount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumption-analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consumption Analysis</CardTitle>
              <CardDescription>Analyze water consumption patterns and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Consumption analysis charts and trends will be implemented here.
                <br />
                This feature will show consumption patterns, usage trends, and cost analysis.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}