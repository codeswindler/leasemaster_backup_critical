import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { BackToTop } from "@/components/back-to-top";
import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import "@/components/animated-icons.css";

// Lazy load components for code splitting and faster initial load
const Dashboard = lazy(() => import("@/components/dashboard").then(m => ({ default: m.Dashboard })));
const Properties = lazy(() => import("@/components/properties").then(m => ({ default: m.Properties })));
const Houses = lazy(() => import("@/components/houses").then(m => ({ default: m.Houses })));
const LeaseManagement = lazy(() => import("@/components/lease-management").then(m => ({ default: m.LeaseManagement })));
const UploadData = lazy(() => import("@/components/upload-data").then(m => ({ default: m.UploadData })));
const Tenants = lazy(() => import("@/components/tenants").then(m => ({ default: m.Tenants })));
const TerminatedLeases = lazy(() => import("@/components/terminated-leases").then(m => ({ default: m.TerminatedLeases })));
const TenantDetail = lazy(() => import("@/components/tenant-detail").then(m => ({ default: m.TenantDetail })));
const BulkInvoicing = lazy(() => import("@/components/bulk-invoicing").then(m => ({ default: m.BulkInvoicing })));
const SingleInvoicing = lazy(() => import("@/components/single-invoicing").then(m => ({ default: m.SingleInvoicing })));
const Invoices = lazy(() => import("@/components/invoices").then(m => ({ default: m.Invoices })));
const Receipts = lazy(() => import("@/components/receipts").then(m => ({ default: m.Receipts })));
const ReceivePayments = lazy(() => import("@/components/receive-payments").then(m => ({ default: m.ReceivePayments })));
const IncomingPayments = lazy(() => import("@/components/incoming-payments").then(m => ({ default: m.IncomingPayments })));
const Bills = lazy(() => import("@/components/bills").then(m => ({ default: m.Bills })));
const PaymentTransactions = lazy(() => import("@/components/payment-transactions").then(m => ({ default: m.PaymentTransactions })));
const MaintenanceRequests = lazy(() => import("@/components/maintenance-requests").then(m => ({ default: m.MaintenanceRequests })));
const TenantPortal = lazy(() => import("@/components/tenant-portal").then(m => ({ default: m.TenantPortal })));
const WaterUnits = lazy(() => import("@/components/water-units").then(m => ({ default: m.WaterUnits })));
const Messaging = lazy(() => import("@/components/messaging").then(m => ({ default: m.Messaging })));
const MessagingCompose = lazy(() => import("@/components/messaging-compose").then(m => ({ default: m.MessagingCompose })));
const MessagingSmsOutbox = lazy(() => import("@/components/messaging-sms-outbox").then(m => ({ default: m.MessagingSmsOutbox })));
const MessagingEmailOutbox = lazy(() => import("@/components/messaging-email-outbox").then(m => ({ default: m.MessagingEmailOutbox })));
const MessageDetails = lazy(() => import("@/components/message-details").then(m => ({ default: m.MessageDetails })));
const Reports = lazy(() => import("@/components/reports").then(m => ({ default: m.Reports })));
const UserManagement = lazy(() => import("@/components/user-management").then(m => ({ default: m.UserManagement })));
const CreditUsage = lazy(() => import("@/components/credit-usage").then(m => ({ default: m.CreditUsage })));
const Settings = lazy(() => import("@/components/settings").then(m => ({ default: m.Settings })));
const FullActivity = lazy(() => import("@/components/full-activity").then(m => ({ default: m.FullActivity })));
const UserDetail = lazy(() => import("@/components/user-detail").then(m => ({ default: m.UserDetail })));

// Lazy load pages to keep initial bundle small
const Landing = lazy(() => import("@/pages/Landing").then(m => ({ default: m.Landing })));
const About = lazy(() => import("@/pages/About").then(m => ({ default: m.About })));
const AdminLogin = lazy(() => import("@/pages/AdminLogin").then(m => ({ default: m.AdminLogin })));
const AgentLogin = lazy(() => import("@/pages/AgentLogin").then(m => ({ default: m.AgentLogin })));
const ClientLogin = lazy(() => import("@/pages/ClientLogin").then(m => ({ default: m.ClientLogin })));
const TenantLogin = lazy(() => import("@/pages/TenantLogin").then(m => ({ default: m.TenantLogin })));
const AgentReset = lazy(() => import("@/pages/AgentReset").then(m => ({ default: m.AgentReset })));
const AdminPortal = lazy(() => import("@/pages/AdminPortal").then(m => ({ default: m.AdminPortal })));
const ClientPortal = lazy(() => import("@/pages/ClientPortal").then(m => ({ default: m.ClientPortal })));
const ClientsPage = lazy(() => import("@/pages/ClientsPage").then(m => ({ default: m.ClientsPage })));
const AgentsPage = lazy(() => import("@/pages/AgentsPage").then(m => ({ default: m.AgentsPage })));
const EnquiriesPage = lazy(() => import("@/pages/EnquiriesPage").then(m => ({ default: m.EnquiriesPage })));
const EnquiryForm = lazy(() => import("@/pages/EnquiryForm").then(m => ({ default: m.EnquiryForm })));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-slate-600 dark:text-slate-400">Loading...</p>
    </div>
  </div>
);
import { AlertTriangle, Bell, CreditCard, LogOut, ArrowLeft, Mail, MessageSquare, Receipt, User, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FilterProvider, useFilter } from "@/contexts/FilterContext";
import { FilterSelectors } from "@/components/FilterSelectors";
import { useToast } from "@/hooks/use-toast";
import { getPaletteByIndex } from "@/lib/palette";

