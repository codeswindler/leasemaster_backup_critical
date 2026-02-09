import { useMemo, useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useFilter } from "@/contexts/FilterContext"
import { formatDateWithOffset, usePropertyTimezoneOffset } from "@/lib/timezone"
import {
  FileText,
  Plus,
  Eye,
  Download,
  Edit,
  Trash,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
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
  property?: string
  propertyId?: string
  category: string
  amount: number
  totalPaid?: number
  balance?: number
  dueDate: string
  issueDate: string
  status: "draft" | "pending" | "paid" | "overdue"
  accountNumber?: string
  description?: string
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
  const { selectedAgentId, selectedPropertyId, selectedLandlordId } = useFilter()
  const { timezoneOffsetMinutes } = usePropertyTimezoneOffset()
  const isLandlordSelected = !!selectedLandlordId && selectedLandlordId !== "all"
  const actionsDisabled = !selectedPropertyId || !isLandlordSelected
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<any>(null)
  const [billForm, setBillForm] = useState({
    vendor: "",
    propertyId: selectedPropertyId || "",
    category: "",
    amount: "",
    dueDate: "",
    accountNumber: "",
    description: "",
  })
  const [paymentData, setPaymentData] = useState({
    billId: "",
    amount: "",
    method: "mpesa",
    reference: ""
  })

  const { data: propertiesData = [] } = useQuery({
    queryKey: ["/api/properties", selectedLandlordId, selectedPropertyId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })

  // Fetch bills from API
  const { data: bills = [], isLoading: billsLoading, error: billsError } = useQuery<Bill[]>({
    queryKey: ["/api/bills", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/bills${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: isLandlordSelected,
  })

  const { data: invoiceSettings } = useQuery({
    queryKey: ["/api/settings/invoice", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/settings/invoice${params.toString() ? `?${params}` : ""}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: isLandlordSelected,
  })

  const createBillMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (actionsDisabled) {
        throw new Error("Select a client and property in the header to add bills.")
      }
      const response = await apiRequest("POST", "/api/bills", payload)
      return await response.json()
    },
    onSuccess: () => {
      toast({
        title: "Bill Added",
        description: "Bill created successfully.",
      })
      setIsAddDialogOpen(false)
      setBillForm({
        vendor: "",
        propertyId: selectedPropertyId || "",
        category: "",
        amount: "",
        dueDate: "",
        accountNumber: "",
        description: "",
      })
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] })
    },
    onError: (error: any) => {
      toast({
        title: "Add Bill Failed",
        description: error.message || "Unable to add bill.",
        variant: "destructive",
      })
    },
  })

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (actionsDisabled) {
        throw new Error("Select a client and property in the header to record bill payments.")
      }
      const payload = {
        amount: parseFloat(data.amount),
        method: data.method,
        reference: data.reference || null,
        paymentDate: new Date().toISOString().slice(0, 10),
      }
      const response = await apiRequest("POST", `/api/bills/${data.billId}/payments`, payload)
      return await response.json()
    },
    onSuccess: (payment) => {
      const paidAmount = Number(payment?.amount ?? paymentData.amount ?? 0)
      toast({
        title: "Payment Successful",
        description: `Payment of KSh ${paidAmount.toLocaleString()} has been processed successfully.`,
      })
      setIsPaymentDialogOpen(false)
      setPaymentData({ billId: "", amount: "", method: "mpesa", reference: "" })
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] })
      queryClient.invalidateQueries({ queryKey: ["/api/bill-payments"] })
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
      const response = await apiRequest("PUT", `/api/bills/${billId}`, { status })
      return await response.json()
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
      amount: String(bill.balance ?? bill.amount),
      method: "mpesa",
      reference: ""
    })
    setIsPaymentDialogOpen(true)
  }

  const { data: billPayments = [] } = useQuery({
    queryKey: ["/api/bill-payments", selectedBill?.id],
    queryFn: async () => {
      if (!selectedBill?.id) return []
      const response = await apiRequest("GET", `/api/bill-payments?billId=${selectedBill.id}`)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: Boolean(selectedBill?.id) && isViewDialogOpen,
  })

  const handleDownloadBillReceipt = (bill: any) => {
    const doc = new jsPDF()
    const companyName = invoiceSettings?.company_name ?? invoiceSettings?.companyName ?? "Company"
    const companyEmail = invoiceSettings?.company_email ?? invoiceSettings?.companyEmail ?? ""
    const companyPhone = invoiceSettings?.company_phone ?? invoiceSettings?.companyPhone ?? ""
    const companyAddress = invoiceSettings?.company_address ?? invoiceSettings?.companyAddress ?? ""
    const billTotalPaid = Number(bill.totalPaid ?? 0)
    const billBalance = Number(bill.balance ?? (bill.amount - billTotalPaid))

    doc.setFontSize(16)
    doc.text("Bill Receipt", 14, 18)
    doc.setFontSize(10)
    doc.text(companyName, 14, 26)
    if (companyAddress) doc.text(companyAddress, 14, 31)
    if (companyEmail) doc.text(companyEmail, 14, 36)
    if (companyPhone) doc.text(companyPhone, 14, 41)

    doc.setFontSize(11)
    doc.text(`Bill ID: ${bill.id}`, 14, 52)
    doc.text(`Vendor: ${bill.vendor}`, 14, 58)
    doc.text(`Property: ${bill.property ?? "-"}`, 14, 64)
    doc.text(`Category: ${bill.category}`, 14, 70)
    doc.text(`Issue Date: ${bill.issueDate}`, 14, 76)
    doc.text(`Due Date: ${bill.dueDate}`, 14, 82)

    autoTable(doc, {
      startY: 88,
      head: [["Amount", "Total Paid", "Balance"]],
      body: [[
        `KSh ${bill.amount.toLocaleString()}`,
        `KSh ${billTotalPaid.toLocaleString()}`,
        `KSh ${billBalance.toLocaleString()}`
      ]]
    })

    const paymentRows = billPayments.map((payment: any) => ([
      payment.payment_date ?? payment.paymentDate ?? "",
      (payment.method ?? "").toUpperCase(),
      `KSh ${Number(payment.amount ?? 0).toLocaleString()}`,
      payment.reference ?? ""
    ]))

    if (paymentRows.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Payment Date", "Method", "Amount", "Reference"]],
        body: paymentRows
      })
    }

    doc.save(`bill-${bill.id}.pdf`)
  }

  const propertyMap = Array.isArray(propertiesData)
    ? propertiesData.reduce<Record<string, any>>((acc, property: any) => {
        acc[String(property.id)] = property
        return acc
      }, {})
    : {}

  const normalizedBills = Array.isArray(bills)
    ? bills.map((bill: any) => {
        const amount = Number(bill.amount ?? 0)
        const totalPaid = Number(bill.total_paid ?? bill.totalPaid ?? 0)
        return {
          ...bill,
          vendor: bill.vendor ?? bill.vendor_name ?? "",
          propertyId: bill.propertyId ?? bill.property_id ?? "",
          property: bill.property ?? propertyMap[String(bill.propertyId ?? bill.property_id)]?.name ?? "No property",
          category: bill.category ?? "",
          amount,
          totalPaid,
          balance: Number(bill.balance ?? (amount - totalPaid)),
          dueDate: bill.dueDate ?? bill.due_date ?? "",
          issueDate: bill.issueDate ?? bill.issue_date ?? "",
          status: (bill.status ?? "draft").toLowerCase(),
          accountNumber: bill.accountNumber ?? bill.account_number ?? "",
          description: bill.description ?? "",
        }
      })
    : []

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

  const filteredBills = normalizedBills.filter(bill => {
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
    if (!billForm.vendor || !billForm.propertyId || !billForm.category || !billForm.amount || !billForm.dueDate) {
      toast({
        title: "Missing Information",
        description: "Please complete all required bill fields.",
        variant: "destructive",
      })
      return
    }
    createBillMutation.mutate({
      vendor: billForm.vendor,
      propertyId: billForm.propertyId,
      landlordId: selectedLandlordId,
      category: billForm.category,
      amount: parseFloat(billForm.amount),
      dueDate: billForm.dueDate,
      accountNumber: billForm.accountNumber || null,
      description: billForm.description || null,
    })
  }

  const statusCounts = {
    all: normalizedBills.length,
    draft: normalizedBills.filter(bill => bill.status === "draft").length,
    pending: normalizedBills.filter(bill => bill.status === "pending").length,
    paid: normalizedBills.filter(bill => bill.status === "paid").length,
    overdue: normalizedBills.filter(bill => bill.status === "overdue").length
  }

  if (actionsDisabled) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="bills-title">Bills</h1>
            <p className="text-muted-foreground">Manage property expenses and vendor bills</p>
          </div>
        </div>
        <Card className={`vibrant-card ${billsCardVariants[(billsCardSeed + 2) % billsCardVariants.length]}`}>
          <CardContent className="p-6">
            <div className="rounded-xl border border-white/5 bg-slate-900/30 px-6 py-8">
              <div className="mx-auto max-w-xl text-center space-y-2">
                <div className="flex items-center justify-center">
                  <span
                    className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold shadow-sm animate-pulse ${
                      billsCardVariants[billsCardSeed % billsCardVariants.length]
                    }`}
                  >
                    Please select a client and property filter first.
                  </span>
                </div>
                <div className="text-sm text-muted-foreground animate-[pulse_2.2s_ease-in-out_infinite]">
                  Apply filters in the top nav so I can fetch bills.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
          <DialogContent
            className={`sm:max-w-[500px] vibrant-card ${billsCardVariants[(billsCardSeed + 3) % billsCardVariants.length]}`}
          >
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
                  value={billForm.vendor}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, vendor: e.target.value }))}
                  data-testid="input-vendor"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="property">Property</Label>
                <Select
                  value={billForm.propertyId}
                  onValueChange={(value) => setBillForm((prev) => ({ ...prev, propertyId: value }))}
                >
                  <SelectTrigger data-testid="select-property">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertiesData.map((property: any) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={billForm.category}
                  onValueChange={(value) => setBillForm((prev) => ({ ...prev, category: value }))}
                >
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
                  value={billForm.amount}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, amount: e.target.value }))}
                  data-testid="input-amount"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={billForm.dueDate}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  data-testid="input-due-date"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-number">Account Number</Label>
                <Input
                  id="account-number"
                  placeholder="Vendor account number"
                  value={billForm.accountNumber}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                  data-testid="input-account-number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Bill description or notes"
                  rows={3}
                  value={billForm.description}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, description: e.target.value }))}
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
            Showing {filteredBills.length} of {normalizedBills.length} bills
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
              <TableHead>Balance</TableHead>
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
                <TableCell className="font-mono">KSh {Number(bill.balance ?? 0).toLocaleString()}</TableCell>
                <TableCell>{formatDateWithOffset(bill.dueDate, timezoneOffsetMinutes)}</TableCell>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`button-download-${bill.id}`}
                      onClick={() => handleDownloadBillReceipt(bill)}
                    >
                      <Download className="h-4 w-4" />
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
                  <Select
                    value={paymentData.billId}
                    onValueChange={(value) => {
                      const bill = normalizedBills.find((entry) => entry.id === value)
                      setPaymentData((prev) => ({
                        ...prev,
                        billId: value,
                        amount: bill ? String(bill.amount) : prev.amount,
                      }))
                    }}
                  >
                    <SelectTrigger id="bill-select">
                      <SelectValue placeholder="Choose a bill to pay" />
                    </SelectTrigger>
                    <SelectContent>
                      {normalizedBills.filter(bill => bill.status === "pending").map((bill) => (
                        <SelectItem key={bill.id} value={bill.id}>
                          {bill.id} - {bill.vendor} - KSh {Number(bill.balance ?? bill.amount).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select
                    value={paymentData.method}
                    onValueChange={(value) => setPaymentData((prev) => ({ ...prev, method: value }))}
                  >
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
                  <Label htmlFor="payment-amount">Payment Amount</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    min="0"
                    placeholder="Enter amount to pay"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="payment-reference">Payment Reference</Label>
                  <Input 
                    id="payment-reference" 
                    placeholder="Enter payment reference or transaction ID"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData((prev) => ({ ...prev, reference: e.target.value }))}
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
                    KSh {normalizedBills
                      .filter(bill => bill.status === "pending")
                      .reduce((sum, bill) => sum + Number(bill.balance ?? 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Overdue Bills</span>
                  <span className="font-mono font-semibold text-destructive">
                    KSh {normalizedBills
                      .filter(bill => bill.status === "overdue")
                      .reduce((sum, bill) => sum + Number(bill.balance ?? 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <span className="text-sm font-medium">Paid This Month</span>
                  <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                    KSh {normalizedBills.filter(bill => bill.status === "paid").reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}
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

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className={`sm:max-w-[600px] vibrant-card ${billsCardVariants[(billsCardSeed + 4) % billsCardVariants.length]}`}>
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
            <DialogDescription>View bill details and download a receipt.</DialogDescription>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Bill ID</div>
                  <div className="font-mono">{selectedBill.id}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Vendor</div>
                  <div className="font-medium">{selectedBill.vendor}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Property</div>
                  <div>{selectedBill.property}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Category</div>
                  <div>{selectedBill.category}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Amount</div>
                  <div className="font-mono">KSh {selectedBill.amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Balance</div>
                  <div className="font-mono">KSh {Number(selectedBill.balance ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Issue Date</div>
                  <div>{formatDateWithOffset(selectedBill.issueDate, timezoneOffsetMinutes)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Due Date</div>
                  <div>{formatDateWithOffset(selectedBill.dueDate, timezoneOffsetMinutes)}</div>
                </div>
                {selectedBill.accountNumber && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Account Number</div>
                    <div>{selectedBill.accountNumber}</div>
                  </div>
                )}
              </div>
              {selectedBill.description && (
                <div className="text-sm">
                  <div className="text-muted-foreground">Description</div>
                  <div>{selectedBill.description}</div>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => handleDownloadBillReceipt(selectedBill)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Payments</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billPayments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                          No payments recorded for this bill.
                        </TableCell>
                      </TableRow>
                    )}
                    {billPayments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDateWithOffset(payment.payment_date ?? payment.paymentDate ?? "", timezoneOffsetMinutes)}</TableCell>
                        <TableCell>{(payment.method ?? "").toUpperCase()}</TableCell>
                        <TableCell>KSh {Number(payment.amount ?? 0).toLocaleString()}</TableCell>
                        <TableCell>{payment.reference ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}