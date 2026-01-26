import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Landing } from "@/pages/Landing";
import { About } from "@/pages/About";
import { AdminLogin } from "@/pages/AdminLogin";
import { ClientLogin } from "@/pages/ClientLogin";
import { TenantLogin } from "@/pages/TenantLogin";
import { AdminPortal } from "@/pages/AdminPortal";
import { ClientPortal } from "@/pages/ClientPortal";
import { ClientsPage } from "@/pages/ClientsPage";
import { EnquiriesPage } from "@/pages/EnquiriesPage";
import { EnquiryForm } from "@/pages/EnquiryForm";
import NotFound from "@/pages/not-found";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { BackToTop } from "@/components/back-to-top";
import React, { useState, useEffect, lazy, Suspense } from "react";
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

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-slate-600 dark:text-slate-400">Loading...</p>
    </div>
  </div>
);
import { MessageSquare, Bell, CreditCard, User, LogOut, ArrowLeft, Building2, Users, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
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

function Router({ showLanding = false }: { showLanding?: boolean }) {
  // Show landing page routes when not on portal
  if (showLanding) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Switch>
          {/* Old /login redirects to admin login */}
          <Route path="/login">
            {() => {
              const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
              if (hostname === 'localhost' || hostname === '127.0.0.1') {
                window.location.href = '/admin/login';
                return null;
              } else {
                const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
                const rootDomain = hostname.replace(/^(admin|portal|clients|enquiries)\./, '');
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
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/portal/login" component={ClientLogin} />
        <Route path="/tenant/login" component={TenantLogin} />
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
            } else if (hostname.startsWith('portal.')) {
              return <ClientLogin />;
            } else {
              // Fallback: redirect to admin login
              const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
              const rootDomain = hostname.replace(/^(admin|portal)\./, '');
              window.location.href = `${protocol}//admin.${rootDomain}/login`;
              return null;
            }
          }}
        </Route>
        
        {/* Portal pages */}
        <Route path="/admin" component={AdminPortal} />
        <Route path="/portal" component={ClientPortal} />
        
        {/* Special pages */}
        <Route path="/register" component={EnquiryForm} />
        <Route path="/clients" component={ClientsPage} />
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
  const [paymentNotifications, setPaymentNotifications] = useState(0)
  const [recentPayment, setRecentPayment] = useState<any>(null)
  const [location, setLocation] = useLocation()
  const [isPortal, setIsPortal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role?: string } | null>(null)
  const { selectedPropertyId, selectedLandlordId } = useFilter()
  const { toast } = useToast()
  const [smsBalanceNotified, setSmsBalanceNotified] = useState(false)
  const [emailBalanceNotified, setEmailBalanceNotified] = useState(false)
  const portalModuleRoutes = [
    '/properties', '/houses', '/tenants', '/accounting', '/maintenance',
    '/messaging', '/reports', '/users', '/credit-usage', '/settings', '/activity',
    '/payments', '/upload-data', '/leases', '/water-units'
  ]
  
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
              const userRole = data.user.role || 'client';
              // Development mode: log role for debugging (remove in production)
              if (process.env.NODE_ENV === 'development' && !userRole) {
                console.warn('[Auth] User role missing from API response:', data.user);
              }
              setCurrentUser({ 
                id: data.user.id, 
                username: data.user.username, 
                role: userRole
              });
              
              // Clear filters for admin users on login (they should see all data by default)
              if (userRole === 'admin' || userRole === 'super_admin') {
                localStorage.removeItem('selectedLandlordId');
                localStorage.removeItem('selectedPropertyId');
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
                role: data.user.role || 'client' 
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

  // Fetch SMS balance from API (only when authenticated)
  const { data: smsData } = useQuery({
    queryKey: ["/api/sms-balance", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/sms-balance${params.toString() ? `?${params}` : ""}`);
      return await response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const { data: emailData } = useQuery({
    queryKey: ["/api/email-balance", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/email-balance${params.toString() ? `?${params}` : ""}`)
      return await response.json()
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })

  const { data: smsSettingsData } = useQuery({
    queryKey: ["/api/settings/sms", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/settings/sms${params.toString() ? `?${params}` : ""}`)
      return await response.json()
    },
    enabled: isAuthenticated,
  })

  const { data: emailSettingsData } = useQuery({
    queryKey: ["/api/settings/email", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/settings/email${params.toString() ? `?${params}` : ""}`)
      return await response.json()
    },
    enabled: isAuthenticated,
  })

  // Fetch properties for selector (admin sees all, clients see only their property)
  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/properties");
      return await response.json();
    },
    enabled: isAuthenticated,
  })

  // Fetch landlords for selector (only for admin users)
  const { data: landlords = [] } = useQuery({
    queryKey: ["/api/landlords"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/landlords");
      return await response.json();
    },
    enabled: isAuthenticated && currentUser?.role === 'admin',
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
    queryFn: () => apiRequest("GET", "/api/payments?recent=true"),
    enabled: isAuthenticated,
    refetchInterval: 15000, // Refetch every 15 seconds
  })

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
  const isPortalSubdomain = !isLocalhost && hostname.startsWith('portal.');
  const isRootDomain = !isLocalhost && !isAdminSubdomain && !isPortalSubdomain;
  
  // Portal module routes (existing routes that should use app router)
  const isPortalModuleRoute = isLocalhost && portalModuleRoutes.some(route => pathname.startsWith(route));
  
  // Path-based detection (for localhost)
  // Clients and enquiries are part of admin context (admin-authenticated pages)
  const isAdminPath = isLocalhost && (pathname.startsWith('/admin') || pathname.startsWith('/clients') || pathname.startsWith('/enquiries'));
  const isPortalPath = isLocalhost && (pathname.startsWith('/portal') || isPortalModuleRoute);
  
  // Determine context
  // In production: admin subdomain includes /clients and /enquiries routes
  // In localhost: /clients and /enquiries are part of admin context
  const isAdminContext = isAdminSubdomain || isAdminPath;
  const isPortalContext = isPortalSubdomain || isPortalPath;
  const isAppContext = isAdminContext || isPortalContext;
  
  // Early return for login routes and standalone pages - render WITHOUT app layout
  // This MUST be checked BEFORE isAppContext to prevent sidebar from rendering
  const isLoginRoute = pathname === '/admin/login' || 
                       pathname === '/portal/login' || 
                       pathname === '/tenant/login' ||
                       pathname === '/login';
  const isTenantRoute =
    pathname === '/tenant/login' ||
    pathname.startsWith('/tenant/') ||
    pathname.startsWith('/tenant-portal');
  // Clients and enquiries are standalone pages (no sidebar) but require admin auth
  const isStandalonePage = pathname === '/clients' || pathname === '/enquiries';
  
  // Handle standalone pages (clients, enquiries) - require admin auth but no sidebar
  if (isStandalonePage) {
    // Check if authenticated and admin before rendering
    if (!isAuthenticated || (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      // Redirect to admin login if not authenticated or not admin
      if (!isAuthenticated) {
        if (isLocalhost) {
          setLocation('/admin/login');
        } else {
          const protocol = window.location.protocol;
          const rootDomain = hostname.replace(/^(admin|portal|clients|enquiries)\./, '');
          window.location.href = `${protocol}//admin.${rootDomain}/login`;
        }
        return null;
      }
      // If authenticated but not admin, redirect to portal
      if (isLocalhost) {
        setLocation('/portal');
      } else {
        const protocol = window.location.protocol;
        const rootDomain = hostname.replace(/^(admin|portal)\./, '');
        window.location.href = `${protocol}//portal.${rootDomain}`;
      }
      return null;
    }
    // Render standalone (no sidebar) for authenticated admin users
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
    const shouldShowAdminLogin = isAdminSubdomain || (isLocalhost && (currentPathname.startsWith('/admin') || currentPathname.startsWith('/clients') || currentPathname.startsWith('/enquiries')));
    const shouldShowClientLogin = isPortalSubdomain || (isLocalhost && (currentPathname.startsWith('/portal') || isPortalModuleRoute) && !currentPathname.includes('/admin'));
    
    if (!isAuthenticated) {
      // Redirect to appropriate login page
      // CRITICAL: Don't redirect if already on a login page (prevents redirect loops)
      if (currentPathname === '/admin/login' || currentPathname === '/portal/login' || currentPathname === '/login') {
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
          const rootDomain = hostname.replace(/^(admin|portal|clients|enquiries)\./, '');
          window.location.href = `${protocol}//admin.${rootDomain}/login`;
          return null;
        }
      } else if (shouldShowClientLogin) {
        if (isLocalhost) {
          setLocation('/portal/login');
        } else {
          const protocol = window.location.protocol;
          const rootDomain = hostname.replace(/^(admin|portal|clients|enquiries)\./, '');
          window.location.href = `${protocol}//portal.${rootDomain}/login`;
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
      const hasAdminAccess = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
      
      // Clients and Enquiries pages require admin role (they're routes under admin subdomain)
      if (currentPathname.startsWith('/clients') || currentPathname.startsWith('/enquiries')) {
        if (!hasAdminAccess) {
          // Redirect to appropriate portal
          if (isLocalhost) {
            setLocation('/portal');
          } else {
            const protocol = window.location.protocol;
            const rootDomain = hostname.replace(/^(admin|portal)\./, '');
            window.location.href = `${protocol}//portal.${rootDomain}`;
          }
          return null;
        }
      }
      
      // Admin portal requires admin role (admin or super_admin)
      if ((isAdminContext || (isLocalhost && currentPathname.startsWith('/admin') && !currentPathname.includes('/login'))) && !hasAdminAccess) {
        // Redirect to client portal
        if (isLocalhost) {
          setLocation('/portal');
        } else {
          const protocol = window.location.protocol;
          const rootDomain = hostname.replace(/^(admin|portal)\./, '');
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
              <div className="flex h-screen w-full relative z-10">
                <AppSidebar />
                <main className="flex-1 overflow-y-auto">
                  <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    {/* Top row: SidebarTrigger left, ThemeToggle + User right (mobile only) */}
                    <div className="flex items-center justify-between px-4 py-2 md:hidden">
                      <SidebarTrigger />
                      <div className="flex items-center gap-2">
                        <ThemeToggle />
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
                        {paymentNotifications > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPaymentNotifications(0);
                              setRecentPayment(null);
                            }}
                            className="gap-2 relative"
                          >
                            <Bell className="h-4 w-4" />
                            Payments
                            {paymentNotifications > 0 && (
                              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                                {paymentNotifications}
                              </Badge>
                            )}
                          </Button>
                        )}
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
