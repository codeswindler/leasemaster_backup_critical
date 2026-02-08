import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Search, Mail, Phone, Loader2, Plus, Send, Edit, Trash2, LogIn, Shield, UserPlus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { getPaletteByKey, getSessionSeed } from "@/lib/palette";
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

type AgentFormData = z.infer<typeof agentSchema>;

export function AgentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [sendingLoginTo, setSendingLoginTo] = useState<string | null>(null);
  const [isSendLoginDialogOpen, setIsSendLoginDialogOpen] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { setSelectedAgentId, setSelectedLandlordId, setSelectedPropertyId } = useFilter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionPaletteSeed = useMemo(() => getSessionSeed("agent-cards"), []);
  const headerPaletteSeed = useMemo(() => Math.floor(Math.random() * 1_000_000), []);
  const headerPalette = useMemo(
    () => getPaletteByKey("agents-header-actions", headerPaletteSeed),
    [headerPaletteSeed]
  );
  const dialogPaletteSeed = useMemo(() => Math.floor(Math.random() * 1_000_000), []);
  const createDialogPalette = useMemo(
    () => getPaletteByKey("create-agent-dialog", dialogPaletteSeed),
    [dialogPaletteSeed]
  );
  const editDialogPalette = useMemo(
    () => getPaletteByKey("edit-agent-dialog", dialogPaletteSeed),
    [dialogPaletteSeed]
  );

  const createForm = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      username: "",
      fullName: "",
      phone: "",
      idNumber: "",
      propertyLimit: undefined,
    },
  });

  const editForm = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      username: "",
      fullName: "",
      phone: "",
      idNumber: "",
      propertyLimit: undefined,
    },
  });

  const normalizeId = (value: any) => (value === null || value === undefined ? null : String(value));

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["/api/users", "agents"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users?role=agent");
      return await response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: landlordsForCount = [] } = useQuery({
    queryKey: ["/api/landlords", "agents-summary"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/landlords");
      return await response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: propertiesForCount = [] } = useQuery({
    queryKey: ["/api/properties", "agents-summary"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/properties");
      return await response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const propertyCountsByAgent = useMemo(() => {
    const landlordToAgent = new Map<string, string>();
    (Array.isArray(landlordsForCount) ? landlordsForCount : []).forEach((landlord: any) => {
      const landlordId = normalizeId(landlord.id);
      const agentId = normalizeId(landlord.admin_id ?? landlord.adminId);
      if (landlordId && agentId) {
        landlordToAgent.set(landlordId, agentId);
      }
    });

    const counts = new Map<string, number>();
    (Array.isArray(propertiesForCount) ? propertiesForCount : []).forEach((property: any) => {
      const landlordId = normalizeId(property.landlord_id ?? property.landlordId);
      if (!landlordId) return;
      const agentId = landlordToAgent.get(landlordId);
      if (!agentId) return;
      counts.set(agentId, (counts.get(agentId) || 0) + 1);
    });
    return counts;
  }, [landlordsForCount, propertiesForCount]);

  const filteredAgents = useMemo(() => {
    if (!Array.isArray(agents)) return [];
    if (!searchTerm) return agents;
    const searchLower = searchTerm.toLowerCase();
    return agents.filter((agent: any) => {
      return (
        agent.username?.toLowerCase().includes(searchLower) ||
        agent.full_name?.toLowerCase().includes(searchLower) ||
        agent.fullName?.toLowerCase().includes(searchLower) ||
        agent.phone?.includes(searchLower)
      );
    });
  }, [agents, searchTerm]);

  const createAgentMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      const response = await apiRequest("POST", "/api/users", {
        username: data.username,
        fullName: data.fullName,
        phone: data.phone,
        idNumber: data.idNumber || null,
        propertyLimit: data.propertyLimit ?? null,
        role: "agent",
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Agent created",
        description: data?.generatedPassword
          ? `Temporary password: ${data.generatedPassword}`
          : "Agent created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      createForm.reset();
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Agent creation failed",
        description: error?.message || "Unable to create agent.",
        variant: "destructive",
      });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async (payload: { id: string; data: AgentFormData }) => {
      const response = await apiRequest("PUT", `/api/users/${payload.id}`, {
        username: payload.data.username,
        fullName: payload.data.fullName,
        phone: payload.data.phone,
        idNumber: payload.data.idNumber || null,
        propertyLimit: payload.data.propertyLimit ?? null,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Agent updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setEditingAgent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Agent update failed",
        description: error?.message || "Unable to update agent.",
        variant: "destructive",
      });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      await apiRequest("DELETE", `/api/users/${agentId}`);
    },
    onSuccess: () => {
      toast({ title: "Agent deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Agent delete failed",
        description: error?.message || "Unable to delete agent.",
        variant: "destructive",
      });
    },
  });

  const sendLoginMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const response = await apiRequest("POST", `/api/users/${agentId}/send-login-details`);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Login details sent" });
      setIsSendLoginDialogOpen(false);
      setSendingLoginTo(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send login details",
        description: error?.message || "Unable to send login details.",
        variant: "destructive",
      });
    },
  });

  const handleToggleAgent = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAgents.length === filteredAgents.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(filteredAgents.map((agent: any) => String(agent.id)));
    }
  };

  const handleOpenEdit = (agent: any) => {
    setEditingAgent(agent);
    editForm.reset({
      username: agent.username || "",
      fullName: agent.full_name || agent.fullName || "",
      phone: agent.phone || "",
      idNumber: agent.id_number || agent.idNumber || "",
      propertyLimit: agent.propertyLimit ?? agent.property_limit ?? undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleViewClients = (agentId: string) => {
    setSelectedAgentId(String(agentId));
    setSelectedLandlordId(null);
    setSelectedPropertyId(null);
    setLocation("/clients");
  };

  const handleBackToLobby = () => {
    setSelectedAgentId(null);
    setSelectedLandlordId(null);
    setSelectedPropertyId(null);
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      setLocation("/admin/login");
    } else {
      const rootDomain = hostname.replace(/^(www|admin|agents|portal|clients|enquiries|tenant|tenants)\./, "");
      window.location.href = `${protocol}//admin.${rootDomain}/login`;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agents</h1>
            <p className="text-muted-foreground">Create and manage agent accounts</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleBackToLobby}
              className={`gap-2 border-2 ${headerPalette.border} ${headerPalette.accentBg} ${headerPalette.accentText}`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Lobby
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/portal")}
              className={`flex items-center gap-2 border-2 ${headerPalette.border} ${headerPalette.accentBg} ${headerPalette.accentText}`}
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
                    rotate: { duration: 5, repeat: Infinity, ease: "easeInOut", times: [0, 0.8, 0.85, 0.9, 1] },
                  }}
                >
                  <Shield className="h-5 w-5 text-primary" />
                </motion.div>
              </motion.div>
              Admin Dashboard
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className={`gap-2 border-2 ${headerPalette.border} ${headerPalette.accentBg} ${headerPalette.accentText}`}>
                  <Plus className="h-4 w-4" />
                  Add New Agent
                </Button>
              </DialogTrigger>
              <DialogContent className={`vibrant-card ${createDialogPalette.card} ${createDialogPalette.border}`}>
                <DialogHeader>
                  <DialogTitle>Add New Agent</DialogTitle>
                  <DialogDescription>
                    Create a new agent account. Login credentials will be sent automatically.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form
                    onSubmit={createForm.handleSubmit((values) => createAgentMutation.mutate(values))}
                    className="space-y-4"
                  >
                    <FormField
                      control={createForm.control}
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
                      control={createForm.control}
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
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={selectedAgents.length === filteredAgents.length && filteredAgents.length > 0} onCheckedChange={handleSelectAll} />
            <span className="text-sm text-muted-foreground">Select All</span>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {!isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent: any) => {
                const isSelected = selectedAgents.includes(String(agent.id));
                const palette = getPaletteByKey(
                  String(agent.id ?? agent.username ?? "agent"),
                  sessionPaletteSeed
                );
                const propertyLimit = agent.property_limit ?? agent.propertyLimit ?? null;
                const propertyCount = propertyCountsByAgent.get(String(agent.id)) || 0;

                return (
                  <Card
                    key={agent.id}
                    className={`border ${palette.card} ${palette.border} ${isSelected ? "ring-2 ring-primary" : ""}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleAgent(String(agent.id))}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          />
                          <div className={`p-2 rounded-full ${palette.iconBg}`}>
                            <Users className={`h-5 w-5 ${palette.icon}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{agent.full_name || agent.fullName || agent.username}</CardTitle>
                            <CardDescription>Agent Account</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className={palette.badge}>agent</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{agent.username || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{agent.phone || "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Properties</span>
                          <span className="font-medium text-foreground">
                            {propertyLimit !== null && propertyLimit !== undefined && propertyLimit !== ""
                              ? `${propertyCount} / ${propertyLimit}`
                              : `${propertyCount}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewClients(String(agent.id))}
                          title="View Clients"
                        >
                          <LogIn className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSendingLoginTo(String(agent.id));
                            setIsSendLoginDialogOpen(true);
                          }}
                          title="Send Login"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(agent)}
                          title="Edit Agent"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingAgentId(String(agent.id))}
                          title="Delete Agent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12 text-muted-foreground col-span-full">
                {searchTerm ? "No agents found matching your search" : "No agents found"}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={`vibrant-card ${editDialogPalette.card} ${editDialogPalette.border}`}>
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>Update agent details.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((values) =>
                editingAgent?.id ? updateAgentMutation.mutate({ id: String(editingAgent.id), data: values }) : null
              )}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
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
                control={editForm.control}
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
                <Button type="submit" disabled={updateAgentMutation.isPending}>
                  {updateAgentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isSendLoginDialogOpen} onOpenChange={setIsSendLoginDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send login details?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a temporary password to the agent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSendingLoginTo(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendingLoginTo && sendLoginMutation.mutate(sendingLoginTo)}
            >
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingAgentId} onOpenChange={() => setDeletingAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingAgentId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingAgentId) {
                  deleteAgentMutation.mutate(deletingAgentId);
                }
                setDeletingAgentId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
