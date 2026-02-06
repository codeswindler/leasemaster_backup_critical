import { useMemo, useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { 
  Users, 
  Plus, 
  Edit,
  Trash,
  Shield,
  Eye,
  EyeOff
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useFilter } from "@/contexts/FilterContext"
import { useLocation } from "wouter"

export function UserManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const { toast } = useToast()
  const { selectedPropertyId, selectedLandlordId } = useFilter()
  const [, setLocation] = useLocation()
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
    permissions: [] as string[],
    propertyIds: [] as string[],
    region: "Africa/Nairobi", // Default to Nairobi, Kenya
    timezone: "Africa/Nairobi"
  })
  const landlordSelected = !!selectedLandlordId && selectedLandlordId !== "all"
  const propertySelected = !!selectedPropertyId && selectedPropertyId !== "all"
  const hasAssignedProperties = newUser.propertyIds.length > 0
  const actionsDisabled = !hasAssignedProperties

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/check")
      return await response.json()
    },
  })
  const currentRole = (authData?.user?.role || "").toLowerCase()
  const isAdmin = currentRole === "admin" || currentRole === "super_admin" || currentRole === "administrator"
  const isLandlord = currentRole === "landlord" || currentRole === "client"
  const currentUserId = authData?.user?.id ? String(authData.user.id) : null
  const landlordIdToUse =
    landlordSelected ? String(selectedLandlordId) : (isLandlord ? currentUserId : null)
  const showLandlordsOnly = isAdmin && !landlordSelected && !propertySelected

  const { data: landlordUser } = useQuery({
    queryKey: ["/api/users", "landlord", landlordIdToUse],
    queryFn: async () => {
      if (!landlordIdToUse) return null
      const response = await apiRequest("GET", `/api/users/${landlordIdToUse}`)
      return await response.json()
    },
    enabled: !!landlordIdToUse,
  })

  // Fetch real user data from API
  const { data: apiUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users", selectedPropertyId, selectedLandlordId, currentRole],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId && selectedPropertyId !== "all") {
        params.append("propertyId", selectedPropertyId)
      }
      if (selectedLandlordId && selectedLandlordId !== "all") {
        params.append("landlordId", selectedLandlordId)
      }
      const url = `/api/users${params.toString() ? `?${params}` : ""}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isAdmin || isLandlord || landlordSelected || propertySelected,
  })

  const { data: availableProperties = [] } = useQuery({
    queryKey: ["/api/properties", selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLandlordId && selectedLandlordId !== "all") {
        params.append("landlordId", selectedLandlordId)
      }
      const url = `/api/properties${params.toString() ? `?${params}` : ""}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: landlordSelected,
  })
  
  // Enhanced users with role/permission info (since basic users table only has username/password)
  const users = apiUsers.map((user: any) => {
    let permissions: string[] = []
    if (Array.isArray(user.permissions)) {
      permissions = user.permissions
    } else if (typeof user.permissions === "string" && user.permissions.trim().length > 0) {
      try {
        const parsed = JSON.parse(user.permissions)
        if (Array.isArray(parsed)) permissions = parsed
      } catch {
        permissions = []
      }
    }
    const lastLogin = user.last_login || user.lastLogin
    const otpEnabled =
      typeof user.otp_enabled === "number"
        ? user.otp_enabled === 1
        : typeof user.otpEnabled === "boolean"
          ? user.otpEnabled
          : true
    return {
      id: user.id,
      name: user.full_name || user.fullName || user.username,
      email: user.email || user.username,
      role: user.role || "Administrator",
      status: user.status === 0 || user.status === "inactive" ? "inactive" : "active",
      lastLogin: lastLogin ? new Date(lastLogin).toLocaleString() : "—",
      permissions,
      otpEnabled,
      landlordId: user.landlord_id ?? user.landlordId
    }
  })
  const ensureUserIncluded = (list: any[], user: any | null) => {
    if (!user) return list
    const exists = list.some((item: any) => String(item.id) === String(user.id))
    if (exists) return list
    const mapped = {
      id: user.id,
      name: user.full_name || user.fullName || user.username,
      email: user.email || user.username,
      role: user.role || "Administrator",
      status: user.status === 0 || user.status === "inactive" ? "inactive" : "active",
      lastLogin: user.last_login ? new Date(user.last_login).toLocaleString() : "—",
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      otpEnabled: typeof user.otp_enabled === "number" ? user.otp_enabled === 1 : true
    }
    return [mapped, ...list]
  }

  const baseLandlordsOnly = users.filter((user: any) => {
    const role = String(user.role || "").toLowerCase()
    if (role !== "landlord" && role !== "client") return false
    const landlordId = user.landlord_id ?? user.landlordId
    if (landlordId === null || landlordId === undefined) return false
    return String(landlordId) === String(user.id)
  })

  let visibleUsers = showLandlordsOnly ? baseLandlordsOnly : users

  if (showLandlordsOnly && currentUserId) {
    const currentAdmin = users.find((user: any) => String(user.id) === String(currentUserId)) || null
    visibleUsers = ensureUserIncluded(visibleUsers, currentAdmin)
  }

  if (!showLandlordsOnly && landlordIdToUse) {
    visibleUsers = ensureUserIncluded(visibleUsers, landlordUser || null)
  }

  const permissionCategories = [
    {
      id: "dashboard",
      name: "Dashboard",
      description: "View high-level metrics and summaries",
      permissions: [{ id: "dashboard.view", name: "View dashboard" }],
    },
    {
      id: "properties",
      name: "Properties",
      description: "Create, edit, and manage properties",
      permissions: [
        { id: "properties.view", name: "View properties" },
        { id: "properties.create", name: "Create properties" },
        { id: "properties.edit", name: "Edit properties" },
        { id: "properties.enable", name: "Enable properties" },
        { id: "properties.disable", name: "Disable properties" },
        { id: "properties.delete", name: "Delete properties" },
      ],
    },
    {
      id: "landlords",
      name: "Landlords",
      description: "Manage landlord accounts and access",
      permissions: [
        { id: "landlords.view", name: "View landlords" },
        { id: "landlords.create", name: "Create landlords" },
        { id: "landlords.edit", name: "Edit landlords" },
        { id: "landlords.delete", name: "Delete landlords" },
        { id: "landlords.send_login", name: "Send login details" },
      ],
    },
    {
      id: "house_types",
      name: "House Types",
      description: "Manage unit/house categories",
      permissions: [
        { id: "house_types.view", name: "View house types" },
        { id: "house_types.create", name: "Create house types" },
        { id: "house_types.edit", name: "Edit house types" },
        { id: "house_types.delete", name: "Delete house types" },
      ],
    },
    {
      id: "units",
      name: "Units",
      description: "Manage units across properties",
      permissions: [
        { id: "units.view", name: "View units" },
        { id: "units.create", name: "Create units" },
        { id: "units.edit", name: "Edit units" },
        { id: "units.delete", name: "Delete units" },
      ],
    },
    {
      id: "tenants",
      name: "Tenants",
      description: "Manage tenant profiles",
      permissions: [
        { id: "tenants.view", name: "View tenants" },
        { id: "tenants.create", name: "Create tenants" },
        { id: "tenants.edit", name: "Edit tenants" },
        { id: "tenants.delete", name: "Delete tenants" },
      ],
    },
    {
      id: "tenant_portal",
      name: "Tenant Portal Access",
      description: "Generate and send tenant portal credentials",
      permissions: [
        { id: "tenants.send_login", name: "Send tenant login details" },
        { id: "tenants.bulk_send_login", name: "Bulk send tenant logins" },
      ],
    },
    {
      id: "leases",
      name: "Leases",
      description: "Create, update, and terminate leases",
      permissions: [
        { id: "leases.view", name: "View leases" },
        { id: "leases.create", name: "Create leases" },
        { id: "leases.edit", name: "Edit leases" },
        { id: "leases.terminate", name: "Terminate leases" },
        { id: "leases.delete", name: "Delete leases" },
        { id: "leases.view_balance", name: "View lease balances" },
      ],
    },
    {
      id: "invoices",
      name: "Invoices",
      description: "Manage invoicing and approvals",
      permissions: [
        { id: "invoices.view", name: "View invoices" },
        { id: "invoices.create", name: "Create invoices" },
        { id: "invoices.edit", name: "Edit invoices" },
        { id: "invoices.approve", name: "Approve invoices" },
        { id: "invoices.send", name: "Send invoices" },
        { id: "invoices.generate", name: "Generate monthly invoices" },
        { id: "invoices.delete", name: "Delete invoices" },
      ],
    },
    {
      id: "payments",
      name: "Payments & Receipts",
      description: "Record and manage payments",
      permissions: [
        { id: "payments.view", name: "View payments" },
        { id: "payments.receive", name: "Receive payments" },
        { id: "payments.edit", name: "Edit payments" },
        { id: "payments.delete", name: "Delete payments" },
        { id: "payments.export_receipt", name: "Export receipts" },
      ],
    },
    {
      id: "water_readings",
      name: "Water Readings",
      description: "Record and analyze water readings",
      permissions: [
        { id: "water_readings.view", name: "View readings" },
        { id: "water_readings.create", name: "Record readings" },
        { id: "water_readings.edit", name: "Edit readings" },
        { id: "water_readings.delete", name: "Delete readings" },
        { id: "water_readings.bulk_entry", name: "Bulk entry" },
      ],
    },
    {
      id: "charge_codes",
      name: "Charge Codes",
      description: "Manage charge codes and billing items",
      permissions: [
        { id: "charge_codes.view", name: "View charge codes" },
        { id: "charge_codes.create", name: "Create charge codes" },
        { id: "charge_codes.edit", name: "Edit charge codes" },
        { id: "charge_codes.delete", name: "Delete charge codes" },
      ],
    },
    {
      id: "messaging",
      name: "Messaging",
      description: "Send and manage messages",
      permissions: [
        { id: "messaging.view", name: "View messages" },
        { id: "messaging.create", name: "Create messages" },
        { id: "messaging.edit", name: "Edit messages" },
        { id: "messaging.delete", name: "Delete messages" },
        { id: "messaging.send_sms", name: "Send SMS" },
        { id: "messaging.send_email", name: "Send email" },
        { id: "messaging.bulk_send", name: "Send bulk messages" },
        { id: "messaging.templates_manage", name: "Manage templates" },
        { id: "messaging.export", name: "Export message logs" },
      ],
    },
    {
      id: "maintenance",
      name: "Maintenance",
      description: "Manage maintenance requests",
      permissions: [
        { id: "maintenance.view", name: "View maintenance requests" },
        { id: "maintenance.create", name: "Create maintenance requests" },
        { id: "maintenance.edit", name: "Edit maintenance requests" },
        { id: "maintenance.delete", name: "Delete maintenance requests" },
      ],
    },
    {
      id: "reports",
      name: "Reports",
      description: "Generate and export reports",
      permissions: [
        { id: "reports.view", name: "View reports" },
        { id: "reports.export", name: "Export reports" },
      ],
    },
    {
      id: "activity_logs",
      name: "Operational Log",
      description: "Audit trail of system activity",
      permissions: [{ id: "activity_logs.view", name: "View activity logs" }],
    },
    {
      id: "users",
      name: "User Management",
      description: "Manage system users and access",
      permissions: [
        { id: "users.view", name: "View users" },
        { id: "users.create", name: "Create users" },
        { id: "users.edit", name: "Edit users" },
        { id: "users.disable", name: "Disable users" },
        { id: "users.delete", name: "Delete users" },
        { id: "users.manage_permissions", name: "Manage permissions" },
        { id: "users.send_login", name: "Send login details" },
        { id: "users.reset_password", name: "Reset passwords" },
        { id: "users.toggle_otp", name: "Toggle OTP" },
      ],
    },
    {
      id: "settings",
      name: "System Settings",
      description: "Configure system and SMS settings",
      permissions: [
        { id: "settings.view", name: "View settings" },
        { id: "settings.edit", name: "Edit settings" },
        { id: "settings.sms_settings", name: "Manage SMS settings" },
      ],
    },
    {
      id: "data_import",
      name: "Data Import",
      description: "Upload or import data",
      permissions: [{ id: "data_import.upload", name: "Upload/import data" }],
    },
  ]

  const allPermissionIds = useMemo(
    () => permissionCategories.flatMap((category) => category.permissions.map((permission) => permission.id)),
    []
  )

  const permissionCategoryAliases: Record<string, string[]> = {
    properties: ["properties"],
    tenants: ["tenants"],
    accounting: ["invoices", "payments", "receipts", "bills", "water_readings"],
    reports: ["reports"],
    messaging: ["messaging"],
    users: ["users"],
    settings: ["settings"],
  }

  const addUserMutation = useMutation({
    mutationFn: async () => {
      if (actionsDisabled) {
        throw new Error("Assign at least one property before adding users.")
      }
      const response = await apiRequest("POST", "/api/users", {
        username: newUser.email || newUser.name,
        fullName: newUser.name,
        role: newUser.role || "Administrator",
        password: newUser.password,
        permissions: newUser.permissions,
        propertyIds: newUser.propertyIds,
        landlordId: landlordIdToUse,
        region: newUser.region,
        timezone: newUser.timezone,
      })
      return await response.json()
    },
    onSuccess: (data: any) => {
      toast({
        title: "User created",
        description: data?.generatedPassword
          ? `Temporary password: ${data.generatedPassword}`
          : "User created successfully.",
      })
      queryClient.invalidateQueries({ queryKey: ["/api/users"] })
      setNewUser({
        name: "",
        email: "",
        role: "",
        password: "",
        permissions: [],
        propertyIds: [],
        region: "Africa/Nairobi",
        timezone: "Africa/Nairobi",
      })
      setIsAddDialogOpen(false)
    },
    onError: (error: any) => {
      toast({
        title: "User creation failed",
        description: error?.message || "Unable to create user.",
        variant: "destructive",
      })
    },
  })

  const handleAddUser = () => addUserMutation.mutate()

  const handleTogglePermission = (permissionId: string) => {
    setNewUser(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const handleToggleProperty = (propertyId: string) => {
    setNewUser(prev => ({
      ...prev,
      propertyIds: prev.propertyIds.includes(propertyId)
        ? prev.propertyIds.filter(id => id !== propertyId)
        : [...prev.propertyIds, propertyId]
    }))
  }

  const handleSelectAllPermissions = () => {
    setNewUser((prev) => ({
      ...prev,
      permissions: allPermissionIds,
    }))
  }

  const handleClearAllPermissions = () => {
    setNewUser((prev) => ({
      ...prev,
      permissions: [],
    }))
  }
  const handleToggleCategory = (categoryId: string) => {
    const category = permissionCategories.find((item) => item.id === categoryId)
    if (!category) return
    const permissionIds = category.permissions.map((permission) => permission.id)
    const hasAll = permissionIds.every((permissionId) => newUser.permissions.includes(permissionId))
    setNewUser(prev => {
      if (hasAll) {
        return {
          ...prev,
          permissions: prev.permissions.filter((permission) => !permissionIds.includes(permission))
        }
      }
      const merged = new Set(prev.permissions)
      permissionIds.forEach((permission) => merged.add(permission))
      return {
        ...prev,
        permissions: Array.from(merged)
      }
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "landlord":
      case "client":
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Landlord</Badge>
      case "Administrator":
        return <Badge variant="default" className="bg-red-100 text-red-800">Administrator</Badge>
      case "Manager":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Manager</Badge>
      case "Accountant":
        return <Badge variant="default" className="bg-green-100 text-green-800">Accountant</Badge>
      case "Support":
        return <Badge variant="outline">Support</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case "inactive":
        return <Badge variant="destructive">Inactive</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!landlordSelected && !isAdmin) {
    return (
      <div className="p-6">
        <Card className="vibrant-panel">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Select a client to manage users.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="user-management-title">User Management</h1>
          <p className="text-muted-foreground">Manage system users and their permissions</p>
          {isAdmin && !landlordSelected && (
            <p className="text-xs text-amber-600 mt-1">Select a landlord to manage staff users.</p>
          )}
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="button-add-user"
              disabled={isAdmin && !landlordSelected}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new system user and assign permissions
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-user-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-user-email"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger data-testid="select-user-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Administrator">Administrator</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Accountant">Accountant</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    data-testid="input-user-password"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region">Region / Timezone</Label>
                  <Select 
                    value={newUser.region} 
                    onValueChange={(value) => {
                      // Map region to timezone
                      const regionToTimezone: Record<string, string> = {
                        "East Africa": "Africa/Nairobi",
                        "West Africa": "Africa/Lagos",
                        "Southern Africa": "Africa/Johannesburg",
                        "North Africa": "Africa/Cairo",
                        "Central Africa": "Africa/Kinshasa",
                        "Europe": "Europe/London",
                        "Asia": "Asia/Dubai",
                        "Americas": "America/New_York",
                      };
                      setNewUser(prev => ({ 
                        ...prev, 
                        region: value,
                        timezone: regionToTimezone[value] || "Africa/Nairobi"
                      }));
                    }}
                  >
                    <SelectTrigger data-testid="select-user-region">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="East Africa">East Africa (Africa/Nairobi - EAT)</SelectItem>
                      <SelectItem value="West Africa">West Africa (Africa/Lagos - WAT)</SelectItem>
                      <SelectItem value="Southern Africa">Southern Africa (Africa/Johannesburg - SAST)</SelectItem>
                      <SelectItem value="North Africa">North Africa (Africa/Cairo - EET)</SelectItem>
                      <SelectItem value="Central Africa">Central Africa (Africa/Kinshasa - WAT)</SelectItem>
                      <SelectItem value="Europe">Europe (Europe/London - GMT/BST)</SelectItem>
                      <SelectItem value="Asia">Asia (Asia/Dubai - GST)</SelectItem>
                      <SelectItem value="Americas">Americas (America/New_York - EST/EDT)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Determines timezone for records and reports. Default: Nairobi, Kenya (EAT)
                  </p>
                </div>
                <div>
                  <Label htmlFor="timezone-display">Selected Timezone</Label>
                  <Input
                    id="timezone-display"
                    value={newUser.timezone}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Assigned Properties</Label>
                {!landlordSelected ? (
                  <p className="text-sm text-muted-foreground">
                    Select a landlord to load available properties.
                  </p>
                ) : availableProperties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No properties available for assignment.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {availableProperties.map((property: any) => (
                      <div key={property.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`property-${property.id}`}
                          checked={newUser.propertyIds.includes(String(property.id))}
                          onCheckedChange={() => handleToggleProperty(String(property.id))}
                          data-testid={`checkbox-property-${property.id}`}
                        />
                        <Label htmlFor={`property-${property.id}`} className="text-sm">
                          {property.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  At least one property must be assigned.
                </p>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <Label className="text-base font-medium">Permissions</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleSelectAllPermissions}>
                      Select all
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleClearAllPermissions}>
                      Clear all
                    </Button>
                  </div>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {permissionCategories.map((category) => {
                    const permissionIds = category.permissions.map((permission) => permission.id)
                    const categoryChecked = permissionIds.every((permissionId) =>
                      newUser.permissions.includes(permissionId)
                    )
                    return (
                      <div key={category.id} className="border rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={category.id}
                            checked={categoryChecked}
                            onCheckedChange={() => handleToggleCategory(category.id)}
                            data-testid={`checkbox-permission-${category.id}`}
                          />
                          <Label htmlFor={category.id} className="text-sm font-medium">
                            {category.name}
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {category.description}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                          {category.permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={permission.id}
                                checked={newUser.permissions.includes(permission.id)}
                                onCheckedChange={() => handleTogglePermission(permission.id)}
                                data-testid={`checkbox-permission-${permission.id}`}
                              />
                              <Label htmlFor={permission.id} className="text-sm">
                                {permission.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                data-testid="button-submit-user"
                disabled={addUserMutation.isPending || actionsDisabled}
              >
                Add User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card className="vibrant-panel">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>System Users</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPasswords(!showPasswords)}
              data-testid="button-toggle-passwords"
            >
              {showPasswords ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPasswords ? "Hide" : "Show"} Passwords
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : visibleUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    {showLandlordsOnly
                      ? "No landlords found."
                      : "No users found for the selected property."}
                  </TableCell>
                </TableRow>
              ) : visibleUsers.map((user: any) => (
                <TableRow key={user.id} className="hover-elevate">
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {showPasswords && (
                        <p className="text-xs font-mono text-muted-foreground">
                          Password: ********
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-sm">{user.lastLogin}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const permissionSet = new Set(
                          user.permissions.flatMap((permissionId: string) => {
                            if (permissionCategoryAliases[permissionId]) {
                              return permissionCategoryAliases[permissionId].map((categoryId) => {
                                const category = permissionCategories.find((item) => item.id === categoryId)
                                return category?.name || categoryId
                              })
                            }
                            const category = permissionCategories.find((item) =>
                              permissionId.startsWith(`${item.id}.`)
                            )
                            return category?.name || permissionId
                          })
                        )
                        return Array.from(permissionSet) as string[]
                      })()
                        .slice(0, 3)
                        .map((permission: string) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {(() => {
                        const permissionSet = new Set(
                          user.permissions.flatMap((permissionId: string) => {
                            if (permissionCategoryAliases[permissionId]) {
                              return permissionCategoryAliases[permissionId].map((categoryId) => {
                                const category = permissionCategories.find((item) => item.id === categoryId)
                                return category?.name || categoryId
                              })
                            }
                            const category = permissionCategories.find((item) =>
                              permissionId.startsWith(`${item.id}.`)
                            )
                            return category?.name || permissionId
                          })
                        )
                        return permissionSet.size
                      })() > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-edit-user-${user.id}`}
                        onClick={() => setLocation(`/users/${user.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-permissions-${user.id}`}
                        onClick={() => setLocation(`/users/${user.id}`)}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      {user.role !== "Administrator" && (
                        <Button variant="ghost" size="sm" data-testid={`button-delete-user-${user.id}`}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}



