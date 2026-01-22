import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertLeaseSchema } from "@shared/schema"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useParams } from "wouter"
import { useFilter } from "@/contexts/FilterContext"
import { ArrowLeft, User, Calendar, DollarSign, FileText, Plus, Eye, Edit, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export function LeaseManagement() {
  const { unitId } = useParams()
  const [, setLocation] = useLocation()
  const [isAddLeaseDialogOpen, setIsAddLeaseDialogOpen] = useState(false)
  const { toast } = useToast()
  const { selectedPropertyId, selectedLandlordId } = useFilter()

  // Fetch unit details
  const { data: unit, isLoading: unitLoading } = useQuery({
    queryKey: ["/api/units", unitId],
  })

  // Fetch all units to get unit details
  const { data: allUnits = [] } = useQuery({
    queryKey: ["/api/units", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const currentUnit = allUnits.find((u: any) => u.id === unitId)

  // Fetch property details
  const { data: properties = [] } = useQuery({
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

  const property = currentUnit ? properties.find((p: any) => p.id === currentUnit.propertyId) : null

  // Fetch tenants for lease assignment
  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch leases for this unit
  const { data: allLeases = [] } = useQuery({
    queryKey: ["/api/leases", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const unitLeases = allLeases.filter((lease: any) => lease.unitId === unitId)

  // Enhanced leases with tenant information
  const enhancedLeases = unitLeases.map((lease: any) => {
    const tenant = tenants.find((t: any) => t.id === lease.tenantId)
    return {
      ...lease,
      tenantName: tenant?.fullName || "Unknown Tenant",
      tenantEmail: tenant?.email || "",
      tenantPhone: tenant?.phone || ""
    }
  })

  // Form for adding new lease
  const form = useForm({
    resolver: zodResolver(insertLeaseSchema),
    defaultValues: {
      unitId: unitId || "",
      tenantId: "",
      startDate: "",
      endDate: "",
      rentAmount: "",
      depositAmount: "",
      waterRatePerUnit: "15.50",
    },
  })

  // Create lease mutation
  const createLeaseMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/leases", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      toast({
        title: "Success",
        description: "Lease created successfully",
      })
      setIsAddLeaseDialogOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lease",
        variant: "destructive",
      })
    },
  })

  const handleAddLease = (data: any) => {
    createLeaseMutation.mutate({
      ...data,
      unitId: unitId,
    })
  }

  if (unitLoading || !currentUnit) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
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
          onClick={() => setLocation(`/properties/${currentUnit.propertyId}`)}
          data-testid="button-back-to-property"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Property
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="lease-management-title">
            <FileText className="h-8 w-8" />
            Lease Management - Unit {currentUnit.unitNumber}
          </h1>
          <p className="text-muted-foreground">Manage occupancy and lease agreements for this unit</p>
        </div>
      </div>

      {/* Unit Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Unit Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Property</Label>
              <p className="font-medium">{property?.name || "Unknown Property"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Unit Number</Label>
              <p className="font-medium">{currentUnit.unitNumber}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Unit Type</Label>
              <p className="font-medium capitalize">{currentUnit.type}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Monthly Rent</Label>
              <p className="font-medium">KSh {parseFloat(currentUnit.rentAmount).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <Badge variant={currentUnit.status === 'occupied' ? 'default' : 'outline'}>
                {currentUnit.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Lease Agreements ({enhancedLeases.length})
            </CardTitle>
            <CardDescription>
              Manage lease agreements and tenant assignments for this unit
            </CardDescription>
          </div>
          <Dialog open={isAddLeaseDialogOpen} onOpenChange={setIsAddLeaseDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-lease">
                <Plus className="h-4 w-4 mr-2" />
                New Lease
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Lease</DialogTitle>
                <DialogDescription>
                  Create a new lease agreement for Unit {currentUnit.unitNumber}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddLease)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tenant">
                              <SelectValue placeholder="Select tenant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tenants.map((tenant: any) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                {tenant.fullName} ({tenant.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              data-testid="input-start-date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              data-testid="input-end-date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent (KSh)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder={currentUnit.rentAmount}
                              data-testid="input-rent-amount"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="depositAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deposit (KSh)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50000"
                              data-testid="input-deposit-amount"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="waterRatePerUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Water Rate per Unit (KSh)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            data-testid="input-water-rate"
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
                      onClick={() => setIsAddLeaseDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createLeaseMutation.isPending}>
                      Create Lease
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {enhancedLeases.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No lease agreements</h3>
              <p className="text-muted-foreground mb-4">
                This unit is currently vacant. Create a lease agreement to assign a tenant.
              </p>
              <Button onClick={() => setIsAddLeaseDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Lease
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {enhancedLeases.map((lease: any) => (
                <Card key={lease.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium" data-testid={`tenant-name-${lease.id}`}>
                          {lease.tenantName}
                        </h4>
                        <p className="text-sm text-muted-foreground">{lease.tenantEmail}</p>
                        {lease.tenantPhone && (
                          <p className="text-sm text-muted-foreground">{lease.tenantPhone}</p>
                        )}
                      </div>
                      <Badge 
                        variant={lease.status === 'active' ? 'default' : 'outline'}
                        data-testid={`lease-status-${lease.id}`}
                      >
                        {lease.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Start Date</Label>
                        <p className="font-medium">{new Date(lease.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">End Date</Label>
                        <p className="font-medium">{new Date(lease.endDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Monthly Rent</Label>
                        <p className="font-medium">KSh {parseFloat(lease.rentAmount).toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Deposit</Label>
                        <p className="font-medium">KSh {parseFloat(lease.depositAmount).toLocaleString()}</p>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Lease Details",
                            description: `Viewing details for lease ${lease.id}`,
                          })
                        }}
                        data-testid={`button-view-lease-${lease.id}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Edit Lease",
                            description: `Editing lease ${lease.id}`,
                          })
                        }}
                        data-testid={`button-edit-lease-${lease.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Terminate Lease",
                            description: `Terminating lease ${lease.id}`,
                          })
                        }}
                        data-testid={`button-terminate-lease-${lease.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Terminate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}