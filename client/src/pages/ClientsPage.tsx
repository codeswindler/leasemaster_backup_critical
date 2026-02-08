import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Search, Building2, Mail, Phone, Loader2, Plus, Send, Edit, Trash2, UserPlus, LogIn, KeyRound, Shield, ArrowLeft, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { getPaletteByKey, getSessionSeed } from "@/lib/palette";
import { useUndoDelete } from "@/lib/use-undo-delete";
import { useFilter } from "@/contexts/FilterContext";

const propertyLimitSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  },
  z.number().int().min(0, "Property limit must be 0 or higher")
);

const agentSchema = z.object({
  username: z.string().email("Must be a valid email address"),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  idNumber: z.string().min(1, "Identification number is required"),
  propertyLimit: propertyLimitSchema,
});

const createLandlordSchema = z.object({
  username: z.string().email("Must be a valid email address"),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  idNumber: z.string().min(1, "Identification number is required"),
  propertyLimit: propertyLimitSchema,
});

type CreateLandlordFormData = z.infer<typeof createLandlordSchema>;
type AgentFormData = z.infer<typeof agentSchema>;

const editLandlordSchema = z.object({
  username: z.string().email("Must be a valid email address"),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  idNumber: z.string().min(1, "Identification number is required"),
  propertyLimit: propertyLimitSchema,
});

type EditLandlordFormData = z.infer<typeof editLandlordSchema>;

