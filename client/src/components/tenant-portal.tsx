import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { 
  AlertTriangle, 
  Receipt, 
  FileText, 
  CreditCard,
  Download,
  Eye,
  Calendar,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  THRESHOLDS,
  getSharePercent,
  getStatusPalette,
  getThresholdPalette,
} from "@/lib/color-rules"

export function TenantPortal() {
  const [selectedTab, setSelectedTab] = useState("invoices")
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isAddRequestDialogOpen, setIsAddRequestDialogOpen] = useState(false)
  const [requestTitle, setRequestTitle] = useState("")
  const [requestDescription, setRequestDescription] = useState("")
  const [requestPriority, setRequestPriority] = useState("medium")
  const [requestFiles, setRequestFiles] = useState<File[]>([])
  const { toast } = useToast()

  // Fetch tenant data from authentication/session
  // For now, tenant ID should come from auth context or session
  // This will be implemented when tenant authentication is added
  const { data: tenantSession } = useQuery({
    queryKey: ["/api/auth/tenant-check"],
    queryFn: async () => {
      const response = await fetch("/api/auth/tenant-check", { credentials: "include" })
      if (response.status === 401) {
        return null
      }
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load tenant session")
      }
      return await response.json()
    },
    retry: false,
  })
  
  const tenantProfile = tenantSession?.tenant ?? null
  const tenantId = tenantProfile?.id || null
  const tenantInfo = {
    name: tenantProfile?.full_name ?? tenantProfile?.fullName ?? "Tenant",
    phone: tenantProfile?.phone ?? "—",
    email: tenantProfile?.email ?? "—",
    property: tenantProfile?.property_name ?? tenantProfile?.propertyName ?? "—",
    unit: tenantProfile?.unit_number ?? tenantProfile?.unitNumber ?? "—",
    address: tenantProfile?.property_address ?? tenantProfile?.propertyAddress ?? "—",
    accountPrefix: tenantProfile?.account_prefix ?? tenantProfile?.accountPrefix ?? "",
  }

  const tenantAccountNumber =
    tenantInfo.accountPrefix && tenantInfo.unit && tenantInfo.unit !== "—"
      ? `${tenantInfo.accountPrefix}${tenantInfo.unit}`
      : "—"

  const { data: leases = [] } = useQuery({
    queryKey: ["/api/leases", tenantId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/leases?tenantId=${tenantId}`)
      return await response.json()
    },
    enabled: Boolean(tenantId),
  })

  const leaseIds = Array.isArray(leases)
    ? leases.map((lease: any) => lease.id).filter(Boolean)
    : []
  const tenantPropertyId = tenantProfile?.property_id ?? tenantProfile?.propertyId ?? null
  const tenantUnitId = tenantProfile?.unit_id ?? tenantProfile?.unitId ?? null

  // Fetch tenant's maintenance requests
  const { data: maintenanceRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: [`/api/maintenance-requests/tenant/${tenantId}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/maintenance-requests/tenant/${tenantId}`)
      return await response.json()
    },
    enabled: Boolean(tenantId),
  })

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      formData.append("title", requestTitle)
      formData.append("description", requestDescription)
      formData.append("priority", requestPriority)
      if (tenantPropertyId) formData.append("propertyId", tenantPropertyId)
      if (tenantUnitId) formData.append("unitId", tenantUnitId)
      requestFiles.forEach((file) => formData.append("media[]", file))

      const response = await fetch("/api/maintenance-requests", {
        method: "POST",
        body: formData,
        credentials: "include",
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to submit request")
      }
      return await response.json()
    },
    onSuccess: () => {
      toast({ title: "Request submitted" })
      setIsAddRequestDialogOpen(false)
      setRequestTitle("")
      setRequestDescription("")
      setRequestPriority("medium")
      setRequestFiles([])
    },
    onError: (error: any) => {
      toast({
        title: "Submit failed",
        description: error.message || "Unable to submit maintenance request.",
        variant: "destructive",
      })
    },
  })

  const handleRequestFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    if (totalSize > 5 * 1024 * 1024) {
      toast({
        title: "Files too large",
        description: "Maintenance uploads must be 5MB or less.",
        variant: "destructive",
      })
      return
    }
    setRequestFiles(files)
  }

  const removeRequestFile = (index: number) => {
    setRequestFiles((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Fetch tenant's invoices
  const { data: invoicesRaw = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["tenant-invoices", tenantId, leaseIds.join(",")],
    queryFn: async () => {
      if (!leaseIds.length) return []
      const results = await Promise.all(
        leaseIds.map(async (leaseId: string) => {
          const response = await apiRequest("GET", `/api/invoices?leaseId=${leaseId}`)
          return await response.json()
        })
      )
      return results.flat()
    },
    enabled: Boolean(tenantId),
  })

  const { data: invoiceItemsRaw = [] } = useQuery({
    queryKey: ["/api/invoice-items", tenantId],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/invoice-items")
      return await response.json()
    },
    enabled: Boolean(tenantId),
  })

  // Fetch tenant's receipts
  const { data: paymentsRaw = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["tenant-payments", tenantId, leaseIds.join(",")],
    queryFn: async () => {
      if (!leaseIds.length) return []
      const results = await Promise.all(
        leaseIds.map(async (leaseId: string) => {
          const response = await apiRequest("GET", `/api/payments?leaseId=${leaseId}`)
          return await response.json()
        })
      )
      return results.flat()
    },
    enabled: Boolean(tenantId),
  })

  const receipts = Array.isArray(paymentsRaw)
    ? paymentsRaw.map((payment: any) => ({
        id: payment.id,
        invoiceId: payment.invoiceId ?? payment.invoice_id ?? null,
        receiptNumber: payment.reference ?? payment.reference_number ?? payment.id,
        paymentDate: payment.paymentDate ?? payment.payment_date,
        amount: payment.amount ?? 0,
        paymentMethod: payment.paymentMethod ?? payment.payment_method ?? "—",
      }))
    : []

  const paymentsByInvoice = receipts.reduce((acc: Record<string, number>, receipt: any) => {
    if (!receipt.invoiceId) return acc
    const amount = Number(receipt.amount) || 0
    acc[receipt.invoiceId] = (acc[receipt.invoiceId] || 0) + amount
    return acc
  }, {})

  const invoices = Array.isArray(invoicesRaw)
    ? invoicesRaw.map((invoice: any) => {
        const amount = Number(invoice.amount ?? invoice.total_amount ?? 0)
        const paidAmount = Number(paymentsByInvoice[invoice.id] ?? 0)
        const balance = Math.max(0, amount - paidAmount)
        const paymentStatus = balance <= 0 && amount > 0
          ? "paid"
          : paidAmount > 0
            ? "partially_paid"
            : "pending"
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number ?? invoice.id,
          description:
            invoice.description ??
            invoice.itemDescription ??
            invoice.item_description ??
            "Invoice",
          amount,
          paidAmount,
          balance,
          dueDate: invoice.dueDate ?? invoice.due_date ?? invoice.issueDate ?? invoice.issue_date,
          status: paymentStatus,
        }
      })
    : []

  const invoiceItems = Array.isArray(invoiceItemsRaw) ? invoiceItemsRaw : []
  const itemsByInvoice = invoiceItems.reduce((acc: Record<string, any[]>, item: any) => {
    const invoiceId = item.invoiceId ?? item.invoice_id
    if (!invoiceId) return acc
    acc[invoiceId] = acc[invoiceId] || []
    acc[invoiceId].push({
      description: item.description ?? item.itemDescription ?? item.item_description ?? "Invoice item",
      amount: Number(item.amount ?? 0),
    })
    return acc
  }, {})

  const totalInvoiceAmount = invoices.reduce((sum: number, invoice: any) => {
    const amount = Number(invoice.amount) || 0
    return sum + amount
  }, 0)
  const totalPayments = receipts.reduce((sum: number, receipt: any) => {
    const amount = Number(receipt.amount) || 0
    return sum + amount
  }, 0)
  const currentBalance = totalInvoiceAmount - totalPayments
  const now = new Date()
  const thisMonthPayments = receipts.reduce((sum: number, receipt: any) => {
    if (!receipt.paymentDate) return sum
    const paymentDate = new Date(receipt.paymentDate)
    if (paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear()) {
      return sum + (Number(receipt.amount) || 0)
    }
    return sum
  }, 0)
  const lastPayment = receipts
    .filter((receipt: any) => receipt.paymentDate)
    .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]

  const latestInvoice = invoices
    .filter((invoice: any) => invoice.dueDate)
    .sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0]

  const latestReceipt = receipts
    .filter((receipt: any) => receipt.paymentDate)
    .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]

  const paymentProgress = totalInvoiceAmount > 0
    ? Math.min(100, Math.round((totalPayments / totalInvoiceAmount) * 100))
    : 0

  const methodCounts = receipts.reduce((acc: Record<string, number>, receipt: any) => {
    const method = receipt.paymentMethod || "Other"
    acc[method] = (acc[method] || 0) + 1
    return acc
  }, {})

  const invoiceItemTotals = invoiceItems.reduce((acc: Record<string, number>, item: any) => {
    const label = item.description ?? "Invoice item"
    acc[label] = (acc[label] || 0) + Number(item.amount || 0)
    return acc
  }, {})

  const stkPushMutation = useMutation({
    mutationFn: async (invoice: any) => {
      const phone = String(tenantInfo.phone || "").replace(/\s+/g, "")
      if (!phone || phone === "—") {
        throw new Error("Tenant phone number is missing.")
      }
      const amount = Number(invoice.balance ?? invoice.amount ?? 0)
      if (!amount || amount <= 0) {
        throw new Error("Invoice balance is already cleared.")
      }
      const response = await apiRequest("POST", "/api/mpesa/stk-push", {
        invoiceId: invoice.id,
        amount,
        phone
      })
      return await response.json()
    },
    onSuccess: () => {
      toast({
        title: "STK Push sent",
        description: "Check your phone to complete the payment.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "STK Push failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    },
  })

  const invoiceCount = invoices.length
  const pendingCount = invoices.filter((invoice: any) => invoice.status === "pending").length
  const partialCount = invoices.filter((invoice: any) => invoice.status === "partially_paid").length
  const paidCount = invoices.filter((invoice: any) => invoice.status === "paid").length
  const receiptsCount = receipts.length
  const outstandingAmount = Math.max(0, totalInvoiceAmount - totalPayments)
  const outstandingPercent = getSharePercent(outstandingAmount, totalInvoiceAmount)
  const tenantCollectionRate = totalInvoiceAmount > 0 ? Math.round(((totalInvoiceAmount - outstandingAmount) / totalInvoiceAmount) * 100) : 0

  const invoiceSummaryPalettes = [
    getThresholdPalette(tenantCollectionRate, THRESHOLDS.ratePercent, "higherBetter"),
    getThresholdPalette(invoiceCount, THRESHOLDS.count, "higherBetter"),
    getStatusPalette("paid"),
    getStatusPalette("partially_paid"),
    getStatusPalette("pending"),
  ]
  const receiptSummaryPalettes = [
    getThresholdPalette(tenantCollectionRate, THRESHOLDS.ratePercent, "higherBetter"),
    getThresholdPalette(receiptsCount, THRESHOLDS.count, "higherBetter"),
    getThresholdPalette(outstandingPercent, THRESHOLDS.vacancyPercent, "lowerBetter"),
  ]
  const statementSummaryPalettes = [
    getThresholdPalette(outstandingPercent, THRESHOLDS.vacancyPercent, "lowerBetter"),
    getThresholdPalette(tenantCollectionRate, THRESHOLDS.ratePercent, "higherBetter"),
    getThresholdPalette(receiptsCount, THRESHOLDS.count, "higherBetter"),
  ]

  const statementRows = [
    ...invoices.flatMap((invoice: any) => {
      const items = itemsByInvoice[invoice.id] || []
      if (items.length === 0) {
        return [{
          date: invoice.dueDate || "",
          type: "Invoice",
          description: invoice.description || "Invoice",
          debit: Number(invoice.amount) || 0,
          credit: 0,
        }]
      }
      return items.map((item) => ({
        date: invoice.dueDate || "",
        type: "Invoice",
        description: `${invoice.invoiceNumber} • ${item.description}`,
        debit: Number(item.amount) || 0,
        credit: 0,
      }))
    }),
    ...receipts.map((receipt: any) => ({
      date: receipt.paymentDate || "",
      type: "Payment",
      description: receipt.paymentMethod || "Payment",
      debit: 0,
      credit: Number(receipt.amount) || 0,
    })),
  ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const exportStatementCsv = () => {
    const headers = ["Date", "Type", "Description", "Debit", "Credit"]
    const rows = statementRows.map((row) => [
      row.date ? new Date(row.date).toLocaleDateString() : "",
      row.type,
      row.description,
      row.debit ? row.debit.toFixed(2) : "",
      row.credit ? row.credit.toFixed(2) : "",
    ])
    const csv = [headers, ...rows].map((line) => line.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "tenant-statement.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const getMediaUrls = (request: any) => {
    const raw = request?.mediaUrls ?? request?.media_urls
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case "in_progress":
        return <Badge variant="secondary" className="bg-blue-500 text-white">In Progress</Badge>
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500 text-white">Pending</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getInvoiceStatusBadge = (status: string) => {
    const normalized = (status || "").toLowerCase()
    if (normalized === "paid") {
        return <Badge variant="default" className="bg-green-500">Paid</Badge>
    }
    if (normalized === "partially_paid") {
      return <Badge variant="outline" className="bg-blue-500 text-white">Partially Paid</Badge>
    }
        return <Badge variant="outline" className="bg-yellow-500 text-white">Pending</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Portal</h1>
          <p className="text-muted-foreground">Welcome back, {tenantInfo.name}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Property</div>
          <div className="font-semibold">{tenantInfo.property} - {tenantInfo.unit}</div>
        </div>
      </div>

      {!tenantId && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Tenant access is not configured yet. Please log in from the tenant portal or contact
            your property manager to activate your account.
          </CardContent>
        </Card>
      )}

      {/* Tenant Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Name</span>
              </div>
              <p className="text-sm">{tenantInfo.name}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Phone</span>
              </div>
              <p className="text-sm">{tenantInfo.phone}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <p className="text-sm">{tenantInfo.email}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Property</span>
              </div>
              <p className="text-sm">{tenantInfo.property}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Unit</span>
              </div>
              <p className="text-sm">{tenantInfo.unit}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Address</span>
              </div>
              <p className="text-sm">{tenantInfo.address}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Account Number</span>
              </div>
              <p className="text-sm">{tenantAccountNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoices
                </CardTitle>
              <CardDescription>Your rent and utility invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className={`p-4 rounded-lg border ${invoiceSummaryPalettes[0].card} ${invoiceSummaryPalettes[0].border}`}>
                  <div className="text-sm text-muted-foreground">Total Invoiced</div>
                  <div className={`text-2xl font-bold ${invoiceSummaryPalettes[0].accentText}`}>
                    KSh {totalInvoiceAmount.toLocaleString()}
                </div>
                            </div>
                <div className={`p-4 rounded-lg border ${invoiceSummaryPalettes[1].card} ${invoiceSummaryPalettes[1].border}`}>
                  <div className="text-sm text-muted-foreground">Invoices</div>
                  <div className={`text-2xl font-bold ${invoiceSummaryPalettes[1].accentText}`}>{invoiceCount}</div>
                          </div>
                <div className={`p-4 rounded-lg border ${invoiceSummaryPalettes[2].card} ${invoiceSummaryPalettes[2].border}`}>
                  <div className="text-sm text-muted-foreground">Paid</div>
                  <div className={`text-2xl font-bold ${invoiceSummaryPalettes[2].accentText}`}>{paidCount}</div>
                          </div>
                <div className={`p-4 rounded-lg border ${invoiceSummaryPalettes[3].card} ${invoiceSummaryPalettes[3].border}`}>
                  <div className="text-sm text-muted-foreground">Partially Paid</div>
                  <div className={`text-2xl font-bold ${invoiceSummaryPalettes[3].accentText}`}>{partialCount}</div>
                          </div>
                <div className={`p-4 rounded-lg border ${invoiceSummaryPalettes[4].card} ${invoiceSummaryPalettes[4].border}`}>
                  <div className="text-sm text-muted-foreground">Pending</div>
                  <div className={`text-2xl font-bold ${invoiceSummaryPalettes[4].accentText}`}>{pendingCount}</div>
                          </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <Card className="border bg-card/80">
            <CardHeader>
                    <CardTitle className="text-base">Latest Invoice</CardTitle>
                    <CardDescription>Most recent invoice issued</CardDescription>
            </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {latestInvoice ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Invoice</span>
                          <span className="font-medium">{latestInvoice.invoiceNumber}</span>
                  </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-mono">KSh {Number(latestInvoice.amount).toLocaleString()}</span>
                  </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Balance</span>
                          <span className="font-mono">KSh {Number(latestInvoice.balance).toLocaleString()}</span>
                  </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Due</span>
                          <span>{latestInvoice.dueDate ? new Date(latestInvoice.dueDate).toLocaleDateString() : "—"}</span>
                </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status</span>
                          {getInvoiceStatusBadge(latestInvoice.status)}
                </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground">No invoices yet.</div>
                    )}
            </CardContent>
          </Card>
                <Card className="border bg-card/80">
            <CardHeader>
                    <CardTitle className="text-base">Payment Progress</CardTitle>
                    <CardDescription>Collected vs invoiced</CardDescription>
            </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Collected</span>
                      <span className="font-mono">KSh {totalPayments.toLocaleString()}</span>
                    </div>
                    <Progress value={paymentProgress} />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Outstanding</span>
                      <span className="font-mono">KSh {outstandingAmount.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading invoices...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                    <TableHead>Balance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(invoices) ? invoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.description}</TableCell>
                        <TableCell className="font-mono">KSh {parseFloat(invoice.amount).toLocaleString()}</TableCell>
                        <TableCell className="font-mono">KSh {parseFloat(invoice.balance).toLocaleString()}</TableCell>
                        <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            {Number(invoice.balance ?? 0) > 0 && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => stkPushMutation.mutate(invoice)}
                                disabled={stkPushMutation.isPending}
                              >
                                Pay Now
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Receipts
              </CardTitle>
              <CardDescription>Your payment confirmations and receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-lg border ${receiptSummaryPalettes[0].card} ${receiptSummaryPalettes[0].border}`}>
                  <div className="text-sm text-muted-foreground">Total Paid</div>
                  <div className={`text-2xl font-bold ${receiptSummaryPalettes[0].accentText}`}>
                    KSh {totalPayments.toLocaleString()}
                  </div>
                </div>
                <div className={`p-4 rounded-lg border ${receiptSummaryPalettes[1].card} ${receiptSummaryPalettes[1].border}`}>
                  <div className="text-sm text-muted-foreground">Receipts</div>
                  <div className={`text-2xl font-bold ${receiptSummaryPalettes[1].accentText}`}>{receiptsCount}</div>
                </div>
                <div className={`p-4 rounded-lg border ${receiptSummaryPalettes[2].card} ${receiptSummaryPalettes[2].border}`}>
                  <div className="text-sm text-muted-foreground">Outstanding</div>
                  <div className={`text-2xl font-bold ${receiptSummaryPalettes[2].accentText}`}>
                    KSh {outstandingAmount.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <Card className="border bg-card/80">
                  <CardHeader>
                    <CardTitle className="text-base">Latest Receipt</CardTitle>
                    <CardDescription>Most recent payment record</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {latestReceipt ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Receipt</span>
                          <span className="font-medium">{latestReceipt.receiptNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-mono">KSh {Number(latestReceipt.amount).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Method</span>
                          <span>{latestReceipt.paymentMethod}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Date</span>
                          <span>{latestReceipt.paymentDate ? new Date(latestReceipt.paymentDate).toLocaleDateString() : "—"}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground">No receipts yet.</div>
                    )}
                  </CardContent>
                </Card>
                <Card className="border bg-card/80">
                  <CardHeader>
                    <CardTitle className="text-base">Payment Methods</CardTitle>
                    <CardDescription>Distribution of receipts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {Object.keys(methodCounts).length ? (
                      Object.entries(methodCounts).map(([method, count]) => (
                        <div key={method} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{method}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">No payment methods yet.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading receipts...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(receipts) ? receipts.map((receipt: any) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-mono text-sm">{receipt.receiptNumber}</TableCell>
                        <TableCell>{new Date(receipt.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono">KSh {parseFloat(receipt.amount).toLocaleString()}</TableCell>
                        <TableCell>{receipt.paymentMethod}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No receipts found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statements Tab */}
        <TabsContent value="statements" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Account Statements
              </CardTitle>
              <Button variant="outline" size="sm" onClick={exportStatementCsv}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <CardDescription>Your account balance and transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg border ${statementSummaryPalettes[0].card} ${statementSummaryPalettes[0].border}`}>
                    <div className={`text-sm ${statementSummaryPalettes[0].accentText}`}>Current Balance</div>
                    <div className={`text-2xl font-bold ${statementSummaryPalettes[0].accentText}`}>
                      KSh {currentBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg border ${statementSummaryPalettes[1].card} ${statementSummaryPalettes[1].border}`}>
                    <div className={`text-sm ${statementSummaryPalettes[1].accentText}`}>This Month</div>
                    <div className={`text-2xl font-bold ${statementSummaryPalettes[1].accentText}`}>
                      KSh {thisMonthPayments.toLocaleString()}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg border ${statementSummaryPalettes[2].card} ${statementSummaryPalettes[2].border}`}>
                    <div className={`text-sm ${statementSummaryPalettes[2].accentText}`}>Last Payment</div>
                    <div className={`text-2xl font-bold ${statementSummaryPalettes[2].accentText}`}>
                      {lastPayment ? `KSh ${Number(lastPayment.amount || 0).toLocaleString()}` : "—"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border bg-card/80">
                    <CardHeader>
                      <CardTitle className="text-base">Invoice Breakdown</CardTitle>
                      <CardDescription>Charges by category</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {Object.keys(invoiceItemTotals).length ? (
                        Object.entries(invoiceItemTotals).map(([label, amount]) => (
                          <div key={label} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-mono">KSh {Number(amount).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">No invoice items yet.</div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border bg-card/80">
                    <CardHeader>
                      <CardTitle className="text-base">Statement Snapshot</CardTitle>
                      <CardDescription>Totals for this tenant</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Invoiced</span>
                        <span className="font-mono">KSh {totalInvoiceAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Paid</span>
                        <span className="font-mono">KSh {totalPayments.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Outstanding</span>
                        <span className="font-mono">KSh {outstandingAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Invoices</span>
                        <span className="font-medium">{invoiceCount}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statementRows.length > 0 ? statementRows.map((row: any, index: number) => (
                      <TableRow key={`${row.type}-${index}`}>
                        <TableCell>{row.date ? new Date(row.date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell className="text-right font-mono">
                          {row.debit ? `KSh ${row.debit.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.credit ? `KSh ${row.credit.toLocaleString()}` : "—"}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No statement activity yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Requests Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Maintenance Requests
                </CardTitle>
                <CardDescription>Report and track maintenance issues</CardDescription>
              </div>
              <Button onClick={() => setIsAddRequestDialogOpen(true)}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading requests...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(maintenanceRequests) ? maintenanceRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {request.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={request.priority === "urgent" ? "destructive" : "outline"}>
                            {request.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            {getStatusBadge(request.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request)
                              setIsViewDialogOpen(true)
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No maintenance requests found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Request Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Maintenance Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Title</Label>
                  <p className="text-sm">{selectedRequest.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedRequest.status)}
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm">{selectedRequest.description}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Date Reported</Label>
                <p className="text-sm">{new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
              </div>
              {selectedRequest.response && (
                <div>
                  <Label className="text-sm font-medium">Response</Label>
                  <p className="text-sm">{selectedRequest.response}</p>
                </div>
              )}
              {getMediaUrls(selectedRequest).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Attachments</Label>
                  <div className="space-y-2 text-sm">
                    {getMediaUrls(selectedRequest).map((url: string) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="text-primary underline">
                        {url.split("/").pop()}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Request Dialog */}
      <Dialog open={isAddRequestDialogOpen} onOpenChange={setIsAddRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Maintenance Request</DialogTitle>
            <DialogDescription>
              Report a maintenance issue in your unit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-title">Issue Title</Label>
              <Input
                id="request-title"
                placeholder="e.g., Water Leak in Kitchen"
                value={requestTitle}
                onChange={(event) => setRequestTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-description">Description</Label>
              <Textarea 
                id="request-description" 
                placeholder="Please describe the issue in detail..."
                rows={4}
                value={requestDescription}
                onChange={(event) => setRequestDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-priority">Priority</Label>
              <Select value={requestPriority} onValueChange={setRequestPriority}>
                <SelectTrigger id="request-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent (Emergency)</SelectItem>
                  <SelectItem value="high">High (Needs attention soon)</SelectItem>
                  <SelectItem value="medium">Medium (Can wait a few days)</SelectItem>
                  <SelectItem value="low">Low (Minor issue)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-media">Upload Media (max 5MB)</Label>
              <Input
                id="request-media"
                type="file"
                multiple
                onChange={handleRequestFiles}
                accept="image/*,video/*"
              />
              {requestFiles.length > 0 && (
                <div className="space-y-2 text-sm">
                  {requestFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="truncate">{file.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeRequestFile(index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddRequestDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createRequestMutation.mutate()}
                disabled={!requestTitle.trim() || !requestDescription.trim() || createRequestMutation.isPending}
              >
                {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
