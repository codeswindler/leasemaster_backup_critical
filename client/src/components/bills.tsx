import { useMemo, useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useFilter } from "@/contexts/FilterContext"
import { 
  FileText, 
  Plus, 
  Eye,
  Edit,
  Trash,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2
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
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Bill = {
  id: string
  vendor: string
  property: string
  category: string
  amount: number
  dueDate: string
  issueDate: string
  status: "draft" | "pending" | "paid" | "overdue"
  accountNumber: string
}

export function Bills() {
  const billsCardVariants = [
    "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-blue-900/50",
    "bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-emerald-900/50",
    "bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-rose-900/50",
    "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-amber-900/50",
    "bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-violet-900/50",
    "bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-cyan-900/50",
  ]
  const billsCardSeed = useMemo(
    () => Math.floor(Math.random() * billsCardVariants.length),
    []
  )
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { selectedPropertyId, selectedLandlordId } = useFilter()
  const isLandlordSelected = !!selectedLandlordId && selectedLandlordId !== "all"
  const actionsDisabled = !selectedPropertyId || !isLandlordSelected
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<any>(null)
  const [paymentData, setPaymentData] = useState({
    billId: "",
    amount: "",
    method: "mpesa",
    reference: ""
  })

  // Mock bills data (keeping for fallback)
  const mockBills: Bill[] = [
    {
      id: "BILL-2024-001",
      vendor: "Kenya Power & Lighting",
      property: "BigRock Apartments",
      category: "Electricity",
      amount: 45000,
      dueDate: "2024-12-31",
      issueDate: "2024-12-01",
      status: "pending",
      accountNumber: "1234567890"
    },
    {
      id: "BILL-2024-002",
      vendor: "Nairobi Water & Sewerage",
      property: "Riverside Complex",
      category: "Water",
      amount: 28000,
      dueDate: "2024-12-28",
      issueDate: "2024-11-28",
      status: "overdue",
      accountNumber: "WS789012345"
    },
    {
      id: "BILL-2024-003",
      vendor: "SecureGuard Services",
      property: "Garden View Estates",
      category: "Security",
      amount: 15000,
      dueDate: "2025-01-15",
      issueDate: "2024-12-15",
      status: "draft",
      accountNumber: "SG2024001"
    },
    {
      id: "BILL-2024-004",
      vendor: "CleanCorp Services",
      property: "All Properties",
      category: "Maintenance",
      amount: 12000,
      dueDate: "2024-12-20",
      issueDate: "2024-12-05",
      status: "paid",
      accountNumber: "CC456789"
    }
  ]

  // Fetch bills from API (using mock data for now since we don't have bills API)
  const { data: bills = [], isLoading: billsLoading, error: billsError } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bills")
      if (!response.ok) {
        return mockBills
      }
      const data = await response.json()
      return Array.isArray(data) ? data : mockBills
    },
    initialData: mockBills,
  })

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (actionsDisabled) {
        throw new Error("Select a client and property in the header to record bill payments.")
      }
      // Mock payment processing
      return Promise.resolve({
        id: `PAY-${Date.now()}`,
        billId: data.billId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        status: "completed",
        timestamp: new Date().toISOString()
      })
    },
    onSuccess: (payment) => {
      toast({
        title: "Payment Successful",
        description: `Payment of KSh ${payment.amount.toLocaleString()} has been processed successfully.`,
      })
      setIsPaymentDialogOpen(false)
      setPaymentData({ billId: "", amount: "", method: "mpesa", reference: "" })
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] })
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      })
    },
  })

  // Bill status update mutation
  const updateBillStatusMutation = useMutation({
    mutationFn: async ({ billId, status }: { billId: string; status: string }) => {
      if (actionsDisabled) {
        throw new Error("Select a client and property in the header to update bills.")
      }
      // Mock status update
      return Promise.resolve({ id: billId, status })
    },
    onSuccess: (updatedBill) => {
      toast({
        title: "Bill Updated",
        description: `Bill status updated to ${updatedBill.status}`,
      })
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] })
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update bill status",
        variant: "destructive",
      })
    },
  })

  // Handlers
  const handleViewBill = (bill: any) => {
    setSelectedBill(bill)
    setIsViewDialogOpen(true)
  }

  const handleEditBill = (bill: any) => {
    setSelectedBill(bill)
    setIsEditDialogOpen(true)
  }

  const handleMakePayment = (bill: any) => {
    if (actionsDisabled) {
      toast({
        title: "Client Required",
        description: "Select a client and property in the header to make payments.",
        variant: "destructive",
      })
      return
    }
    setSelectedBill(bill)
    setPaymentData({
      billId: bill.id,
      amount: bill.amount.toString(),
      method: "mpesa",
      reference: ""
    })
    setIsPaymentDialogOpen(true)
  }

  const handleConfirmDraft = (bill: any) => {
    updateBillStatusMutation.mutate({ billId: bill.id, status: "pending" })
  }

  const handleProcessPayment = () => {
    if (actionsDisabled) {
      toast({
        title: "Client Required",
        description: "Select a client and property in the header to make payments.",
        variant: "destructive",
      })
      return
    }
    if (!paymentData.billId || !paymentData.amount || !paymentData.reference) {
      toast({
        title: "Missing Information",
        description: "Please fill in all payment details",
        variant: "destructive",
      })
      return
    }
    paymentMutation.mutate(paymentData)
  }

  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || bill.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "paid":
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const handleAddBill = () => {
    if (actionsDisabled) {
      toast({
        title: "Client Required",
        description: "Select a client and property in the header to add bills.",
        variant: "destructive",
      })
      return
    }
    console.log("Add bill form submitted")
    setIsAddDialogOpen(false)
  }

  const statusCounts = {
    all: bills.length,
    draft: bills.filter(bill => bill.status === "draft").length,
    pending: bills.filter(bill => bill.status === "pending").length,
    paid: bills.filter(bill => bill.status === "paid").length,
    overdue: bills.filter(bill => bill.status === "overdue").length
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="bills-title">Bills</h1>
          <p className="text-muted-foreground">Manage property expenses and vendor bills</p>
          {!isLandlordSelected && (
            <p className="text-xs text-amber-600 mt-1">Select a client to manage bills.</p>
          )}
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-bill" disabled={actionsDisabled}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Bill</DialogTitle>
              <DialogDescription>
                Enter bill details to track property expenses.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="vendor">Vendor Name</Label>
                <Input
                  id="vendor"
                  placeholder="e.g., Kenya Power & Lighting"
                  data-testid="input-vendor"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="property">Property</Label>
                <Select>
                  <SelectTrigger data-testid="select-property">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    <SelectItem value="bigrock">BigRock Apartments</SelectItem>
                    <SelectItem value="riverside">Riverside Complex</SelectItem>
                    <SelectItem value="garden">Garden View Estates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electricity">Electricity</SelectItem>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter bill amount"
                  data-testid="input-amount"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  data-testid="input-due-date"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-number">Account Number</Label>
                <Input
                  id="account-number"
                  placeholder="Vendor account number"
                  data-testid="input-account-number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Bill description or notes"
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddBill} disabled={actionsDisabled} data-testid="button-submit-bill">
                Add Bill
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusCounts).map(([status, count], index) => (
          <Card 
            key={status}
            className={`vibrant-card cursor-pointer hover-elevate ${billsCardVariants[(billsCardSeed + index) % billsCardVariants.length]} ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {status === "all" ? "Total" : status}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search bills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-bills"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bills Table */}
      <Card className={`vibrant-card ${billsCardVariants[(billsCardSeed + 5) % billsCardVariants.length]}`}>
        <CardHeader>
          <CardTitle>Bills List</CardTitle>
          <CardDescription>
            Showing {filteredBills.length} of {bills.length} bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill ID</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.id} className="hover-elevate">
                  <TableCell className="font-mono text-sm">{bill.id}</TableCell>
                  <TableCell className="font-medium">{bill.vendor}</TableCell>
                  <TableCell>{bill.property}</TableCell>
                  <TableCell>{bill.category}</TableCell>
                  <TableCell className="font-mono">KSh {bill.amount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(bill.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(bill.status)}
                      {getStatusBadge(bill.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        data-testid={`button-view-${bill.id}`}
                        onClick={() => handleViewBill(bill)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {bill.status === "draft" && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            data-testid={`button-edit-${bill.id}`}
                            onClick={() => handleEditBill(bill)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            data-testid={`button-confirm-${bill.id}`}
                            onClick={() => handleConfirmDraft(bill)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(bill.status === "pending" || bill.status === "overdue") && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          data-testid={`button-pay-${bill.id}`}
                          onClick={() => handleMakePayment(bill)}
                        >
                          <CheckCircle className="h-4 w-4" />
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

      {/* Make Payment Module */}
      <Card className={`vibrant-card ${billsCardVariants[(billsCardSeed + 6) % billsCardVariants.length]}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Make Payment
          </CardTitle>
          <CardDescription>Settle outstanding bills and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Payment Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Payment</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bill-select">Select Bill</Label>
                  <Select>
                    <SelectTrigger id="bill-select">
                      <SelectValue placeholder="Choose a bill to pay" />
                    </SelectTrigger>
                    <SelectContent>
                      {bills.filter(bill => bill.status === "pending").map((bill) => (
                        <SelectItem key={bill.id} value={bill.id}>
                          {bill.id} - {bill.vendor} - KSh {bill.amount.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select>
                    <SelectTrigger id="payment-method">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment-reference">Payment Reference</Label>
                  <Input 
                    id="payment-reference" 
                    placeholder="Enter payment reference or transaction ID"
                  />
                </div>
                <Button
                  className="w-full"
                  data-testid="button-make-payment"
                  onClick={handleProcessPayment}
                  disabled={actionsDisabled}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Make Payment
                </Button>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Total Outstanding Bills</span>
                  <span className="font-mono font-semibold">
                    KSh {bills.filter(bill => bill.status === "pending").reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Overdue Bills</span>
                  <span className="font-mono font-semibold text-destructive">
                    KSh {bills.filter(bill => bill.status === "overdue").reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <span className="text-sm font-medium">Paid This Month</span>
                  <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                    KSh {bills.filter(bill => bill.status === "paid").reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Payment Tips</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Always verify payment references</li>
                  <li>• Keep receipts for accounting</li>
                  <li>• Update bill status after payment</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}