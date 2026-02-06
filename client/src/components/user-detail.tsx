import { useEffect, useMemo, useState } from "react"
import { useRoute, useLocation } from "wouter"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, KeyRound, Mail, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

const permissionCategories = [
  {
    id: "dashboard",
    name: "Dashboard",
    permissions: [{ id: "dashboard.view", name: "View dashboard" }],
  },
  {
    id: "properties",
    name: "Properties",
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
    permissions: [
      { id: "tenants.send_login", name: "Send tenant login details" },
      { id: "tenants.bulk_send_login", name: "Bulk send tenant logins" },
    ],
  },
  {
    id: "leases",
    name: "Leases",
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
    permissions: [
      { id: "reports.view", name: "View reports" },
      { id: "reports.export", name: "Export reports" },
    ],
  },
  {
    id: "activity_logs",
    name: "Operational Log",
    permissions: [{ id: "activity_logs.view", name: "View activity logs" }],
  },
  {
    id: "users",
    name: "User Management",
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
    permissions: [
      { id: "settings.view", name: "View settings" },
      { id: "settings.edit", name: "Edit settings" },
      { id: "settings.sms_settings", name: "Manage SMS settings" },
    ],
  },
  {
    id: "data_import",
    name: "Data Import",
    permissions: [{ id: "data_import.upload", name: "Upload/import data" }],
  },
]

const permissionCategoryAliases: Record<string, string[]> = {
  properties: ["properties"],
  tenants: ["tenants"],
  accounting: ["invoices", "payments", "receipts", "bills", "water_readings"],
  reports: ["reports"],
  messaging: ["messaging"],
  users: ["users"],
  settings: ["settings"],
}