export function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [sendingLoginTo, setSendingLoginTo] = useState<string | null>(null);
  const [isSendLoginDialogOpen, setIsSendLoginDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const {
    selectedAgentId,
    selectedLandlordId,
    selectedPropertyId,
    setSelectedLandlordId,
    setSelectedPropertyId,
  } = useFilter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionPaletteSeed = useMemo(() => getSessionSeed("client-cards"), []);
  const dialogPaletteSeed = useMemo(() => Math.floor(Math.random() * 1_000_000), []);
  const createDialogPalette = useMemo(
    () => getPaletteByKey("create-client-dialog", dialogPaletteSeed),
    [dialogPaletteSeed]
  );
  const editDialogPalette = useMemo(
    () => getPaletteByKey("edit-client-dialog", dialogPaletteSeed),
    [dialogPaletteSeed]
  );
  const agentDialogPalette = useMemo(
    () => getPaletteByKey("create-agent-dialog", dialogPaletteSeed),
    [dialogPaletteSeed]
  );
  const { scheduleDelete } = useUndoDelete();
  const [selectedAgentForForm, setSelectedAgentForForm] = useState<string | null>(null);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/check");
      return await response.json();
    },
  });
  const currentUser = authData?.user || null;
  const currentRole = (currentUser?.role || "").toLowerCase();
  const isSuperAdmin = currentRole === "super_admin";
  const isAgentUser = currentRole === "agent";
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/check");
      return await response.json();
    },
  });
  const currentRole = (authData?.user?.role || "").toLowerCase();
  const isSuperAdmin = currentRole === "super_admin";

  // Fetch all landlords (users with role 'landlord')
  const { data: landlords = [], isLoading } = useQuery({
    queryKey: ["/api/landlords", selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.append("agentId", selectedAgentId);
      const response = await apiRequest("GET", `/api/landlords${params.toString() ? `?${params}` : ""}`);
      return await response.json();
    },
    staleTime: 0, // Always fetch fresh data (no caching)
    refetchOnMount: true, // Refetch when component mounts
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["/api/users", "agents"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users?role=agent");
      return await response.json();
    },
    enabled: isSuperAdmin,
  });
  
  // Invalidate cache on mount to remove stale data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/landlords"] });
  }, []);

  // Fetch properties for each landlord
  const { data: allProperties = [] } = useQuery({
    queryKey: ["/api/properties", selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.append("agentId", selectedAgentId);
      const response = await apiRequest("GET", `/api/properties${params.toString() ? `?${params}` : ""}`);
      return await response.json();
    },
    enabled: landlords.length > 0,
  });

  const selectedPropertyLabel = selectedPropertyId
    ? (allProperties as any[]).find((property: any) => property.id === selectedPropertyId)?.name
    : null;
  const selectedLandlordLabel = selectedLandlordId
    ? (landlords as any[]).find((landlord: any) => landlord.id === selectedLandlordId)?.username
    : null;

  // Create landlord form
  const createForm = useForm<CreateLandlordFormData>({
    resolver: zodResolver(createLandlordSchema),
    defaultValues: {
      username: "",
      fullName: "",
      phone: "",
      idNumber: "",
      propertyLimit: undefined,
    },
  });

  // Edit landlord form
  const editForm = useForm<EditLandlordFormData>({
    resolver: zodResolver(editLandlordSchema),
    defaultValues: {
      username: "",
      fullName: "",
      phone: "",
      idNumber: "",
      propertyLimit: undefined,
    },
  });

  const agentForm = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      username: "",
      fullName: "",
      phone: "",
      idNumber: "",
      propertyLimit: undefined,
    },
  });

  useEffect(() => {
    if (isAgentUser && currentUser?.id) {
      setSelectedAgentForForm(String(currentUser.id));
      return;
    }
    if (isSuperAdmin && selectedAgentId) {
      setSelectedAgentForForm(String(selectedAgentId));
    }
  }, [isAgentUser, isSuperAdmin, currentUser?.id, selectedAgentId]);

  // Create landlord mutation
  const createLandlordMutation = useMutation({
    mutationFn: async (data: CreateLandlordFormData) => {
      const agentIdForPayload = isAgentUser
        ? String(currentUser?.id || "")
        : selectedAgentForForm || undefined;
      const response = await apiRequest("POST", "/api/landlords", {
        username: data.username,
        fullName: data.fullName,
        phone: data.phone,
        idNumber: data.idNumber || undefined,
        propertyLimit: data.propertyLimit,
        adminId: agentIdForPayload || undefined,
      });
      const result = await response.json();
      
      // Verify response indicates success
      if (!response.ok || result.error) {
        throw new Error(result.error || `Failed to create customer: ${response.statusText}`);
      }
      
      // Verify landlord was created (has id)
      if (!result.id) {
        throw new Error('Customer creation failed - no ID returned from server');
      }
      
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch landlords list to ensure UI is in sync with database
      queryClient.invalidateQueries({ queryKey: ["/api/landlords"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      createForm.reset();
      setIsCreateDialogOpen(false);
      toast({
        title: "Customer Created",
        description: "Customer has been created successfully. Login credentials have been sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      const response = await apiRequest("POST", "/api/users", {
        username: data.username,
        fullName: data.fullName,
        phone: data.phone,
        idNumber: data.idNumber || undefined,
        propertyLimit: data.propertyLimit,
        role: "agent",
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to create agent");
      }
      if (!result.id) {
        throw new Error("Agent creation failed - no ID returned");
      }
      return result;
    },
    onSuccess: (agent: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", "agents"] });
      agentForm.reset();
      setIsAgentDialogOpen(false);
      if (agent?.id) {
        setSelectedAgentForForm(String(agent.id));
      }
      toast({
        title: "Agent Created",
        description: "Agent has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create agent",
        variant: "destructive",
      });
    },
  });

  // Update landlord mutation
  const updateLandlordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditLandlordFormData }) => {
      const agentIdForPayload = isAgentUser
        ? String(currentUser?.id || "")
        : selectedAgentForForm || undefined;
      const response = await apiRequest("PUT", `/api/landlords/${id}`, {
        username: data.username,
        fullName: data.fullName,
        phone: data.phone,
        idNumber: data.idNumber || undefined,
        propertyLimit: data.propertyLimit,
        adminId: agentIdForPayload || undefined,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landlords"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      editForm.reset();
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      toast({
        title: "Customer Updated",
        description: "Customer has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  // Delete landlord mutation
  const deleteLandlordMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/landlords/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landlords"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setSelectedCustomers([]);
      toast({
        title: "Customer Deleted",
        description: "Customer has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  // Send login details mutation
  const sendLoginDetailsMutation = useMutation({
    mutationFn: async ({ id, generateNew }: { id: string; generateNew: boolean }) => {
      const response = await apiRequest("POST", `/api/landlords/${id}/send-login-details`, {
        generateNewPassword: generateNew,
      });
      return await response.json();
    },
    onSuccess: () => {
      setIsSendLoginDialogOpen(false);
      setSendingLoginTo(null);
      toast({
        title: "Login Details Sent",
        description: "Login credentials have been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send login details",
        variant: "destructive",
      });
    },
  });

  // Filter landlords based on search term
  const filteredLandlords = landlords.filter((landlord: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      landlord.username?.toLowerCase().includes(searchLower) ||
      landlord.id?.toLowerCase().includes(searchLower)
    );
  });

  // Get properties for a specific landlord
  const getPropertiesForLandlord = (landlordId: string) => {
    return allProperties.filter((property: any) => {
      const propertyLandlordId = property.landlord_id ?? property.landlordId;
      return propertyLandlordId === landlordId;
    });
  };

  // Handle customer selection
  const handleToggleCustomer = (customerId: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredLandlords.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredLandlords.map((l: any) => l.id));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    // Filter out customers with properties
    const customersWithProperties = selectedCustomers.filter((id) => {
      const properties = getPropertiesForLandlord(id);
      return properties.length > 0;
    });

    if (customersWithProperties.length > 0) {
      toast({
        title: "Cannot Delete",
        description: "Some selected customers have properties and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    // Delete all selected customers with undo window
    selectedCustomers.forEach((id) => {
      const landlord = landlords.find((item: any) => item.id === id);
      scheduleDelete({
        key: `customer-${id}`,
        label: landlord?.username || landlord?.fullName || "Customer",
        onDelete: () => deleteLandlordMutation.mutate(id),
      });
    });
  };

  // Handle bulk send login details
  const handleBulkSendLogin = () => {
    selectedCustomers.forEach((id) => {
      sendLoginDetailsMutation.mutate({ id, generateNew: false });
    });
  };

  // Handle edit customer
  const handleEditCustomer = (customer: any) => {
    const properties = getPropertiesForLandlord(customer.id);
    const primaryProperty = properties[0];
    const fallbackName = primaryProperty?.landlord_name ?? primaryProperty?.landlordName ?? "";
    const fallbackPhone = primaryProperty?.landlord_phone ?? primaryProperty?.landlordPhone ?? "";
    const ownerAgentId = customer.admin_id ?? customer.adminId ?? selectedAgentForForm;
    setEditingCustomer(customer);
    editForm.reset({
      username: customer.username || "",
      fullName: customer.fullName || customer.full_name || fallbackName,
      phone: customer.phone || customer.landlord_phone || fallbackPhone,
      idNumber: customer.idNumber || customer.id_number || "",
      propertyLimit:
        customer.propertyLimit ??
        customer.property_limit ??
        undefined,
    });
    if (isAgentUser && currentUser?.id) {
      setSelectedAgentForForm(String(currentUser.id));
    } else if (isSuperAdmin && ownerAgentId) {
      setSelectedAgentForForm(String(ownerAgentId));
    }
    setIsEditDialogOpen(true);
  };

  // Handle "Login as Client" - apply filters and route to admin portal
  const handleLoginAsClient = (customerId: string) => {
    const properties = getPropertiesForLandlord(customerId);
    setSelectedLandlordId(String(customerId));
    if (properties.length === 1 && properties[0]?.id) {
      setSelectedPropertyId(String(properties[0].id));
    } else {
      setSelectedPropertyId(null);
    }
    setLocation("/portal");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground mt-1">
              Manage customers and their properties
            </p>
            {(selectedLandlordId || selectedPropertyId) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedLandlordId && (
                  <Badge variant="secondary">
                    Client: {selectedLandlordLabel || selectedLandlordId}
                  </Badge>
                )}
                {selectedPropertyId && (
                  <Badge variant="outline">
                    Property: {selectedPropertyLabel || selectedPropertyId}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Admin Dashboard Button */}
            <Button
              variant="outline"
              onClick={() => setLocation("/portal")}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1, 1.1, 1],
                }}
                transition={{ 
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                <motion.div
                  animate={{ rotate: [0, 0, 0, 0, 360] }}
                  transition={{ 
                    rotate: { duration: 5, repeat: Infinity, ease: "easeInOut", times: [0, 0.8, 0.85, 0.9, 1] }
                  }}
                >
                  <Shield className="h-5 w-5 text-primary" />
                </motion.div>
              </motion.div>
              Admin Dashboard
            </Button>
            {selectedCustomers.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleBulkSendLogin}
                  disabled={sendLoginDetailsMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Login Details ({selectedCustomers.length})
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleteLandlordMutation.isPending}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedCustomers.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Customers</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedCustomers.length} customer(s)? 
                        Customers with properties cannot be deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            {isSuperAdmin && (
              <Button variant="outline" onClick={() => setLocation("/agents")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Agents
              </Button>
            )}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    if (isAgentUser && currentUser?.id) {
                      setSelectedAgentForForm(String(currentUser.id));
                    } else if (isSuperAdmin && selectedAgentId) {
                      setSelectedAgentForForm(String(selectedAgentId));
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Customer
                </Button>
              </DialogTrigger>
              <DialogContent className={`vibrant-card ${createDialogPalette.card} ${createDialogPalette.border}`}>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>
                    Create a new customer account. Login credentials will be sent automatically.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form
                    onSubmit={createForm.handleSubmit((data) => {
                      if (isSuperAdmin && !selectedAgentForForm) {
                        toast({
                          title: "Agent Required",
                          description: "Select an agent before creating a customer.",
                          variant: "destructive",
                        });
                        return;
                      }
                      createLandlordMutation.mutate(data);
                    })}
                    className="space-y-4"
                  >
                    {isSuperAdmin && (
                      <FormItem>
                        <FormLabel>Agent <span className="text-destructive">*</span></FormLabel>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <Select
                            value={selectedAgentForForm || ""}
                            onValueChange={(value) => setSelectedAgentForForm(value)}
                          >
                            <SelectTrigger className="w-full">
                              <UserCog className="h-4 w-4 mr-2" />
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {(agents as any[]).map((agent: any) => (
                                <SelectItem key={agent.id} value={String(agent.id)}>
                                  {agent.username}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAgentDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Agent
                          </Button>
                        </div>
                      </FormItem>
                    )}
                    {isAgentUser && (
                      <FormItem>
                        <FormLabel>Agent</FormLabel>
                        <Input value={currentUser?.username || ""} disabled />
                      </FormItem>
                    )}
                    <FormField
                      control={createForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username (Email) <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="customer@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Customer Full Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+254 7XX XXX XXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="propertyLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Limit <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              placeholder="e.g. 10"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="idNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identification Number <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="ID Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createLandlordMutation.isPending}>
                        {createLandlordMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create Customer
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Select All */}
        {filteredLandlords.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedCustomers.length === filteredLandlords.length && filteredLandlords.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label className="text-sm text-muted-foreground cursor-pointer" onClick={handleSelectAll}>
              Select All
            </label>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {/* Customers Grid */}
        {!isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredLandlords.length > 0 ? (
              filteredLandlords.map((landlord: any) => {
                const properties = getPropertiesForLandlord(landlord.id);
                const hasProperties = properties.length > 0;
                const isSelected = selectedCustomers.includes(landlord.id);
                const palette = getPaletteByKey(
                  String(landlord.id ?? landlord.username ?? properties[0]?.id ?? "client"),
                  sessionPaletteSeed
                );
                const propertyLimit =
                  landlord.propertyLimit ??
                  landlord.property_limit ??
                  null;

                return (
                  <Card 
                    key={landlord.id}
                    className={`cursor-pointer hover:shadow-lg transition-shadow border ${palette.card} ${palette.border} ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => handleLoginAsClient(landlord.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {
                              handleToggleCustomer(landlord.id);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Prevent card click when clicking checkbox
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          />
                          <div className={`p-2 rounded-full ${palette.iconBg}`}>
                            <Users className={`h-5 w-5 ${palette.icon}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{landlord.username || 'N/A'}</CardTitle>
                            <CardDescription>Customer Account</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className={palette.badge}>{landlord.role || 'client'}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {propertyLimit !== null && propertyLimit !== undefined && propertyLimit !== "" && (
                        <div className="text-sm text-muted-foreground">
                          Property limit: {propertyLimit}
                        </div>
                      )}
                      {properties.length > 0 && properties[0] && (
                        <div className="space-y-2">
                          {properties[0].landlordName && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{properties[0].landlordName}</span>
                            </div>
                          )}
                          {properties[0].landlordEmail && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground truncate">{properties[0].landlordEmail}</span>
                            </div>
                          )}
                          {properties[0].landlordPhone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{properties[0].landlordPhone}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Properties Owned:</p>
                        {properties.length > 0 ? (
                          <div className="space-y-2">
                            {properties.map((property: any) => (
                              <div
                                key={property.id}
                                className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{property.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {property.address}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No properties assigned</p>
                        )}
                      </div>
                      <div className="pt-2 border-t flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Total Properties: <span className={`font-semibold ${palette.accentText}`}>{properties.length}</span>
                        </p>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoginAsClient(landlord.id)}
                            title="Login as Client"
                          >
                            <LogIn className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCustomer(landlord)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSendingLoginTo(landlord.id);
                              setIsSendLoginDialogOpen(true);
                            }}
                            title="Reset Password - Send or generate new login credentials"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={hasProperties}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this customer? 
                                  {hasProperties && (
                                    <span className="block mt-2 text-destructive">
                                      This customer has properties and cannot be deleted.
                                    </span>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    scheduleDelete({
                                      key: `customer-${landlord.id}`,
                                      label: landlord.username || landlord.fullName || "Customer",
                                      onDelete: () => deleteLandlordMutation.mutate(landlord.id),
                                    })
                                  }
                                  disabled={hasProperties}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {searchTerm ? 'No customers found matching your search' : 'No customers found'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent className={`vibrant-card ${editDialogPalette.card} ${editDialogPalette.border}`}>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => {
                if (isSuperAdmin && !selectedAgentForForm) {
                  toast({
                    title: "Agent Required",
                    description: "Select an agent before updating a customer.",
                    variant: "destructive",
                  });
                  return;
                }
                if (editingCustomer) {
                  updateLandlordMutation.mutate({ id: editingCustomer.id, data });
                }
              })}
              className="space-y-4"
            >
              {isSuperAdmin && (
                <FormItem>
                  <FormLabel>Agent <span className="text-destructive">*</span></FormLabel>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Select
                      value={selectedAgentForForm || ""}
                      onValueChange={(value) => setSelectedAgentForForm(value)}
                    >
                      <SelectTrigger className="w-full">
                        <UserCog className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {(agents as any[]).map((agent: any) => (
                          <SelectItem key={agent.id} value={String(agent.id)}>
                            {agent.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAgentDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Agent
                    </Button>
                  </div>
                </FormItem>
              )}
              {isAgentUser && (
                <FormItem>
                  <FormLabel>Agent</FormLabel>
                  <Input value={currentUser?.username || ""} disabled />
                </FormItem>
              )}
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Email) <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="customer@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Customer Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+254 7XX XXX XXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="propertyLimit"
                render={({ field }) => (
                  <FormItem>
                  <FormLabel>Property Limit <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="e.g. 10"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                  <FormLabel>Identification Number <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="ID Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateLandlordMutation.isPending}>
                  {updateLandlordMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Agent Dialog (nested) */}
      <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
        <DialogContent className={`vibrant-card ${agentDialogPalette.card} ${agentDialogPalette.border}`}>
          <DialogHeader>
            <DialogTitle>Add New Agent</DialogTitle>
            <DialogDescription>
              Create a new agent account. Login credentials will be sent automatically.
            </DialogDescription>
          </DialogHeader>
          <Form {...agentForm}>
            <form
              onSubmit={agentForm.handleSubmit((data) => createAgentMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={agentForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Email) <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="agent@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={agentForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Agent Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={agentForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+254 7XX XXX XXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={agentForm.control}
                name="propertyLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Limit <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="e.g. 10"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={agentForm.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identification Number <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="ID Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAgentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAgentMutation.isPending}>
                  {createAgentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Agent
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Send Login Details Dialog */}
      <Dialog open={isSendLoginDialogOpen} onOpenChange={setIsSendLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Login Details</DialogTitle>
            <DialogDescription>
              A new password will be generated and sent to the client.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSendLoginDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (sendingLoginTo) {
                  sendLoginDetailsMutation.mutate({
                    id: sendingLoginTo,
                    generateNew: true,
                  });
                }
              }}
              disabled={sendLoginDetailsMutation.isPending}
            >
              {sendLoginDetailsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Login Details
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
