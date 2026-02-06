import { useQuery, useMutation } from "@tanstack/react-query"
import { useRef } from "react"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function TerminatedLeases() {
  const terminatedLeaseVariants = [
    "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-blue-900/50",
    "bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-emerald-900/50",
    "bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-rose-900/50",
    "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-amber-900/50",
    "bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-violet-900/50",
    "bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-cyan-900/50",
  ]
  const terminatedLeaseSeed = useRef(Math.floor(Math.random() * terminatedLeaseVariants.length))
  const { selectedPropertyId, selectedLandlordId } = useFilter()
  const { toast } = useToast()
  const actionsDisabled = !selectedPropertyId
  const effectivePropertyId = selectedPropertyId && selectedPropertyId !== "all" ? selectedPropertyId : null
  const normalizeStatus = (status: any) => String(status ?? "").trim().toLowerCase()

  const { data: leases = [] } = useQuery({
    queryKey: ["/api/leases", effectivePropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (effectivePropertyId) params.append("propertyId", effectivePropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units", effectivePropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (effectivePropertyId) params.append("propertyId", effectivePropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants", effectivePropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (effectivePropertyId) params.append("propertyId", effectivePropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties", selectedLandlordId, effectivePropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (effectivePropertyId) params.append("propertyId", effectivePropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const normalizedLeases = leases.map((lease: any) => ({
    id: lease.id,
    unitId: lease.unitId ?? lease.unit_id,
    tenantId: lease.tenantId ?? lease.tenant_id,
    startDate: lease.startDate ?? lease.start_date,
    endDate: lease.endDate ?? lease.end_date,
    status: normalizeStatus(lease.status),
  })).filter((lease: any) => lease.status === "terminated")

  const normalizedUnits = units.map((unit: any) => ({
    id: unit.id,
    unitNumber: unit.unitNumber ?? unit.unit_number,
    propertyId: unit.propertyId ?? unit.property_id,
  }))

  const normalizedTenants = tenants.map((tenant: any) => ({
    id: tenant.id,
    fullName: tenant.fullName ?? tenant.full_name,
  }))

  const normalizedProperties = properties.map((property: any) => ({
    id: property.id,
    name: property.name,
  }))

  const propertyFilterId = effectivePropertyId

  const filteredLeases = normalizedLeases.filter((lease: any) => {
    if (!propertyFilterId) return true
    const unit = normalizedUnits.find((u: any) => u.id === lease.unitId)
    return unit?.propertyId === propertyFilterId
  })

  const reActivateMutation = useMutation({
    mutationFn: async (leaseId: string) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header to reactivate leases.")
      }
      const response = await apiRequest("PUT", `/api/leases/${leaseId}`, {
        status: "active",
      })
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      toast({
        title: "Lease reactivated",
        description: "The lease is active again.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reactivate",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    },
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Terminated Leases</h1>
        <p className="text-muted-foreground">Review terminated leases and reactivate when needed</p>
      </div>

      <Card className={`vibrant-card ${terminatedLeaseVariants[terminatedLeaseSeed.current % terminatedLeaseVariants.length]}`}>
        <CardHeader>
          <CardTitle>Terminated Leases</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Tenant</TableHead>
                <TableHead className="w-32">Unit</TableHead>
                <TableHead>Property</TableHead>
                <TableHead className="w-32">End Date</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeases.map((lease: any) => {
                const unit = normalizedUnits.find((u: any) => u.id === lease.unitId)
                const tenant = normalizedTenants.find((t: any) => t.id === lease.tenantId)
                const property = normalizedProperties.find((p: any) => p.id === unit?.propertyId)

                return (
                  <TableRow key={lease.id} className="text-red-600 dark:text-red-400">
                    <TableCell className="font-medium">{tenant?.fullName || "Unknown"}</TableCell>
                    <TableCell>{unit?.unitNumber || "Unknown"}</TableCell>
                    <TableCell>{property?.name || "Unknown"}</TableCell>
                    <TableCell>{lease.endDate ? new Date(lease.endDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">terminated</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={actionsDisabled || reActivateMutation.isPending}
                        onClick={() => reActivateMutation.mutate(lease.id)}
                      >
                        Reactivate
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {filteredLeases.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">
              {propertyFilterId
                ? "No terminated leases for the selected property. Switch to View All Properties to see all terminated leases."
                : "No terminated leases found."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