function Router({ showLanding = false }: { showLanding?: boolean }) {
  // Show landing page routes when not on portal
  if (showLanding) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Switch>
          {/* Old /login redirects to role-specific login */}
          <Route path="/login">
            {() => {
              const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
              if (hostname === 'localhost' || hostname === '127.0.0.1') {
                window.location.href = '/admin/login';
                return null;
              } else {
                if (hostname.startsWith('tenant.') || hostname.startsWith('tenants.')) {
                  window.location.href = 'https://tenants.theleasemaster.com/login';
                  return null;
                }
                if (hostname.startsWith('agents.')) {
                  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
                  const rootDomain = hostname.replace(/^(www|admin|agents|portal|tenant|tenants|clients|enquiries)\./, '');
                  window.location.href = `${protocol}//agents.${rootDomain}/login`;
                  return null;
                }
                const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
                const rootDomain = hostname.replace(/^(www|admin|agents|portal|tenant|tenants|clients|enquiries)\./, '');
                window.location.href = `${protocol}//admin.${rootDomain}/login`;
                return null;
              }
            }}
          </Route>
          <Route path="/about" component={About} />
          <Route path="/register" component={EnquiryForm} />
          <Route path="/tenant/login" component={TenantLogin} />
          <Route path="/landing" component={Landing} />
          <Route path="/" component={Landing} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    );
  }

  // Show app routes when on portal
  // IMPORTANT: More specific routes must come BEFORE less specific routes in wouter Switch
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        {/* Login routes */}
        <Route path="/admin/login">
          {() => <AdminLogin />}
        </Route>
        <Route path="/agent/login" component={AgentLogin} />
        <Route path="/portal/login" component={ClientLogin} />
        <Route path="/tenant/login" component={TenantLogin} />
        <Route path="/agent/reset" component={AgentReset} />
        <Route path="/login">
          {() => {
            const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
            const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
            
            // Localhost: redirect to /admin/login (preserve existing behavior)
            if (isLocalhost) {
              window.location.href = '/admin/login';
              return null;
            }
            
            // Production: Show correct login component based on subdomain
            if (hostname.startsWith('admin.')) {
              return <AdminLogin />;
            } else if (hostname.startsWith('agents.')) {
              return <AgentLogin />;
            } else if (hostname.startsWith('portal.')) {
              return <ClientLogin />;
            } else if (hostname.startsWith('tenant.') || hostname.startsWith('tenants.')) {
              return <TenantLogin />;
            } else {
              // Fallback: redirect to admin login
              const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
              const rootDomain = hostname.replace(/^(www|admin|agents|portal|tenant|tenants)\./, '');
              window.location.href = `${protocol}//admin.${rootDomain}/login`;
              return null;
            }
          }}
        </Route>
        
        {/* Portal pages */}
        <Route path="/admin" component={AdminPortal} />
        <Route path="/agent" component={AdminPortal} />
        <Route path="/portal" component={ClientPortal} />
        
        {/* Special pages */}
        <Route path="/register" component={EnquiryForm} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/agents" component={AgentsPage} />
        <Route path="/enquiries" component={EnquiriesPage} />
        
        {/* Specific routes first */}
        <Route path="/properties">
          {() => <Properties />}
        </Route>
        <Route path="/leases/manage/:unitId">
          {() => <LeaseManagement />}
        </Route>
        <Route path="/message-details/:id">
          {() => <MessageDetails />}
        </Route>
        <Route path="/accounting/bulk-invoice">
          {() => <BulkInvoicing />}
        </Route>
        <Route path="/accounting/single-invoice">
          {() => <SingleInvoicing />}
        </Route>
        <Route path="/accounting/invoices">
          {() => <Invoices />}
        </Route>
        <Route path="/accounting/receipts">
          {() => <Receipts />}
        </Route>
        <Route path="/accounting/payments">
          {() => <ReceivePayments />}
        </Route>
        <Route path="/accounting/incoming-payments">
          {() => <IncomingPayments />}
        </Route>
        <Route path="/accounting/bills">
          {() => <Bills />}
        </Route>
        <Route path="/accounting/water-units">
          {() => <WaterUnits />}
        </Route>
        <Route path="/houses">
          {() => <Houses />}
        </Route>
        <Route path="/upload-data">
          {() => <UploadData />}
        </Route>
        <Route path="/tenants/terminated">
          {() => <TerminatedLeases />}
        </Route>
        <Route path="/tenants/:id">
          {() => <TenantDetail />}
        </Route>
        <Route path="/tenants">
          {() => <Tenants />}
        </Route>
        <Route path="/payments">
          {() => <PaymentTransactions />}
        </Route>
        <Route path="/maintenance">
          {() => <MaintenanceRequests />}
        </Route>
        <Route path="/tenant-portal">
          {() => <TenantPortal />}
        </Route>
        <Route path="/messaging">
          {() => <Messaging />}
        </Route>
        <Route path="/messaging/compose">
          {() => <MessagingCompose />}
        </Route>
        <Route path="/messaging/sms-outbox">
          {() => <MessagingSmsOutbox />}
        </Route>
        <Route path="/messaging/email-outbox">
          {() => <MessagingEmailOutbox />}
        </Route>
        <Route path="/reports">
          {() => <Reports />}
        </Route>
        <Route path="/users/:id">
          {() => <UserDetail />}
        </Route>
        <Route path="/users">
          {() => <UserManagement />}
        </Route>
        <Route path="/credit-usage">
          {() => <CreditUsage />}
        </Route>
        <Route path="/settings">
          {() => <Settings />}
        </Route>
        <Route path="/activity">
          {() => <FullActivity />}
        </Route>
        {/* Portal sub-routes (for portal context) */}
        <Route path="/portal/:rest*">
          {() => <ClientPortal />}
        </Route>
        {/* Admin sub-routes (for admin context) */}
        <Route path="/admin/:rest*">
          {() => <AdminPortal />}
        </Route>
        {/* Dashboard route should come last as fallback for root */}
        <Route path="/">
          {() => {
            // Determine which portal to show based on context
            const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
            const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
            const isAdminSubdomain = !isLocalhost && hostname.startsWith('admin.');
            const isPortalSubdomain = !isLocalhost && hostname.startsWith('portal.');
            
            if (isAdminSubdomain) {
              return <AdminPortal />;
            } else if (isPortalSubdomain) {
              return <ClientPortal />;
            }
            // Default fallback for localhost root
            return <Dashboard />;
          }}
        </Route>
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  const [smsBalance, setSmsBalance] = useState(0)
  const [emailBalance, setEmailBalance] = useState(0)
  const [notificationsReadAt, setNotificationsReadAt] = useState<number | null>(null)
  const [notificationsClearedAt, setNotificationsClearedAt] = useState<number | null>(null)
  const [paymentNotifications, setPaymentNotifications] = useState(0)
  const [recentPayment, setRecentPayment] = useState<any>(null)
  const [location, setLocation] = useLocation()
  const [isPortal, setIsPortal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const prefetched = useRef(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const notificationsPaletteSeed = useRef(Math.floor(Math.random() * 6))
  const notificationsPalette = getPaletteByIndex(notificationsPaletteSeed.current)
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    role?: string;
    propertyId?: string | number | null;
    permissions?: string[] | string | null;
    propertyLimit?: number | null;
  } | null>(null)
  const {
    selectedAgentId,
    selectedPropertyId,
    selectedLandlordId,
    setSelectedAgentId,
    setSelectedLandlordId,
    setSelectedPropertyId,
  } = useFilter()
  const { toast } = useToast()
  const [smsBalanceNotified, setSmsBalanceNotified] = useState(false)
  const [emailBalanceNotified, setEmailBalanceNotified] = useState(false)
  const portalModuleRoutes = [
    '/properties', '/houses', '/tenants', '/accounting', '/maintenance',
    '/messaging', '/reports', '/users', '/credit-usage', '/settings', '/activity',
    '/payments', '/upload-data', '/leases', '/water-units'
  ]

  const getUserPermissions = () => {
    if (!currentUser?.permissions) return [];
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions;
    if (typeof currentUser.permissions === "string") {
      const trimmed = currentUser.permissions.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (error) {
        // Fall through to comma-split fallback.
      }
      return trimmed.split(",").map((value) => value.trim()).filter(Boolean);
    }
    return [];
  };

  const isLandlordRole = (role?: string) => {
    const normalized = (role || "").toLowerCase();
    return normalized === "landlord" || normalized === "client";
  };

  const hasPermissionCategory = (category: string, permissions: string[]) => {
    if (!permissions.length) return false;
    if (permissions.includes(category)) return true;
    return permissions.some((permission) => permission.startsWith(`${category}.`));
  };
  
  // Check if we're on portal subdomain
  useEffect(() => {
    const hostname = window.location.hostname;
    // localhost is treated as portal for development
    // Only root domain (theleasemaster.com) shows landing page
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const portalCheck = hostname.includes('portal') || isLocalhost;
    setIsPortal(portalCheck);

    // Check authentication status
    const checkAuth = async () => {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const isLoginPage = pathname.includes('/login') || pathname.includes('/admin/login') || pathname.includes('/portal/login');
      
      // Determine context
      // Production: admin subdomain includes /clients and /enquiries routes
      // Localhost: path-based detection
      const isAdminContextLocal = !isLocalhost && hostname.startsWith('admin.') || (isLocalhost && (pathname.startsWith('/admin') || pathname.startsWith('/clients') || pathname.startsWith('/enquiries')));
    const isPortalModuleRouteLocal = isLocalhost && portalModuleRoutes.some(route => pathname.startsWith(route));
    const isPortalContextLocal = !isLocalhost && hostname.startsWith('portal.') || (isLocalhost && (pathname.startsWith('/portal') || isPortalModuleRouteLocal));
      // Clients and enquiries are now routes under admin subdomain, not separate subdomains
      const isAppContextLocal = isAdminContextLocal || isPortalContextLocal;
      
      // Check auth for app contexts (not login pages)
      if (isAppContextLocal && !isLoginPage) {
        try {
          const response = await fetch("/api/auth/check", {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            setIsAuthenticated(true);
            if (data.user) {
              const userRole = data.user.role || 'landlord';
              // Development mode: log role for debugging (remove in production)
              if (process.env.NODE_ENV === 'development' && !userRole) {
                console.warn('[Auth] User role missing from API response:', data.user);
              }
              setCurrentUser({ 
                id: data.user.id, 
                username: data.user.username, 
                role: userRole,
                propertyId: data.user.propertyId ?? null,
                permissions: data.user.permissions ?? null,
                propertyLimit: data.user.propertyLimit ?? null
              });
              
              // Clear filters for super admin users on login (they should see all data by default)
              if (userRole === 'super_admin') {
                localStorage.removeItem('selectedAgentId');
                localStorage.removeItem('selectedLandlordId');
                localStorage.removeItem('selectedPropertyId');
                setSelectedAgentId(null);
                setSelectedLandlordId(null);
                setSelectedPropertyId(null);
              } else {
                localStorage.removeItem('selectedAgentId');
                setSelectedAgentId(null);
              }
            } else {
              // Development mode: warn if user data is missing
              if (process.env.NODE_ENV === 'development') {
                console.warn('[Auth] API returned authenticated=true but no user data:', data);
              }
            }
          } else if (response.status === 401) {
            // 401 is expected when not logged in - handle silently
            setIsAuthenticated(false);
            setCurrentUser(null);
          } else {
            // Other errors - still set as not authenticated
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        } catch (error) {
          // Network errors - handle silently, don't log
          setIsAuthenticated(false);
          setCurrentUser(null);
        } finally {
          setCheckingAuth(false);
        }
      } else {
        // On root domain, login page, or landing page - skip auth check
        setCheckingAuth(false);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (!isLandlordRole(currentUser.role)) {
      return;
    }
    const userLandlordId = String(currentUser.id);
    if (selectedLandlordId !== userLandlordId) {
      setSelectedLandlordId(userLandlordId);
    }
  }, [currentUser, selectedLandlordId, setSelectedLandlordId]);

  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLanding =
      !isLocalhost &&
      !hostname.startsWith('admin.') &&
      !hostname.startsWith('agents.') &&
      !hostname.startsWith('portal.') &&
      !hostname.startsWith('clients.') &&
      !hostname.startsWith('enquiries.');
    document.body.dataset.layout = isLanding ? 'landing' : 'portal';
  }, [location]);
  
  // Refresh authentication state when navigating to /properties or other admin routes
  // This ensures auth state is maintained during client-side navigation
  useEffect(() => {
    // Only refresh auth if we're already authenticated (to avoid unnecessary calls)
    if (isAuthenticated && location && (location === '/properties' || location.startsWith('/clients') || location.startsWith('/admin'))) {
      const checkAuthRefresh = async () => {
        try {
          const response = await fetch("/api/auth/check", {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            if (data.user && (!currentUser || currentUser.id !== data.user.id || currentUser.role !== data.user.role)) {
              // Update currentUser if it changed or is missing
              setCurrentUser({ 
                id: data.user.id, 
                username: data.user.username, 
                role: data.user.role || 'landlord',
                propertyId: data.user.propertyId ?? null,
                permissions: data.user.permissions ?? null,
                propertyLimit: data.user.propertyLimit ?? null
              });
            }
          }
        } catch (error) {
          // Silently handle auth check errors - don't break the UI
        }
      };
      checkAuthRefresh();
    }
  }, [location, isAuthenticated, currentUser]);

  // Note: No redirect needed here - we show Login directly in render logic below

  useEffect(() => {
    if (!isAuthenticated || prefetched.current) return;
    prefetched.current = true;
    const warm = () => {
      import("@/components/dashboard");
      import("@/components/properties");
      import("@/components/tenants");
      import("@/components/invoices");
      import("@/components/receipts");
      import("@/components/messaging");
      import("@/components/settings");
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(warm, { timeout: 1500 });
    } else {
      setTimeout(warm, 800);
    }
  }, [isAuthenticated]);

  // Fetch SMS balance from API (only when authenticated)
  const { data: smsData } = useQuery({
    queryKey: ["/api/sms-balance", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/sms-balance${params.toString() ? `?${params}` : ""}`);
      return await response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const { data: emailData } = useQuery({
    queryKey: ["/api/email-balance", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/email-balance${params.toString() ? `?${params}` : ""}`)
      return await response.json()
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })

  const { data: smsSettingsData } = useQuery({
    queryKey: ["/api/settings/sms", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/settings/sms${params.toString() ? `?${params}` : ""}`)
      return await response.json()
    },
    enabled: isAuthenticated,
  })

  const { data: emailSettingsData } = useQuery({
    queryKey: ["/api/settings/email", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/settings/email${params.toString() ? `?${params}` : ""}`)
      return await response.json()
    },
    enabled: isAuthenticated,
  })

  // Fetch properties for selector (admin sees all, clients see only their property)
  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties", selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.append("agentId", selectedAgentId);
      const response = await apiRequest("GET", `/api/properties${params.toString() ? `?${params}` : ""}`);
      return await response.json();
    },
    enabled: isAuthenticated,
  })

  // Fetch landlords for selector (only for admin users)
  const { data: landlords = [] } = useQuery({
    queryKey: ["/api/landlords", selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.append("agentId", selectedAgentId);
      const response = await apiRequest("GET", `/api/landlords${params.toString() ? `?${params}` : ""}`);
      return await response.json();
    },
    enabled: isAuthenticated && (currentUser?.role === 'super_admin' || currentUser?.role === 'agent'),
  })

  useEffect(() => {
    if (smsData && typeof smsData === 'object' && 'balance' in smsData) {
      setSmsBalance((smsData as any).balance);
    }
  }, [smsData])

  useEffect(() => {
    if (emailData && typeof emailData === 'object' && 'balance' in emailData) {
      setEmailBalance((emailData as any).balance ?? 0)
    }
  }, [emailData])

  useEffect(() => {
    const threshold = smsSettingsData?.balance_threshold
    if (threshold !== undefined && threshold !== null) {
      const limit = Number(threshold)
      if (!Number.isNaN(limit) && smsBalance <= limit && !smsBalanceNotified) {
        toast({
          title: "SMS balance low",
          description: `SMS balance is ${smsBalance}, below threshold ${limit}.`,
          variant: "destructive"
        })
        setSmsBalanceNotified(true)
      }
      if (smsBalance > limit) {
        setSmsBalanceNotified(false)
      }
    }
  }, [smsBalance, smsSettingsData, smsBalanceNotified, toast])

  useEffect(() => {
    const threshold = emailSettingsData?.credit_threshold
    if (threshold !== undefined && threshold !== null) {
      const limit = Number(threshold)
      if (!Number.isNaN(limit) && emailBalance <= limit && !emailBalanceNotified) {
        toast({
          title: "Email balance low",
          description: `Email balance is ${emailBalance}, below threshold ${limit}.`,
          variant: "destructive"
        })
        setEmailBalanceNotified(true)
      }
      if (emailBalance > limit) {
        setEmailBalanceNotified(false)
      }
    }
  }, [emailBalance, emailSettingsData, emailBalanceNotified, toast])

  // Fetch recent payments for notifications (only when authenticated)
  const { data: recentPayments } = useQuery({
    queryKey: ["/api/payments?recent=true"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payments?recent=true");
      return await response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 15000, // Refetch every 15 seconds
  })

  const { data: maintenanceRequests = [] } = useQuery({
    queryKey: ["/api/maintenance-requests", selectedPropertyId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.append("agentId", selectedAgentId);
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId);
      const response = await apiRequest("GET", `/api/maintenance-requests?${params.toString()}`);
      return await response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: invoicesForNotifications = [] } = useQuery({
    queryKey: ["/api/invoices", "notifications", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.append("agentId", selectedAgentId);
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId);
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId);
      const response = await apiRequest("GET", `/api/invoices?${params.toString()}`);
      return await response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const { data: leasesForNotifications = [] } = useQuery({
    queryKey: ["/api/leases", "notifications", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.append("agentId", selectedAgentId);
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId);
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId);
      const response = await apiRequest("GET", `/api/leases?${params.toString()}`);
      return await response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const { data: paymentLogs = [] } = useQuery({
    queryKey: ["/api/activity-logs", "payment", selectedPropertyId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("type", "payment");
      params.append("limit", "10");
      if (selectedAgentId) params.append("agentId", selectedAgentId);
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId);
      const response = await apiRequest("GET", `/api/activity-logs?${params.toString()}`);
      return await response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (Array.isArray(recentPayments) && recentPayments.length > 0) {
      const latestPayment = recentPayments[0]
      // Only show notification if it's a new payment
      if (latestPayment && (!recentPayment || latestPayment.id !== recentPayment.id)) {
        setRecentPayment(latestPayment)
        setPaymentNotifications(prev => prev + 1)
        
        // Clear the popup after 5 seconds
        setTimeout(() => {
          setRecentPayment(null)
        }, 5000)
      }
    }
  }, [recentPayments, recentPayment])

  const notificationItems = useMemo(() => {
    const accessRequests = Array.isArray(maintenanceRequests)
      ? maintenanceRequests.filter((req: any) => req.title === "Tenant Portal Access Request")
      : [];
    const maintenanceAlerts = Array.isArray(maintenanceRequests)
      ? maintenanceRequests.filter((req: any) => req.title !== "Tenant Portal Access Request")
      : [];
    const payments = Array.isArray(paymentLogs) ? paymentLogs : [];
    const invoices = Array.isArray(invoicesForNotifications) ? invoicesForNotifications : [];
    const leases = Array.isArray(leasesForNotifications) ? leasesForNotifications : [];
    const now = new Date();
    const dueCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const overdueInvoices = invoices.filter((inv: any) => {
      const dueDate = inv.dueDate ?? inv.due_date;
      if (!dueDate) return false;
      const parsed = new Date(dueDate);
      if (Number.isNaN(parsed.getTime())) return false;
      const status = String(inv.status || "").toLowerCase();
      return parsed.getTime() <= dueCutoff.getTime() && status !== "paid";
    });
    const leaseExpiryWindow = new Date();
    leaseExpiryWindow.setDate(leaseExpiryWindow.getDate() + 30);
    const expiringLeases = leases.filter((lease: any) => {
      const endDate = lease.endDate ?? lease.end_date;
      if (!endDate) return false;
      const parsed = new Date(endDate);
      if (Number.isNaN(parsed.getTime())) return false;
      const status = String(lease.status || "active").toLowerCase();
      return parsed >= now && parsed <= leaseExpiryWindow && status === "active";
    });
    const smsThreshold = smsSettingsData?.balance_threshold;
    const emailThreshold = emailSettingsData?.credit_threshold;
    const smsLow = smsThreshold !== undefined && smsThreshold !== null && Number(smsBalance) <= Number(smsThreshold);
    const emailLow = emailThreshold !== undefined && emailThreshold !== null && Number(emailBalance) <= Number(emailThreshold);

    const items = [
      ...accessRequests.map((req: any) => ({
        id: `access-${req.id}`,
        type: "access",
        title: "Tenant Access Request",
        detail: req.description || req.title,
        createdAt: req.createdAt || req.created_at,
        href: "/maintenance",
      })),
      ...maintenanceAlerts.map((req: any) => ({
        id: `maintenance-${req.id}`,
        type: "maintenance",
        title: req.title || "Maintenance Request",
        detail: req.description || "",
        createdAt: req.createdAt || req.created_at,
        href: "/maintenance",
      })),
      ...payments.map((log: any) => ({
        id: `payment-${log.id}`,
        type: "payment",
        title: log.action || "Payment Received",
        detail: log.details || "",
        createdAt: log.createdAt || log.created_at,
        href: "/accounting/incoming-payments",
      })),
      ...overdueInvoices.slice(0, 5).map((inv: any) => ({
        id: `overdue-${inv.id}`,
        type: "overdue",
        title: "Overdue Invoice",
        detail: inv.description || inv.invoiceNumber || inv.invoice_number || "Invoice overdue",
        createdAt: inv.dueDate || inv.due_date,
        href: "/accounting/invoices",
      })),
      ...(smsLow ? [{
        id: "sms-low",
        type: "balance",
        title: "SMS balance low",
        detail: `Balance ${smsBalance} below threshold ${smsThreshold}`,
        createdAt: new Date().toISOString(),
        href: "/settings",
      }] : []),
      ...(emailLow ? [{
        id: "email-low",
        type: "balance",
        title: "Email balance low",
        detail: `Balance ${emailBalance} below threshold ${emailThreshold}`,
        createdAt: new Date().toISOString(),
        href: "/settings",
      }] : []),
      ...expiringLeases.slice(0, 5).map((lease: any) => ({
        id: `lease-expiry-${lease.id}`,
        type: "lease",
        title: "Lease expiring soon",
        detail: lease.unitNumber || lease.unit_number || "Lease ending",
        createdAt: lease.endDate || lease.end_date,
        href: "/leases",
      })),
    ];

    const filtered = items.filter((item) => {
      if (!notificationsClearedAt) return true;
      const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      return createdAt > notificationsClearedAt;
    });

    return filtered.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [
    maintenanceRequests,
    paymentLogs,
    invoicesForNotifications,
    leasesForNotifications,
    smsBalance,
    emailBalance,
    smsSettingsData,
    emailSettingsData,
    notificationsClearedAt,
  ]);

  const notificationCount = notificationItems.filter((item) => {
    if (!notificationsReadAt) return true;
    const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    return createdAt > notificationsReadAt;
  }).length;

  const getNotificationIcon = (type: string) => {
    if (type === "access") {
      return <UserPlus className="h-4 w-4 text-blue-600" />;
    }
    if (type === "maintenance") {
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    }
    if (type === "overdue") {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    if (type === "balance") {
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    }
    if (type === "lease") {
      return <Receipt className="h-4 w-4 text-indigo-600" />;
    }
    return <CreditCard className="h-4 w-4 text-emerald-600" />;
  };

  const renderNotificationsMenu = (align: "start" | "end" = "end") => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {notificationCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={`w-80 border-2 ${notificationsPalette.border} ${notificationsPalette.card} text-foreground`}
        align={align}
        forceMount
      >
        <DropdownMenuLabel className="font-normal flex items-center justify-between">
          Notifications
          {notificationItems.length > 0 && (
            <div className="flex gap-2 text-xs">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setNotificationsReadAt(Date.now())}
              >
                Read all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const now = Date.now();
                  setNotificationsReadAt(now);
                  setNotificationsClearedAt(now);
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notificationItems.length === 0 ? (
          <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
        ) : (
          notificationItems.slice(0, 8).map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => setLocation(item.href)}
              className="cursor-pointer focus:bg-white/70 dark:focus:bg-slate-900/40"
            >
              <div className="flex items-start gap-2">
                {getNotificationIcon(item.type)}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{item.title}</span>
                  {item.detail && (
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {item.detail}
                    </span>
                  )}
                  {item.createdAt && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading...</p>
            </div>
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Detect subdomain and route type
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Subdomain detection (for production)
  // Clients and enquiries are routes under admin subdomain, not separate subdomains
  const isAdminSubdomain = !isLocalhost && hostname.startsWith('admin.');
  const isAgentSubdomain = !isLocalhost && hostname.startsWith('agents.');
  const isPortalSubdomain = !isLocalhost && hostname.startsWith('portal.');
  const isTenantSubdomain = !isLocalhost && (hostname.startsWith('tenant.') || hostname.startsWith('tenants.'));
  const isRootDomain = !isLocalhost && !isAdminSubdomain && !isAgentSubdomain && !isPortalSubdomain && !isTenantSubdomain;
  
  // Portal module routes (existing routes that should use app router)
  const isPortalModuleRoute = isLocalhost && portalModuleRoutes.some(route => pathname.startsWith(route));
  
  // Path-based detection (for localhost)
  // Clients and enquiries are part of admin context (admin-authenticated pages)
  const isAdminPath = isLocalhost && (pathname.startsWith('/admin') || pathname.startsWith('/enquiries') || pathname.startsWith('/agents'));
  const isAgentPath = isLocalhost && (pathname.startsWith('/agent') || pathname.startsWith('/clients'));
  const isPortalPath = isLocalhost && (pathname.startsWith('/portal') || isPortalModuleRoute);
  
  // Determine context
  // In production: admin subdomain includes /clients and /enquiries routes
  // In localhost: /clients and /enquiries are part of admin context
  const isAdminContext = isAdminSubdomain || isAdminPath;
  const isAgentContext = isAgentSubdomain || isAgentPath;
  const isPortalContext = isPortalSubdomain || isPortalPath;
  const isAppContext = isAdminContext || isAgentContext || isPortalContext;
  
  // Early return for login routes and standalone pages - render WITHOUT app layout
  // This MUST be checked BEFORE isAppContext to prevent sidebar from rendering
  const isLoginRoute = pathname === '/admin/login' || 
                       pathname === '/agent/login' ||
                       pathname === '/portal/login' || 
                       pathname === '/tenant/login' ||
                       pathname === '/login';
  const isTenantRoute =
    pathname === '/tenant/login' ||
    pathname.startsWith('/tenant/') ||
    pathname.startsWith('/tenant-portal') ||
    isTenantSubdomain;
  // Clients and enquiries are standalone pages (no sidebar) but require admin auth
  const isClientsPage = pathname === '/clients';
  const isEnquiriesPage = pathname === '/enquiries';
  const isAgentsPage = pathname === '/agents';
  const isStandalonePage = isClientsPage || isEnquiriesPage || isAgentsPage;
  
  // Handle standalone pages (clients, enquiries) - require admin auth but no sidebar
  if (isStandalonePage) {
    const role = (currentUser?.role || "").toLowerCase();
    const canViewClients = role === "super_admin" || role === "agent";
    const canViewEnquiries = role === "super_admin";
    const canViewAgents = role === "super_admin";
    const hasAccess =
      (isClientsPage && canViewClients) ||
      (isEnquiriesPage && canViewEnquiries) ||
      (isAgentsPage && canViewAgents);

    if (!isAuthenticated || !hasAccess) {
      if (!isAuthenticated) {
        if (isLocalhost) {
          setLocation(isClientsPage ? "/agent/login" : "/admin/login");
        } else {
          const protocol = window.location.protocol;
          const rootDomain = hostname.replace(/^(www|admin|agents|portal|clients|enquiries)\./, "");
          const targetSubdomain = isClientsPage ? "agents" : "admin";
          window.location.href = `${protocol}//${targetSubdomain}.${rootDomain}/login`;
        }
        return null;
      }

      if (isLocalhost) {
        setLocation("/portal");
      } else {
        const protocol = window.location.protocol;
        const rootDomain = hostname.replace(/^(www|admin|agents|portal)\./, "");
        window.location.href = `${protocol}//portal.${rootDomain}`;
      }
      return null;
    }

    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider>
            <Router showLanding={false} />
            <Toaster />
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isLoginRoute || isTenantRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider>
            <Router showLanding={false} />
            <Toaster />
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // Show landing page only on root domain (production) or root path (localhost) without app context
  if ((isRootDomain || (isLocalhost && !isAppContext && !isPortalModuleRoute)) && (pathname === '/' || pathname === '/about' || pathname === '/landing')) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider>
            <Router showLanding={true} />
            <Toaster />
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // If in app context (admin, portal, clients, enquiries) or portal module route, show app
  if (isAppContext || isPortalModuleRoute) {
    // Wait for auth check to complete before deciding what to show
    if (checkingAuth) {
      // Show loading while checking auth (prevents redirect loop)
      return (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ThemeProvider>
              <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                </div>
              </div>
              <Toaster />
            </ThemeProvider>
          </TooltipProvider>
        </QueryClientProvider>
      );
    }
    
    // Show login page if not authenticated
    // Note: Login routes are now handled early (above), so they won't reach here
    const currentPathname = typeof window !== 'undefined' ? window.location.pathname : '';
    
    // Determine which login page to show based on context (for redirects when not authenticated)
    // IMPORTANT: Check subdomain FIRST, then path, to avoid incorrect redirects
    // Clients and enquiries are part of admin context (they're admin-authenticated)
    const shouldShowAdminLogin = isAdminSubdomain || (isLocalhost && (currentPathname.startsWith('/admin') || currentPathname.startsWith('/enquiries')));
    const shouldShowAgentLogin = isAgentSubdomain || (isLocalhost && (currentPathname.startsWith('/agent') || currentPathname.startsWith('/clients')));
    const shouldShowClientLogin = isPortalSubdomain || (isLocalhost && (currentPathname.startsWith('/portal') || isPortalModuleRoute) && !currentPathname.includes('/admin'));
    const shouldShowTenantLogin = isTenantSubdomain || (isLocalhost && currentPathname.startsWith('/tenant'));
    
    if (!isAuthenticated) {
      // Redirect to appropriate login page
      // CRITICAL: Don't redirect if already on a login page (prevents redirect loops)
      if (currentPathname === '/admin/login' || currentPathname === '/agent/login' || currentPathname === '/portal/login' || currentPathname === '/login') {
        // Already on login page, let Router handle it
        return (
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <ThemeProvider>
                <Router showLanding={false} />
                <Toaster />
              </ThemeProvider>
            </TooltipProvider>
          </QueryClientProvider>
        );
      }
      
      if (shouldShowAdminLogin) {
        if (isLocalhost) {
          setLocation('/admin/login');
        } else {
          const protocol = window.location.protocol;
          const rootDomain = hostname.replace(/^(www|admin|agents|portal|tenant|tenants|clients|enquiries)\./, '');
          window.location.href = `${protocol}//admin.${rootDomain}/login`;
          return null;
        }
      } else if (shouldShowAgentLogin) {
        if (isLocalhost) {
          setLocation('/agent/login');
        } else {
          const protocol = window.location.protocol;
          const rootDomain = hostname.replace(/^(www|admin|agents|portal|tenant|tenants|clients|enquiries)\./, '');
          window.location.href = `${protocol}//agents.${rootDomain}/login`;
          return null;
        }
      } else if (shouldShowClientLogin) {
        if (isLocalhost) {
          setLocation('/portal/login');
        } else {
          const protocol = window.location.protocol;
          const rootDomain = hostname.replace(/^(www|admin|agents|portal|tenant|tenants|clients|enquiries)\./, '');
          window.location.href = `${protocol}//portal.${rootDomain}/login`;
          return null;
        }
      } else if (shouldShowTenantLogin) {
        if (isLocalhost) {
          setLocation('/tenant/login');
        } else {
          window.location.href = `https://tenants.theleasemaster.com/login`;
          return null;
        }
      }
      
      return (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ThemeProvider>
              <Router showLanding={false} />
              <Toaster />
            </ThemeProvider>
          </TooltipProvider>
        </QueryClientProvider>
      );
    }
    
    // Check role-based access for admin-only pages
    // Add null-safety check: ensure currentUser exists and has role before checking access
    if (isAuthenticated && currentUser) {
      // Check if user has admin access (admin or super_admin roles) - with null-safety
      const role = (currentUser?.role || "").toLowerCase();
      const hasAdminAccess = role === 'super_admin';
      const hasAgentAccess = role === 'agent' || role === 'super_admin';
      const hasAdminLikeAccess = role === 'agent' || role === 'super_admin';
      const permissions = getUserPermissions();
      const hasUsersAccess =
        hasPermissionCategory("users", permissions) ||
        permissions.includes("users.view") ||
        permissions.includes("users.manage_permissions");
      const routePermissionMap: { prefix: string; categories: string[]; required?: string[] }[] = [
        { prefix: '/portal', categories: ['dashboard'] },
        { prefix: '/users', categories: ['users'], required: ['users.view', 'users.manage_permissions'] },
        { prefix: '/properties', categories: ['properties'] },
        { prefix: '/houses', categories: ['house_types', 'units'] },
        { prefix: '/tenants', categories: ['tenants'] },
        { prefix: '/accounting', categories: ['invoices', 'payments', 'receipts', 'bills', 'water_readings'] },
        { prefix: '/maintenance', categories: ['maintenance'] },
        { prefix: '/messaging', categories: ['messaging'] },
        { prefix: '/reports', categories: ['reports'] },
        { prefix: '/credit-usage', categories: ['settings'] },
        { prefix: '/settings', categories: ['settings'] },
        { prefix: '/activity', categories: ['activity_logs'] },
        { prefix: '/upload-data', categories: ['data_import'] },
        { prefix: '/leases', categories: ['leases'] },
        { prefix: '/water-units', categories: ['water_readings'] },
      ];
      
      // Clients and Enquiries pages require admin role (they're routes under admin subdomain)
      if (currentPathname.startsWith('/clients') || currentPathname.startsWith('/enquiries') || currentPathname.startsWith('/agents')) {
        const canViewClients = currentPathname.startsWith('/clients') && hasAgentAccess;
        const canViewEnquiries = currentPathname.startsWith('/enquiries') && hasAdminAccess;
        const canViewAgents = currentPathname.startsWith('/agents') && hasAdminAccess;
        if (!canViewClients && !canViewEnquiries && !canViewAgents) {
          // Redirect to appropriate portal
          if (isLocalhost) {
            setLocation('/portal');
          } else {
            const protocol = window.location.protocol;
            const rootDomain = hostname.replace(/^(www|admin|agents|portal)\./, '');
            window.location.href = `${protocol}//portal.${rootDomain}`;
          }
          return null;
        }
      }

      // User management requires explicit permission (clients should not access it)
      if (currentPathname.startsWith('/users') && !hasAdminLikeAccess && !hasUsersAccess) {
        if (isLocalhost) {
          setLocation('/portal');
        } else {
          const protocol = window.location.protocol;
          const rootDomain = hostname.replace(/^(www|admin|agents|portal|tenant|tenants|clients|enquiries)\./, '');
          window.location.href = `${protocol}//portal.${rootDomain}`;
        }
        return null;
      }

      if (!hasAdminLikeAccess) {
        const matchedPermission = routePermissionMap.find((entry) =>
          currentPathname.startsWith(entry.prefix)
        );

        if (matchedPermission) {
          const hasRequiredPermission = matchedPermission.required?.some((permission) =>
            permissions.includes(permission)
          );
          const hasCategoryPermission = matchedPermission.categories.some((category) =>
            hasPermissionCategory(category, permissions)
          );

          if (!hasRequiredPermission && !hasCategoryPermission) {
            if (isLocalhost) {
              setLocation('/portal');
            } else {
              const protocol = window.location.protocol;
              const rootDomain = hostname.replace(/^(www|admin|agents|portal|tenant|tenants|clients|enquiries)\./, '');
              window.location.href = `${protocol}//portal.${rootDomain}`;
            }
            return null;
          }
        }
      }
      
      // Admin portal requires admin role (admin or super_admin)
      if ((isAdminContext || (isLocalhost && currentPathname.startsWith('/admin') && !currentPathname.includes('/login'))) && !hasAdminAccess) {
        // Redirect to client portal
        if (isLocalhost) {
          setLocation('/portal');
        } else {
          const protocol = window.location.protocol;
          const rootDomain = hostname.replace(/^(www|admin|agents|portal)\./, '');
          window.location.href = `${protocol}//portal.${rootDomain}`;
        }
        return null;
      }

      if ((isAgentContext || (isLocalhost && currentPathname.startsWith('/agent') && !currentPathname.includes('/login'))) && !hasAgentAccess) {
        if (isLocalhost) {
          setLocation('/portal');
        } else {
          const protocol = window.location.protocol;
          const rootDomain = hostname.replace(/^(www|admin|agents|portal)\./, '');
          window.location.href = `${protocol}//portal.${rootDomain}`;
        }
        return null;
      }
    }

    // Show full app with sidebar when authenticated
    return (
      <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ThemeProvider>
            <AnimatedBackground />
            <SidebarProvider 
              style={style as React.CSSProperties} 
              open={sidebarOpen}
              onOpenChange={setSidebarOpen}
              defaultOpen={true}
            >
              <div
                className="flex min-h-full w-full relative z-10"
                style={{ minHeight: "calc(100vh / var(--ui-zoom))" }}
              >
                <AppSidebar />
                <main className="flex-1 overflow-y-auto">
                  <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    {/* Top row: SidebarTrigger left, ThemeToggle + User right (mobile only) */}
                    <div className="flex items-center justify-between px-4 py-2 md:hidden">
                      <SidebarTrigger />
                      <div className="flex items-center gap-2">
                        <ThemeToggle />
                        {renderNotificationsMenu("end")}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {currentUser?.username?.charAt(0).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                              <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                  {currentUser?.username || "User"}
                                </p>
                              </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                                setIsAuthenticated(false);
                                setCurrentUser(null);
                                setLocation("/login");
                              }}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>Log out</span>
                              <ArrowLeft className="ml-auto h-4 w-4 animated-arrow-left" />
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {/* Filter Selectors row (mobile only) */}
                    {isAuthenticated && (
                      <div className="px-4 pb-2 md:hidden">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <FilterSelectors currentUser={currentUser} />
                        </div>
                      </div>
                    )}
                    
                    {/* Desktop header row */}
                    <div className="hidden md:flex h-16 items-center gap-4 px-4">
                      <SidebarTrigger />
                      <div className="flex-1" />
                      {isAuthenticated && <FilterSelectors currentUser={currentUser} />}
                      <div className="flex items-center gap-4">
                        <ThemeToggle />
                          <Badge variant="outline" className="gap-1">
                            <MessageSquare className="h-3 w-3" />
                            SMS: {smsBalance}
                          </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Mail className="h-3 w-3" />
                        Email: {emailBalance}
                      </Badge>
                        {renderNotificationsMenu("end")}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {currentUser?.username?.charAt(0).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                              <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                  {currentUser?.username || "User"}
                                </p>
                              </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                                setIsAuthenticated(false);
                                setCurrentUser(null);
                                setLocation("/login");
                              }}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>Log out</span>
                              <ArrowLeft className="ml-auto h-4 w-4 animated-arrow-left" />
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <Router showLanding={false} />
                  </div>
                </main>
              </div>
            </SidebarProvider>
            <BackToTop />
            <Toaster />
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Fallback (should not reach here, but just in case)
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Router />
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FilterProvider>
      <AppContent />
      </FilterProvider>
    </QueryClientProvider>
  );
}

export default App;