export function UserDetail() {
  const [match, params] = useRoute("/users/:id")
  const userId = params?.id
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [assignedPropertyIds, setAssignedPropertyIds] = useState<string[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(permissionCategories.map((category) => [category.id, true]))
  )
  const [otpEnabled, setOtpEnabled] = useState(true)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [editUserDraft, setEditUserDraft] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  })
  const allPermissionIds = useMemo(
    () => permissionCategories.flatMap((category) => category.permissions.map((permission) => permission.id)),
    []
  )

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${userId}`)
      return await response.json()
    },
    enabled: !!userId,
  })

  const landlordScopeId = useMemo(() => {
    if (!user) return null
    const role = String(user.role || "").toLowerCase()
    if (role === "landlord" || role === "client") {
      return String(user.id)
    }
    if (user.landlord_id) {
      return String(user.landlord_id)
    }
    return null
  }, [user])

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties", landlordScopeId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (landlordScopeId) {
        params.append("landlordId", landlordScopeId)
      }
      const url = `/api/properties${params.toString() ? `?${params}` : ""}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: !!user,
  })

  const propertyName = useMemo(() => {
    const propertyId = user?.property_id || user?.propertyId
    const matchProperty = (properties as any[]).find((p: any) => p.id === propertyId)
    return matchProperty?.name || "—"
  }, [properties, user])

  const displayRole = useMemo(() => {
    const role = String(user?.role || "").toLowerCase()
    if (role === "landlord" || role === "client") {
      return "Landlord"
    }
    if (role === "admin" || role === "super_admin" || role === "administrator") {
      return "Admin"
    }
    return user?.role || "Admin"
  }, [user])

  useEffect(() => {
    if (!user) return
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
    const expandedPermissions = new Set<string>()
    permissions.forEach((permission) => {
      const aliasedCategoryIds = permissionCategoryAliases[permission]
      if (aliasedCategoryIds) {
        aliasedCategoryIds.forEach((categoryId) => {
          const category = permissionCategories.find((item) => item.id === categoryId)
          category?.permissions.forEach((child) => expandedPermissions.add(child.id))
        })
        return
      }
      const category = permissionCategories.find((item) => item.id === permission)
      if (category) {
        category.permissions.forEach((child) => expandedPermissions.add(child.id))
      } else {
        expandedPermissions.add(permission)
      }
    })
    setSelectedPermissions(Array.from(expandedPermissions))
    const otpRaw = user.otp_enabled ?? user.otpEnabled
    if (typeof otpRaw === "number") {
      setOtpEnabled(otpRaw === 1)
    } else if (typeof otpRaw === "string") {
      setOtpEnabled(Number(otpRaw) === 1)
    } else if (typeof otpRaw === "boolean") {
      setOtpEnabled(otpRaw)
    }
    if (typeof user.alerts_enabled === "number") {
      setAlertsEnabled(user.alerts_enabled === 1)
    } else if (typeof user.alertsEnabled === "boolean") {
      setAlertsEnabled(user.alertsEnabled)
    }
    if (Array.isArray(user.propertyIds)) {
      setAssignedPropertyIds(user.propertyIds.map((id: any) => String(id)))
    }
    setEditUserDraft({
      name: user.full_name || user.fullName || user.username || "",
      email: user.username || "",
      phone: user.phone || "",
      role: user.role || "",
    })
  }, [user])
  const updateUserInfoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/users/${userId}`, {
        fullName: editUserDraft.name,
        username: editUserDraft.email,
        phone: editUserDraft.phone,
        role: editUserDraft.role,
      })
      return await response.json()
    },
    onSuccess: () => {
      toast({ title: "User updated" })
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] })
      setIsEditingUser(false)
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update user",
        description: error?.message || "Unable to save user details.",
        variant: "destructive",
      })
    },
  })

  const handleSaveUserInfo = () => updateUserInfoMutation.mutate()


  const updatePermissionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/users/${userId}`, {
        permissions: selectedPermissions,
      })
      return await response.json()
    },
    onSuccess: () => {
      toast({ title: "Permissions updated" })
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update permissions",
        description: error?.message || "Unable to save permissions.",
        variant: "destructive",
      })
    },
  })

  const updateAssignedPropertiesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/users/${userId}`, {
        propertyIds: assignedPropertyIds,
      })
      return await response.json()
    },
    onSuccess: () => {
      toast({ title: "Assigned properties updated" })
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update properties",
        description: error?.message || "Unable to save assigned properties.",
        variant: "destructive",
      })
    },
  })

  const sendLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/users/${userId}/send-login-details`)
      return await response.json()
    },
    onSuccess: (data: any) => {
      const channels: string[] = []
      if (data?.sent?.sms) channels.push("SMS")
      if (data?.sent?.email) channels.push("Email")
      const channelLabel = channels.length ? channels.join(" & ") : "no channels"
      const tempPassword = data?.generatedPassword || ""
      toast({
        title: "Password generated",
        description: (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span>
                Temporary password:{" "}
                <span className="font-mono font-semibold select-text">{tempPassword || "—"}</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!tempPassword) return
                  try {
                    await navigator.clipboard.writeText(tempPassword)
                    toast({ title: "Copied", description: "Password copied to clipboard." })
                  } catch {
                    toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" })
                  }
                }}
                disabled={!tempPassword}
              >
                Copy
              </Button>
            </div>
            <div>Sent via {channelLabel}</div>
          </div>
        ),
        duration: 1000000,
      })
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate password",
        description: error?.message || "Unable to send password.",
        variant: "destructive",
      })
    },
  })

  const otpToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest("POST", `/api/users/${userId}/otp`, { enabled })
      return await response.json()
    },
    onSuccess: (_data, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] })
      toast({
        title: "OTP updated",
        description: enabled ? "OTP enabled." : "OTP disabled.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "OTP update failed",
        description: error?.message || "Unable to update OTP settings.",
        variant: "destructive",
      })
    },
  })

  const alertsToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest("PUT", `/api/users/${userId}`, {
        alertsEnabled: enabled,
      })
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] })
      toast({
        title: "Alert preference saved",
        description: alertsEnabled ? "Alerts enabled." : "Alerts disabled.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update alerts",
        description: error?.message || "Unable to update alert preference.",
        variant: "destructive",
      })
    },
  })

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((p) => p !== permissionId) : [...prev, permissionId]
    )
  }

  const toggleAssignedProperty = (propertyId: string) => {
    setAssignedPropertyIds((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    )
  }

  const selectAllPermissions = () => {
    setSelectedPermissions(allPermissionIds)
  }

  const clearAllPermissions = () => {
    setSelectedPermissions([])
  }

  const toggleCategory = (categoryId: string) => {
    const category = permissionCategories.find((item) => item.id === categoryId)
    if (!category) return
    const categoryPermissionIds = category.permissions.map((permission) => permission.id)
    const hasAll = categoryPermissionIds.every((permissionId) =>
      selectedPermissions.includes(permissionId)
    )
    setSelectedPermissions((prev) => {
      if (hasAll) {
        return prev.filter((permission) => !categoryPermissionIds.includes(permission))
      }
      const merged = new Set(prev)
      categoryPermissionIds.forEach((permissionId) => merged.add(permissionId))
      return Array.from(merged)
    })
  }

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

  const handleOtpToggle = (nextValue: boolean) => {
    setOtpEnabled(nextValue)
    otpToggleMutation.mutate(nextValue)
  }

  const handleAlertsToggle = () => {
    const nextValue = !alertsEnabled
    setAlertsEnabled(nextValue)
    alertsToggleMutation.mutate(nextValue)
  }

  if (!match) return null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" className="pl-0" onClick={() => setLocation("/users")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to users
          </Button>
          <h1 className="text-3xl font-bold mt-2">User Profile</h1>
          <p className="text-muted-foreground">Manage access, permissions, and login actions</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>User Overview</CardTitle>
            <CardDescription>Account and property assignment</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAlertsToggle}
              aria-label={alertsEnabled ? "Disable alerts" : "Enable alerts"}
              title={alertsEnabled ? "Alerts enabled" : "Alerts disabled"}
            >
              {alertsEnabled ? "🔔" : "🔕 zzz"}
            </Button>
            {isEditingUser ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditingUser(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveUserInfo} disabled={updateUserInfoMutation.isPending}>
                  Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditingUser(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Loading user...</div>
          ) : user ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Name</div>
                {isEditingUser ? (
                  <Input
                    value={editUserDraft.name}
                    onChange={(e) => setEditUserDraft(prev => ({ ...prev, name: e.target.value }))}
                  />
                ) : (
                  <div className="text-lg font-semibold">{user.full_name || user.fullName || user.username}</div>
                )}
                <div className="text-sm text-muted-foreground">Username / Email</div>
                {isEditingUser ? (
                  <Input
                    value={editUserDraft.email}
                    onChange={(e) => setEditUserDraft(prev => ({ ...prev, email: e.target.value }))}
                  />
                ) : (
                  <div>{user.username}</div>
                )}
                <div className="text-sm text-muted-foreground">Mobile</div>
                {isEditingUser ? (
                  <Input
                    value={editUserDraft.phone}
                    onChange={(e) => setEditUserDraft(prev => ({ ...prev, phone: e.target.value }))}
                  />
                ) : (
                  <div>{user.phone || "—"}</div>
                )}
                <div className="text-sm text-muted-foreground">Role</div>
                {isEditingUser && !["admin", "super_admin"].includes(String(user.role || "").toLowerCase()) ? (
                  <Select
                    value={editUserDraft.role}
                    onValueChange={(value) => setEditUserDraft(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landlord">Landlord</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Accountant">Accountant</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">{displayRole}</Badge>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Property</div>
                <div className="text-lg font-semibold">{propertyName}</div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Active
                </Badge>
                <div className="text-sm text-muted-foreground">Last Login</div>
                <div>{user.last_login ? new Date(user.last_login).toLocaleString() : "—"}</div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">User not found.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>Generate and send a temporary password, plus OTP controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => sendLoginMutation.mutate()} disabled={sendLoginMutation.isPending}>
              <KeyRound className="h-4 w-4 mr-2" />
              Generate & Send Password
            </Button>
          </div>
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div className="space-y-1">
              <div className="font-medium">OTP</div>
              <div className="text-sm text-muted-foreground">Toggle OTP for this user</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">{otpEnabled ? "Enabled" : "Disabled"}</Badge>
              <Switch checked={otpEnabled} onCheckedChange={handleOtpToggle} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Properties</CardTitle>
          <CardDescription>Select which properties this user can manage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {properties.length === 0 ? (
            <div className="text-sm text-muted-foreground">No properties available.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {(properties as any[]).map((property: any) => (
                <div key={property.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`user-property-${property.id}`}
                    checked={assignedPropertyIds.includes(String(property.id))}
                    onCheckedChange={() => toggleAssignedProperty(String(property.id))}
                  />
                  <Label htmlFor={`user-property-${property.id}`} className="text-sm">
                    {property.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => updateAssignedPropertiesMutation.mutate()}
              disabled={updateAssignedPropertiesMutation.isPending}
            >
              <Shield className="h-4 w-4 mr-2" />
              Save Assigned Properties
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Permission Management</CardTitle>
            <CardDescription>Manage access for this user</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions}>
              Select all
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearAllPermissions}>
              Clear all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {permissionCategories.map((category) => {
              const categoryPermissionIds = category.permissions.map((permission) => permission.id)
              const categoryChecked = categoryPermissionIds.every((permissionId) =>
                selectedPermissions.includes(permissionId)
              )
              return (
                <div key={category.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={categoryChecked}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <Label className="text-sm font-medium">{category.name}</Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategoryExpanded(category.id)}
                    >
                      {expandedCategories[category.id] ? "Hide" : "Show"} permissions
                    </Button>
                  </div>
                  {expandedCategories[category.id] && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-4 pb-4">
                      {category.permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                          <Label className="text-sm">{permission.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => updatePermissionsMutation.mutate()}
              disabled={updatePermissionsMutation.isPending}
            >
              <Shield className="h-4 w-4 mr-2" />
              Save Permissions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
