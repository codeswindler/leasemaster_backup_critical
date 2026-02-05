import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { insertPropertySchema } from "@shared/schema"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useFilter } from "@/contexts/FilterContext"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Plus, Building2, MapPin, Users, DollarSign, Settings, Eye, Trash2, Pause, Play, RotateCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUndoDelete } from "@/lib/use-undo-delete"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export function Properties() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [disablingPropertyId, setDisablingPropertyId] = useState<string | null>(null)
  const [isCreateLandlordDialogOpen, setIsCreateLandlordDialogOpen] = useState(false)
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const { selectedPropertyId, selectedLandlordId, clearFilters, setSelectedPropertyId, setSelectedLandlordId } = useFilter()
  
  // Get current user for access control
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/check")
      return await response.json()
    },
  })
  const currentUser = authData?.authenticated ? authData.user : null
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin"
  const permissionsRaw = currentUser?.permissions
  const permissions = Array.isArray(permissionsRaw)
    ? permissionsRaw
    : typeof permissionsRaw === "string" && permissionsRaw.trim().length > 0
      ? (() => {
          try {
            const parsed = JSON.parse(permissionsRaw)
            return Array.isArray(parsed) ? parsed : permissionsRaw.split(",").map((value: string) => value.trim()).filter(Boolean)
          } catch (error) {
            return permissionsRaw.split(",").map((value: string) => value.trim()).filter(Boolean)
          }
        })()
      : []
  const hasPermissionCategory = (category: string) =>
    permissions.includes(category) || permissions.some((permission: string) => permission.startsWith(`${category}.`))
  const canCreateProperty = isAdmin || hasPermissionCategory("properties") || permissions.includes("properties.create")

  // Edit property form
  const editForm = useForm({
    resolver: zodResolver(insertPropertySchema.pick({ name: true, address: true, landlordName: true, landlordEmail: true })),
    defaultValues: {
      name: "",
      address: "",
      landlordName: "",
      landlordEmail: "",
      accountPrefix: "",
    },
  })

  // Update property mutation
  const updatePropertyMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; address: string; landlordName: string; landlordEmail?: string; accountPrefix?: string }) => {
      return apiRequest("PUT", `/api/properties/${data.id}`, {
        name: data.name,
        address: data.address,
        landlordName: data.landlordName,
        landlordEmail: data.landlordEmail,
        accountPrefix: data.accountPrefix,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] })
      setIsEditDialogOpen(false)
      toast({
        title: "Property Updated",
        description: "Property details have been saved successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      })
    },
  })

  // Disable property mutation
  const disablePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      setDisablingPropertyId(propertyId)
      return apiRequest("POST", `/api/properties/${propertyId}/disable`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      setDisablingPropertyId(null)
      toast({
        title: "Property Disabled",
        description: "Property has been disabled and all leases suspended.",
      })
    },
    onError: (error: any) => {
      setDisablingPropertyId(null)
      toast({
        title: "Error",
        description: error.message || "Failed to disable property",
        variant: "destructive",
      })
    },
  })

  // Enable property mutation
  const enablePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest("POST", `/api/properties/${propertyId}/enable`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      toast({
        title: "Property Enabled",
        description: "Property has been enabled and all leases resumed.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enable property",
        variant: "destructive",
      })
    },
  })

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest("DELETE", `/api/properties/${propertyId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] })
      toast({
        title: "Property Deleted",
        description: "Property has been deleted successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete property. Remove all tenant leases first.",
        variant: "destructive",
      })
    },
  })

  const { scheduleDelete } = useUndoDelete()

  const normalizeId = (value: any) => (value === null || value === undefined ? null : String(value))
  const normalizeLandlordId = (value: any) => (value === null || value === undefined ? null : String(value))
  const normalizeProperty = (property: any) => ({
    ...property,
    landlordId: property.landlordId ?? property.landlord_id ?? null,
    landlordName: property.landlordName ?? property.landlord_name ?? "",
    landlordEmail: property.landlordEmail ?? property.landlord_email ?? "",
    landlordPhone: property.landlordPhone ?? property.landlord_phone ?? "",
    accountPrefix: property.accountPrefix ?? property.account_prefix ?? "",
    createdAt: property.createdAt ?? property.created_at ?? property.createdAt,
  })
  const getLandlordById = (id: string | null) =>
    Array.isArray(landlords) ? landlords.find((landlord: any) => normalizeLandlordId(landlord.id) === id) : null
  const getLandlordByName = (name: string) =>
    Array.isArray(landlords)
      ? landlords.find((landlord: any) => landlord.username === name || landlord.fullName === name)
      : null

  const buildPropertyPayload = (data: any) => {
    if (!canCreateProperty) {
      toast({
        title: "Permission denied",
        description: "You do not have permission to create properties.",
        variant: "destructive",
      })
      return null
    }

    if (propertyLimitReached) {
      toast({
        title: "Property limit reached",
        description: "You have reached the maximum number of properties allowed for your account.",
        variant: "destructive",
      })
      return null
    }
    if (!data.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Property name is required",
        variant: "destructive",
      })
      return null
    }

    if (!data.address?.trim()) {
      toast({
        title: "Validation Error",
        description: "Property address is required",
        variant: "destructive",
      })
      return null
    }

    // Auto-assign userId as landlordId for client users (userId = landlordId)
    // Admin users must select a landlord, client users are locked to their own id.
    // Handle "all" as empty/null (not a valid landlord ID)
    const landlordIdValue = data.landlordId === "all" ? "" : data.landlordId
    const landlordIdToUse = isAdmin
      ? (selectedLandlordId || landlordIdValue || null)
      : (currentUser ? currentUser.id : null)

    if (!landlordIdToUse) {
      // Only require selection for admin users
      if (isAdmin) {
        toast({
          title: "Validation Error",
          description: "Please select a landlord or create a new one",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Validation Error",
          description: "Unable to determine landlord. Please try again.",
          variant: "destructive",
        })
      }
      return null
    }

    const landlord = isAdmin ? getLandlordById(String(landlordIdToUse)) : null
    const landlordName = isAdmin
      ? (data.landlordName?.trim() || landlord?.username || landlord?.fullName || "")
      : (currentUser?.username || "")
    const landlordEmail = isAdmin
      ? (data.landlordEmail?.trim() || landlord?.username || "")
      : (currentUser?.username || "")

    return {
      name: data.name,
      address: data.address,
      landlordId: landlordIdToUse,
      landlordName,
      landlordEmail,
      ...(data.landlordPhone && { landlordPhone: data.landlordPhone }),
      ...(data.accountPrefix && { accountPrefix: data.accountPrefix }),
    }
  }

  // Reset edit form when selected property changes
  useEffect(() => {
    if (selectedProperty && isEditDialogOpen) {
      const matchedLandlord = getLandlordByName(selectedProperty.landlordName || "")
      editForm.reset({
        name: selectedProperty.name || "",
        address: selectedProperty.address || "",
        landlordName: matchedLandlord?.username || matchedLandlord?.fullName || selectedProperty.landlordName || "",
        landlordEmail: selectedProperty.landlordEmail || "",
        accountPrefix: selectedProperty.accountPrefix || "",
      })
    }
  }, [selectedProperty, isEditDialogOpen, editForm])

  // Fetch properties from API with filters
  const { data: properties = [], isLoading: propertiesLoading, error: propertiesError } = useQuery({
    queryKey: ["/api/properties", selectedLandlordId, selectedPropertyId],
    queryFn: async () => {
      try {
        let url = "/api/properties";
        const params = new URLSearchParams();
        if (selectedLandlordId) params.append("landlordId", selectedLandlordId);
        if (selectedPropertyId) params.append("propertyId", selectedPropertyId);
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await apiRequest("GET", url)
        const data = await response.json()
        
        // Ensure response is an array
        const propertiesArray = Array.isArray(data) ? data : []
        
        // Validate each property has required fields
        const validatedProperties = propertiesArray.map((property: any) => {
          if (!property || typeof property !== 'object' || !property.id) {
            return null
          }
          return normalizeProperty(property)
        }).filter(Boolean)
        
        return validatedProperties
      } catch (error) {
        console.error("Error fetching properties:", error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  })

  const getPropertyLandlordId = (property: any) =>
    property?.landlordId ?? property?.landlord_id ?? null

  const propertyLimitValue =
    typeof currentUser?.propertyLimit === "number"
      ? currentUser.propertyLimit
      : currentUser?.propertyLimit !== null && currentUser?.propertyLimit !== undefined && currentUser?.propertyLimit !== ""
        ? Number(currentUser.propertyLimit)
        : null

  const propertyCountForUser = !isAdmin && currentUser
    ? (Array.isArray(properties)
        ? properties.filter((property: any) => String(getPropertyLandlordId(property)) === String(currentUser.id)).length
        : 0)
    : (Array.isArray(properties) ? properties.length : 0)

  const propertyLimitReached =
    !isAdmin &&
    propertyLimitValue !== null &&
    !Number.isNaN(propertyLimitValue) &&
    propertyCountForUser >= propertyLimitValue

  // Fetch units for occupancy data
  const { data: units = [] } = useQuery({
    queryKey: ["/api/units", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    staleTime: 0, // Always refetch when invalidated
  })

  // Fetch landlords for selector
  const { data: landlords = [], refetch: refetchLandlords } = useQuery({
    queryKey: ["/api/landlords"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/landlords")
      return await response.json()
    },
  })

  // Form setup
  const form = useForm({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      name: "",
      address: "",
      landlordId: "",
      landlordName: "",
      landlordPhone: "",
      landlordEmail: "",
      accountPrefix: "",
    },
  })

  // Auto-populate landlordId when dialog opens if filter is active
  useEffect(() => {
    if (!isAddDialogOpen) return
    if (!isAdmin && currentUser) {
      form.setValue("landlordId", String(currentUser.id))
      form.setValue("landlordName", currentUser.username || "")
      form.setValue("landlordEmail", currentUser.username || "")
      return
    }
    if (selectedLandlordId) {
      form.setValue("landlordId", normalizeId(selectedLandlordId) || "")
    } else {
      form.setValue("landlordId", "")
    }
  }, [isAddDialogOpen, selectedLandlordId, form, isAdmin, currentUser])

  // Create property mutation with comprehensive debugging
  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      // Validate form data
      if (!data.name || !data.address) {
        throw new Error("Property name and address are required")
      }
      
      // Use apiRequest for relative URLs (works in both dev and production)
      const response = await apiRequest("POST", "/api/properties", data)
      const result = await response.json()
      return result
    },
    onMutate: async (newProperty) => {
      await queryClient.cancelQueries({ queryKey: ["/api/properties"] })
      
      // Optimistically update the cache
      const previousProperties = queryClient.getQueryData(["/api/properties"])
      
      return { previousProperties }
    },
    onSuccess: (newProperty: any) => {
      // Update the cache with the new property
      queryClient.setQueryData(["/api/properties"], (old: any) => {
        return Array.isArray(old) ? [...old, newProperty] : [newProperty]
      })
      
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] })
      
      toast({
        title: "Success",
        description: "Property created successfully",
      })
      
      setIsAddDialogOpen(false)
      form.reset()
    },
    onError: (error: any, variables, context) => {
      console.error("Property creation failed:", error)
      
      // Revert optimistic update
      if (context?.previousProperties) {
        queryClient.setQueryData(["/api/properties"], context.previousProperties)
      }
      
      // Extract error message from error object
      // apiRequest throws Error with format "400: {error text}" or JSON error object
      let errorMessage = "Failed to create property. Please try again.";
      
      if (error?.message) {
        const message = error.message;
        // Try to parse JSON error from message (format: "400: {\"error\":\"...\"}")
        const jsonMatch = message.match(/\d+:\s*({.*})/);
        if (jsonMatch) {
          try {
            const errorData = JSON.parse(jsonMatch[1]);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If not JSON, use the message after status code
            const parts = message.split(':');
            errorMessage = parts.length > 1 ? parts.slice(1).join(':').trim() : message;
          }
        } else {
          // Use the error message directly
          errorMessage = message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] })
    },
  })

  // Calculate enhanced property data with robust validation
  const enhancedProperties = Array.isArray(properties) ? properties.map((property: any) => {
    // Validate property data
    if (!property || typeof property !== 'object') {
      console.warn("Invalid property in properties array:", property)
      return null
    }

    // Ensure required fields exist with defaults
    const safeProperty = {
      id: property.id || '',
      name: property.name || 'Unnamed Property',
      address: property.address || 'No Address',
      landlordName: property.landlordName || 'Unknown Landlord',
      landlordPhone: property.landlordPhone || '',
      landlordEmail: property.landlordEmail || '',
      accountPrefix: property.accountPrefix || property.account_prefix || '',
      status: property.status || 'active',
      createdAt: property.createdAt || new Date().toISOString(),
      ...property // Spread original property to preserve any additional fields
    }

    const propertyUnits = Array.isArray(units) ? units.filter((unit: any) => unit.propertyId === safeProperty.id) : []
    const occupiedUnits = propertyUnits.filter((unit: any) => unit.status === 'occupied').length
    const totalUnits = propertyUnits.length
    
    // Group units by type with safe parsing
    const unitTypes = propertyUnits.reduce((acc: any, unit: any) => {
      const unitType = unit.type || 'Unknown'
      if (!acc[unitType]) {
        acc[unitType] = { type: unitType, count: 0, prices: [] }
      }
      acc[unitType].count++
      acc[unitType].prices.push(parseFloat(unit.rentAmount) || 0)
      return acc
    }, {})
    
    // Calculate average prices and format with safe division
    const formattedUnitTypes = Object.values(unitTypes).map((unitType: any) => {
      const avgPrice = unitType.prices.length > 0 
        ? Math.round(unitType.prices.reduce((a: number, b: number) => a + b, 0) / unitType.prices.length)
        : 0
      return {
        type: unitType.type,
        count: unitType.count,
        price: `KSh ${avgPrice.toLocaleString()}`
      }
    })
    
    const monthlyRevenue = propertyUnits
      .filter((unit: any) => unit.status === 'occupied')
      .reduce((sum: number, unit: any) => sum + (parseFloat(unit.rentAmount) || 0), 0)
    
    return {
      ...safeProperty,
      totalUnits,
      occupiedUnits,
      monthlyRevenue: `KSh ${monthlyRevenue.toLocaleString()}`,
      unitTypes: formattedUnitTypes
    }
  }).filter(Boolean) : [] // Remove any null entries

  // Apply search filtering to enhanced properties (backend handles landlord/property filtering)
  const filteredProperties = enhancedProperties.filter((property: any) => {
    // Ensure property exists and has required fields
    if (!property || typeof property !== 'object') {
      console.warn("Invalid property object:", property)
      return false
    }

    // Apply search term filtering only (backend handles filter by landlord/property)
    const searchLower = searchTerm.toLowerCase()
    const name = String(property.name || '').toLowerCase()
    const landlordName = String(property.landlordName || '').toLowerCase()
    const address = String(property.address || '').toLowerCase()
    
    return name.includes(searchLower) ||
           landlordName.includes(searchLower) ||
           address.includes(searchLower)
  })

  // Ensure properties load on component mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/properties"] })
  }, [])

  // Debug: Log current state (reduced for production)
  if (propertiesLoading) {
    console.log("📡 Loading properties...")
  } else if (propertiesError) {
    console.error("❌ Error loading properties:", propertiesError)
  } else {
    console.log(`✅ Properties loaded: ${enhancedProperties.length} properties`)
  }

  const handleAddProperty = (data: any) => {
    const propertyData = buildPropertyPayload(data)
    if (!propertyData) return
    createPropertyMutation.mutate(propertyData)
  }

  const handleAddPropertyWithRedirect = () => {
    const formData = form.getValues()

    const propertyData = buildPropertyPayload(formData)
    if (!propertyData) return

    // Submit the mutation
    createPropertyMutation.mutate(propertyData, {
      onSuccess: (newProperty) => {
        const newPropertyId = newProperty?.id
        if (newPropertyId) {
          setSelectedPropertyId(String(newPropertyId))
          if (propertyData.landlordId) {
            setSelectedLandlordId(String(propertyData.landlordId))
          }
          setLocation(`/houses?property=${newPropertyId}`)
        } else {
          setLocation("/houses?property=new")
        }
      },
      onError: () => {
        // Error handling is already done in the main mutation
      },
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Add Property Dialog - Render when user can create properties */}
      {canCreateProperty && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-8">
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
              <DialogDescription>
                Create a new property and configure its details.
              </DialogDescription>
            </DialogHeader>
            {propertyLimitReached && (
              <p className="text-sm text-destructive">
                You have reached the maximum number of properties allowed for your account.
              </p>
            )}
            <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddProperty)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Sunset Apartments"
                              data-testid="input-property-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 123 Westlands Road, Nairobi"
                              data-testid="input-address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  <FormField
                    control={form.control}
                    name="accountPrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Prefix</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., INF"
                            data-testid="input-account-prefix"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {isAdmin ? (
                    <FormField
                      control={form.control}
                      name="landlordId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landlord <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={(value) => {
                                if (value === "create-new") {
                                  setIsCreateLandlordDialogOpen(true);
                                } else if (value === "all") {
                                  field.onChange("");
                                  setSelectedLandlordId(null);
                                } else {
                                  field.onChange(value);
                                  setSelectedLandlordId(value);
                                  const selectedLandlord = landlords.find((l: any) => normalizeId(l.id) === value);
                                  if (selectedLandlord) {
                                    form.setValue("landlordEmail", selectedLandlord.username || "");
                                  }
                                }
                              }}
                              value={field.value ? String(field.value) : "all"}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select landlord or create new" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  <span className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    All Landlords
                                  </span>
                                </SelectItem>
                                {!selectedLandlordId && (
                                  <SelectItem value="create-new">
                                    <span className="flex items-center gap-2">
                                      <Plus className="h-4 w-4" />
                                      Create New Landlord
                                    </span>
                                  </SelectItem>
                                )}
                                {Array.isArray(landlords) && landlords.map((landlord: any) => (
                                  <SelectItem key={landlord.id} value={String(landlord.id)}>
                                    {landlord.username || landlord.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormItem>
                      <FormLabel>Landlord</FormLabel>
                      <FormControl>
                        <Input value={currentUser?.username || ""} disabled />
                      </FormControl>
                    </FormItem>
                  )}
                </form>
            </Form>
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                disabled={createPropertyMutation.isPending || propertyLimitReached}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="outline"
                data-testid="button-save-close-property"
                disabled={createPropertyMutation.isPending || propertyLimitReached}
                onClick={() => handleAddProperty(form.getValues())}
              >
                {createPropertyMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save and Close
              </Button>
              <Button
                type="button"
                data-testid="button-save-add-units-property"
                disabled={createPropertyMutation.isPending || propertyLimitReached}
                onClick={handleAddPropertyWithRedirect}
              >
                {createPropertyMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save and Add Houses
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="properties-title">Properties</h1>
            <p className="text-muted-foreground">Manage your rental properties and units</p>
          </div>
          {/* Add Property Button - Only show in header when properties exist */}
          {canCreateProperty && enhancedProperties.length > 0 && (
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-property"
              disabled={propertyLimitReached}
              title={propertyLimitReached ? "Property limit reached" : undefined}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          )}
        </div>
          
        {/* Create New Landlord Dialog */}
        {isAdmin && (
          <Dialog open={isCreateLandlordDialogOpen} onOpenChange={setIsCreateLandlordDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Landlord</DialogTitle>
                <DialogDescription>
                  Create a new landlord account. Credentials will be sent via email and SMS.
                </DialogDescription>
              </DialogHeader>
              <CreateLandlordForm
                onSuccess={(landlord) => {
                  // Close dialog
                  setIsCreateLandlordDialogOpen(false)
                  // Refresh landlords list
                  refetchLandlords()

                  if (isAddDialogOpen) {
                    // Auto-select newly created landlord for add flow
                    form.setValue("landlordId", landlord.id)
                    form.setValue("landlordEmail", landlord.username)
                  }

                  if (isEditDialogOpen) {
                    // Update edit form to the newly created landlord
                    editForm.setValue("landlordName", landlord.username || landlord.fullName || "")
                    editForm.setValue("landlordEmail", landlord.username || "")
                  }

                  // Show success toast with password
                  toast({
                    title: "Landlord Created",
                    description: `Landlord account created. Credentials sent to ${landlord.username}. Temporary password: ${(landlord as any).tempPassword || 'Check email'}`,
                  })
                }}
                onCancel={() => setIsCreateLandlordDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
        
        {/* Search Bar */}
        <div className="flex gap-4 items-center">
          <Input
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-properties"
          />
          {isAdmin && selectedLandlordId && (
            <Button
              variant="outline"
              onClick={() => {
                clearFilters();
              }}
              className="flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              View All Properties
            </Button>
          )}
          {isAdmin && selectedLandlordId && (
            <Badge variant="secondary" className="flex items-center gap-2">
              Filtered by landlord
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={() => clearFilters()}
              >
                ×
              </Button>
            </Badge>
          )}
        </div>
      </div>

      {/* Loading State */}
      {propertiesLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading properties...</span>
        </div>
      )}

      {/* Error State */}
      {propertiesError && (
        <div className="flex items-center justify-center py-20 text-destructive">
          <AlertTriangle className="h-6 w-6 mr-2" />
          <div className="text-center">
            <span>Failed to load properties</span>
            <p className="text-sm text-muted-foreground mt-1">
              {(propertiesError as any)?.message || "Unknown error occurred"}
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!propertiesLoading && !propertiesError && enhancedProperties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Building2 className="h-12 w-12 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No properties found</h3>
          {canCreateProperty && (
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="mt-4"
              disabled={propertyLimitReached}
              title={propertyLimitReached ? "Property limit reached" : undefined}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          )}
          <p className="text-center max-w-md mt-4">
            Get started by creating your first property. Click the "Add Property" button below.
          </p>
        </div>
      )}

      {/* Properties Grid */}
      {!propertiesLoading && !propertiesError && enhancedProperties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property: any) => (
          <Card key={property.id} className={`vibrant-card hover-elevate relative ${property.status === 'inactive' ? 'opacity-60 bg-muted/30' : ''} ${disablingPropertyId === property.id ? 'animate-pulse' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle 
                      className="text-lg cursor-pointer hover:text-primary transition-colors"
                      onClick={() => {
                        setSelectedPropertyId(property.id)
                        setLocation(`/houses?property=${property.id}`)
                      }}
                    >
                      {property.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {property.address}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={property.status === "active" ? "default" : "destructive"}
                  data-testid={`status-${property.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {property.status === "inactive" ? "SUSPENDED" : property.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="demographic-tile">
                  <p className="text-muted-foreground">Landlord</p>
                  <p className="font-medium">{property.landlordName}</p>
                </div>
                  <div className="demographic-tile">
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{property.address}</p>
                </div>
                  <div className="demographic-tile">
                  <p className="text-muted-foreground">Occupancy</p>
                  <p className="font-medium">
                    {property.occupiedUnits}/{property.totalUnits} units
                  </p>
                </div>
                  <div className="demographic-tile">
                  <p className="text-muted-foreground">Monthly Revenue</p>
                  <p className="font-medium font-mono">{property.monthlyRevenue}</p>
                </div>
              </div>

              {property.unitTypes && property.unitTypes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Unit Types</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {property.unitTypes.map((unitType: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                        <span>{unitType.type} ({unitType.count} units)</span>
                        <span className="font-mono text-muted-foreground">{unitType.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1" 
                  onClick={() => {
                    const landlordId = property?.landlordId ?? property?.landlord_id ?? null
                    if (landlordId) {
                      setSelectedLandlordId(landlordId)
                    }
                    setSelectedPropertyId(property.id)
                    setLocation(`/houses?property=${property.id}`)
                  }}
                  data-testid={`button-view-${property.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
                <Button 
                  variant={property.status === "inactive" ? "default" : "outline"}
                  size="sm" 
                  className="flex-1" 
                  onClick={() => {
                    // Validate property exists in current filtered list
                    const propertyExists = enhancedProperties.some((p: any) => p.id === property.id);
                    if (propertyExists) {
                      setSelectedProperty(property);
                      setIsManageDialogOpen(true);
                    } else {
                      toast({
                        title: "Property Not Found",
                        description: "This property may have been deleted or is not accessible with the current filter.",
                        variant: "destructive",
                      });
                      // Clear property selection if it doesn't exist
                      setSelectedPropertyId(null);
                    }
                  }}
                  data-testid={`button-manage-${property.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {property.status === "inactive" ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Activate
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-1" />
                      Manage
                    </>
                  )}
                </Button>
              </div>
              
              {/* Suspended Watermark */}
              {property.status === "inactive" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-6xl font-bold text-muted-foreground/20 rotate-12 select-none">
                    SUSPENDED
                  </div>
                </div>
              )}
            </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedProperty ? (Array.isArray(properties) ? properties.find((p: any) => p.id === selectedProperty.id) || selectedProperty : selectedProperty)?.name : ''}
            </DialogTitle>
            <DialogDescription>
              Detailed property information
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (() => {
            // Get fresh property data from the query instead of stale selectedProperty
            const freshProperty = Array.isArray(properties) ? properties.find((p: any) => p.id === selectedProperty.id) || selectedProperty : selectedProperty;
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Property Name</Label>
                    <p className="text-sm">{freshProperty.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={freshProperty.status === "active" ? "default" : "secondary"}>
                      {freshProperty.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-sm">{freshProperty.address}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Account Prefix</Label>
                    <p className="text-sm">{freshProperty.accountPrefix || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Landlord</Label>
                    <p className="text-sm">{freshProperty.landlordName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Occupancy</Label>
                    <p className="text-sm">{freshProperty.occupiedUnits}/{freshProperty.totalUnits} units</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Monthly Revenue</Label>
                    <p className="text-sm font-mono">{freshProperty.monthlyRevenue}</p>
                  </div>
                </div>
                
                {freshProperty.unitTypes && freshProperty.unitTypes.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Unit Types</Label>
                    <div className="space-y-2">
                      {freshProperty.unitTypes.map((unitType: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                          <span className="font-medium">{unitType.type}</span>
                          <div className="text-right">
                            <p className="text-sm">{unitType.count} units</p>
                            <p className="text-xs text-muted-foreground font-mono">{unitType.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Manage Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage {selectedProperty?.name}
            </DialogTitle>
            <DialogDescription>
              Property management options
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-4">
              <div className="grid gap-3">
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  onClick={() => {
                    setIsManageDialogOpen(false)
                    setIsEditDialogOpen(true)
                  }}
                  data-testid="button-edit-property"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Edit Property Details
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  onClick={() => {
                    setIsManageDialogOpen(false)
                    // Navigate to water units page with property filter
                    setLocation(`/accounting/water-units?property=${selectedProperty?.id}`)
                  }}
                  data-testid="button-view-units"
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Units
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  onClick={() => {
                    setIsManageDialogOpen(false)
                    // Navigate to tenants page with property filter
                    setLocation(`/tenants?property=${selectedProperty?.id}`)
                  }}
                  data-testid="button-view-tenants"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  View Tenants
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  onClick={() => {
                    setIsManageDialogOpen(false)
                    // Navigate to reports page with property filter
                    setLocation(`/reports?property=${selectedProperty?.id}`)
                  }}
                  data-testid="button-financial-reports"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Financial Reports
                </Button>
                {selectedProperty?.status === 'active' ? (
                  <Button 
                    variant="outline" 
                    className="justify-start" 
                    onClick={() => {
                      disablePropertyMutation.mutate(selectedProperty.id)
                      setIsManageDialogOpen(false)
                    }}
                    disabled={disablePropertyMutation.isPending}
                    data-testid="button-disable-property"
                  >
                    {disablePropertyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Pause className="h-4 w-4 mr-2" />
                    )}
                    Disable Property
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="justify-start" 
                    onClick={() => {
                      enablePropertyMutation.mutate(selectedProperty.id)
                      setIsManageDialogOpen(false)
                    }}
                    disabled={enablePropertyMutation.isPending}
                    data-testid="button-enable-property"
                  >
                    {enablePropertyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Enable Property
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="justify-start" 
                      data-testid="button-delete-property"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Property
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Property</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{selectedProperty?.name}"? This action cannot be undone.
                        {selectedProperty?.occupiedUnits > 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-800">
                              <strong>Warning:</strong> This property has {selectedProperty.occupiedUnits} occupied unit(s). 
                              You must terminate all active leases before deleting this property.
                            </p>
                          </div>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          if (selectedProperty) {
                            scheduleDelete({
                              key: `property-${selectedProperty.id}`,
                              label: selectedProperty.name || "Property",
                              onDelete: () => deletePropertyMutation.mutate(selectedProperty.id),
                            })
                          }
                          setIsManageDialogOpen(false)
                        }}
                        disabled={deletePropertyMutation.isPending || selectedProperty?.occupiedUnits > 0}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deletePropertyMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete Property"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="pt-2 border-t">
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => setIsManageDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Edit {selectedProperty?.name}
            </DialogTitle>
            <DialogDescription>
              Update property information
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <Form {...editForm}>
              <form 
                onSubmit={editForm.handleSubmit((data) => {
                  updatePropertyMutation.mutate({
                    id: selectedProperty.id,
                    ...data,
                  })
                })}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-property-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-property-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="accountPrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Prefix</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-account-prefix" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="landlordName"
                    render={({ field }) => {
                      const matchedLandlord = getLandlordByName(field.value || "")
                      const selectedValue = matchedLandlord?.id ? String(matchedLandlord.id) : "unlinked"

                      return (
                        <FormItem>
                          <FormLabel>Landlord</FormLabel>
                          <FormControl>
                            <Select
                              value={selectedValue}
                              onValueChange={(value) => {
                                if (value === "create-new") {
                                  setIsCreateLandlordDialogOpen(true)
                                  return
                                }
                                if (value === "unlinked") {
                                  field.onChange("")
                                  editForm.setValue("landlordEmail", "")
                                  return
                                }
                                const selectedLandlord = getLandlordById(value)
                                if (selectedLandlord) {
                                  field.onChange(selectedLandlord.username || selectedLandlord.fullName || "")
                                  editForm.setValue("landlordEmail", selectedLandlord.username || "")
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select landlord" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unlinked">
                                  <span className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Unknown Landlord
                                  </span>
                                </SelectItem>
                                {isAdmin && (
                                  <SelectItem value="create-new">
                                    <span className="flex items-center gap-2">
                                      <Plus className="h-4 w-4" />
                                      Create New Landlord
                                    </span>
                                  </SelectItem>
                                )}
                                {Array.isArray(landlords) &&
                                  landlords.map((landlord: any) => (
                                    <SelectItem key={landlord.id} value={String(landlord.id)}>
                                      {landlord.username || landlord.fullName || landlord.id}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1"
                    disabled={updatePropertyMutation.isPending}
                    data-testid="button-save-property"
                  >
                    {updatePropertyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}

// Create Landlord Form Component
function CreateLandlordForm({ onSuccess, onCancel }: { onSuccess: (landlord: any) => void; onCancel: () => void }) {
  const { toast } = useToast()
  
  // Create validation schema for landlord form
  const landlordFormSchema = z.object({
    username: z.string().email("Invalid email address"),
    fullName: z.string().min(1, "Full name is required"),
    phone: z.string().min(1, "Phone is required"),
    idNumber: z.string().optional(),
  })
  
  const landlordForm = useForm({
    resolver: zodResolver(landlordFormSchema),
    defaultValues: {
      username: "",
      fullName: "",
      phone: "",
      idNumber: "",
    },
  })

  const createLandlordMutation = useMutation({
    mutationFn: async (data: { username: string; fullName: string; phone: string; idNumber?: string }) => {
      const response = await apiRequest("POST", "/api/landlords", {
        username: data.username,
        fullName: data.fullName,
        phone: data.phone,
        idNumber: data.idNumber || undefined,
      })
      return await response.json()
    },
    onSuccess: (landlord) => {
      queryClient.invalidateQueries({ queryKey: ["/api/landlords"] })
      onSuccess(landlord)
      landlordForm.reset()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create landlord",
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (data: any) => {
    createLandlordMutation.mutate(data)
  }

  return (
    <Form {...landlordForm}>
      <form onSubmit={landlordForm.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={landlordForm.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username (Email) <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="landlord@email.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={landlordForm.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  placeholder="Landlord Full Name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={landlordForm.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={landlordForm.control}
          name="idNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Identification Number (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="ID Number"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createLandlordMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createLandlordMutation.isPending}
          >
            {createLandlordMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Create Landlord
          </Button>
        </div>
      </form>
    </Form>
  )
}