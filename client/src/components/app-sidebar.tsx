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

  const getPropertyId = (item: any) => item?.propertyId ?? item?.property_id;
  const getLandlordId = (item: any) => item?.landlordId ?? item?.landlord_id;
  const getUnitId = (item: any) => item?.unitId ?? item?.unit_id;
  const getLeaseId = (item: any) => item?.leaseId ?? item?.lease_id;
  const getTenantId = (item: any) => item?.tenantId ?? item?.tenant_id;

  // Fetch data for badges
  const { data: allProperties = [] } = useQuery({
    queryKey: ["/api/properties", selectedLandlordId, selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  const { data: allTenants = [] } = useQuery({
    queryKey: ["/api/tenants", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["/api/invoices", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoices${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  const { data: allHouseTypes = [] } = useQuery({
    queryKey: ["/api/house-types", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/house-types${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json();
    },
  })

  const { data: allBulkMessages = [] } = useQuery({
    queryKey: ["/api/bulk-messages", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
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
  if (selectedLandlordId && selectedLandlordId !== "all") {
    properties = (allProperties as any[]).filter((p: any) => getLandlordId(p) === selectedLandlordId);
    
    // Filter house types by landlord's properties
    const landlordPropertyIds = new Set(properties.map((p: any) => p.id));
    houseTypes = (allHouseTypes as any[]).filter((ht: any) => landlordPropertyIds.has(getPropertyId(ht)));
    
    // Filter units by landlord's properties
    const filteredUnitsByLandlord = (allUnits as any[]).filter((u: any) => landlordPropertyIds.has(getPropertyId(u)));
    units = filteredUnitsByLandlord;
    const unitsMapByLandlord: Record<string, any> = {};
    filteredUnitsByLandlord.forEach((u: any) => { unitsMapByLandlord[u.id] = u });

    // Filter leases by landlord's properties (via units)
    const filteredLeasesByLandlord = (allLeases as any[]).filter((l: any) => {
      const unit = unitsMapByLandlord[getUnitId(l)];
      return unit && landlordPropertyIds.has(getPropertyId(unit));
    });
    const leasesMapByLandlord: Record<string, any> = {};
    filteredLeasesByLandlord.forEach((l: any) => { leasesMapByLandlord[l.id] = l });

    // Filter tenants by landlord's properties (via leases)
    const filteredLeaseTenantIdsByLandlord = new Set(filteredLeasesByLandlord.map((l: any) => getTenantId(l)));
    tenants = (allTenants as any[]).filter((t: any) => filteredLeaseTenantIdsByLandlord.has(t.id));

    // Filter invoices by landlord's properties (via leases)
    invoices = (allInvoices as any[]).filter((i: any) => {
      const lease = leasesMapByLandlord[getLeaseId(i)];
      if (!lease) return false;
      const unit = unitsMapByLandlord[getUnitId(lease)];
      return unit && landlordPropertyIds.has(getPropertyId(unit));
    });
  }

  // Filter by property (further narrows down if both landlord and property are selected)
  if (selectedPropertyId && selectedPropertyId !== "all") {
    properties = properties.filter((p: any) => p.id === selectedPropertyId);
    
    // Filter house types by property
    houseTypes = (allHouseTypes as any[]).filter((ht: any) => getPropertyId(ht) === selectedPropertyId);
    
    // Filter units by property
    const filteredUnits = (allUnits as any[]).filter((u: any) => getPropertyId(u) === selectedPropertyId);
    units = filteredUnits;
    const unitsMap: Record<string, any> = {};
    filteredUnits.forEach((u: any) => { unitsMap[u.id] = u });

    // Filter leases by property (via units)
    const filteredLeases = (allLeases as any[]).filter((l: any) => {
      const unit = unitsMap[getUnitId(l)];
      return unit && getPropertyId(unit) === selectedPropertyId;
    });
    const leasesMap: Record<string, any> = {};
    filteredLeases.forEach((l: any) => { leasesMap[l.id] = l });

    // Filter tenants by property (via leases)
    const filteredLeaseTenantIds = new Set(filteredLeases.map((l: any) => getTenantId(l)));
    tenants = (allTenants as any[]).filter((t: any) => filteredLeaseTenantIds.has(t.id));

    // Filter invoices by property (via leases)
    invoices = (allInvoices as any[]).filter((i: any) => {
      const lease = leasesMap[getLeaseId(i)];
      if (!lease) return false;
      const unit = unitsMap[getUnitId(lease)];
      return unit && getPropertyId(unit) === selectedPropertyId;
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
  const iconClassForIndex = (index: number) => getPaletteByIndex(index).icon
  const menuOffset = 0
  const tenantsOffset = menuItems.length
  const tenantItemsOffset = tenantsOffset + 1
  const accountingOffset = tenantItemsOffset + tenantItems.length
  const otherOffset = accountingOffset + accountingItems.length
  const messagingOffset = otherOffset + otherItems.length

  return (
    <Sidebar className="bg-sidebar/95 backdrop-blur-sm border-r-2" collapsible="offcanvas">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-primary rounded-md p-1.5"
            >
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <span className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              LeaseMaster
            </span>
          </div>
        </SidebarHeader>
      </motion.div>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item, index) => (
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
              <Collapsible open={tenantsOpen} onOpenChange={setTenantsOpen}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: menuItems.length * 0.05 }}
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
                        {tenantItems.map((item, index) => (
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Accounting</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountingItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: (menuItems.length + index) * 0.05 }}
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

        <SidebarGroup>
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Maintenance item */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: (menuItems.length + accountingItems.length) * 0.05 }}
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

              {/* Messaging Collapsible Dropdown */}
              <Collapsible open={messagingOpen} onOpenChange={setMessagingOpen}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: (menuItems.length + accountingItems.length + 1) * 0.05 }}
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
                        {messagingItems.map((item, index) => (
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

              {/* Remaining other items (Reports, User Management, Settings) */}
              {otherItems.filter(item => !['Maintenance'].includes(item.title)).map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: (menuItems.length + accountingItems.length + 2 + index) * 0.05 }}
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
                const rootDomain = hostname.replace(/^(admin|portal|clients|enquiries)\./, '');
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