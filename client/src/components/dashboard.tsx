import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { 
  Building2, 
  Users, 
  Receipt, 
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  UserPlus,
  Activity,
  ExternalLink,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useFilter } from "@/contexts/FilterContext"
import { getPaletteByIndex, getPaletteByKey, getPaletteByName } from "@/lib/palette"
import {
  THRESHOLDS,
  getThresholdLevel,
  getThresholdPalette,
  getTrendDirectionFromLevel,
  getTrendPalette,
} from "@/lib/color-rules"

export function Dashboard() {
  const [mpesaBalance, setMpesaBalance] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [timeframe, setTimeframe] = useState("monthly")
  const mpesaPalette = getPaletteByName("emerald")
  const activityPaletteSeed = useRef(Math.floor(Math.random() * 6))
  const incomingPaletteSeed = useRef(Math.floor(Math.random() * 6))
  const activityPalette = getPaletteByIndex(activityPaletteSeed.current)
  const incomingPalette = getPaletteByIndex(incomingPaletteSeed.current)
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const { selectedPropertyId, selectedLandlordId } = useFilter()
  
  // Debug logging
  console.log("Dashboard filtering - selectedLandlordId:", selectedLandlordId, "selectedPropertyId:", selectedPropertyId)

  // Fetch M-Pesa balance from API (if available)
  // Note: API endpoint not yet implemented, so this is disabled
  const { data: mpesaData, isError: mpesaError } = useQuery({
    queryKey: ["/api/mpesa-balance"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/mpesa-balance")
      return await response.json()
    },
    enabled: false, // Disable until API endpoint is implemented
  })

  useEffect(() => {
    if (mpesaData && typeof mpesaData === 'object' && 'balance' in mpesaData) {
      setMpesaBalance((mpesaData as any).balance)
      setIsConnected(true)
    } else if (mpesaError) {
      setIsConnected(false)
    }
  }, [mpesaData, mpesaError])

  // Fetch real data from backend with optimized caching
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties", selectedLandlordId, selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["/api/stats"],
    staleTime: 2 * 60 * 1000, // Cache stats for 2 minutes (more dynamic)
  })

  // Show error toast if API calls fail
  useEffect(() => {
    if (statsError) {
      toast({
        title: "Failed to load stats",
        description: "Unable to fetch dashboard statistics. Please try again.",
        variant: "destructive"
      })
    }
  }, [statsError])

  const { data: allRecentPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/payments", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/payments${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    staleTime: 1 * 60 * 1000, // Payments are dynamic, cache for 1 minute
  })

  const { data: allOverdueInvoices, isLoading: overdueLoading } = useQuery({
    queryKey: ["/api/invoices", selectedPropertyId, selectedLandlordId, "overdue"],
    queryFn: async () => {
      const params = new URLSearchParams("overdue=true")
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoices?${params}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    staleTime: 1 * 60 * 1000, // Overdue invoices are dynamic
  })

  const { data: incomingPayments = [], isLoading: incomingLoading } = useQuery({
    queryKey: ["/api/incoming-payments", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      params.append("limit", "6")
      const url = `/api/incoming-payments?${params.toString()}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    staleTime: 1 * 60 * 1000,
  })
  
  // Filter recent payments and overdue invoices (will be set after filtering logic)
  let recentPayments: any[] = []
  let overdueInvoices: any[] = []

  const { data: allInvoices } = useQuery({
    queryKey: ["/api/invoices", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoices${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    staleTime: 5 * 60 * 1000, // Full invoices list cached longer
  })

  const { data: allPayments } = useQuery({
    queryKey: ["/api/payments", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/payments${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: leases } = useQuery({
    queryKey: ["/api/leases", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: tenants } = useQuery({
    queryKey: ["/api/tenants", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: activityLogs, isLoading: activityLoading } = useQuery({
    queryKey: ["/api/activity-logs", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId && selectedPropertyId !== "all") {
        params.append("propertyId", selectedPropertyId)
      }
      params.append("limit", "50")
      const url = `/api/activity-logs?${params.toString()}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    staleTime: 30 * 1000,
  })

  // Fetch units data for filtering (needed for unitId → propertyId mapping)
  const { data: units } = useQuery({
    queryKey: ["/api/units", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    staleTime: 5 * 60 * 1000,
  })


  // Generate monthly invoices mutation
  const generateInvoicesMutation = useMutation({
    mutationFn: async () => {
      const currentDate = new Date()
      const response = await apiRequest("POST", "/api/invoices/generate", {
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      })
      return response.json()
    },
    onSuccess: (data) => {
      toast({
        title: "Invoices generated!",
        description: data.message
      })
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] })
    },
    onError: (error: any) => {
      toast({
        title: "Invoice generation failed",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Transform backend stats into display format
  const statsData = stats as any
  const allPropertiesData = Array.isArray(properties)
    ? properties.map((property: any) => ({
        ...property,
        id: property.id,
        landlordId: property.landlordId ?? property.landlord_id,
      }))
    : []
  const allUnitsData = Array.isArray(units)
    ? units.map((unit: any) => ({
        ...unit,
        id: unit.id,
        propertyId: unit.propertyId ?? unit.property_id,
        unitNumber: unit.unitNumber ?? unit.unit_number,
      }))
    : []
  const allLeasesData = Array.isArray(leases)
    ? leases.map((lease: any) => ({
        ...lease,
        id: lease.id,
        unitId: lease.unitId ?? lease.unit_id,
        tenantId: lease.tenantId ?? lease.tenant_id,
        startDate: lease.startDate ?? lease.start_date,
        endDate: (lease.endDate ?? lease.end_date) || null,
        rentAmount: lease.rentAmount ?? lease.rent_amount,
        status: (lease.status || "").toLowerCase(),
      }))
    : []
  const allTenantsData = Array.isArray(tenants)
    ? tenants.map((tenant: any) => ({
        ...tenant,
        id: tenant.id,
        fullName: tenant.fullName ?? tenant.full_name,
      }))
    : []
  const allInvoicesData = Array.isArray(allInvoices)
    ? allInvoices.map((invoice: any) => ({
        ...invoice,
        id: invoice.id,
        leaseId: invoice.leaseId ?? invoice.lease_id,
        amount: invoice.amount,
        dueDate: invoice.dueDate ?? invoice.due_date,
        status: (invoice.status || "").toLowerCase(),
      }))
    : []
  const allOverdueInvoicesData = Array.isArray(allOverdueInvoices)
    ? allOverdueInvoices.map((invoice: any) => ({
        ...invoice,
        id: invoice.id,
        leaseId: invoice.leaseId ?? invoice.lease_id,
        amount: invoice.amount,
        dueDate: invoice.dueDate ?? invoice.due_date,
        status: (invoice.status || "").toLowerCase(),
      }))
    : []
  const allPaymentsData = Array.isArray(allPayments)
    ? allPayments.map((payment: any) => ({
        ...payment,
        id: payment.id,
        leaseId: payment.leaseId ?? payment.lease_id,
        amount: payment.amount,
        paymentDate: payment.paymentDate ?? payment.payment_date,
      }))
    : []
  const allActivityLogs = Array.isArray(activityLogs) ? activityLogs : []
  
  // Debug logging
  console.log("Dashboard filtering - selectedLandlordId:", selectedLandlordId, "selectedPropertyId:", selectedPropertyId)
  
  const normalizeId = (value: any) => (value === null || value === undefined ? null : String(value))
  const normalizedLandlordId = normalizeId(selectedLandlordId)
  const normalizedPropertyId = normalizeId(selectedPropertyId)

  // First filter by landlordId if selected
  let propertiesAfterLandlordFilter = allPropertiesData
  if (normalizedLandlordId && normalizedLandlordId !== "all") {
    propertiesAfterLandlordFilter = allPropertiesData.filter((p: any) => normalizeId(p.landlordId) === normalizedLandlordId)
    console.log("Dashboard - Filtered properties by landlord:", selectedLandlordId, "Count:", propertiesAfterLandlordFilter.length)
  }
  
  // Then filter data by selectedPropertyId if a specific property is selected
  let propertiesData = propertiesAfterLandlordFilter
  let filteredUnits = allUnitsData
  let filteredLeases = allLeasesData
  let filteredTenants = allTenantsData
  let filteredInvoices = allInvoicesData
  let filteredPayments = allPaymentsData
  
  if (normalizedPropertyId && normalizedPropertyId !== "all") {
    // Ensure the selected property belongs to the selected landlord (if landlord is selected)
    propertiesData = propertiesAfterLandlordFilter.filter((p: any) => normalizeId(p.id) === normalizedPropertyId)
    if (propertiesData.length === 0) {
      console.warn("Dashboard - Selected property not found or doesn't belong to selected landlord")
    }
    
    // Filter units (direct propertyId relationship) - only for properties that passed landlord filter
    const propertyIds = propertiesData.map((p: any) => normalizeId(p.id))
    filteredUnits = allUnitsData.filter((u: any) => propertyIds.includes(normalizeId(u.propertyId)))
    console.log("Dashboard - Filtered units by property:", propertyIds, "Count:", filteredUnits.length)
    
    // Create unitId → propertyId mapping for filtering leases
    const unitsMap: Record<string, any> = {}
    allUnitsData.forEach((u: any) => {
      unitsMap[normalizeId(u.id) as string] = u
    })
    
    // Filter leases (via unitId → propertyId)
    filteredLeases = allLeasesData.filter((l: any) => {
      const unit = unitsMap[normalizeId(l.unitId) as string]
      return unit && normalizeId(unit.propertyId) === normalizedPropertyId
    })
    
    // Create leaseId → lease mapping for filtering invoices/payments
    const leasesMap: Record<string, any> = {}
    filteredLeases.forEach((l: any) => {
      leasesMap[l.id] = l
    })
    
    // Filter tenants (via leases)
    const filteredLeaseIds = new Set(filteredLeases.map((l: any) => normalizeId(l.tenantId)))
    filteredTenants = allTenantsData.filter((t: any) => filteredLeaseIds.has(normalizeId(t.id)))
    
    // Filter invoices (via leaseId → unitId → propertyId)
    filteredInvoices = allInvoicesData.filter((i: any) => {
      const lease = leasesMap[normalizeId(i.leaseId) as string]
      if (!lease) return false
      const unit = unitsMap[normalizeId(lease.unitId) as string]
      return unit && normalizeId(unit.propertyId) === normalizedPropertyId
    })
    
    // Filter payments (via leaseId → unitId → propertyId)
    filteredPayments = allPaymentsData.filter((p: any) => {
      const lease = leasesMap[normalizeId(p.leaseId) as string]
      if (!lease) return false
      const unit = unitsMap[normalizeId(lease.unitId) as string]
      return unit && normalizeId(unit.propertyId) === normalizedPropertyId
    })
    
    // Filter recent payments and overdue invoices
    const allRecentPaymentsData = Array.isArray(allRecentPayments) ? allRecentPayments : []
    
    recentPayments = allRecentPaymentsData.filter((p: any) => {
      const lease = leasesMap[p.leaseId]
      if (!lease) return false
      const unit = unitsMap[lease.unitId]
      return unit && unit.propertyId === selectedPropertyId
    }).slice(0, 5)
    
    overdueInvoices = allOverdueInvoicesData.filter((i: any) => {
      const lease = leasesMap[i.leaseId]
      if (!lease) return false
      const unit = unitsMap[lease.unitId]
      return unit && unit.propertyId === selectedPropertyId
    }).slice(0, 5)
  } else if (selectedLandlordId && selectedLandlordId !== "all") {
    // If only landlord is selected (no property), filter by landlord's properties
    const propertyIds = propertiesAfterLandlordFilter.map((p: any) => p.id)
    const unitsMap: Record<string, any> = {}
    allUnitsData.forEach((u: any) => {
      if (propertyIds.includes(u.propertyId)) {
        unitsMap[u.id] = u
      }
    })
    
    const leasesMap: Record<string, any> = {}
    allLeasesData.forEach((l: any) => {
      const unit = unitsMap[l.unitId]
      if (unit) {
        leasesMap[l.id] = l
      }
    })
    
    const allRecentPaymentsData = Array.isArray(allRecentPayments) ? allRecentPayments : []
    
    recentPayments = allRecentPaymentsData.filter((p: any) => {
      const lease = leasesMap[p.leaseId]
      return !!lease
    }).slice(0, 5)
    
    overdueInvoices = allOverdueInvoicesData.filter((i: any) => {
      const lease = leasesMap[i.leaseId]
      return !!lease
    }).slice(0, 5)
    
    // Also filter other data by landlord
    filteredLeases = allLeasesData.filter((l: any) => {
      const unit = unitsMap[l.unitId]
      return !!unit
    })
    
    const filteredLeaseIds = new Set(filteredLeases.map((l: any) => l.tenantId))
    filteredTenants = allTenantsData.filter((t: any) => filteredLeaseIds.has(t.id))
    
    filteredInvoices = allInvoicesData.filter((i: any) => {
      const lease = leasesMap[i.leaseId]
      return !!lease
    })
    
    filteredPayments = allPaymentsData.filter((p: any) => {
      const lease = leasesMap[p.leaseId]
      return !!lease
    })
    
    filteredUnits = allUnitsData.filter((u: any) => propertyIds.includes(u.propertyId))
    
    console.log("Dashboard - Filtered by landlord only:", selectedLandlordId, "Payments:", recentPayments.length, "Invoices:", overdueInvoices.length, "Properties:", propertiesAfterLandlordFilter.length)
  } else {
    // Show all data
    recentPayments = Array.isArray(allRecentPayments) ? allRecentPayments.slice(0, 5) : []
    overdueInvoices = allOverdueInvoicesData.slice(0, 5)
  }

  const filteredActivityLogs = (() => {
    if (selectedPropertyId && selectedPropertyId !== "all") {
      return allActivityLogs
    }
    if (selectedLandlordId && selectedLandlordId !== "all") {
      const propertyIds = new Set(propertiesAfterLandlordFilter.map((p: any) => p.id))
      return allActivityLogs.filter((log: any) => !log.property_id || propertyIds.has(log.property_id))
    }
    return allActivityLogs
  })()
  
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

  const isActiveLease = (lease: any) => {
    const startDate = toStartOfDay(lease.startDate)
    const endDate = lease.endDate ? toEndOfDay(lease.endDate) : null
    if (!startDate) return false
    const normalizedStatus = lease.status || "active"
    const isActiveStatus = normalizedStatus === "active" || normalizedStatus === ""
    const now = new Date()
    return startDate <= now && (!endDate || endDate >= now) && isActiveStatus
  }
  
  // Recalculate stats from filtered data
  const calculateFilteredStats = () => {
    // Calculate occupancy from filtered units and leases
    const occupiedUnitsCount = filteredLeases.filter((l: any) => isActiveLease(l)).length
    const totalUnitsCount = filteredUnits.length
    const vacantUnitsCount = totalUnitsCount - occupiedUnitsCount
    
    // Calculate monthly revenue from filtered active leases
    const monthlyRevenue = filteredLeases
      .filter((l: any) => isActiveLease(l))
      .reduce((sum: number, l: any) => sum + parseFloat(l.rentAmount || l.monthlyRent || 0), 0)
    
    return {
      occupiedUnits: occupiedUnitsCount,
      totalUnits: totalUnitsCount,
      vacantUnits: vacantUnitsCount,
      monthlyRevenue: monthlyRevenue,
      collectionRate: 0
    }
  }
  
  const filteredStats = calculateFilteredStats()
  const totalInvoiced = filteredInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0)
  const totalPaid = filteredPayments.reduce((sum: number, pay: any) => sum + parseFloat(pay.amount || 0), 0)
  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0
  const revenueAttainment = collectionRate
  const vacancyPercent =
    filteredStats.totalUnits > 0
      ? Math.round((filteredStats.vacantUnits / filteredStats.totalUnits) * 100)
      : 0
  
  const vacancyLevel = getThresholdLevel(vacancyPercent, THRESHOLDS.vacancyPercent)
  const vacancyPalette = getThresholdPalette(vacancyPercent, THRESHOLDS.vacancyPercent, "lowerBetter")
  const vacancyTrend = getTrendDirectionFromLevel(vacancyLevel, "lowerBetter")

  const collectionLevel = getThresholdLevel(collectionRate, THRESHOLDS.ratePercent)
  const collectionPalette = getThresholdPalette(collectionRate, THRESHOLDS.ratePercent, "higherBetter")
  const collectionTrend = getTrendDirectionFromLevel(collectionLevel, "higherBetter")

  const revenueLevel = getThresholdLevel(revenueAttainment, THRESHOLDS.ratePercent)
  const revenuePalette = getThresholdPalette(revenueAttainment, THRESHOLDS.ratePercent, "higherBetter")
  const revenueTrend = getTrendDirectionFromLevel(revenueLevel, "higherBetter")

  const propertiesThresholds = { low: 1, high: 5 }
  const propertiesLevel = getThresholdLevel(propertiesData.length, propertiesThresholds)
  const propertiesPalette = getThresholdPalette(propertiesData.length, propertiesThresholds, "higherBetter")
  const propertiesTrend = getTrendDirectionFromLevel(propertiesLevel, "higherBetter")

  const displayStats = [
    {
      id: "total-properties",
      title: "Total Properties",
      value: propertiesData.length.toString(),
      description: "Active properties",
      icon: Building2,
      trend: "Updated from database",
      palette: propertiesPalette,
      trendPalette: getTrendPalette(propertiesTrend),
    },
    {
      id: "occupancy",
      title: "Occupancy",
      value: `${filteredStats.occupiedUnits}/${filteredStats.totalUnits}`,
      description: `${filteredStats.totalUnits > 0 ? Math.round((filteredStats.occupiedUnits / filteredStats.totalUnits) * 100) : 0}% occupied`,
      icon: Users,
      trend: `${filteredStats.vacantUnits} vacant units`,
      palette: vacancyPalette,
      trendPalette: getTrendPalette(vacancyTrend),
    },
    {
      id: "monthly-revenue",
      title: "Monthly Revenue",
      value: `KSh ${filteredStats.monthlyRevenue.toLocaleString()}`,
      description: "Expected monthly",
      icon: Receipt,
      trend: `Attainment ${revenueAttainment}%`,
      palette: revenuePalette,
      trendPalette: getTrendPalette(revenueTrend),
    },
    {
      id: "collection-rate",
      title: "Collection Rate",
      value: `${collectionRate}%`,
      description: "This month",
      icon: TrendingUp,
      trend: `Paid ${collectionRate}% of invoices`,
      palette: collectionPalette,
      trendPalette: getTrendPalette(collectionTrend),
    }
  ]

  // Generate revenue data from actual payments by month (using filtered payments)
  const getRevenueData = () => {
    const payments = filteredPayments
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    
    // Get payments grouped by month
    const getPaymentsByMonth = (monthOffset: number) => {
      const targetDate = new Date(currentYear, currentDate.getMonth() - monthOffset, 1)
      const nextMonth = new Date(currentYear, currentDate.getMonth() - monthOffset + 1, 1)
      
      return payments
        .filter((p: any) => {
          const payDate = new Date(p.paymentDate)
          return payDate >= targetDate && payDate < nextMonth
        })
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)
    }
    
    switch (timeframe) {
      case "weekly":
        // Get last 4 weeks
        const weeklyData = []
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date(currentDate)
          weekStart.setDate(weekStart.getDate() - (i * 7))
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 7)
          
          const weekPayments = payments
            .filter((p: any) => {
              const payDate = new Date(p.paymentDate)
              return payDate >= weekStart && payDate < weekEnd
            })
            .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)
          
          weeklyData.push(weekPayments)
        }
        return {
          labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
          data: weeklyData.length === 4 ? weeklyData : [0, 0, 0, 0]
        }
      case "quarterly":
        return {
          labels: ["Q1", "Q2", "Q3", "Q4"],
          data: [
            getPaymentsByMonth(9) + getPaymentsByMonth(10) + getPaymentsByMonth(11), // Q1 (3 months ago)
            getPaymentsByMonth(6) + getPaymentsByMonth(7) + getPaymentsByMonth(8),  // Q2
            getPaymentsByMonth(3) + getPaymentsByMonth(4) + getPaymentsByMonth(5),  // Q3
            getPaymentsByMonth(0) + getPaymentsByMonth(1) + getPaymentsByMonth(2)   // Q4 (current)
          ]
        }
      case "yearly":
        const yearlyData = []
        for (let year = 0; year < 4; year++) {
          const yearPayments = payments
            .filter((p: any) => {
              const payDate = new Date(p.paymentDate)
              return payDate.getFullYear() === (currentYear - (3 - year))
            })
            .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)
          yearlyData.push(yearPayments)
        }
        return {
          labels: [(currentYear - 3).toString(), (currentYear - 2).toString(), (currentYear - 1).toString(), currentYear.toString()],
          data: yearlyData
        }
      default: // monthly
        return {
          labels: ["Jan", "Feb", "Mar", "Apr"],
          data: [
            getPaymentsByMonth(3), // Jan (3 months ago)
            getPaymentsByMonth(2), // Feb
            getPaymentsByMonth(1), // Mar
            getPaymentsByMonth(0)  // Apr (current month)
          ]
        }
    }
  }

  const revenueData = getRevenueData()

  // Calculate real financial metrics using filtered data
  const calculateFinancialMetrics = () => {
    const invoices = filteredInvoices.filter((inv: any) => (inv.status || "").toLowerCase() === "approved")
    const payments = filteredPayments
    const leasesData = filteredLeases

    // Calculate collection rate (payments / invoices)
    const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0)
    const totalPaid = payments.reduce((sum: number, pay: any) => sum + parseFloat(pay.amount || 0), 0)
    const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0

    // Calculate monthly revenue from active leases
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyRevenue = leasesData
      .filter((lease: any) => isActiveLease(lease))
      .reduce((sum: number, lease: any) => sum + parseFloat(lease.rentAmount || lease.monthlyRent || 0), 0)

    // Find top performing property (using filtered data)
    // Create unitsMap for property lookup
    const unitsMapForRevenue: Record<string, any> = {}
    filteredUnits.forEach((u: any) => {
      unitsMapForRevenue[u.id] = u
    })
    
    const propertyRevenue = propertiesData.length > 0 ? propertiesData.map((prop: any) => {
      const propLeases = leasesData.filter((l: any) => {
        const unit = unitsMapForRevenue[l.unitId]
        return unit && unit.propertyId === prop.id
      })
      const propRevenue = propLeases.reduce((sum: number, l: any) => sum + parseFloat(l.rentAmount || l.monthlyRent || 0), 0)
      const propUnits = propLeases.length
      return { ...prop, revenue: propRevenue, units: propUnits }
    }).sort((a: any, b: any) => b.revenue - a.revenue)[0] : null

    // Calculate growth rate (compare this month vs last month payments)
    const thisMonthPayments = payments.filter((p: any) => {
      const payDate = new Date(p.paymentDate)
      return payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear
    }).reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)

    const lastMonthPayments = payments.filter((p: any) => {
      const payDate = new Date(p.paymentDate)
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear
      return payDate.getMonth() === lastMonth && payDate.getFullYear() === lastYear
    }).reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)

    const growthRate = lastMonthPayments > 0 
      ? Math.round(((thisMonthPayments - lastMonthPayments) / lastMonthPayments) * 100) 
      : 0

    // Calculate collection breakdown by invoice type
    const rentInvoices = invoices.filter((inv: any) => inv.description?.toLowerCase().includes('rent'))
    const waterInvoices = invoices.filter((inv: any) => inv.description?.toLowerCase().includes('water'))
    const serviceInvoices = invoices.filter((inv: any) => 
      inv.description?.toLowerCase().includes('service') || 
      inv.description?.toLowerCase().includes('charge')
    )

    const rentCollected = rentInvoices.reduce((sum: number, inv: any) => {
      const invPayments = payments.filter((p: any) => p.invoiceId === inv.id)
      return sum + invPayments.reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0)
    }, 0)
    const rentTotal = rentInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0)
    const rentCollectionRate = rentTotal > 0 ? Math.round((rentCollected / rentTotal) * 100) : 0

    const waterCollected = waterInvoices.reduce((sum: number, inv: any) => {
      const invPayments = payments.filter((p: any) => p.invoiceId === inv.id)
      return sum + invPayments.reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0)
    }, 0)
    const waterTotal = waterInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0)
    const waterCollectionRate = waterTotal > 0 ? Math.round((waterCollected / waterTotal) * 100) : 0

    const serviceCollected = serviceInvoices.reduce((sum: number, inv: any) => {
      const invPayments = payments.filter((p: any) => p.invoiceId === inv.id)
      return sum + invPayments.reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0)
    }, 0)
    const serviceTotal = serviceInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0)
    const serviceCollectionRate = serviceTotal > 0 ? Math.round((serviceCollected / serviceTotal) * 100) : 0

    return {
      collectionRate,
      monthlyRevenue,
      topProperty: propertyRevenue,
      growthRate,
      rentCollectionRate,
      waterCollectionRate,
      serviceCollectionRate
    }
  }

  const financialMetrics = calculateFinancialMetrics()

  const recentActivity = filteredActivityLogs
    .slice(0, 6)
    .map((activity: any) => ({
      id: activity.id,
      type: activity.type || "system",
      message: activity.action,
      amount: activity.amount ? `KSh ${parseFloat(activity.amount || 0).toLocaleString()}` : null,
      time: activity.created_at ? new Date(activity.created_at).toLocaleString() : "—",
      status: activity.status || "success",
      user: activity.user_name || "System"
    }))

  const hasOverdue = Array.isArray(overdueInvoices) && overdueInvoices.length > 0
  const overduePalette = getPaletteByName(hasOverdue ? "rose" : "emerald")

  const activityLast24h = filteredActivityLogs.filter((activity: any) => {
    if (!activity.created_at) return false
    const createdAt = new Date(activity.created_at)
    if (Number.isNaN(createdAt.getTime())) return false
    return Date.now() - createdAt.getTime() <= 24 * 60 * 60 * 1000
  }).length

  // Loading and error states
  const isLoading = statsLoading || propertiesLoading || paymentsLoading || overdueLoading
  const showEmptyState = !isLoading && (!stats || !properties)

  return (
    <div className="p-6 space-y-6 relative">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
            data-testid="dashboard-title"
          >
            Property Overview
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground"
          >
            Monitor your rental property performance
          </motion.p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            data-testid="button-add-property"
            onClick={() => setLocation('/properties')}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>
      </motion.div>

      {/* M-Pesa Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className={`border ${mpesaPalette.border} ${mpesaPalette.card} hover:shadow-xl transition-all duration-300 hover:scale-[1.01]`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">M-Pesa Paybill Balance</CardTitle>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {isConnected ? "Live" : "Disconnected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Wallet className={`h-8 w-8 ${mpesaPalette.icon}`} />
            <div>
              <div className="text-2xl font-bold font-mono" data-testid="mpesa-balance">
                KSh {mpesaBalance.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">
                Real-time balance • Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-4 flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading stats...</span>
          </div>
        ) : statsError ? (
          <div className="col-span-4 flex items-center justify-center py-8 text-destructive">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <span>Failed to load statistics</span>
          </div>
        ) : displayStats.map((stat, index) => {
          const palette = stat.palette ?? getPaletteByKey(stat.title || `stat-${index}`, 1)
          const trendPalette = stat.trendPalette ?? palette
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 ${palette.border} ${palette.card} backdrop-blur-sm`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <stat.icon className={`h-4 w-4 ${palette.icon}`} />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                    className="text-2xl font-bold"
                    data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {stat.value}
                  </motion.div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
                    className="flex items-center gap-1 mt-2"
                  >
                    <TrendingUp className={`h-3 w-3 ${palette.icon}`} />
                    <span className={`text-xs ${trendPalette.accentText}`}>{stat.trend}</span>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Main Dashboard Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 gap-6"
      >
        {/* Operational Log */}
        <Card
          className={`hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border-2 ${activityPalette.border} ${activityPalette.card} backdrop-blur-sm`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Operational Log
            </CardTitle>
            <CardDescription>Live system activity and urgent operational signals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Activity Logging</span>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/40" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Events (Last 24h)</span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {activityLast24h}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overdue Invoices</span>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {overdueInvoices && Array.isArray(overdueInvoices) ? overdueInvoices.length : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recent Payments</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {recentPayments && Array.isArray(recentPayments) ? recentPayments.length : 0}
                  </span>
                </div>
              </div>
              
                  {recentActivity.length > 0 ? (
                <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Latest Activity</h4>
                  <div className="text-sm text-orange-800 dark:text-orange-200">
                    <div className="font-semibold">{recentActivity[0].message}</div>
                    <div className="text-xs opacity-75">
                      {recentActivity[0].time} • by {recentActivity[0].user}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">All Clear</h4>
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <div className="font-semibold">No recent activity recorded</div>
                    <div className="text-xs opacity-75">System idle with no updates</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Analytics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Tenant Satisfaction Analytics */}
        <Card
          className={`hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border-2 ${overduePalette.border} ${overduePalette.card} backdrop-blur-sm`}
        >
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-rose-500" />
              Tenant Satisfaction Analytics
            </CardTitle>
            <CardDescription>Customer experience and retention metrics</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              {tenants && Array.isArray(tenants) && tenants.length > 0 ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Tenants</span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {filteredTenants.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Retention Rate</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {filteredLeases && Array.isArray(filteredLeases) ? 
                          Math.round((filteredLeases.filter((l: any) => isActiveLease(l)).length / Math.max(filteredLeases.length, 1)) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Average Lease Duration</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {filteredLeases && Array.isArray(filteredLeases) && filteredLeases.length > 0 ? (() => {
                          let validCount = 0
                          const totalMonths = filteredLeases.reduce((sum: number, lease: any) => {
                            const start = toStartOfDay(lease.startDate)
                            if (!start) return sum
                            const end = lease.endDate ? toEndOfDay(lease.endDate) : new Date()
                            if (!end) return sum
                            const endTime = end.getTime()
                            if (Number.isNaN(endTime)) return sum
                            validCount += 1
                            return sum + (endTime - start.getTime()) / (1000 * 60 * 60 * 24 * 30)
                          }, 0)
                          if (validCount === 0) return "0 months"
                          const avgMonths = totalMonths / validCount
                          if (avgMonths < 1) {
                            return `${Math.max(1, Math.round(avgMonths * 30))} days`
                          }
                          return `${Math.round(avgMonths)} months`
                        })() : "0 months"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg">
                    <h4 className="font-medium text-rose-900 dark:text-rose-100 mb-2">Tenant Overview</h4>
                    <div className="space-y-2 text-sm text-rose-800 dark:text-rose-200">
                      <div className="flex justify-between">
                        <span>Total Tenants</span>
                        <span className="font-semibold">{filteredTenants.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Leases</span>
                        <span className="font-semibold">
                          {filteredLeases && Array.isArray(filteredLeases)
                            ? filteredLeases.filter((l: any) => isActiveLease(l)).length
                            : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Terminated Leases</span>
                        <span className="font-semibold">
                          {filteredLeases && Array.isArray(filteredLeases)
                            ? filteredLeases.filter((l: any) => (l.status || "").toLowerCase() === "terminated").length
                            : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Properties with Tenants</span>
                        <span className="font-semibold">
                          {filteredUnits && Array.isArray(filteredUnits) && filteredLeases && Array.isArray(filteredLeases) ? (() => {
                            const activeUnitIds = new Set(
                              filteredLeases.filter((l: any) => isActiveLease(l)).map((l: any) => l.unitId)
                            )
                            const propertyIds = new Set(
                              filteredUnits.filter((u: any) => activeUnitIds.has(u.id)).map((u: any) => u.propertyId)
                            )
                            return propertyIds.size
                          })() : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tenant data available</p>
                  <p className="text-xs mt-2">Add tenants and leases to see analytics</p>
                </div>
              )}
          </div>
        </CardContent>
      </Card>

        {/* Financial Overview */}
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Financial Overview
            </CardTitle>
            <CardDescription>Revenue and financial performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Monthly Revenue</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    KSh {filteredStats.monthlyRevenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Collection Rate</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {financialMetrics.collectionRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Growth Rate</span>
                  <span className={`text-lg font-bold ${financialMetrics.growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {financialMetrics.growthRate >= 0 ? '+' : ''}{financialMetrics.growthRate}%
                  </span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                <h4 className="font-medium text-emerald-900 dark:text-emerald-100 mb-2">Collection Rate Breakdown</h4>
                <div className="space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
                  <div className="flex justify-between">
                    <span>Rent Collection</span>
                    <span className="font-semibold">{financialMetrics.rentCollectionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Water Bills</span>
                    <span className="font-semibold">{financialMetrics.waterCollectionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Charges</span>
                    <span className="font-semibold">{financialMetrics.serviceCollectionRate}%</span>
                  </div>
                </div>
              </div>
              
              {financialMetrics.topProperty && (
                <div className="mt-4 p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                  <h4 className="font-medium text-primary mb-2">Top Performing Property</h4>
                  <div className="text-sm">
                    <div className="font-semibold">{financialMetrics.topProperty.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {financialMetrics.topProperty.units} units • KSh {financialMetrics.topProperty.revenue.toLocaleString()}/month
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Incoming Payments */}
        <Card
          className={`hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border-2 ${incomingPalette.border} ${incomingPalette.card} backdrop-blur-sm`}
        >
          <CardHeader>
            <CardTitle>Incoming Payments</CardTitle>
            <CardDescription>Integrated M-Pesa/bank transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {incomingLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading incoming payments...</span>
              </div>
            ) : Array.isArray(incomingPayments) && incomingPayments.length > 0 ? (
              incomingPayments.slice(0, 5).map((payment: any, index: number) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
                >
                  <div>
                    <p className="font-medium">
                      {payment.reference || payment.account_number || "Incoming payment"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.payment_method || "Integrated"} •{" "}
                      {payment.created_at ? new Date(payment.created_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium font-mono">
                      KSh {parseFloat(payment.amount || 0).toLocaleString()}
                    </p>
                    <Badge variant="secondary" className="mt-1">
                      {payment.status || payment.allocation_status || "received"}
                    </Badge>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No incoming payments</p>
            )}
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setLocation("/accounting/receive-payments#incoming-payments")}
            >
              View Incoming Payments
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Recent Activity */}
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest transactions and user activities</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-view-full-activity"
              onClick={() => setLocation("/activity")}
            >
              <Activity className="h-4 w-4 mr-2" />
              View Full Activity
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {activityLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading activity...</span>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No activity recorded yet
              </div>
            ) : recentActivity.slice(0, 4).map((activity, idx) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.7 + idx * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
              >
                <div className="flex-shrink-0">
                  {activity.status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {activity.status === "pending" && <Clock className="h-5 w-5 text-blue-500" />}
                  {activity.status === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{activity.time}</span>
                    <span>•</span>
                    <span>by {activity.user}</span>
                  </div>
                </div>
                {activity.amount && (
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {activity.amount}
                    </Badge>
                  </div>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Overdue Invoices</CardTitle>
            <CardDescription>Invoices requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading overdue invoices...</span>
              </div>
            ) : (overdueInvoices && Array.isArray(overdueInvoices) && overdueInvoices.length > 0) ? (
              overdueInvoices.slice(0, 5).map((invoice: any, index: number) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
                >
                  <div>
                    <p className="font-medium">{invoice.description || 'Monthly Rent'}</p>
                    <p className="text-sm text-muted-foreground">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium font-mono">KSh {parseFloat(invoice.amount).toLocaleString()}</p>
                    <Badge variant="destructive" className="mt-1">
                      Overdue
                    </Badge>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No overdue invoices</p>
            )}
            <Button 
              className="w-full" 
              variant="outline" 
              data-testid="button-view-all-invoices"
              onClick={() => setLocation("/accounting/invoices")}
            >
              View All Invoices
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Revenue Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Revenue Analytics
            </CardTitle>
            <CardDescription>Revenue trends with customizable timeframe</CardDescription>
          </div>
                <div className="flex items-center gap-2">
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Professional Bar Chart */}
            <div className="space-y-4">
              <div className="h-64 flex items-end justify-between px-4 py-6 bg-gradient-to-t from-muted/20 to-transparent rounded-lg border">
                  {/* Chart Bars */}
                  <div className="flex items-end justify-between w-full h-full">
                    {revenueData.labels.map((label, index) => {
                      const amount = revenueData.data[index]
                      const height = Math.min(100, Math.max(20, (amount / 1000) * 2))
                      const isCurrent = timeframe === "monthly" && index === revenueData.labels.length - 1
                      return (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                          className="flex flex-col items-center space-y-2"
                        >
                          <div className="text-xs text-muted-foreground font-medium">{label}</div>
                          <div className="flex flex-col items-center space-y-1">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${height}px` }}
                              transition={{ duration: 0.8, delay: 0.8 + index * 0.1, ease: "easeOut" }}
                              whileHover={{ scale: 1.1, opacity: 0.9 }}
                              className={`w-12 rounded-t-sm shadow-lg transition-all duration-300 cursor-pointer ${
                                isCurrent 
                                  ? 'bg-gradient-to-t from-blue-600 to-blue-400' 
                                  : 'bg-gradient-to-t from-slate-600 to-slate-400'
                              }`}
                            ></motion.div>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: 1.2 + index * 0.1 }}
                              className="text-xs font-medium text-center"
                            >
                              {amount.toLocaleString()}
                            </motion.div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
              </div>
              
              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-600 to-blue-400 rounded"></div>
                  <span className="text-muted-foreground">Current Month</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-slate-600 to-slate-400 rounded"></div>
                  <span className="text-muted-foreground">Previous Months</span>
                </div>
              </div>
            </div>
            
            {/* Revenue Summary */}
            <div className="grid grid-cols-1 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className={`text-2xl font-bold ${financialMetrics.growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {financialMetrics.growthRate >= 0 ? '+' : ''}{financialMetrics.growthRate}%
                </div>
                <div className="text-xs text-muted-foreground">Growth Rate</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  )
}