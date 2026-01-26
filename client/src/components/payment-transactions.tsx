import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useFilter } from "@/contexts/FilterContext"
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Loader2,
  Receipt,
  User,
  Building2,
  Calendar,
  DollarSign
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
} from "@/components/ui/alert-dialog"

export function PaymentTransactions() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isAllocateDialogOpen, setIsAllocateDialogOpen] = useState(false)
  const { toast } = useToast()
  const { selectedPropertyId, selectedLandlordId } = useFilter()
  const actionsDisabled = !selectedPropertyId

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading, error: paymentsError } = 
    useQuery({
      queryKey: ["/api/payments", selectedPropertyId, selectedLandlordId],
      queryFn: async () => {
        const params = new URLSearchParams()
        if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
        if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
        const url = `/api/payments${params.toString() ? `?${params}` : ''}`
        const response = await apiRequest("GET", url)
        return await response.json()
      },
    })

  // Fetch tenants for allocation
  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Fetch invoices for allocation
  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoices${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  // Generate receipt mutation
  const generateReceiptMutation = useMutation({
    mutationFn: (paymentId: string) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header to generate receipts.")
      }
      return apiRequest("POST", `/api/payments/${paymentId}/receipt`)
    },
    onSuccess: () => {
      toast({
        title: "Receipt Generated",
        description: "Payment receipt has been generated successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate receipt",
        variant: "destructive",
      })
    },
  })

  // Allocate payment mutation
  const allocatePaymentMutation = useMutation({
    mutationFn: (data: any) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header to allocate payments.")
      }
      return apiRequest("POST", `/api/payments/${selectedPayment.id}/allocate`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] })
      setIsAllocateDialogOpen(false)
      toast({
        title: "Payment Allocated",
        description: "Payment has been allocated successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to allocate payment",
        variant: "destructive",
      })
    },
  })

  // Filter payments
  const filteredPayments = Array.isArray(payments) ? payments.filter((payment: any) => {
    const matchesSearch = 
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) : []

  const handleGenerateReceipt = (paymentId: string) => {
    generateReceiptMutation.mutate(paymentId)
  }

  const handleAllocatePayment = (data: any) => {
    allocatePaymentMutation.mutate(data)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Pending</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (paymentsError) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>Error loading payments: {(paymentsError as any).message}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="payments-title">Payment Transactions</h1>
          <p className="text-muted-foreground">Manage incoming payments and generate receipts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export-payments">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search payments by reference or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Transactions
          </CardTitle>
          <CardDescription>
            {filteredPayments.length} payment(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading payments...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="font-mono font-semibold">
                          KSh {parseFloat(payment.amount).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.reference || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.status)}
                        {getStatusBadge(payment.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment)
                            setIsViewDialogOpen(true)
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateReceipt(payment.id)}
                          disabled={generateReceiptMutation.isPending}
                        >
                          <Receipt className="h-3 w-3 mr-1" />
                          Receipt
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment)
                            setIsAllocateDialogOpen(true)
                          }}
                        >
                          <User className="h-3 w-3 mr-1" />
                          Allocate
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Payment Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the payment transaction
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Date</Label>
                  <p className="text-sm">{new Date(selectedPayment.paymentDate).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm font-mono font-semibold">KSh {parseFloat(selectedPayment.amount).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <p className="text-sm">{selectedPayment.paymentMethod}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reference</Label>
                  <p className="text-sm font-mono">{selectedPayment.reference || "N/A"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedPayment.status)}
                    {getStatusBadge(selectedPayment.status)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm">{selectedPayment.notes || "No notes"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Allocate Payment Dialog */}
      <Dialog open={isAllocateDialogOpen} onOpenChange={setIsAllocateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate Payment</DialogTitle>
            <DialogDescription>
              Assign this payment to a specific tenant and invoice
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Tenant</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(tenants) ? tenants.map((tenant: any) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.fullName}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Invoice (Optional)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an invoice" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(invoices) ? invoices.map((invoice: any) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} - KSh {parseFloat(invoice.amount).toLocaleString()}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAllocateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAllocatePayment({})}
                disabled={allocatePaymentMutation.isPending}
              >
                {allocatePaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Allocate Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
