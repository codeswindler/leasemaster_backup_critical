import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { getPaletteByIndex, getPaletteByKey } from "@/lib/palette"
import { Plus, Save, Eye, FileText, Calculator, Droplets } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { Unit, WaterReading } from "@shared/schema"

export function WaterUnits() {
  const { toast } = useToast()
  const { selectedAgentId, selectedPropertyId: globalSelectedPropertyId, selectedLandlordId } = useFilter()
  const summaryPaletteSeed = useRef(Math.floor(Math.random() * 6))
  const listPaletteSeed = useRef(Math.floor(Math.random() * 6))
  const analysisPaletteSeed = useRef(Math.floor(Math.random() * 6))
  const getPreviousMonthKey = useCallback(() => {
    const now = new Date()
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`
  }, [])
  const [consumptionMonth, setConsumptionMonth] = useState<string>(() => getPreviousMonthKey())
  const [currentReading, setCurrentReading] = useState<{ unitId: string; reading: string; previousReading: string }>({
    unitId: "",
    reading: "",
    previousReading: "",
  })
  const actionsDisabled = !globalSelectedPropertyId || globalSelectedPropertyId === "all"
  
  // Bulk editing state
  const [bulkReadings, setBulkReadings] = useState<Record<string, string>>({})
  const [bulkPreviousReadings, setBulkPreviousReadings] = useState<Record<string, string>>({})
  const [savingUnits, setSavingUnits] = useState<Set<string>>(new Set())
  const [savedUnits, setSavedUnits] = useState<Set<string>>(new Set())
  const [editingUnits, setEditingUnits] = useState<Set<string>>(new Set())
  const [pendingConfirmUnits, setPendingConfirmUnits] = useState<Set<string>>(new Set())
  const [confirmPaletteSeed, setConfirmPaletteSeed] = useState(() => Math.floor(Math.random() * 1_000_000))
  const [crossMonthConfirm, setCrossMonthConfirm] = useState<{
    isOpen: boolean
    message: string
    unitId: string | null
    onConfirm: (() => void) | null
    onCancel?: (() => void) | null
  }>({
    isOpen: false,
    message: "",
    unitId: null,
    onConfirm: null,
    onCancel: null,
  })
  const [showTrendBreakdown, setShowTrendBreakdown] = useState(false)
  // Removed unitSaveTimes - now using database timestamps from water readings

  // Fetch units for dropdown
  const { data: units = [], isLoading: isLoadingUnits } = useQuery<Unit[]>({
    queryKey: ["/api/units", globalSelectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (globalSelectedPropertyId) params.append("propertyId", globalSelectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch properties for filtering
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/properties", selectedLandlordId, globalSelectedPropertyId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (globalSelectedPropertyId) params.append("propertyId", globalSelectedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch water readings with consumption data
  const { data: waterReadings = [], isLoading: isLoadingReadings } = useQuery<WaterReading[]>({
    queryKey: ["/api/water-readings", globalSelectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (globalSelectedPropertyId) params.append("propertyId", globalSelectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/water-readings${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch leases to get water rates per unit
  const { data: leases = [] } = useQuery<Array<{ id: string; unitId: string; waterRatePerUnit: string }>>({
    queryKey: ["/api/leases", globalSelectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (globalSelectedPropertyId) params.append("propertyId", globalSelectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices", globalSelectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (globalSelectedPropertyId && globalSelectedPropertyId !== "all") params.append("propertyId", globalSelectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoices${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants", globalSelectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (globalSelectedPropertyId && globalSelectedPropertyId !== "all") params.append("propertyId", globalSelectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const saveWaterReading = async (data: { id?: string; unitId: string; currentReading?: string; previousReading?: string; readingDate: string }) => {
    const { id, ...payload } = data
    const method = id ? "PUT" : "POST"
    const url = id ? `/api/water-readings/${id}` : "/api/water-readings"
    return await apiRequest(method, url, payload)
  }

  // Create or update water reading mutation (single-entry form)
  const upsertReadingMutation = useMutation({
    mutationFn: async (data: { id?: string; unitId: string; currentReading?: string; previousReading?: string; readingDate: string }) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header to save water readings.")
      }
      return await saveWaterReading(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/water-readings"] })
      setCurrentReading({ unitId: "", reading: "", previousReading: "" })
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
    mutationFn: async (data: { id?: string; unitId: string; currentReading?: string; previousReading?: string; readingDate: string }) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header to save water readings.")
      }
      console.log("🚀 Bulk save mutation starting for unit:", data.unitId)
      return await saveWaterReading(data)
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
  const [previousTimeoutRefs, setPreviousTimeoutRefs] = useState<Record<string, NodeJS.Timeout>>({})

  const normalizedUnits = useMemo(() => {
    return units.map((unit: any) => ({
      ...unit,
      id: unit.id,
      propertyId: unit.propertyId ?? unit.property_id,
      unitNumber: unit.unitNumber ?? unit.unit_number,
      waterRateAmount: unit.waterRateAmount ?? unit.water_rate_amount,
      houseTypeId: unit.houseTypeId ?? unit.house_type_id,
    }))
  }, [units])

  const normalizedProperties = useMemo(() => {
    return properties.map((property: any) => ({
      ...property,
      id: property.id,
      name: property.name,
    }))
  }, [properties])

  const normalizedLeases = useMemo(() => {
    return leases.map((lease: any) => ({
      ...lease,
      id: lease.id,
      unitId: lease.unitId ?? lease.unit_id,
      tenantId: lease.tenantId ?? lease.tenant_id,
      waterRatePerUnit: lease.waterRatePerUnit ?? lease.water_rate_per_unit,
      startDate: lease.startDate ?? lease.start_date,
      endDate: lease.endDate ?? lease.end_date,
      status: lease.status,
    }))
  }, [leases])

  const normalizeId = (value: any) => (value === null || value === undefined ? null : String(value))

  const getReadingTimestamp = useCallback((reading: any) => {
    const timestampValue =
      reading.lastModifiedAt ||
      reading.createdAt ||
      reading.last_modified_at ||
      reading.created_at ||
      reading.readingDate ||
      reading.reading_date
    return timestampValue ? new Date(timestampValue).getTime() : 0
  }, [])

  const getReadingMonthKey = useCallback((reading: any) => {
    const readingDateValue = reading.readingDate ?? reading.reading_date ?? reading.createdAt ?? reading.created_at
    if (!readingDateValue) return null
    const readingDate = new Date(readingDateValue)
    if (Number.isNaN(readingDate.getTime())) return null
    return `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, "0")}`
  }, [])

  const getReadingForUnitMonth = useCallback(
    (unitId: string, monthKey: string | null) => {
      if (!monthKey) return null
      const unitKey = normalizeId(unitId)
      const candidates = waterReadings.filter((reading: any) => {
        const readingUnitId = normalizeId(reading.unitId ?? reading.unit_id)
        return readingUnitId === unitKey && getReadingMonthKey(reading) === monthKey
      })
      if (!candidates.length) return null
      return candidates.reduce((latest: any, reading: any) => {
        return getReadingTimestamp(reading) >= getReadingTimestamp(latest) ? reading : latest
      }, candidates[0])
    },
    [getReadingMonthKey, getReadingTimestamp, normalizeId, waterReadings]
  )

  const getAdjacentMonthKey = useCallback((monthKey: string | null, offset: number) => {
    if (!monthKey) return null
    const [year, month] = monthKey.split("-").map(Number)
    if (!year || !month) return null
    const date = new Date(year, month - 1 + offset, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  }, [])

  const getReadingDateForMonth = useCallback((monthKey: string | null) => {
    if (!monthKey) return new Date().toISOString().split("T")[0]
    const [year, month] = monthKey.split("-").map(Number)
    if (!year || !month) return new Date().toISOString().split("T")[0]
    return `${year}-${String(month).padStart(2, "0")}-01`
  }, [])

  const getLatestReadingBeforeMonth = useCallback(
    (unitId: string, monthKey: string | null) => {
      if (!monthKey) return null
      const [year, month] = monthKey.split("-").map(Number)
      if (!year || !month) return null
      const monthStart = new Date(year, month - 1, 1)
      const unitKey = normalizeId(unitId)
      const candidates = waterReadings.filter((reading: any) => {
        const readingUnitId = normalizeId(reading.unitId ?? reading.unit_id)
        if (readingUnitId !== unitKey) return false
        const readingDateValue = reading.readingDate ?? reading.reading_date ?? reading.createdAt ?? reading.created_at
        if (!readingDateValue) return false
        const readingDate = new Date(readingDateValue)
        if (Number.isNaN(readingDate.getTime())) return false
        return readingDate < monthStart
      })
      if (!candidates.length) return null
      return candidates.reduce((latest: any, reading: any) => {
        return getReadingTimestamp(reading) >= getReadingTimestamp(latest) ? reading : latest
      }, candidates[0])
    },
    [getReadingTimestamp, normalizeId, waterReadings]
  )

  const readingsMatch = useCallback((a: any, b: any) => {
    const aNum = Number(a)
    const bNum = Number(b)
    if (!Number.isFinite(aNum) || !Number.isFinite(bNum)) return false
    return aNum === bNum
  }, [])

  const updateNextMonthPrevious = useCallback(
    (unitId: string, value: string) => {
      const nextMonthKey = getAdjacentMonthKey(consumptionMonth, 1)
      // #region agent log
      fetch('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H1',location:'water-units.tsx:updateNextMonthPrevious',message:'update_next_month_prev_start',data:{unitId,consumptionMonth,nextMonthKey,value},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!nextMonthKey) return
      const existing = getReadingForUnitMonth(unitId, nextMonthKey)
      // #region agent log
      fetch('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H1',location:'water-units.tsx:updateNextMonthPrevious',message:'update_next_month_prev_existing',data:{unitId,hasExisting:!!existing,existingId:existing?.id ?? null,existingPrev:existing?.previousReading ?? existing?.previous_reading ?? null,existingCurr:existing?.currentReading ?? existing?.current_reading ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const readingDate = getReadingDateForMonth(nextMonthKey)
      if (existing) {
        bulkSaveReadingMutation.mutate({
          id: existing.id,
          unitId,
          previousReading: value,
          readingDate,
        })
        return
      }
      bulkSaveReadingMutation.mutate({
        unitId,
        previousReading: value,
        readingDate,
      })
    },
    [bulkSaveReadingMutation, consumptionMonth, getAdjacentMonthKey, getReadingDateForMonth, getReadingForUnitMonth]
  )

  const updatePrevMonthCurrent = useCallback(
    (unitId: string, value: string) => {
      const prevMonthKey = getAdjacentMonthKey(consumptionMonth, -1)
      // #region agent log
      fetch('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H2',location:'water-units.tsx:updatePrevMonthCurrent',message:'update_prev_month_curr_start',data:{unitId,consumptionMonth,prevMonthKey,value},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!prevMonthKey) return
      const existing = getReadingForUnitMonth(unitId, prevMonthKey)
      // #region agent log
      fetch('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H2',location:'water-units.tsx:updatePrevMonthCurrent',message:'update_prev_month_curr_existing',data:{unitId,hasExisting:!!existing,existingId:existing?.id ?? null,existingPrev:existing?.previousReading ?? existing?.previous_reading ?? null,existingCurr:existing?.currentReading ?? existing?.current_reading ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!existing) return
      const readingDate = getReadingDateForMonth(prevMonthKey)
      bulkSaveReadingMutation.mutate({
        id: existing.id,
        unitId,
        currentReading: value,
        readingDate,
      })
    },
    [bulkSaveReadingMutation, consumptionMonth, getAdjacentMonthKey, getReadingDateForMonth, getReadingForUnitMonth]
  )

  const confirmCrossMonthImpact = useCallback(
    (unitId: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
      // #region agent log
      fetch('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H3',location:'water-units.tsx:confirmCrossMonthImpact',message:'open_cross_month_confirm',data:{unitId,message},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setConfirmPaletteSeed(Math.floor(Math.random() * 1_000_000))
      setPendingConfirmUnits(prev => new Set(prev).add(unitId))
      setCrossMonthConfirm({
        isOpen: true,
        message,
        unitId,
        onConfirm,
        onCancel: onCancel ?? null,
      })
    },
    []
  )

  const confirmPalette = useMemo(
    () => getPaletteByKey("cross-month-confirm", confirmPaletteSeed),
    [confirmPaletteSeed]
  )

  const toStartOfDay = (dateValue: any) => {
    if (!dateValue) return null
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return null
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  const toEndOfDay = (dateValue: any) => {
    if (!dateValue) return null
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return null
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
  }

  const isLeaseActive = (lease: any) => {
    const normalizedStatus = String(lease.status || "").toLowerCase()
    const isTerminated = ["terminated", "cancelled", "canceled", "inactive"].includes(normalizedStatus)
    if (isTerminated) return false
    const startDate = toStartOfDay(lease.startDate)
    const endDate = lease.endDate ? toEndOfDay(lease.endDate) : null
    const now = new Date()
    const inRange = !!startDate && startDate <= now && (!endDate || endDate >= now)
    return normalizedStatus === "active" || inRange
  }

  const normalizedTenants = useMemo(() => {
    return tenants.map((tenant: any) => ({
      ...tenant,
      id: tenant.id,
      fullName: tenant.fullName ?? tenant.full_name,
    }))
  }, [tenants])

  const normalizedInvoices = useMemo(() => {
    return invoices.map((invoice: any) => ({
      id: invoice.id,
      leaseId: invoice.leaseId ?? invoice.lease_id,
      issueDate: invoice.issueDate ?? invoice.issue_date,
      status: invoice.status,
    }))
  }, [invoices])

  // Handle bulk reading input change with immediate state management
  const handleBulkReadingChange = (unitId: string, value: string, previousReading: number | null, isPreviousMissing: boolean) => {
    if (actionsDisabled) return
    if (isPreviousMissing) {
      toast({
        title: "Previous reading required",
        description: "Enter a previous reading before saving the current reading.",
        variant: "destructive",
      })
      return
    }
    console.log("📝 Input change for unit:", unitId, "value:", value)
    setEditingUnits(prev => {
      const next = new Set(prev)
      next.add(unitId)
      return next
    })
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
    if (value && value.trim() !== "" && !isNaN(Number(value)) && previousReading !== null && !isNaN(previousReading)) {
      console.log("✅ Valid value, setting timeout for:", unitId)
      // Set new timeout for auto-save
      const timeoutId = setTimeout(() => {
        const doSave = () => {
          // #region agent log
          fetch('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H1',location:'water-units.tsx:handleBulkReadingChange',message:'bulk_doSave',data:{unitId,consumptionMonth,value,previousReading},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          console.log("⏱️ Timeout triggered for unit:", unitId, "Setting saving state...")
          setSavingUnits(prev => {
            const newSet = new Set(prev).add(unitId)
            console.log("💾 Adding to savingUnits:", unitId, "New set:", newSet)
            return newSet
          })

          const readingDate = getReadingDateForMonth(consumptionMonth)
          const existingReading = getReadingForUnitMonth(unitId, consumptionMonth)
          bulkSaveReadingMutation.mutate({
            id: existingReading?.id,
            unitId,
            currentReading: value,
            previousReading: previousReading.toString(),
            readingDate,
          })
        }

        const nextMonthKey = getAdjacentMonthKey(consumptionMonth, 1)
        const nextReading = getReadingForUnitMonth(unitId, nextMonthKey)
        const nextPrevious = nextReading?.previousReading ?? nextReading?.previous_reading
        const shouldPrompt = !!nextReading && !readingsMatch(value, nextPrevious)
        // #region agent log
        fetch('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H3',location:'water-units.tsx:handleBulkReadingChange',message:'bulk_prompt_decision',data:{unitId,consumptionMonth,nextMonthKey,hasNext:!!nextReading,nextPrevious,shouldPrompt},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (shouldPrompt) {
          confirmCrossMonthImpact(
            unitId,
            "This current reading will affect the next month's previous reading. We will update it if you continue.",
            () => {
              doSave()
              updateNextMonthPrevious(unitId, value)
            },
            () => {
              doSave()
            }
          )
          return
        }
        doSave()
        if (!nextReading) {
          updateNextMonthPrevious(unitId, value)
        }
      }, 1500) // Save after 1.5 seconds of no changes
      
      // Store timeout reference
      setTimeoutRefs(prev => ({ ...prev, [unitId]: timeoutId }))
    }
  }

  const handleBulkPreviousReadingChange = (unitId: string, value: string) => {
    if (actionsDisabled) return
    setEditingUnits(prev => {
      const next = new Set(prev)
      next.add(unitId)
      return next
    })
    setBulkPreviousReadings(prev => ({ ...prev, [unitId]: value }))
    setSavedUnits(prev => {
      const newSet = new Set(prev)
      newSet.delete(unitId)
      return newSet
    })

    if (previousTimeoutRefs[unitId]) {
      clearTimeout(previousTimeoutRefs[unitId])
    }

    if (value && value.trim() !== "" && !isNaN(Number(value))) {
      const timeoutId = setTimeout(() => {
        const existingReading = getReadingForUnitMonth(unitId, consumptionMonth)
        const currentValue =
          bulkReadings[unitId] ??
          existingReading?.currentReading ??
          existingReading?.current_reading

        if (currentValue === undefined || currentValue === null || String(currentValue).trim() === "") {
          return
        }

        const doSave = () => {
          setSavingUnits(prev => new Set(prev).add(unitId))

          const readingDate = getReadingDateForMonth(consumptionMonth)
          bulkSaveReadingMutation.mutate({
            id: existingReading?.id,
            unitId,
            currentReading: String(currentValue),
            previousReading: value.toString(),
            readingDate,
          })
        }

        const prevMonthKey = getAdjacentMonthKey(consumptionMonth, -1)
        const prevReading = getReadingForUnitMonth(unitId, prevMonthKey)
        const prevCurrent = prevReading?.currentReading ?? prevReading?.current_reading
        const shouldPrompt = !!prevReading && !readingsMatch(value, prevCurrent)
        if (shouldPrompt) {
          confirmCrossMonthImpact(
            unitId,
            "This previous reading should match the prior month's current reading. We will update it if you continue.",
            () => {
              doSave()
              updatePrevMonthCurrent(unitId, value)
            },
            () => {
              doSave()
            }
          )
          return
        }
        doSave()
      }, 1500)

      setPreviousTimeoutRefs(prev => ({ ...prev, [unitId]: timeoutId }))
    }
  }

  const activeLeasesByUnit = useMemo(() => {
    const map = new Map<string, any>()
    normalizedLeases
      .filter(isLeaseActive)
      .forEach((lease: any) => {
        const unitKey = normalizeId(lease.unitId)
        if (unitKey) {
          map.set(unitKey, lease)
        }
      })
    return map
  }, [normalizedLeases])

  const getWaterRateForUnit = (unitId: string) => {
    const unitKey = normalizeId(unitId)
    const unit = normalizedUnits.find((u: any) => normalizeId(u.id) === unitKey)
    if (unit?.waterRateAmount) return parseFloat(unit.waterRateAmount)
    const lease = unitKey ? activeLeasesByUnit.get(unitKey) : null
    return lease ? parseFloat(lease.waterRatePerUnit) : 15.50 // fallback to default
  }

  // Filter units by selected property (header filter) and active leases
  const normalizedSelectedPropertyId = normalizeId(globalSelectedPropertyId)
  const filteredUnits = (normalizedSelectedPropertyId && normalizedSelectedPropertyId !== "all")
    ? normalizedUnits.filter((unit) => {
        const unitKey = normalizeId(unit.id)
        if (!unitKey) return false
        return normalizeId(unit.propertyId) === normalizedSelectedPropertyId && activeLeasesByUnit.has(unitKey)
      })
    : normalizedUnits.filter((unit) => {
        const unitKey = normalizeId(unit.id)
        return unitKey ? activeLeasesByUnit.has(unitKey) : false
      })

  // Get unit IDs for the selected property filter
  const filteredUnitIds = new Set(filteredUnits.map(unit => normalizeId(unit.id)).filter(Boolean))

  // Filter water readings to match the filtered units
  const filteredWaterReadings = waterReadings.filter((reading: any) => {
    const unitId = normalizeId(reading.unitId ?? reading.unit_id)
    if (!unitId || !filteredUnitIds.has(unitId)) return false
    if (!consumptionMonth) return true
    const readingDate = new Date(reading.readingDate ?? reading.reading_date ?? reading.createdAt ?? reading.created_at)
    const monthKey = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, "0")}`
    return monthKey === consumptionMonth
  })

  const parseNumber = (value: any) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : NaN
  }

  const getReadingConsumption = (reading: any) => {
    const consumptionValue = parseNumber(reading.consumption ?? reading.unitsConsumed ?? reading.units_consumed)
    if (Number.isFinite(consumptionValue)) return Math.max(0, consumptionValue)
    const currentValue = parseNumber(reading.currentReading ?? reading.current_reading)
    const previousValue = parseNumber(reading.previousReading ?? reading.previous_reading)
    if (Number.isFinite(currentValue) && Number.isFinite(previousValue)) {
      return Math.max(0, currentValue - previousValue)
    }
    return 0
  }

  const latestReadingByUnit = useMemo(() => {
    const map = new Map<string, any>()
    filteredWaterReadings.forEach((reading: any) => {
      const unitId = reading.unitId ?? reading.unit_id
      if (!unitId) return
      const timestampValue = reading.lastModifiedAt || reading.createdAt || reading.last_modified_at || reading.created_at || reading.readingDate || reading.reading_date
      const timestamp = timestampValue ? new Date(timestampValue).getTime() : 0
      const existing = map.get(unitId)
      if (!existing) {
        map.set(unitId, reading)
        return
      }
      const existingTimestampValue = existing.lastModifiedAt || existing.createdAt || existing.last_modified_at || existing.created_at || existing.readingDate || existing.reading_date
      const existingTimestamp = existingTimestampValue ? new Date(existingTimestampValue).getTime() : 0
      if (timestamp >= existingTimestamp) {
        map.set(unitId, reading)
      }
    })
    return map
  }, [filteredWaterReadings])

  useEffect(() => {
    if (!consumptionMonth) {
      setConsumptionMonth(getPreviousMonthKey())
    }
  }, [consumptionMonth, getPreviousMonthKey])

  useEffect(() => {
    setBulkReadings({})
    setBulkPreviousReadings({})
    setSavingUnits(new Set())
    setSavedUnits(new Set())
    setEditingUnits(new Set())
    setPendingConfirmUnits(new Set())
  }, [consumptionMonth])

  useEffect(() => {
    if (!filteredUnits.length) {
      setBulkReadings({})
      setBulkPreviousReadings({})
      return
    }
    setBulkReadings((prev) => {
      const next: Record<string, string> = { ...prev }
      filteredUnits.forEach((unit) => {
        const unitId = unit.id
        if (savingUnits.has(unitId) || editingUnits.has(unitId) || pendingConfirmUnits.has(unitId)) return
        const reading = latestReadingByUnit.get(unitId)
        const currentValue = reading?.currentReading ?? reading?.current_reading
        if (currentValue !== undefined && currentValue !== null && currentValue !== "") {
          next[unitId] = String(currentValue)
        } else {
          delete next[unitId]
        }
      })
      return next
    })
    setBulkPreviousReadings((prev) => {
      const next: Record<string, string> = { ...prev }
      filteredUnits.forEach((unit) => {
        const unitId = unit.id
        if (savingUnits.has(unitId) || editingUnits.has(unitId) || pendingConfirmUnits.has(unitId)) return
        if (prev[unitId] !== undefined && String(prev[unitId]).trim() !== "") return
        const reading = latestReadingByUnit.get(unitId)
        const previousValue = reading?.previousReading ?? reading?.previous_reading
        if (previousValue !== undefined && previousValue !== null && previousValue !== "") {
          next[unitId] = String(previousValue)
        } else {
          delete next[unitId]
        }
      })
      return next
    })
  }, [filteredUnits, latestReadingByUnit, savingUnits, editingUnits, pendingConfirmUnits])

  // Get water readings summary for dashboard cards (scoped to selected property)
  const readingsThisMonth = filteredWaterReadings.filter((reading: any) => {
    if (!consumptionMonth) return true
    const readingDate = new Date(reading.readingDate ?? reading.reading_date ?? reading.createdAt ?? reading.created_at)
    const monthKey = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, "0")}`
    return monthKey === consumptionMonth
  })

  // Count unique units with readings this month
  const unitsWithReadingsThisMonth = new Set(readingsThisMonth.map((reading: any) => normalizeId(reading.unitId ?? reading.unit_id))).size

  const latestReadingsThisMonth = Array.from(latestReadingByUnit.values())
  const readingsSummary = {
    totalUnits: filteredUnits.length,
    unitsWithReadingsThisMonth,
    readingsThisMonth: readingsThisMonth.length,
    totalConsumption: latestReadingsThisMonth.reduce((sum, reading: any) => sum + getReadingConsumption(reading), 0),
    totalAmountConsumed: latestReadingsThisMonth.reduce((sum, reading: any) => {
      const unitId = reading.unitId ?? reading.unit_id
      const rate = getWaterRateForUnit(unitId)
      const consumption = getReadingConsumption(reading)
      return sum + (Number.isFinite(rate) ? consumption * rate : 0)
    }, 0),
  }

  const consumptionTrend = useMemo(() => {
    if (!consumptionMonth) return []
    const [selectedYear, selectedMonth] = consumptionMonth.split("-").map(Number)
    if (!selectedYear || !selectedMonth) return []

    const trend: Array<{ monthKey: string; label: string; consumption: number; totalCost: number }> = []
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(selectedYear, selectedMonth - 1 - offset, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleString(undefined, { month: "short", year: "numeric" })

      const monthlyReadings = waterReadings.filter((reading: any) => {
        const unitId = reading.unitId ?? reading.unit_id
        if (!filteredUnitIds.has(unitId)) return false
        const readingDate = new Date(reading.readingDate ?? reading.reading_date ?? reading.createdAt ?? reading.created_at)
        const key = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, "0")}`
        return key === monthKey
      })

      const latestByUnit = new Map<string, any>()
      monthlyReadings.forEach((reading: any) => {
        const unitId = reading.unitId ?? reading.unit_id
        if (!unitId) return
        const timestampValue = reading.lastModifiedAt || reading.createdAt || reading.last_modified_at || reading.created_at || reading.readingDate || reading.reading_date
        const timestamp = timestampValue ? new Date(timestampValue).getTime() : 0
        const existing = latestByUnit.get(unitId)
        if (!existing) {
          latestByUnit.set(unitId, reading)
          return
        }
        const existingTimestampValue = existing.lastModifiedAt || existing.createdAt || existing.last_modified_at || existing.created_at || existing.readingDate || existing.reading_date
        const existingTimestamp = existingTimestampValue ? new Date(existingTimestampValue).getTime() : 0
        if (timestamp >= existingTimestamp) {
          latestByUnit.set(unitId, reading)
        }
      })

      const latestReadings = Array.from(latestByUnit.values())
      const consumption = latestReadings.reduce((sum, reading: any) => sum + getReadingConsumption(reading), 0)
      const totalCost = latestReadings.reduce((sum, reading: any) => {
        const unitId = reading.unitId ?? reading.unit_id
        const rate = getWaterRateForUnit(unitId)
        const units = getReadingConsumption(reading)
        return sum + (Number.isFinite(rate) ? units * rate : 0)
      }, 0)

      trend.push({ monthKey, label, consumption, totalCost })
    }

    return trend
  }, [consumptionMonth, waterReadings, filteredUnitIds, getReadingConsumption, getWaterRateForUnit])

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
    const latestReading = getLatestReadingBeforeMonth(currentReading.unitId, consumptionMonth)
    const existingReading = getReadingForUnitMonth(currentReading.unitId, consumptionMonth)
    const overridePrevious = currentReading.previousReading ? parseFloat(currentReading.previousReading) : null
    const existingPrevious = existingReading?.previousReading ?? existingReading?.previous_reading
    const previousValue = overridePrevious
      ?? (existingPrevious !== undefined && existingPrevious !== null ? parseFloat(existingPrevious) : null)
      ?? (latestReading ? parseFloat(latestReading.currentReading ?? latestReading.current_reading) : null)
    if (previousValue === null || Number.isNaN(previousValue)) {
      toast({
        title: "Previous reading required",
        description: "Enter a previous reading before saving the current reading.",
        variant: "destructive",
      })
      return
    }
    if (readingValue < previousValue) {
      toast({
        title: "Error",
        description: `Current reading (${readingValue}) cannot be less than the previous reading (${previousValue})`,
        variant: "destructive",
      })
      return
    }

    const selectedUnit = normalizedUnits.find((unit: any) => unit.id === currentReading.unitId)
    if (!selectedUnit) return

    // Get water rate from the unit's lease
    const waterRate = getWaterRateForUnit(currentReading.unitId)

    // Get current date for reading
        const readingDate = getReadingDateForMonth(consumptionMonth)

    const doSave = () => {
      upsertReadingMutation.mutate({
        id: existingReading?.id,
        unitId: currentReading.unitId,
        currentReading: readingValue.toString(),
        previousReading: previousValue.toString(),
        readingDate,
      })
    }
    const nextMonthKey = getAdjacentMonthKey(consumptionMonth, 1)
    const nextReading = getReadingForUnitMonth(currentReading.unitId, nextMonthKey)
    const nextPrevious = nextReading?.previousReading ?? nextReading?.previous_reading
    const shouldPrompt = !!nextReading && !readingsMatch(readingValue, nextPrevious)
    if (shouldPrompt) {
      confirmCrossMonthImpact(
        currentReading.unitId,
        "This current reading will affect the next month's previous reading. We will update it if you continue.",
        () => {
          doSave()
          updateNextMonthPrevious(currentReading.unitId, readingValue.toString())
        },
        () => {
          doSave()
        }
      )
      return
    }
    doSave()
    if (!nextReading) {
      updateNextMonthPrevious(currentReading.unitId, readingValue.toString())
    }
  }

  const getUnitName = (unitId: string) => {
    const unit = normalizedUnits.find((u: any) => u.id === unitId)
    return unit ? unit.unitNumber : "Unknown"
  }

  const getAccountName = (unitId: string) => {
    const activeLease = activeLeasesByUnit.get(unitId)
    if (!activeLease) return "Vacant"
    const tenant = normalizedTenants.find((t: any) => t.id === activeLease.tenantId)
    return tenant?.fullName || "Unknown"
  }

  const getLastReadingForUnit = (unitId: string) => {
    return getLatestReadingBeforeMonth(unitId, consumptionMonth)
  }

  // Get the last modification timestamp for a unit from database (persistent across page reloads)
  const getLastModifiedInfo = (unitId: string) => {
    if (!consumptionMonth) return null
    const [year, month] = consumptionMonth.split("-").map(Number)

    // Find the most recent reading for this unit from the selected month
    const recentReading = waterReadings
      .filter((reading: any) => {
        const readingDateValue = reading.readingDate ?? reading.reading_date
        if (!readingDateValue) return false
        const readingDate = new Date(readingDateValue)
        const readingUnitId = reading.unitId ?? reading.unit_id
        return readingUnitId === unitId &&
               readingDate.getMonth() === month - 1 &&
               readingDate.getFullYear() === year
      })
      .sort((a: any, b: any) => {
        const aDate = (a as any).lastModifiedAt || (a as any).createdAt || (a as any).last_modified_at || (a as any).created_at || (a as any).readingDate || (a as any).reading_date
        const bDate = (b as any).lastModifiedAt || (b as any).createdAt || (b as any).last_modified_at || (b as any).created_at || (b as any).readingDate || (b as any).reading_date
        if (!aDate || !bDate) return 0
        const aTime = new Date(aDate).getTime()
        const bTime = new Date(bDate).getTime()
        return bTime - aTime
      })[0]

    if (!recentReading) return null
    const timestampValue = (recentReading as any).lastModifiedAt || (recentReading as any).createdAt || (recentReading as any).last_modified_at || (recentReading as any).created_at || (recentReading as any).readingDate || (recentReading as any).reading_date
    if (!timestampValue) return null
    const modifiedTime = new Date(timestampValue)
    const label = modifiedTime.toLocaleString()

    const lease = activeLeasesByUnit.get(unitId)
    const invoiceCutoff = normalizedInvoices
      .filter((invoice: any) => invoice.leaseId === lease?.id && invoice.issueDate)
      .filter((invoice: any) => ["approved", "submitted"].includes((invoice.status || "").toLowerCase()))
      .map((invoice: any) => new Date(invoice.issueDate).getTime())
      .sort((a: number, b: number) => b - a)[0]

    const isLate = invoiceCutoff ? modifiedTime.getTime() > invoiceCutoff : false

    return { label, isLate }
  }

  return (
    <div className="space-y-6">
      <AlertDialog
        open={crossMonthConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (crossMonthConfirm.unitId) {
              setPendingConfirmUnits(prev => {
                const next = new Set(prev)
                next.delete(crossMonthConfirm.unitId!)
                return next
              })
            }
            setCrossMonthConfirm({ isOpen: false, message: "", unitId: null, onConfirm: null, onCancel: null })
          }
        }}
      >
        <AlertDialogContent className={`vibrant-card ${confirmPalette.card} ${confirmPalette.border}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm cross-month impact</AlertDialogTitle>
            <AlertDialogDescription>{crossMonthConfirm.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                crossMonthConfirm.onCancel?.()
                if (crossMonthConfirm.unitId) {
                  setPendingConfirmUnits(prev => {
                    const next = new Set(prev)
                    next.delete(crossMonthConfirm.unitId!)
                    return next
                  })
                }
                setCrossMonthConfirm({ isOpen: false, message: "", unitId: null, onConfirm: null, onCancel: null })
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                crossMonthConfirm.onConfirm?.()
                if (crossMonthConfirm.unitId) {
                  setPendingConfirmUnits(prev => {
                    const next = new Set(prev)
                    next.delete(crossMonthConfirm.unitId!)
                    return next
                  })
                }
                setCrossMonthConfirm({ isOpen: false, message: "", unitId: null, onConfirm: null, onCancel: null })
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-water-units">Water Units</h1>
          <p className="text-muted-foreground">
            Record water meter readings and track consumption across all properties
          </p>
        </div>
      </div>

      {/* Consumption Month */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="consumption-month">Consumption Month:</Label>
          <Input
            id="consumption-month"
            type="month"
            value={consumptionMonth}
            onChange={(event) => setConsumptionMonth(event.target.value)}
            className="w-64"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {globalSelectedPropertyId
            ? `Showing water readings for ${Array.isArray(properties) ? properties.find((p: any) => p.id === globalSelectedPropertyId)?.name : "Unknown"} (${filteredUnits.length} units)`
            : `Showing water readings for all properties (${filteredUnits.length} units)`}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className={`vibrant-card border-2 ${getPaletteByIndex(summaryPaletteSeed.current).border} ${getPaletteByIndex(summaryPaletteSeed.current).card}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-units">{readingsSummary.totalUnits}</div>
            <p className="text-xs text-muted-foreground">Units with water meters</p>
          </CardContent>
        </Card>

        <Card className={`vibrant-card border-2 ${getPaletteByIndex((summaryPaletteSeed.current + 1) % 6).border} ${getPaletteByIndex((summaryPaletteSeed.current + 1) % 6).card}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consumption Month</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-readings-this-month">
              {readingsSummary.unitsWithReadingsThisMonth}/{readingsSummary.totalUnits}
            </div>
            <p className="text-xs text-muted-foreground">Recorded units/Total units</p>
          </CardContent>
        </Card>

        <Card className={`vibrant-card border-2 ${getPaletteByIndex((summaryPaletteSeed.current + 2) % 6).border} ${getPaletteByIndex((summaryPaletteSeed.current + 2) % 6).card}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consumption</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-consumption">{readingsSummary.totalConsumption.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Cubic meters (m³)</p>
          </CardContent>
        </Card>

        <Card className={`vibrant-card border-2 ${getPaletteByIndex((summaryPaletteSeed.current + 3) % 6).border} ${getPaletteByIndex((summaryPaletteSeed.current + 3) % 6).card}`}>
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

      <Tabs defaultValue="bulk-entry" className="space-y-6">
        <TabsList className={`border-2 ${getPaletteByIndex(listPaletteSeed.current).border} ${getPaletteByIndex(listPaletteSeed.current).card}`}>
          <TabsTrigger value="bulk-entry">Bulk Entry</TabsTrigger>
          <TabsTrigger value="consumption-analysis">Consumption Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="add-reading" className="space-y-6">
          <Card className="vibrant-panel">
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
                    disabled={actionsDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUnits.map(unit => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.unitNumber} - {getAccountName(unit.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previous-reading">Previous Reading (Override)</Label>
                  <Input
                    id="previous-reading"
                    type="number"
                    placeholder="Auto from last reading"
                    value={currentReading.previousReading}
                    onChange={(e) => setCurrentReading(prev => ({ ...prev, previousReading: e.target.value }))}
                    disabled={actionsDisabled}
                    data-testid="input-previous-reading"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current-reading">Current Reading (m³)</Label>
                  <Input
                    id="current-reading"
                    type="number"
                    placeholder="Enter meter reading"
                    value={currentReading.reading}
                    onChange={(e) => setCurrentReading(prev => ({ ...prev, reading: e.target.value }))}
                    disabled={actionsDisabled}
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
                  disabled={actionsDisabled || upsertReadingMutation.isPending || !currentReading.unitId || !currentReading.reading}
                  data-testid="button-save-reading"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {upsertReadingMutation.isPending ? "Saving..." : "Save Reading"}
                </Button>
                
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-entry" className="space-y-6">
          <Card className={`vibrant-card border-2 ${getPaletteByIndex(listPaletteSeed.current).border} ${getPaletteByIndex(listPaletteSeed.current).card}`}>
            <CardHeader>
              <CardTitle>Bulk Water Reading Entry</CardTitle>
              <CardDescription>
                Enter readings for multiple units at once. Changes are automatically saved after you stop typing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionsDisabled && (
                <div className="text-sm text-muted-foreground mb-4">
                  Select a property in the header to edit readings.
                </div>
              )}
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
                    <Table className="table-fixed w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32">Unit</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="w-40">Water Rate</TableHead>
                          <TableHead className="w-40">Previous Reading</TableHead>
                          <TableHead className="w-48">New Reading (m³)</TableHead>
                          <TableHead className="w-32">Units Consumed</TableHead>
                          <TableHead className="w-32 text-right">Total Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUnits.map(unit => {
                          const lastReading = getLastReadingForUnit(unit.id)
                          const waterRate = getWaterRateForUnit(unit.id)
                          const currentValue = bulkReadings[unit.id] || ""
                          const previousOverride = bulkPreviousReadings[unit.id]
                          const hasPreviousOverride = previousOverride !== undefined && previousOverride !== ""
                          const lastReadingValue = lastReading ? (lastReading.currentReading ?? lastReading.current_reading) : null
                          const hasLastReading = lastReadingValue !== null && lastReadingValue !== undefined && String(lastReadingValue) !== ""
                          const isPreviousMissing = !hasPreviousOverride && !hasLastReading
                          const previousValue = hasPreviousOverride
                            ? parseFloat(previousOverride)
                            : hasLastReading
                              ? parseFloat(String(lastReadingValue))
                              : NaN
                          const newValue = currentValue !== "" ? parseFloat(currentValue) : NaN
                          const unitsConsumed = Number.isFinite(newValue) ? Math.max(0, newValue - previousValue) : 0
                          const totalCost = unitsConsumed * waterRate
                          const isSaving = savingUnits.has(unit.id)
                          const isSaved = savedUnits.has(unit.id)
                          const lastModifiedInfo = getLastModifiedInfo(unit.id)
                          
                          // Debug logging for rendering
                          console.log("🎨 RENDER unit:", unit.id, "isSaving:", isSaving, "isSaved:", isSaved, "savedUnits:", Array.from(savedUnits), "savingUnits:", Array.from(savingUnits))
                          
                          return (
                            <TableRow key={unit.id} data-testid={`row-bulk-unit-${unit.id}`}>
                              <TableCell className="font-medium">
                                {unit.unitNumber}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {getAccountName(unit.id)}
                              </TableCell>
                              <TableCell className="text-sm">
                                KSH {waterRate.toFixed(2)} per m³
                              </TableCell>
                              <TableCell className="text-sm">
                                <Input
                                  type="number"
                                  placeholder={lastReading ? `${lastReading.currentReading ?? lastReading.current_reading}` : "0"}
                                  value={bulkPreviousReadings[unit.id] ?? ""}
                                  onChange={(e) => handleBulkPreviousReadingChange(unit.id, e.target.value)}
                                  onFocus={() => {
                                    setEditingUnits(prev => {
                                      const next = new Set(prev)
                                      next.add(unit.id)
                                      return next
                                    })
                                  }}
                                  onBlur={() => {
                                    setEditingUnits(prev => {
                                      const next = new Set(prev)
                                      next.delete(unit.id)
                                      return next
                                    })
                                  }}
                                  className="h-8 w-24"
                                  disabled={actionsDisabled}
                                  data-testid={`input-prev-reading-${unit.id}`}
                                />
                                <div className="mt-1 text-xs w-40">
                                  {lastModifiedInfo ? (
                                    <span className={lastModifiedInfo.isLate ? "text-red-500" : "text-green-600"}>
                                      Prev updated: {lastModifiedInfo.label}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Prev updated: --:--</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder="Enter reading"
                                    value={currentValue}
                                    onChange={(e) => handleBulkReadingChange(unit.id, e.target.value, Number.isFinite(previousValue) ? previousValue : null, isPreviousMissing)}
                                    onFocus={() => {
                                      setEditingUnits(prev => {
                                        const next = new Set(prev)
                                        next.add(unit.id)
                                        return next
                                      })
                                    }}
                                    onBlur={() => {
                                      setEditingUnits(prev => {
                                        const next = new Set(prev)
                                        next.delete(unit.id)
                                        return next
                                      })
                                    }}
                                    className={`pr-8 h-8 w-24 ${isSaved ? 'border-green-500' : ''}`}
                                    disabled={actionsDisabled}
                                    data-testid={`input-bulk-reading-${unit.id}`}
                                  />
                                  {isSaving && (
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-1 text-xs w-40">
                                  {lastModifiedInfo ? (
                                    <span className={lastModifiedInfo.isLate ? "text-red-500" : "text-green-600"}>
                                      Last updated: {lastModifiedInfo.label}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Last updated: --:--</span>
                                  )}
                                </div>
                                {isSaved && (
                                  <div className="mt-1 text-xs text-green-600 w-40">
                                    ✓ Saved
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {currentValue ? unitsConsumed.toFixed(2) : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {currentValue ? (
                                  <div className="font-medium text-primary">
                                    KSH {totalCost.toFixed(2)}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground text-sm">-</div>
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

        <TabsContent value="consumption-analysis" className="space-y-6">
          <Card className={`vibrant-card border-2 ${getPaletteByIndex(analysisPaletteSeed.current).border} ${getPaletteByIndex(analysisPaletteSeed.current).card}`}>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Consumption Analysis</CardTitle>
                  <CardDescription>Analyze water consumption patterns and trends</CardDescription>
                </div>
                {consumptionTrend.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTrendBreakdown(prev => !prev)}
                  >
                    {showTrendBreakdown ? "Hide breakdown" : "View breakdown"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {consumptionTrend.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No readings available to build a trend yet.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={consumptionTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === "totalCost") return [`KSH ${value.toFixed(2)}`, "Total Cost"]
                            return [`${value.toFixed(2)} m³`, "Units Consumed"]
                          }}
                        />
                        <Line type="monotone" dataKey="consumption" stroke="#38bdf8" strokeWidth={2} dot />
                        <Line type="monotone" dataKey="totalCost" stroke="#22c55e" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {showTrendBreakdown && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-40">Month</TableHead>
                          <TableHead className="w-40 text-right">Units Consumed (m³)</TableHead>
                          <TableHead className="w-40 text-right">Total Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consumptionTrend.map((row) => (
                          <TableRow key={row.monthKey}>
                            <TableCell className="font-medium">{row.label}</TableCell>
                            <TableCell className="text-right">{row.consumption.toFixed(2)}</TableCell>
                            <TableCell className="text-right">KSH {row.totalCost.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}