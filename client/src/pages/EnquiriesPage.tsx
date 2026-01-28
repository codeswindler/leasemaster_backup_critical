import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { FileText, Mail, Phone, Loader2, Trash2, CheckCircle, Clock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function EnquiriesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch all enquiries
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["/api/enquiries"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/enquiries");
      return await response.json();
    },
  });

  // Update enquiry status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/enquiries/${id}`, { status });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Status updated",
        description: "Enquiry status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update enquiry status.",
        variant: "destructive",
      });
    },
  });

  // Delete enquiry mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/enquiries/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Enquiry deleted",
        description: "Enquiry has been deleted successfully.",
      });
      setDeleteDialogOpen(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete enquiry.",
        variant: "destructive",
      });
    },
  });

  // Filter enquiries by status
  const filteredEnquiries = enquiries.filter((enquiry: any) => {
    if (statusFilter === "all") return true;
    return enquiry.status === statusFilter;
  });

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="default">New</Badge>;
      case "read":
        return <Badge variant="secondary">Read</Badge>;
      case "responded":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Responded
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enquiries Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all property enquiries from the landing page
          </p>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Enquiries</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Enquiries Table */}
      {!isLoading && (
        <>
          {filteredEnquiries.length > 0 ? (
            <div className="space-y-4">
              {filteredEnquiries.map((enquiry: any) => (
                <Card key={enquiry.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{enquiry.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {enquiry.email}
                          </span>
                          {enquiry.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {enquiry.phone}
                            </span>
                          )}
                          {enquiry.createdAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(enquiry.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(enquiry.status)}
                      </div>
                    </div>
                  </CardHeader>
                  {enquiry.message && (
                    <CardContent>
                      <CardDescription className="mb-4">Message:</CardDescription>
                      <p className="text-sm whitespace-pre-wrap">{enquiry.message}</p>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (enquiry.status === "new") {
                              updateStatusMutation.mutate({ id: enquiry.id, status: "read" });
                            } else if (enquiry.status === "read") {
                              updateStatusMutation.mutate({ id: enquiry.id, status: "responded" });
                            }
                          }}
                          disabled={updateStatusMutation.isPending || enquiry.status === "responded"}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {enquiry.status === "new"
                            ? "Mark as Read"
                            : enquiry.status === "read"
                            ? "Mark as Responded"
                            : "Responded"}
                        </Button>
                        <AlertDialog
                          open={deleteDialogOpen === enquiry.id}
                          onOpenChange={(open) => setDeleteDialogOpen(open ? enquiry.id : null)}
                        >
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the
                                enquiry from the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(enquiry.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {statusFilter === "all"
                ? "No enquiries found"
                : `No ${statusFilter} enquiries found`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
