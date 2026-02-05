import { useState } from "react"
import {
  Building2,
  Users,
  Calculator,
  Receipt,
  CreditCard,
  MessageSquare,
  BarChart3,
  Home,
  Settings,
  FileText,
  DollarSign,
  Plus,
  Shield,
  Droplets,
  AlertTriangle,
  Globe,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  PenSquare,
  Smartphone,
  Mail
} from "lucide-react"
import { Link } from "wouter"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { useFilter } from "@/contexts/FilterContext"
import { getPaletteByIndex } from "@/lib/palette"

export function AppSidebar() {
  const { selectedPropertyId, selectedLandlordId } = useFilter();
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [tenantsOpen, setTenantsOpen] = useState(false);

  const normalizeId = (value: any) => (value === null || value === undefined ? null : String(value));
  const normalizedLandlordId = normalizeId(selectedLandlordId);
  const normalizedPropertyId = normalizeId(selectedPropertyId);
  const getPropertyId = (item: any) => normalizeId(item?.propertyId ?? item?.property_id);
  const getLandlordId = (item: any) => normalizeId(item?.landlordId ?? item?.landlord_id);
  const getUnitId = (item: any) => normalizeId(item?.unitId ?? item?.unit_id);
  const getLeaseId = (item: any) => normalizeId(item?.leaseId ?? item?.lease_id);
  const getTenantId = (item: any) => normalizeId(item?.tenantId ?? item?.tenant_id);

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/check");
      return await response.json();
    },
  });

  const currentRole = (authData?.user?.role || "").toLowerCase();
  const isAdminUser = currentRole === "admin" || currentRole === "super_admin";
  const permissionsRaw = authData?.user?.permissions;
  const permissions = Array.isArray(permissionsRaw)
    ? permissionsRaw
    : typeof permissionsRaw === "string" && permissionsRaw.trim().length > 0
      ? (() => {
          try {
            const parsed = JSON.parse(permissionsRaw);
            return Array.isArray(parsed) ? parsed : permissionsRaw.split(",").map((value: string) => value.trim()).filter(Boolean);
          } catch (error) {
            return permissionsRaw.split(",").map((value: string) => value.trim()).filter(Boolean);
          }
        })()
      : [];

  const hasCategoryPermission = (category: string) =>
    isAdminUser ||
    permissions.includes(category) ||
    permissions.some((permission: string) => permission.startsWith(`${category}.`));

  const canViewDashboard = hasCategoryPermission("dashboard");
  const canViewProperties = hasCategoryPermission("properties");
  const canViewHouses = hasCategoryPermission("house_types") || hasCategoryPermission("units");
  const canViewTenants = hasCategoryPermission("tenants");
  const canViewAccounting =
    hasCategoryPermission("invoices") ||
    hasCategoryPermission("payments") ||
    hasCategoryPermission("receipts") ||
    hasCategoryPermission("bills") ||
    hasCategoryPermission("water_readings");
  const canViewMaintenance = hasCategoryPermission("maintenance");
  const canViewMessaging = hasCategoryPermission("messaging");
  const canViewReports = hasCategoryPermission("reports");
  const canViewUsers = hasCategoryPermission("users");
  const canViewCreditUsage = hasCategoryPermission("settings");
  const canViewSettings = hasCategoryPermission("settings");
  const canViewActivity = hasCategoryPermission("activity_logs");
  const hasUsersAccess =
    isAdminUser ||
    permissions.includes("users") ||
    permissions.includes("users.view") ||
    permissions.includes("users.manage_permissions") ||
    permissions.some((permission: string) => permission.startsWith("users."));

  // Fetch data for badges
  const { data: allProperties = [] } = useQuery({
    queryKey: ["/api/properties", selectedLandlordId, selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (normalizedLandlordId) params.append("landlordId", normalizedLandlordId)
      if (normalizedPropertyId) params.append("propertyId", normalizedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  const { data: allTenants = [] } = useQuery({
    queryKey: ["/api/tenants", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (normalizedPropertyId) params.append("propertyId", normalizedPropertyId)
      if (normalizedLandlordId) params.append("landlordId", normalizedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["/api/invoices", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (normalizedPropertyId) params.append("propertyId", normalizedPropertyId)
      if (normalizedLandlordId) params.append("landlordId", normalizedLandlordId)
      const url = `/api/invoices${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  const { data: allHouseTypes = [] } = useQuery({
    queryKey: ["/api/house-types", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (normalizedPropertyId) params.append("propertyId", normalizedPropertyId)
      if (normalizedLandlordId) params.append("landlordId", normalizedLandlordId)
      const url = `/api/house-types${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  const { data: allBulkMessages = [] } = useQuery({
    queryKey: ["/api/bulk-messages", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (normalizedPropertyId) params.append("propertyId", normalizedPropertyId)
      if (normalizedLandlordId) params.append("landlordId", normalizedLandlordId)
      const url = `/api/bulk-messages${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  const { data: allUnits = [] } = useQuery({
    queryKey: ["/api/units", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  const { data: allLeases = [] } = useQuery({
    queryKey: ["/api/leases", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  // Filter data based on selected landlord and property
  let properties = allProperties;
  let tenants = allTenants;
  let invoices = allInvoices;
  let houseTypes = allHouseTypes;
  let bulkMessages = allBulkMessages;
  let units = allUnits;

  // Filter by landlord first
  if (normalizedLandlordId && normalizedLandlordId !== "all") {
    properties = (allProperties as any[]).filter((p: any) => getLandlordId(p) === normalizedLandlordId);
    
    // Filter house types by landlord's properties
    const landlordPropertyIds = new Set(properties.map((p: any) => getPropertyId(p)));
    houseTypes = (allHouseTypes as any[]).filter((ht: any) => landlordPropertyIds.has(getPropertyId(ht)));
    
    // Filter units by landlord's properties
    const filteredUnitsByLandlord = (allUnits as any[]).filter((u: any) => landlordPropertyIds.has(getPropertyId(u)));
    units = filteredUnitsByLandlord;
    const unitsMapByLandlord: Record<string, any> = {};
    filteredUnitsByLandlord.forEach((u: any) => { unitsMapByLandlord[getUnitId(u) as string] = u });

    // Filter leases by landlord's properties (via units)
    const filteredLeasesByLandlord = (allLeases as any[]).filter((l: any) => {
      const unit = unitsMapByLandlord[getUnitId(l)];
      return unit && landlordPropertyIds.has(getPropertyId(unit));
    });
    const leasesMapByLandlord: Record<string, any> = {};
    filteredLeasesByLandlord.forEach((l: any) => { leasesMapByLandlord[l.id] = l });

    // Filter tenants by landlord's properties (via leases)
    const filteredLeaseTenantIdsByLandlord = new Set(filteredLeasesByLandlord.map((l: any) => getTenantId(l)));
    tenants = (allTenants as any[]).filter((t: any) => filteredLeaseTenantIdsByLandlord.has(getTenantId(t)));

    // Filter invoices by landlord's properties (via leases)
    invoices = (allInvoices as any[]).filter((i: any) => {
      const lease = leasesMapByLandlord[getLeaseId(i)];
      if (!lease) return false;
      const unit = unitsMapByLandlord[getUnitId(lease)];
      return unit && landlordPropertyIds.has(getPropertyId(unit));
    });
  }

  // Filter by property (further narrows down if both landlord and property are selected)
  if (normalizedPropertyId && normalizedPropertyId !== "all") {
    properties = properties.filter((p: any) => getPropertyId(p) === normalizedPropertyId);
    
    // Filter house types by property
    houseTypes = (allHouseTypes as any[]).filter((ht: any) => getPropertyId(ht) === normalizedPropertyId);
    
    // Filter units by property
    const filteredUnits = (allUnits as any[]).filter((u: any) => getPropertyId(u) === normalizedPropertyId);
    units = filteredUnits;
    const unitsMap: Record<string, any> = {};
    filteredUnits.forEach((u: any) => { unitsMap[getUnitId(u) as string] = u });

    // Filter leases by property (via units)
    const filteredLeases = (allLeases as any[]).filter((l: any) => {
      const unit = unitsMap[getUnitId(l)];
      return unit && getPropertyId(unit) === normalizedPropertyId;
    });
    const leasesMap: Record<string, any> = {};
    filteredLeases.forEach((l: any) => { leasesMap[l.id] = l });

    // Filter tenants by property (via leases)
    const filteredLeaseTenantIds = new Set(filteredLeases.map((l: any) => getTenantId(l)));
    tenants = (allTenants as any[]).filter((t: any) => filteredLeaseTenantIds.has(getTenantId(t)));

    // Filter invoices by property (via leases)
    invoices = (allInvoices as any[]).filter((i: any) => {
      const lease = leasesMap[getLeaseId(i)];
      if (!lease) return false;
      const unit = unitsMap[getUnitId(lease)];
      return unit && getPropertyId(unit) === normalizedPropertyId;
    });
  }

  // Count overdue invoices (filtered)
  const overdueInvoices = Array.isArray(invoices) ? invoices.filter((invoice: any) => 
    invoice.status === "overdue" || 
    (invoice.status === "pending" && new Date(invoice.dueDate) < new Date())
  ).length : 0

  type NavItem = {
    title: string;
    url: string;
    icon: typeof Home;
    badge?: string | null;
    badgeVariant?: "default" | "destructive" | "outline" | "secondary";
  };

  const menuItems: NavItem[] = [
    {
      title: "Dashboard",
      url: "/portal",
      icon: Home,
    },
    {
      title: "Properties",
      url: "/properties",
      icon: Building2,
      badge: properties.length.toString(),
    },
    {
      title: "Houses",
      url: "/houses",
      icon: Building2,
      badge: units.length.toString(),
    },
  ]

  const tenantItems: NavItem[] = [
    { title: "Active Tenants", url: "/tenants", icon: Users },
    { title: "Terminated Leases", url: "/tenants/terminated", icon: FileText },
  ]

  const accountingItems: NavItem[] = [
    {
      title: "Bulk Invoicing",
      url: "/accounting/bulk-invoice",
      icon: Calculator,
    },
    {
      title: "Single Invoicing", 
      url: "/accounting/single-invoice",
      icon: FileText,
    },
    {
      title: "Invoices",
      url: "/accounting/invoices",
      icon: Receipt,
      badge: invoices.length.toString(),
      badgeVariant: overdueInvoices > 0 ? "destructive" : "default",
    },
    {
      title: "Receipts",
      url: "/accounting/receipts",
      icon: CreditCard,
    },
    {
      title: "Receive Payments",
      url: "/accounting/payments",
      icon: DollarSign,
    },
    {
      title: "Bills",
      url: "/accounting/bills",
      icon: FileText,
    },
    {
      title: "Water Units",
      url: "/accounting/water-units",
      icon: Droplets,
    }
  ]

  const otherItems: NavItem[] = [
    {
      title: "Maintenance",
      url: "/maintenance",
      icon: AlertTriangle,
      badge: null, // Will be calculated from real data if needed
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
    },
    {
      title: "User Management",
      url: "/users",
      icon: Shield,
    },
    {
      title: "Credit Usage",
      url: "/credit-usage",
      icon: CreditCard,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    }
  ]

  // Messaging submenu items
  const messagingItems = [
    {
      title: "Compose",
      url: "/messaging/compose",
      icon: PenSquare,
    },
    {
      title: "SMS Outbox",
      url: "/messaging/sms-outbox",
      icon: Smartphone,
    },
    {
      title: "Email Outbox",
      url: "/messaging/email-outbox",
      icon: Mail,
    }
  ]
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.title === "Dashboard") return canViewDashboard;
    if (item.title === "Properties") return canViewProperties;
    if (item.title === "Houses") return canViewHouses;
    return true;
  })

  const visibleTenantItems = canViewTenants ? tenantItems : []
  const visibleAccountingItems = canViewAccounting ? accountingItems : []
  const visibleMessagingItems = canViewMessaging ? messagingItems : []
  const visibleOtherItems = otherItems.filter((item) => {
    if (item.title === "Maintenance") return canViewMaintenance;
    if (item.title === "Reports") return canViewReports;
    if (item.title === "User Management") return canViewUsers;
    if (item.title === "Credit Usage") return canViewCreditUsage;
    if (item.title === "Settings") return canViewSettings;
    return true;
  })
  const visibleOtherItemsWithoutMaintenance = visibleOtherItems.filter(
    (item) => item.title !== "Maintenance"
  )
  const hasOtherSection =
    canViewMaintenance || visibleMessagingItems.length > 0 || visibleOtherItemsWithoutMaintenance.length > 0
  const iconClassForIndex = (index: number) => getPaletteByIndex(index).icon
  const menuOffset = 0
  const tenantsOffset = visibleMenuItems.length
  const tenantItemsOffset = tenantsOffset + 1
  const accountingOffset = tenantItemsOffset + visibleTenantItems.length
  const otherOffset = accountingOffset + visibleAccountingItems.length
  const messagingOffset = otherOffset + visibleOtherItems.length

  return (
    <Sidebar className="bg-sidebar/95 backdrop-blur-sm border-r-2" collapsible="offcanvas">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SidebarHeader className="p-4">
          <div className="flex items-center">
            <motion.img
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              src="/leasemaster-logo.png"
              alt="LeaseMaster"
              className="logo-sidebar"
            />
          </div>
        </SidebarHeader>
      </motion.div>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      className="group transition-all duration-200 hover:scale-[1.02]"
                      tooltip={item.title}
                    >
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <item.icon className={`h-4 w-4 transition-transform group-hover:rotate-12 ${iconClassForIndex(menuOffset + index)}`} />
                        </motion.div>
                        <span>{item.title}</span>
                        {item.badge && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {item.badge}
                            </Badge>
                          </motion.div>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </motion.div>
              ))}
              {visibleTenantItems.length > 0 && (
                <Collapsible open={tenantsOpen} onOpenChange={setTenantsOpen}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: visibleMenuItems.length * 0.05 }}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className="group transition-all duration-200 hover:scale-[1.02]"
                          tooltip="Tenants"
                        >
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Users className={`h-4 w-4 transition-transform group-hover:rotate-12 ${iconClassForIndex(tenantsOffset)}`} />
                          </motion.div>
                          <span>Tenants</span>
                          {Array.isArray(tenants) && tenants.length > 0 && (
                            <Badge variant="secondary" className="ml-auto text-xs mr-2">
                              {tenants.length}
                            </Badge>
                          )}
                          {tenantsOpen ? (
                            <ChevronDown className="h-4 w-4 ml-auto transition-transform" />
                          ) : (
                            <ChevronRight className="h-4 w-4 ml-auto transition-transform" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {visibleTenantItems.map((item, index) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton asChild>
                                <Link href={item.url} data-testid={`nav-tenants-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                                  <item.icon className={`h-4 w-4 ${iconClassForIndex(tenantItemsOffset + index)}`} />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </motion.div>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

                {visibleAccountingItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Accounting</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAccountingItems.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: (visibleMenuItems.length + index) * 0.05 }}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className="group transition-all duration-200 hover:scale-[1.02]"
                        tooltip={item.title}
                      >
                        <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <item.icon className={`h-4 w-4 transition-transform group-hover:rotate-12 ${iconClassForIndex(accountingOffset + index)}`} />
                          </motion.div>
                          <span>{item.title}</span>
                          {item.badge && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              <Badge
                                variant={(item.badgeVariant as "default" | "destructive" | "outline" | "secondary") || "default"}
                                className={`ml-auto text-xs ${item.badgeVariant === "destructive" ? "text-overdue-foreground bg-overdue animate-pulse" : ""}`}
                              >
                                {item.badge}
                              </Badge>
                            </motion.div>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasOtherSection && (
          <SidebarGroup>
            <SidebarGroupLabel>Other</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Maintenance item */}
                {canViewMaintenance && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: (visibleMenuItems.length + visibleAccountingItems.length) * 0.05 }}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className="group transition-all duration-200 hover:scale-[1.02]"
                        tooltip="Maintenance"
                      >
                        <Link href="/maintenance" data-testid="nav-maintenance">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <AlertTriangle className={`h-4 w-4 transition-transform group-hover:rotate-12 ${iconClassForIndex(otherOffset)}`} />
                          </motion.div>
                          <span>Maintenance</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
                )}

                {/* Messaging Collapsible Dropdown */}
                {visibleMessagingItems.length > 0 && (
                  <Collapsible open={messagingOpen} onOpenChange={setMessagingOpen}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: (visibleMenuItems.length + visibleAccountingItems.length + 1) * 0.05 }}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className="group transition-all duration-200 hover:scale-[1.02]"
                            tooltip="Messaging"
                          >
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <MessageSquare className={`h-4 w-4 transition-transform group-hover:rotate-12 ${iconClassForIndex(otherOffset + 1)}`} />
                            </motion.div>
                            <span>Messaging</span>
                            {Array.isArray(bulkMessages) && bulkMessages.length > 0 && (
                              <Badge variant="outline" className="ml-auto text-xs mr-2">
                                {bulkMessages.length}
                              </Badge>
                            )}
                            {messagingOpen ? (
                              <ChevronDown className="h-4 w-4 ml-auto transition-transform" />
                            ) : (
                              <ChevronRight className="h-4 w-4 ml-auto transition-transform" />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {visibleMessagingItems.map((item, index) => (
                              <SidebarMenuSubItem key={item.title}>
                                <SidebarMenuSubButton asChild>
                                  <Link href={item.url} data-testid={`nav-messaging-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                                    <item.icon className={`h-4 w-4 ${iconClassForIndex(messagingOffset + index)}`} />
                                    <span>{item.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </motion.div>
                  </Collapsible>
                )}

                {/* Remaining other items (Reports, User Management, Settings) */}
                {visibleOtherItemsWithoutMaintenance.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: (visibleMenuItems.length + visibleAccountingItems.length + 2 + index) * 0.05 }}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className="group transition-all duration-200 hover:scale-[1.02]"
                        tooltip={item.title}
                      >
                        <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <item.icon className={`h-4 w-4 transition-transform group-hover:rotate-12 ${iconClassForIndex(otherOffset + 2 + index)}`} />
                          </motion.div>
                          <span>{item.title}</span>
                          {item.badge && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              <Badge variant="outline" className="ml-auto text-xs">
                                {item.badge}
                              </Badge>
                            </motion.div>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-4 space-y-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <SidebarMenuButton
            className="w-full group transition-all duration-200 hover:scale-[1.02] bg-primary/10 hover:bg-primary/20"
            onClick={(e) => {
              e.preventDefault();
              const hostname = window.location.hostname;
              const protocol = window.location.protocol;
              
              if (hostname === 'localhost' || hostname === '127.0.0.1') {
                // Localhost: redirect to landing route to avoid app routing
                window.location.href = '/landing';
              } else {
                // Production: always redirect to root domain (theleasemaster.com)
                const rootDomain = hostname.replace(/^(www|admin|portal|clients|enquiries)\./, '');
                window.location.href = `${protocol}//${rootDomain}/`;
              }
            }}
          >
            <div className="flex items-center gap-2 w-full">
              <motion.div
                whileHover={{ scale: 1.1, x: -2 }}
                whileTap={{ scale: 0.9 }}
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </motion.div>
              <span>Homepage</span>
              <Globe className="h-4 w-4 ml-auto opacity-50" />
            </div>
          </SidebarMenuButton>
        </motion.div>
        <div className="text-xs text-muted-foreground text-center">
          Version 1.0.0
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}