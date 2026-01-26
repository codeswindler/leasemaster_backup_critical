import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { houseTypeFormSchema, insertUnitSchema, insertChargeCodeSchema } from "@shared/schema"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useLocation, useSearch } from "wouter"
import { useFilter } from "@/contexts/FilterContext"
import { AlertTriangle, Loader2, Plus, Building2, Home, Users, DollarSign, Settings, Eye, Edit, Trash2, MapPin, Check, X, Pencil, ArrowLeft, Phone, Mail, Smartphone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function Houses() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddHouseTypeDialogOpen, setIsAddHouseTypeDialogOpen] = useState(false)
  const [isBulkUnitDialogOpen, setIsBulkUnitDialogOpen] = useState(false)
  const [isChargeCodesDialogOpen, setIsChargeCodesDialogOpen] = useState(false)
  const { selectedPropertyId, selectedLandlordId, setSelectedPropertyId } = useFilter()
  const [activeTab, setActiveTab] = useState<string>("all")
  const [selectedHouseType, setSelectedHouseType] = useState<any>(null)
  const [editingUnit, setEditingUnit] = useState<string | null>(null)
  const [editingRentAmount, setEditingRentAmount] = useState<string>("")
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>("")
  
  // House type editing states
  const [editingHouseType, setEditingHouseType] = useState<string | null>(null)
  const [editingHouseTypeField, setEditingHouseTypeField] = useState<string | null>(null)
  const [editingHouseTypeValue, setEditingHouseTypeValue] = useState<string>("")
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])
  const [isUpdateScopeDialogOpen, setIsUpdateScopeDialogOpen] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<{houseTypeId: string, field: string, value: string} | null>(null)
  const [chargeCodeAmounts, setChargeCodeAmounts] = useState<Record<string, string>>({})
  const [selectedChargeCodes, setSelectedChargeCodes] = useState<Record<string, boolean>>({})
  const [isChargePromptOpen, setIsChargePromptOpen] = useState(false)
  const [chargeCodeToDelete, setChargeCodeToDelete] = useState<any>(null)
  const [isDeleteChargeCodeDialogOpen, setIsDeleteChargeCodeDialogOpen] = useState(false)
  const [isSmsSettingsDialogOpen, setIsSmsSettingsDialogOpen] = useState(false)
  const [smsSettings, setSmsSettings] = useState({
    apiUrl: "",
    apiKey: "",
    partnerId: "",
    shortcode: "",
    enabled: false
  })
  
  // Multi-select house type filter
  const [selectedHouseTypeFilters, setSelectedHouseTypeFilters] = useState<string[]>([])
  
  const [, setLocation] = useLocation()
  const { toast } = useToast()

  const normalizeChargeAmounts = (value: any): Record<string, string> => {
    if (!value || value === 'null' || value === '') return {}
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch (error) {
        console.warn('Failed to parse chargeAmounts JSON:', error)
        return {}
      }
    }
    return typeof value === 'object' ? value : {}
  }

  const normalizeHouseType = (houseType: any) => ({
    ...houseType,
    propertyId: houseType.propertyId ?? houseType.property_id,
    baseRentAmount: houseType.baseRentAmount ?? houseType.base_rent_amount ?? "0",
    rentDepositAmount: houseType.rentDepositAmount ?? houseType.rent_deposit_amount ?? "0",
    waterRatePerUnit: houseType.waterRatePerUnit ?? houseType.water_rate_per_unit ?? "0",
    waterRateType: houseType.waterRateType ?? houseType.water_rate_type ?? "unit_based",
    waterFlatRate: houseType.waterFlatRate ?? houseType.water_flat_rate ?? "0",
    chargeAmounts: houseType.chargeAmounts ?? houseType.charge_amounts ?? null,
    isActive: houseType.isActive ?? houseType.is_active ?? "true",
  })

  const normalizeUnit = (unit: any) => ({
    ...unit,
    propertyId: unit.propertyId ?? unit.property_id,
    houseTypeId: unit.houseTypeId ?? unit.house_type_id,
    unitNumber: unit.unitNumber ?? unit.unit_number,
    rentAmount: unit.rentAmount ?? unit.rent_amount ?? "0",
    rentDepositAmount: unit.rentDepositAmount ?? unit.rent_deposit_amount ?? "0",
    waterRateAmount: unit.waterRateAmount ?? unit.water_rate_amount ?? "0",
    chargeAmounts: unit.chargeAmounts ?? unit.charge_amounts ?? null,
    status: unit.status ?? "vacant",
  })
  
  // Get search params from URL
  const getSearchParams = () => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search)
    }
    return new URLSearchParams()
  }

  // House Type form
  const houseTypeForm = useForm({
    resolver: zodResolver(houseTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      baseRentAmount: "",
      rentDepositAmount: "",
      waterRatePerUnit: "15.50",
      waterRateType: "unit_based",
      waterFlatRate: "0.00",
      isActive: "true",
    },
  })


  // Bulk unit creation form
  const bulkUnitForm = useForm<{
    numberOfUnits: number;
    unitPrefix: string;
    startNumber: number;
  }>({
    defaultValues: {
      numberOfUnits: 1,
      unitPrefix: "A",
      startNumber: 101,
    },
  })

  // Charge codes form
  const chargeCodeForm = useForm({
    resolver: zodResolver(insertChargeCodeSchema),
    defaultValues: {
      propertyId: "",
      name: "",
      description: "",
      isActive: "true",
    },
  })

  // Fetch house types
  const { data: houseTypes = [], isLoading: houseTypesLoading, error: houseTypesError } = 
    useQuery({
      queryKey: ["/api/house-types", selectedPropertyId, selectedLandlordId],
      queryFn: async () => {
        const params = new URLSearchParams()
        if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
        if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
        const url = `/api/house-types${params.toString() ? `?${params}` : ''}`
        const response = await apiRequest("GET", url)
        const results = await response.json()
        return Array.isArray(results) ? results.map(normalizeHouseType) : results
      },
    })

  // Fetch properties
  const { data: properties = [], isLoading: propertiesLoading } = 
    useQuery({
      queryKey: ["/api/properties", selectedLandlordId, selectedPropertyId],
      queryFn: async () => {
        const params = new URLSearchParams()
        if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
        if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
        const url = `/api/properties${params.toString() ? `?${params}` : ''}`
        const response = await apiRequest("GET", url)
        return await response.json()
      },
    })

  // Get selected property object for display
  const selectedProperty = selectedPropertyId 
    ? properties.find((p: any) => p.id === selectedPropertyId)
    : null

  // Fetch units
  const { data: units = [], isLoading: unitsLoading } = 
    useQuery({
      queryKey: ["/api/units", selectedPropertyId, selectedLandlordId],
      queryFn: async () => {
        const params = new URLSearchParams()
        if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
        if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
        const url = `/api/units${params.toString() ? `?${params}` : ''}`
        const response = await apiRequest("GET", url)
        const results = await response.json()
        return Array.isArray(results) ? results.map(normalizeUnit) : results
      },
    })

  // Fetch charge codes for selected property
  const { data: chargeCodes = [], isLoading: chargeCodesLoading } = 
    useQuery({
      queryKey: ["/api/charge-codes", selectedPropertyId, selectedLandlordId],
      queryFn: async () => {
        const params = new URLSearchParams()
        if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
        if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
        const url = `/api/charge-codes${params.toString() ? `?${params}` : ''}`
        const response = await apiRequest("GET", url)
        return await response.json()
      },
      enabled: !!selectedPropertyId || !!selectedLandlordId,
    })

  // Fetch property SMS settings
  const { data: propertySmsSettings, refetch: refetchSmsSettings } = 
    useQuery({
      queryKey: ["/api/property-sms-settings", selectedPropertyId],
      queryFn: async () => {
        const response = await apiRequest("GET", `/api/property-sms-settings?propertyId=${selectedPropertyId}`)
        return await response.json()
      },
      enabled: !!selectedPropertyId,
    })

  // Update SMS settings when property changes
  useEffect(() => {
    if (propertySmsSettings) {
      setSmsSettings({
        apiUrl: propertySmsSettings.api_url || "",
        apiKey: propertySmsSettings.api_key || "",
        partnerId: propertySmsSettings.partner_id || "",
        shortcode: propertySmsSettings.shortcode || "",
        enabled: propertySmsSettings.enabled === 1
      })
    } else {
      setSmsSettings({
        apiUrl: "",
        apiKey: "",
        partnerId: "",
        shortcode: "",
        enabled: false
      })
    }
  }, [propertySmsSettings])

  // Force refresh data on component mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/house-types"] })
    queryClient.invalidateQueries({ queryKey: ["/api/units"] })
    queryClient.invalidateQueries({ queryKey: ["/api/charge-codes"] })
  }, [])

  // Handle URL parameters to auto-select property
  useEffect(() => {
    // Don't show errors while properties are still loading
    if (propertiesLoading) return
    
    const urlParams = getSearchParams()
    const propertyParam = urlParams.get('property')
    
    if (propertyParam === 'new' && Array.isArray(properties) && properties.length > 0) {
      // Auto-select the most recently created property
      const latestProperty = properties[properties.length - 1]
      setSelectedPropertyId(latestProperty.id)
    } else if (propertyParam && propertyParam !== 'new' && Array.isArray(properties) && properties.length > 0) {
      // Auto-select the specific property
      const property = properties.find((p: any) => p.id === propertyParam)
      if (property) {
        setSelectedPropertyId(property.id)
      } else {
        // Property not found - show error toast
        toast({
          title: "Property Not Found",
          description: "The requested property could not be found.",
          variant: "destructive",
        })
      }
    }
  }, [properties, propertiesLoading, setSelectedPropertyId, toast])

  // Handle water rate type changes
  useEffect(() => {
    const waterRateType = houseTypeForm.watch("waterRateType")
    
    if (waterRateType === "unit_based") {
      // Clear flat rate when switching to unit based
      houseTypeForm.setValue("waterFlatRate", "0.00")
    } else if (waterRateType === "flat_rate") {
      // Clear per unit rate when switching to flat rate
      houseTypeForm.setValue("waterRatePerUnit", "0.00")
    }
  }, [houseTypeForm.watch("waterRateType")])

  // Reset charge code amounts when dialog closes
  useEffect(() => {
    if (!isAddHouseTypeDialogOpen) {
      setChargeCodeAmounts({})
      setSelectedChargeCodes({})
    }
  }, [isAddHouseTypeDialogOpen])

  // Reset charge code amounts when property changes
  useEffect(() => {
    setChargeCodeAmounts({})
    setSelectedChargeCodes({})
  }, [selectedPropertyId])

  useEffect(() => {
    if (!selectedPropertyId) {
      setSelectedHouseTypeFilters([])
    }
  }, [selectedPropertyId])

  // Add house type mutation
  const addHouseTypeMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Sending house type data to API:", data)
      const response = await apiRequest("POST", "/api/house-types", data)
      const result = await response.json()
      console.log("API Response:", result)
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/house-types"] })
      setIsAddHouseTypeDialogOpen(false)
      houseTypeForm.reset()
      setChargeCodeAmounts({})
      setSelectedChargeCodes({})
      toast({
        title: "House Type Added",
        description: "New house type has been created successfully.",
      })
    },
    onError: (error: any) => {
      console.error("House type creation failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add house type",
        variant: "destructive",
      })
    },
  })


  // Bulk unit creation mutation
  const addBulkUnitsMutation = useMutation({
    mutationFn: async ({ numberOfUnits, unitPrefix, startNumber, propertyId, houseTypeId, houseType }: any) => {
      const units = []
      for (let i = 0; i < numberOfUnits; i++) {
        const unitNumber = `${unitPrefix}${startNumber + i}`
        
        // Copy charge amounts from house type to new unit
        const unitChargeAmounts = normalizeChargeAmounts(houseType?.chargeAmounts)
        
        units.push({
          propertyId,
          houseTypeId,
          unitNumber,
          rentAmount: houseType.baseRentAmount,
          rentDepositAmount: houseType.rentDepositAmount || "0.00",
          waterRateAmount: houseType.waterRateType === "unit_based" 
            ? houseType.waterRatePerUnit || "0.00"
            : houseType.waterFlatRate || "0.00",
          chargeAmounts: Object.keys(unitChargeAmounts).length > 0 ? unitChargeAmounts : undefined,
          status: "vacant"
        })
      }
      
      // Create all units
      const promises = units.map(unit =>
        apiRequest("POST", "/api/units", unit).then((response) => response.json())
      )
      
      return Promise.all(promises)
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      setIsBulkUnitDialogOpen(false)
      bulkUnitForm.reset()
      toast({
        title: "Units Created",
        description: `${results.length} units have been created successfully.`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create units",
        variant: "destructive",
      })
    },
  })

  // Update unit rent amount mutation
  const updateUnitRentMutation = useMutation({
    mutationFn: async ({ unitId, rentAmount }: { unitId: string, rentAmount: string }) => {
      const response = await apiRequest("PUT", `/api/units/${unitId}`, { rentAmount })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      setEditingUnit(null)
      setEditingRentAmount("")
      toast({
        title: "Unit Updated",
        description: "Rent amount has been updated successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update unit",
        variant: "destructive",
      })
    },
  })

  const handleUpdateUnitRent = (unitId: string) => {
    if (editingRentAmount && parseFloat(editingRentAmount) > 0) {
      updateUnitRentMutation.mutate({ unitId, rentAmount: editingRentAmount })
    }
  }

  const handleStartEditRent = (unit: any) => {
    setEditingUnit(unit.id)
    setEditingRentAmount(unit.rentAmount)
  }

  const handleCancelEditRent = () => {
    setEditingUnit(null)
    setEditingRentAmount("")
  }

  // Charge codes mutations
  const addChargeCodeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/charge-codes", data)
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charge-codes"] })
      chargeCodeForm.reset()
      // Re-set propertyId after reset to maintain context for adding another charge code
      chargeCodeForm.setValue("propertyId", selectedPropertyId || "")
      toast({
        title: "Charge Code Added",
        description: "New charge code has been created successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add charge code",
        variant: "destructive",
      })
    },
  })

  // Delete charge code mutation
  const deleteChargeCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Deleting charge code with ID:", id)
      const response = await apiRequest("DELETE", `/api/charge-codes/${id}`)
      console.log("Delete response status:", response.status)
      // 204 No Content has no body, return success object
      if (response.status === 204) {
        return { success: true }
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charge-codes"] })
      setChargeCodeToDelete(null)
      setIsDeleteChargeCodeDialogOpen(false)
      toast({
        title: "Charge Code Deleted",
        description: "Charge code has been deleted successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete charge code",
        variant: "destructive",
      })
    },
  })

  const handleAddChargeCode = (data: any) => {
    if (!selectedPropertyId) {
      toast({
        title: "Property Required",
        description: "Please select a property in the header before adding charge codes.",
        variant: "destructive",
      })
      return
    }
    const chargeCodeData = {
      ...data,
      propertyId: selectedPropertyId
    }
    addChargeCodeMutation.mutate(chargeCodeData)
  }

  // Update all units of a house type when house type rates change
  const updateUnitsFromHouseTypeMutation = useMutation({
    mutationFn: async ({ houseTypeId, field, value }: { houseTypeId: string, field: string, value: string }) => {
      // Validate that we have a value to update
      if (!value || value.trim() === '') {
        throw new Error('Value cannot be empty')
      }
      
      // Prepare the update data for house type
      let houseTypeUpdateData: any = {}
      
      // Handle charge code amounts differently
      if (field.startsWith('charge_')) {
        const chargeCodeId = field.replace('charge_', '')
        const houseType = Array.isArray(houseTypes) ? houseTypes.find((ht: any) => ht.id === houseTypeId) : null
        
        // Safely parse the charge amounts JSON
        const currentChargeAmounts = normalizeChargeAmounts(houseType?.chargeAmounts)
        
        currentChargeAmounts[chargeCodeId] = value
        houseTypeUpdateData.chargeAmounts = currentChargeAmounts
      } else {
        houseTypeUpdateData[field] = value
      }
      
      // Validate that we have data to update
      if (Object.keys(houseTypeUpdateData).length === 0) {
        throw new Error('No valid data to update')
      }
      
      console.log('Updating house type with data:', houseTypeUpdateData)
      console.log('Field being updated:', field)
      console.log('Value being set:', value)
      console.log('House type ID:', houseTypeId)
      
      // First update the house type
      const houseTypeResponse = await apiRequest("PUT", `/api/house-types/${houseTypeId}`, houseTypeUpdateData)
      
      // Then update all units of this house type
      const unitsToUpdate = Array.isArray(units) ? units.filter((unit: any) => unit.houseTypeId === houseTypeId) : []
      
      for (const unit of unitsToUpdate) {
        const updateData: any = {}
        
        // Map house type fields to unit fields
        if (field === 'baseRentAmount') {
          updateData.rentAmount = value
        } else if (field === 'rentDepositAmount') {
          updateData.rentDepositAmount = value
        } else if (field === 'waterRatePerUnit') {
          updateData.waterRateAmount = value
        } else if (field === 'waterFlatRate') {
          updateData.waterRateAmount = value
        } else if (field.startsWith('charge_')) {
          // Handle charge code amounts for units
          const chargeCodeId = field.replace('charge_', '')
          
                  // Safely parse the unit charge amounts JSON
                  const currentUnitChargeAmounts = normalizeChargeAmounts(unit.chargeAmounts)
                  
                  currentUnitChargeAmounts[chargeCodeId] = value
        updateData.chargeAmounts = currentUnitChargeAmounts
        }
        
        // Only update if we have valid data
        if (Object.keys(updateData).length > 0) {
          try {
            await apiRequest("PUT", `/api/units/${unit.id}`, updateData)
          } catch (error: any) {
            console.error(`Failed to update unit ${unit.id}:`, error?.message || error)
          }
        }
      }
      
      return { success: true, updatedUnits: unitsToUpdate.length }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/house-types"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      setEditingHouseType(null)
      setEditingHouseTypeField(null)
      setEditingHouseTypeValue("")
      setPendingUpdate(null)
      setIsUpdateScopeDialogOpen(false)
      toast({
        title: "House Type and Units Updated",
        description: `House type has been updated successfully. ${result.updatedUnits} related units have been updated with the new rates.`,
      })
    },
    onError: (error: any) => {
      setPendingUpdate(null)
      setIsUpdateScopeDialogOpen(false)
      toast({
        title: "Error",
        description: error.message || "Failed to update house type and related units",
        variant: "destructive",
      })
    },
  })

  // Update house type only (without updating existing units) mutation
  const updateHouseTypeOnlyMutation = useMutation({
    mutationFn: async ({ houseTypeId, field, value }: { houseTypeId: string, field: string, value: string }) => {
      // Prepare the update data
      let houseTypeUpdateData: any = {}
      
      // Handle charge code amounts differently
      if (field.startsWith('charge_')) {
        const chargeCodeId = field.replace('charge_', '')
        const houseType = Array.isArray(houseTypes) ? houseTypes.find((ht: any) => ht.id === houseTypeId) : null
        
        // Safely parse the charge amounts JSON
        const currentChargeAmounts = normalizeChargeAmounts(houseType?.chargeAmounts)
        
        currentChargeAmounts[chargeCodeId] = value
        houseTypeUpdateData.chargeAmounts = currentChargeAmounts
      } else {
        houseTypeUpdateData[field] = value
      }
      
      const response = await apiRequest("PUT", `/api/house-types/${houseTypeId}`, houseTypeUpdateData)
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/house-types"] })
      setEditingHouseType(null)
      setEditingHouseTypeField(null)
      setEditingHouseTypeValue("")
      setPendingUpdate(null)
      setIsUpdateScopeDialogOpen(false)
      toast({
        title: "House Type Updated",
        description: "House type has been updated successfully. New units will use these rates.",
      })
    },
    onError: (error: any) => {
      setPendingUpdate(null)
      setIsUpdateScopeDialogOpen(false)
      toast({
        title: "Error",
        description: error.message || "Failed to update house type",
        variant: "destructive",
      })
    },
  })

  // Delete house type mutation
  const deleteHouseTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/house-types/${id}`)
      // DELETE requests typically return 204 (no content)
      if (response.status === 204) {
        return { success: true }
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/house-types"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      toast({
        title: "House Type Deleted",
        description: "House type has been deleted successfully.",
      })
      // Refresh the page to ensure UI is updated
      window.location.reload()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete house type",
        variant: "destructive",
      })
    },
  })

  // Bulk delete units mutation
  const bulkDeleteUnitsMutation = useMutation({
    mutationFn: async (unitIds: string[]) => {
      const response = await apiRequest("POST", "/api/units/bulk-delete", { unitIds })
      return response.json()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      setSelectedUnits([])
      
      if (result.failed.length > 0) {
        toast({
          title: "Partial Success",
          description: `${result.success.length} units deleted successfully. ${result.failed.length} units could not be deleted due to active leases.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Units Deleted",
          description: `${result.success.length} units have been deleted successfully.`,
        })
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete units",
        variant: "destructive",
      })
    },
  })

  // Generic update unit field mutation
  const updateUnitFieldMutation = useMutation({
    mutationFn: async ({ unitId, field, value }: { unitId: string, field: string, value: string }) => {
      const response = await apiRequest("PUT", `/api/units/${unitId}`, { [field]: value })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      setEditingUnit(null)
      setEditingField(null)
      setEditingValue("")
      toast({
        title: "Unit Updated",
        description: "Field has been updated successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update unit",
        variant: "destructive",
      })
    },
  })

  // Save property SMS settings mutation
  const saveSmsSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/property-sms-settings?propertyId=${selectedPropertyId}`, data)
      return await response.json()
    },
    onSuccess: () => {
      refetchSmsSettings()
      setIsSmsSettingsDialogOpen(false)
      toast({
        title: "SMS Settings Saved",
        description: "Property SMS settings have been updated successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save SMS settings",
        variant: "destructive",
      })
    },
  })

  const handleSaveSmsSettings = () => {
    if (!selectedPropertyId) return
    saveSmsSettingsMutation.mutate(smsSettings)
  }

  const handleOpenAddHouseType = () => {
    if (!selectedPropertyId) {
      toast({
        title: "Property Required",
        description: "Please select a property in the header before adding a house type.",
        variant: "destructive",
      })
      return
    }
    if (chargeCodes.length === 0) {
      setIsChargePromptOpen(true)
      return
    }
    setIsAddHouseTypeDialogOpen(true)
  }

  const handleOpenChargeCodes = () => {
    if (!selectedPropertyId) {
      toast({
        title: "Property Required",
        description: "Please select a property in the header before configuring charge codes.",
        variant: "destructive",
      })
      return
    }
    setIsChargeCodesDialogOpen(true)
    chargeCodeForm.setValue("propertyId", selectedPropertyId || "")
  }

  const handleChargePromptConfigure = () => {
    setIsChargePromptOpen(false)
    setIsChargeCodesDialogOpen(true)
    chargeCodeForm.setValue("propertyId", selectedPropertyId || "")
  }

  const handleChargePromptContinue = () => {
    setIsChargePromptOpen(false)
    setIsAddHouseTypeDialogOpen(true)
  }

  const handleAddHouseType = (data: any) => {
    console.log("Creating house type with data:", data)
    console.log("Form data keys:", Object.keys(data))
    console.log("Form data values:", Object.values(data))
    
    // Add propertyId to the house type data
    if (!selectedPropertyId) {
      toast({
        title: "Property Required",
        description: "Please select a property first",
        variant: "destructive",
      })
      return
    }
    
    // Build charge amounts object from selected charge codes
    const chargeAmounts: Record<string, string> = {}
    const selectedChargeCodeIds = Object.keys(selectedChargeCodes).filter((id) => selectedChargeCodes[id])
    for (const chargeCodeId of selectedChargeCodeIds) {
      const amount = chargeCodeAmounts[chargeCodeId]
      if (!amount || parseFloat(amount) <= 0) {
        toast({
          title: "Charge Amount Required",
          description: "Please enter a valid amount for each selected charge code.",
          variant: "destructive",
        })
        return
      }
      chargeAmounts[chargeCodeId] = amount
    }
    
    addHouseTypeMutation.mutate({
      ...data,
      propertyId: selectedPropertyId,
      chargeAmounts: Object.keys(chargeAmounts).length > 0 ? chargeAmounts : undefined
    })
  }


  const handleBulkAddUnits = (data: any) => {
    const { numberOfUnits, unitPrefix, startNumber } = data
    addBulkUnitsMutation.mutate({
      numberOfUnits,
      unitPrefix,
      startNumber,
      propertyId: selectedPropertyId,
      houseTypeId: selectedHouseType?.id,
      houseType: selectedHouseType
    })
  }

  const handleDeleteHouseType = (id: string) => {
    deleteHouseTypeMutation.mutate(id)
  }

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnits(prev => 
      prev.includes(unitId) 
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    )
  }

  const handleSelectAllUnits = () => {
    if (selectedUnits.length === filteredUnits.length) {
      setSelectedUnits([])
    } else {
      setSelectedUnits(filteredUnits.map((unit: any) => unit.id))
    }
  }

  const handleBulkDeleteUnits = () => {
    if (selectedUnits.length === 0) return
    
    if (confirm(`Are you sure you want to delete ${selectedUnits.length} unit(s)? Units with active leases cannot be deleted.`)) {
      bulkDeleteUnitsMutation.mutate(selectedUnits)
    }
  }

  const handleStartEditField = (unitId: string, field: string, currentValue: string) => {
    setEditingUnit(unitId)
    setEditingField(field)
    setEditingValue(currentValue)
  }

  const handleUpdateField = (unitId: string) => {
    if (!editingField) return
    
    // Handle charge code amounts differently
    if (editingField.startsWith('charge_')) {
      // For charge codes, we need to update the chargeAmounts JSON field
      const chargeCodeId = editingField.replace('charge_', '')
      const unit = filteredUnits.find((u: any) => u.id === unitId)
    const currentChargeAmounts = normalizeChargeAmounts(unit?.chargeAmounts)
      currentChargeAmounts[chargeCodeId] = editingValue
      
      updateUnitFieldMutation.mutate({ 
        unitId, 
        field: 'chargeAmounts', 
        value: JSON.stringify(currentChargeAmounts) 
      })
    } else {
      updateUnitFieldMutation.mutate({ unitId, field: editingField, value: editingValue })
    }
  }

  const handleCancelEditField = () => {
    setEditingUnit(null)
    setEditingField(null)
    setEditingValue("")
  }

  // House type editing handlers
  const handleStartEditHouseTypeField = (houseTypeId: string, field: string, currentValue: string) => {
    setEditingHouseType(houseTypeId)
    setEditingHouseTypeField(field)
    setEditingHouseTypeValue(currentValue)
  }

  const handleUpdateHouseTypeField = (houseTypeId: string) => {
    if (!editingHouseTypeField) return
    
    // Validate the input value
    const trimmedValue = editingHouseTypeValue.trim()
    if (!trimmedValue || isNaN(parseFloat(trimmedValue))) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number",
        variant: "destructive",
      })
      return
    }
    
    const numericValue = parseFloat(trimmedValue)
    if (numericValue < 0) {
      toast({
        title: "Invalid Input",
        description: "Amount cannot be negative",
        variant: "destructive",
      })
      return
    }
    
    // Store the pending update and show dialog
    setPendingUpdate({ 
      houseTypeId, 
      field: editingHouseTypeField, 
      value: trimmedValue 
    })
    setIsUpdateScopeDialogOpen(true)
  }

  const handleConfirmUpdateScope = (updateExistingUnits: boolean) => {
    if (!pendingUpdate) return
    
    if (updateExistingUnits) {
      // Update both house type and existing units
      updateUnitsFromHouseTypeMutation.mutate(pendingUpdate)
    } else {
      // Update only house type (for future units)
      updateHouseTypeOnlyMutation.mutate(pendingUpdate)
    }
  }

  const handleCancelEditHouseTypeField = () => {
    setEditingHouseType(null)
    setEditingHouseTypeField(null)
    setEditingHouseTypeValue("")
  }

  // Filter house types based on search and selected property
  const filteredHouseTypes = Array.isArray(houseTypes) ? houseTypes.filter((houseType: any) => {
    // If no search term, show all house types
    if (!searchTerm || searchTerm.trim() === "") {
      return true
    }
    
    const matchesSearch = houseType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      houseType.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  }) : []
  
  console.log("Filtered house types:", filteredHouseTypes)
  console.log("Filtered house types length:", filteredHouseTypes.length)

  // Get units count per house type (backend handles filtering)
  const getUnitsCount = (houseTypeId: string) => {
    if (!Array.isArray(units)) return 0
    
    return units.filter((unit: any) => {
      return unit.houseTypeId === houseTypeId
    }).length
  }

  // Get occupied units count per house type (backend handles filtering)
  const getOccupiedUnitsCount = (houseTypeId: string) => {
    if (!Array.isArray(units)) return 0
    
    return units.filter((unit: any) => {
      const matchesHouseType = unit.houseTypeId === houseTypeId
      const isOccupied = unit.status === "occupied"
      return matchesHouseType && isOccupied
    }).length
  }

  // Check if we should show Property of Interest section
  const shouldShowPropertyOfInterest = () => {
    const urlParams = getSearchParams()
    const propertyParam = urlParams.get('property')
    return propertyParam && selectedPropertyId
  }

  // Toggle house type filter
  const toggleHouseTypeFilter = (houseTypeId: string) => {
    setSelectedHouseTypeFilters(prev => {
      if (prev.includes(houseTypeId)) {
        // Remove from filter
        return prev.filter(id => id !== houseTypeId)
      } else {
        // Add to filter
        return [...prev, houseTypeId]
      }
    })
  }

  // Get filtered units for the table (backend handles property/landlord filtering)
  const filteredUnits = Array.isArray(units) ? units.filter((unit: any) => {
    // Filter by selected house types (multi-select) - client-side only
    if (selectedHouseTypeFilters.length > 0 && !selectedHouseTypeFilters.includes(unit.houseTypeId)) {
      return false
    }
    
    return true
  }) : []

  // Debug filtered units
  console.log("filteredUnits:", filteredUnits)
  if (filteredUnits.length > 0) {
    console.log("First unit data:", filteredUnits[0])
    console.log("First unit rentDepositAmount:", filteredUnits[0].rentDepositAmount)
    console.log("First unit waterRateAmount:", filteredUnits[0].waterRateAmount)
  }

  if (houseTypesError) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>Error loading house types: {(houseTypesError as any).message}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation("/properties")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Properties
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="houses-title">
            <Building2 className="h-8 w-8" />
            {selectedProperty ? `${selectedProperty.name} - House Management` : "Houses"}
          </h1>
          <p className="text-muted-foreground">Manage house types, rates, and unit allocations</p>
        </div>
        <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSmsSettingsDialogOpen(true)}
              disabled={!selectedPropertyId}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              SMS Settings
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenChargeCodes}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Charges
            </Button>
          <Button
            data-testid="button-add-house-type"
            onClick={handleOpenAddHouseType}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add House Type
          </Button>

          <AlertDialog open={isChargePromptOpen} onOpenChange={setIsChargePromptOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Configure Charge Codes?</AlertDialogTitle>
                <AlertDialogDescription>
                  This property has no charge codes yet. Do you want to configure charges before adding a house type?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleChargePromptContinue}>
                  Continue Without Charges
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleChargePromptConfigure}>
                  Configure Charges
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={isAddHouseTypeDialogOpen} onOpenChange={setIsAddHouseTypeDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-8">
              <DialogHeader>
                <DialogTitle>Add New House Type</DialogTitle>
                <DialogDescription>
                  Create a new house type with base rent and water rates.
                </DialogDescription>
              </DialogHeader>
              {!selectedProperty && (
                <div className="bg-muted/50 p-4 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Please select a property first</span>
                  </div>
                </div>
              )}
              <Form {...houseTypeForm}>
                <form onSubmit={houseTypeForm.handleSubmit(handleAddHouseType)} className="space-y-6">
                  <FormField
                    control={houseTypeForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>House Type Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Bedsitter, 1 Bedroom, 2 Bedroom"
                            data-testid="input-house-type-name"
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={houseTypeForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the house type features..."
                            data-testid="input-description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={houseTypeForm.control}
                    name="baseRentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Rent Amount (KSh) <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 25000"
                            data-testid="input-base-rent"
                            required
                            min="0.01"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={houseTypeForm.control}
                    name="rentDepositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent Deposit Amount (KSh) <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 25000"
                            data-testid="input-rent-deposit"
                            required
                            min="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4">
                    <FormField
                      control={houseTypeForm.control}
                      name="waterRateType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Water Rate Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select water rate type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unit_based">Unit Based (Per Unit)</SelectItem>
                              <SelectItem value="flat_rate">Flat Rate (Fixed Amount)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Conditional water rate fields based on water rate type */}
                    {houseTypeForm.watch("waterRateType") === "unit_based" && (
                      <FormField
                        control={houseTypeForm.control}
                        name="waterRatePerUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Water Rate Per Unit (KSh)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="e.g., 15.50"
                                data-testid="input-water-rate"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {houseTypeForm.watch("waterRateType") === "flat_rate" && (
                      <FormField
                        control={houseTypeForm.control}
                        name="waterFlatRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Water Flat Rate (KSh)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="e.g., 500"
                                data-testid="input-water-flat-rate"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  
                  {/* Property Charge Codes Section */}
                  {selectedProperty && (
                    <div className="space-y-4">
                      <div className="border-t pt-4">
                        <h4 className="text-lg font-semibold mb-3">Property Charge Codes</h4>
                        {chargeCodes.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            <div className="mb-3">No charge codes configured for this property yet.</div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsAddHouseTypeDialogOpen(false)
                                setIsChargeCodesDialogOpen(true)
                                chargeCodeForm.setValue("propertyId", selectedPropertyId || "")
                              }}
                            >
                              Configure Charge Codes
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {chargeCodes.map((chargeCode: any) => {
                              const isSelected = !!selectedChargeCodes[chargeCode.id]
                              return (
                                <div key={chargeCode.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        setSelectedChargeCodes((prev) => ({
                                          ...prev,
                                          [chargeCode.id]: Boolean(checked),
                                        }))
                                      }}
                                    />
                                    <div>
                                      <div className="font-medium">{chargeCode.name}</div>
                                      {chargeCode.description && (
                                        <div className="text-sm text-muted-foreground">{chargeCode.description}</div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Rate"
                                      className="w-24"
                                      disabled={!isSelected}
                                      value={chargeCodeAmounts[chargeCode.id] || ""}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        setChargeCodeAmounts((prev) => ({
                                          ...prev,
                                          [chargeCode.id]: value,
                                        }))
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddHouseTypeDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addHouseTypeMutation.isPending || !selectedProperty}>
                      {addHouseTypeMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add House Type"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>


          {/* Bulk Unit Creation Dialog */}
          <Dialog open={isBulkUnitDialogOpen} onOpenChange={setIsBulkUnitDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Multiple Units</DialogTitle>
                <DialogDescription>
                  Create multiple units for {selectedHouseType?.name} at {selectedProperty?.name}
                </DialogDescription>
              </DialogHeader>
              <Form {...bulkUnitForm}>
                <form onSubmit={bulkUnitForm.handleSubmit(handleBulkAddUnits)} className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm font-medium mb-2">Unit Details Preview</div>
                    <div className="text-sm text-muted-foreground">
                      <div>Property: {selectedProperty?.name}</div>
                      <div>House Type: {selectedHouseType?.name}</div>
                      <div>Base Rent: KSh {selectedHouseType?.baseRentAmount}</div>
                    </div>
                  </div>
                  
                  <FormField
                    control={bulkUnitForm.control}
                    name="numberOfUnits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Units</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            placeholder="e.g., 5"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={bulkUnitForm.control}
                      name="unitPrefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Prefix</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., A, B, 1"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={bulkUnitForm.control}
                      name="startNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Number</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g., 101"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 101)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Preview:</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      {bulkUnitForm.watch("numberOfUnits") > 0 && (
                        <>
                          {Array.from({ length: Math.min(bulkUnitForm.watch("numberOfUnits"), 5) }, (_, i) => (
                            <span key={i}>
                              {bulkUnitForm.watch("unitPrefix")}{bulkUnitForm.watch("startNumber") + i}
                              {i < Math.min(bulkUnitForm.watch("numberOfUnits"), 5) - 1 && ", "}
                            </span>
                          ))}
                          {bulkUnitForm.watch("numberOfUnits") > 5 && "..."}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBulkUnitDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addBulkUnitsMutation.isPending}
                    >
                      {addBulkUnitsMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        `Create ${bulkUnitForm.watch("numberOfUnits")} Units`
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Charge Codes Dialog */}
          <Dialog open={isChargeCodesDialogOpen} onOpenChange={setIsChargeCodesDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Configure Charge Codes</DialogTitle>
                <DialogDescription>
                  Manage charge codes for {selectedProperty?.name} (e.g., Garbage Fee, Security Fee, Maintenance Fee)
                </DialogDescription>
              </DialogHeader>
              
              {/* Existing Charge Codes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">Current Charge Codes</h4>
                </div>
                
                {chargeCodesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Loading charge codes...</span>
                  </div>
                ) : chargeCodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No charge codes configured yet</p>
                    <p className="text-sm">Add charge codes like Garbage Fee, Security Fee, etc.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chargeCodes.map((chargeCode: any) => (
                      <div key={chargeCode.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{chargeCode.name}</div>
                          {chargeCode.description && (
                            <div className="text-sm text-muted-foreground">{chargeCode.description}</div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setChargeCodeToDelete(chargeCode)
                            setIsDeleteChargeCodeDialogOpen(true)
                          }}
                          disabled={deleteChargeCodeMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Charge Code Form */}
              <Form {...chargeCodeForm}>
                <form onSubmit={chargeCodeForm.handleSubmit(handleAddChargeCode)} className="space-y-4">
                  <FormField
                    control={chargeCodeForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Charge Code Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Garbage Fee, Security Fee, Maintenance Fee"
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={chargeCodeForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what this charge covers..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsChargeCodesDialogOpen(false)}
                    >
                      Close
                    </Button>
                    <Button
                      type="submit"
                      disabled={addChargeCodeMutation.isPending}
                    >
                      {addChargeCodeMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Charge Code"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* SMS Settings Dialog */}
          <Dialog open={isSmsSettingsDialogOpen} onOpenChange={setIsSmsSettingsDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  SMS Settings
                </DialogTitle>
                <DialogDescription>
                  Configure AdvantaSMS credentials for {selectedProperty?.name}. 
                  These credentials will be used for sending SMS to tenants.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sms-api-url">API URL</Label>
                  <Input
                    id="sms-api-url"
                    placeholder="https://quicksms.advantasms.com/api/services/sendsms/"
                    value={smsSettings.apiUrl}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, apiUrl: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sms-api-key">API Key</Label>
                  <Input
                    id="sms-api-key"
                    type="password"
                    placeholder="Your AdvantaSMS API Key"
                    value={smsSettings.apiKey}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sms-partner-id">Partner ID</Label>
                  <Input
                    id="sms-partner-id"
                    placeholder="Your Partner ID"
                    value={smsSettings.partnerId}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, partnerId: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sms-shortcode">Shortcode / Sender ID</Label>
                  <Input
                    id="sms-shortcode"
                    placeholder="e.g., AdvantaSMS"
                    value={smsSettings.shortcode}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, shortcode: e.target.value }))}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sms-enabled"
                    checked={smsSettings.enabled}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="sms-enabled">Enable SMS for this property</Label>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p className="font-medium mb-1">Note:</p>
                  <p className="text-muted-foreground">
                    SMS sent to tenants of this property will use these credentials. 
                    The SMS cost will be charged to this property's account.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSmsSettingsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSmsSettings}
                  disabled={saveSmsSettingsMutation.isPending}
                >
                  {saveSmsSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Customer Details Section - Only show when property is selected */}
      {selectedProperty && (
        <>
          <Card className="vibrant-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Address:</span>
                    <span>{selectedProperty.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Landlord:</span>
                    <span>{selectedProperty.landlordName}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedProperty.landlordPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Phone:</span>
                      <span>{selectedProperty.landlordPhone}</span>
                    </div>
                  )}
                  {selectedProperty.landlordEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      <span>{selectedProperty.landlordEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Property of Interest or Property Selector */}
      {shouldShowPropertyOfInterest() ? (
        <Card className="vibrant-card border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-primary">Property of Interest</h3>
                  <p className="text-muted-foreground">Currently managing house types and units for this property</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedPropertyId(null)
                  setLocation('/houses')
                }}
              >
                View All Properties
              </Button>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-background/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Property Name</span>
                </div>
                <p className="text-lg font-semibold">{selectedProperty?.name}</p>
              </div>
              
              <div className="bg-background/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Address</span>
                </div>
                <p className="text-sm">{selectedProperty?.address}</p>
              </div>
              
              <div className="bg-background/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Status</span>
                </div>
                <Badge variant={selectedProperty?.status === "active" ? "default" : "secondary"}>
                  {selectedProperty?.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Search */}
      {selectedProperty && (
        <div className="flex items-center space-x-2">
          <Input
            placeholder={`Search house types in ${selectedProperty.name}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      {selectedProperty ? (
      <>
      {/* House Types Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {houseTypesLoading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading house types...</span>
          </div>
        ) : filteredHouseTypes.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {Array.isArray(houseTypes) && houseTypes.length === 0 ? (
              <div>
                <p className="text-lg font-medium mb-2">No house types created yet</p>
                <p>Click "Add House Type" to create your first house type</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">No house types match your search</p>
                <p>Try adjusting your search terms</p>
              </div>
            )}
          </div>
        ) : (
          filteredHouseTypes.map((houseType: any) => {
            const property = properties.find((p: any) => p.id === houseType.propertyId)
            const isFiltered = selectedHouseTypeFilters.includes(houseType.id)
            
            return (
          <Card 
            key={houseType.id} 
            className={`vibrant-card hover:shadow-md transition-all cursor-pointer ${
              isFiltered ? 'ring-2 ring-primary shadow-lg' : ''
            }`}
            onClick={() => toggleHouseTypeFilter(houseType.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{houseType.name}</CardTitle>
                  {property && (
                    <div className="flex items-center gap-1 mt-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{property.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={houseType.isActive === "true" ? "default" : "secondary"}>
                    {houseType.isActive === "true" ? "Active" : "Inactive"}
                  </Badge>
                  {isFiltered && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                      Filtered
                    </Badge>
                  )}
                </div>
              </div>
              {houseType.description && (
                <CardDescription>{houseType.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Base Rent</div>
                  {editingHouseType === houseType.id && editingHouseTypeField === 'baseRentAmount' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingHouseTypeValue}
                        onChange={(e) => setEditingHouseTypeValue(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateHouseTypeField(houseType.id)}
                        disabled={updateUnitsFromHouseTypeMutation.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditHouseTypeField}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="font-semibold cursor-pointer hover:bg-muted/50 p-1 rounded flex items-center gap-1"
                      onClick={() => handleStartEditHouseTypeField(houseType.id, 'baseRentAmount', houseType.baseRentAmount)}
                    >
                      KSh {parseFloat(houseType.baseRentAmount).toLocaleString()}
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground">Rent Deposit</div>
                  {editingHouseType === houseType.id && editingHouseTypeField === 'rentDepositAmount' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingHouseTypeValue}
                        onChange={(e) => setEditingHouseTypeValue(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateHouseTypeField(houseType.id)}
                        disabled={updateUnitsFromHouseTypeMutation.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditHouseTypeField}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="font-semibold cursor-pointer hover:bg-muted/50 p-1 rounded flex items-center gap-1"
                      onClick={() => handleStartEditHouseTypeField(houseType.id, 'rentDepositAmount', houseType.rentDepositAmount || "0")}
                    >
                      KSh {parseFloat(houseType.rentDepositAmount || "0").toLocaleString()}
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground">Water Rate</div>
                  {editingHouseType === houseType.id && editingHouseTypeField === 'waterRatePerUnit' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingHouseTypeValue}
                        onChange={(e) => setEditingHouseTypeValue(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateHouseTypeField(houseType.id)}
                        disabled={updateUnitsFromHouseTypeMutation.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditHouseTypeField}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : editingHouseType === houseType.id && editingHouseTypeField === 'waterFlatRate' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingHouseTypeValue}
                        onChange={(e) => setEditingHouseTypeValue(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateHouseTypeField(houseType.id)}
                        disabled={updateUnitsFromHouseTypeMutation.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditHouseTypeField}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="font-semibold cursor-pointer hover:bg-muted/50 p-1 rounded flex items-center gap-1"
                      onClick={() => {
                        if (houseType.waterRateType === "unit_based") {
                          handleStartEditHouseTypeField(houseType.id, 'waterRatePerUnit', houseType.waterRatePerUnit || "0")
                        } else {
                          handleStartEditHouseTypeField(houseType.id, 'waterFlatRate', houseType.waterFlatRate || "0")
                        }
                      }}
                    >
                      {houseType.waterRateType === "unit_based" 
                        ? `KSh ${parseFloat(houseType.waterRatePerUnit || "0").toFixed(2)}/unit`
                        : `KSh ${parseFloat(houseType.waterFlatRate || "0").toFixed(2)} flat`
                      }
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground">Total Units</div>
                  <div className="font-semibold">{getUnitsCount(houseType.id)}</div>
                </div>
              </div>
              
              {/* Charge Codes for this house type */}
              {chargeCodes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Additional Charges</div>
                  <div className="space-y-1">
                    {chargeCodes.map((chargeCode: any) => {
                      // Get the current charge amount for this house type
                      let currentAmount = "0.00"
                      try {
                        if (houseType.chargeAmounts && houseType.chargeAmounts !== 'null' && houseType.chargeAmounts !== '') {
                      const parsedAmounts = normalizeChargeAmounts(houseType.chargeAmounts)
                          currentAmount = parsedAmounts[chargeCode.id] || "0.00"
                        }
                      } catch (error) {
                        console.warn('Failed to parse chargeAmounts for display:', error)
                        currentAmount = "0.00"
                      }
                      
                      return (
                        <div key={chargeCode.id} className="flex justify-between text-xs items-center">
                          <span className="text-muted-foreground">{chargeCode.name}</span>
                          {editingHouseType === houseType.id && editingHouseTypeField === `charge_${chargeCode.id}` ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingHouseTypeValue}
                                onChange={(e) => setEditingHouseTypeValue(e.target.value)}
                                className="h-6 text-xs w-20"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateHouseTypeField(houseType.id)}
                                disabled={updateUnitsFromHouseTypeMutation.isPending}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-2 w-2" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditHouseTypeField}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </div>
                          ) : (
                            <span 
                              className="font-medium cursor-pointer hover:bg-muted/50 p-1 rounded flex items-center gap-1"
                              onClick={() => handleStartEditHouseTypeField(houseType.id, `charge_${chargeCode.id}`, currentAmount)}
                            >
                              KSh {parseFloat(currentAmount).toFixed(2)}
                              <Pencil className="h-2 w-2 text-muted-foreground" />
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Occupied</div>
                  <div className="font-semibold">{getOccupiedUnitsCount(houseType.id)}</div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedHouseType(houseType)
                    setIsBulkUnitDialogOpen(true)
                    bulkUnitForm.setValue("unitPrefix", "A")
                    bulkUnitForm.setValue("startNumber", 101)
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Units
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete House Type</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{houseType.name}"? This action cannot be undone.
                        All units of this type will also be affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteHouseType(houseType.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
            )
          })
        )}
      </div>

      {/* Active Filters Indicator */}
      {selectedHouseTypeFilters.length > 0 && (
        <Card className="vibrant-card bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Active Filters:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedHouseTypeFilters.map((houseTypeId) => {
                    const houseType = houseTypes.find((ht: any) => ht.id === houseTypeId)
                    if (!houseType) return null
                    
                    return (
                      <Badge 
                        key={houseTypeId}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => toggleHouseTypeFilter(houseTypeId)}
                      >
                        {houseType.name}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    )
                  })}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedHouseTypeFilters([])}
              >
                Clear All Filters
              </Button>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Showing {filteredUnits.length} unit(s) matching selected house types
            </div>
          </CardContent>
        </Card>
      )}

      </>
      ) : (
        <Card className="vibrant-card border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Select a property in the header to view house types. Units across all properties are listed below.
          </CardContent>
        </Card>
      )}

      {/* Units Table */}
      <Card className="vibrant-panel">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              All Units
            </div>
            {selectedUnits.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteUnits}
                disabled={bulkDeleteUnitsMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedUnits.length})
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            {selectedProperty 
              ? `Units in ${selectedProperty.name}` 
              : "Overview of all units across all properties and house types"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedUnits.length === filteredUnits.length && filteredUnits.length > 0}
                    onChange={handleSelectAllUnits}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>Unit Number</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>House Type</TableHead>
                <TableHead>Rent Amount</TableHead>
                <TableHead>Rent Deposit</TableHead>
                <TableHead>Water Rate</TableHead>
                {chargeCodes.map((chargeCode: any) => (
                  <TableHead key={chargeCode.id}>{chargeCode.name}</TableHead>
                ))}
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.map((unit: any) => {
                const property: any = Array.isArray(properties) ? properties.find((p: any) => p.id === unit.propertyId) : null
                const houseType: any = Array.isArray(houseTypes) ? houseTypes.find((ht: any) => ht.id === unit.houseTypeId) : null
                return (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUnits.includes(unit.id)}
                        onChange={() => handleSelectUnit(unit.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                    <TableCell>{property?.name || "Unknown"}</TableCell>
                    <TableCell>{houseType?.name || "Unknown"}</TableCell>
                    <TableCell>
                      {editingUnit === unit.id && editingField === 'rentAmount' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-24 h-8"
                            step="0.01"
                            min="0"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateField(unit.id)}
                            disabled={updateUnitFieldMutation.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditField}
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                          onClick={() => handleStartEditField(unit.id, 'rentAmount', unit.rentAmount)}
                        >
                          KSh {parseFloat(unit.rentAmount).toLocaleString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingUnit === unit.id && editingField === 'rentDepositAmount' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-24 h-8"
                            step="0.01"
                            min="0"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateField(unit.id)}
                            disabled={updateUnitFieldMutation.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditField}
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                          onClick={() => handleStartEditField(unit.id, 'rentDepositAmount', unit.rentDepositAmount || "0")}
                        >
                          KSh {parseFloat(unit.rentDepositAmount || "0").toLocaleString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingUnit === unit.id && editingField === 'waterRateAmount' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-24 h-8"
                            step="0.01"
                            min="0"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateField(unit.id)}
                            disabled={updateUnitFieldMutation.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditField}
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                          onClick={() => handleStartEditField(unit.id, 'waterRateAmount', unit.waterRateAmount || "0")}
                        >
                          KSh {parseFloat(unit.waterRateAmount || "0").toLocaleString()}/unit
                        </div>
                      )}
                    </TableCell>
                    {chargeCodes.map((chargeCode: any) => {
                      const unitChargeAmounts = normalizeChargeAmounts(unit.chargeAmounts)
                      const chargeAmount = unitChargeAmounts[chargeCode.id] || "0.00"
                      
                      return (
                        <TableCell key={chargeCode.id}>
                          {editingUnit === unit.id && editingField === `charge_${chargeCode.id}` ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="w-24 h-8"
                                step="0.01"
                                min="0"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateField(unit.id)}
                                disabled={updateUnitFieldMutation.isPending}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditField}
                              >
                                ×
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                              onClick={() => handleStartEditField(unit.id, `charge_${chargeCode.id}`, chargeAmount)}
                            >
                              <div className="text-sm text-muted-foreground">
                                KSh {parseFloat(chargeAmount).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell>
                      <Badge variant={
                        unit.status === "occupied" ? "default" :
                        unit.status === "vacant" ? "secondary" : "destructive"
                      }>
                        {unit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Update Scope Dialog */}
      <AlertDialog open={isUpdateScopeDialogOpen} onOpenChange={(open) => {
        setIsUpdateScopeDialogOpen(open)
        if (!open) {
          // Reset state when dialog is closed
          setPendingUpdate(null)
          setEditingHouseType(null)
          setEditingHouseTypeField(null)
          setEditingHouseTypeValue("")
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update House Type Rates</AlertDialogTitle>
            <AlertDialogDescription>
              How would you like to apply this rate change?
              <br /><br />
              <strong>New Units Only:</strong> The new rate will only apply to units created after this update.
              <br /><br />
              <strong>Update Existing Units:</strong> All existing units with this house type will be updated to the new rate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleConfirmUpdateScope(false)}
              disabled={updateHouseTypeOnlyMutation.isPending || updateUnitsFromHouseTypeMutation.isPending}
            >
              New Units Only
            </Button>
            <Button
              onClick={() => handleConfirmUpdateScope(true)}
              disabled={updateHouseTypeOnlyMutation.isPending || updateUnitsFromHouseTypeMutation.isPending}
            >
              {updateUnitsFromHouseTypeMutation.isPending || updateHouseTypeOnlyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Existing Units"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Charge Code Dialog */}
      <AlertDialog open={isDeleteChargeCodeDialogOpen} onOpenChange={(open) => {
        setIsDeleteChargeCodeDialogOpen(open)
        if (!open) {
          setChargeCodeToDelete(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Charge Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{chargeCodeToDelete?.name}"?
              <br /><br />
              <strong className="text-destructive">Warning:</strong> This will affect all unit rates in {selectedProperty?.name || "this property"}:
              <br />
              • All house types in this property will lose this charge code
              <br />
              • All existing units in this property will lose this charge code
              <br />
              • Future units will not include this charge code
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (chargeCodeToDelete) {
                  deleteChargeCodeMutation.mutate(chargeCodeToDelete.id)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteChargeCodeMutation.isPending}
            >
              {deleteChargeCodeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Charge Code"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
