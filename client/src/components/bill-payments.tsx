import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useFilter } from "@/contexts/FilterContext"
import { formatDateWithOffset, usePropertyTimezoneOffset } from "@/lib/timezone"
import {
  CreditCard,
  Calendar,
  Search,
  Wallet,
  Download
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

type BillPayment = {
  id: string
  billId: string
  amount: number
  method: string
  reference?: string
  paymentDate: string
  vendorName?: string
  category?: string
  propertyId?: string
  propertyName?: string
  billStatus?: string
  billAmount?: number
  totalPaid?: number
  balance?: number
}

export function BillPayments() {
  const cardVariants = [
    "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-blue-900/50",
    "bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-emerald-900/50",
    "bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-rose-900/50",
    "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-amber-900/50",
    "bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-violet-900/50",
    "bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-cyan-900/50",
  ]
  const cardSeed = useMemo(() => Math.floor(Math.random() * cardVariants.length), [])
  const { toast } = useToast()
  const { selectedAgentId, selectedPropertyId, selectedLandlordId } = useFilter()
  const { timezoneOffsetMinutes } = usePropertyTimezoneOffset()
  const isLandlordSelected = !!selectedLandlordId && selectedLandlordId !== "all"
  const actionsDisabled = !selectedPropertyId || !isLandlordSelected
  const [searchTerm, setSearchTerm] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const { data: payments = [], isLoading, error } = useQuery<BillPayment[]>({
    queryKey: ["/api/bill-payments", selectedPropertyId, selectedLandlordId, selectedAgentId, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (fromDate) params.append("from", fromDate)
      if (toDate) params.append("to", toDate)
      const url = `/api/bill-payments${params.toString() ? `?${params}` : ""}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: isLandlordSelected,
  })

  const normalizedPayments = Array.isArray(payments)
    ? payments.map((payment: any) => ({
        id: payment.id,
        billId: payment.bill_id ?? payment.billId,
        amount: Number(payment.amount ?? 0),
        method: payment.method ?? payment.payment_method ?? "unknown",
        reference: payment.reference ?? "",
        paymentDate: payment.payment_date ?? payment.paymentDate ?? "",
        vendorName: payment.vendor_name ?? payment.vendorName,
        category: payment.category,
        propertyId: payment.property_id ?? payment.propertyId,
        propertyName: payment.property_name ?? payment.propertyName,
        billStatus: payment.bill_status ?? payment.billStatus,
        billAmount: Number(payment.bill_amount ?? payment.billAmount ?? 0),
        totalPaid: Number(payment.total_paid ?? payment.totalPaid ?? 0),
        balance: Number(payment.balance ?? (Number(payment.bill_amount ?? payment.billAmount ?? 0) - Number(payment.total_paid ?? payment.totalPaid ?? 0))),
      }))
    : []

  const filteredPayments = normalizedPayments.filter((payment) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm || (
      payment.vendorName?.toLowerCase().includes(searchLower) ||
      payment.propertyName?.toLowerCase().includes(searchLower) ||
      payment.reference?.toLowerCase().includes(searchLower) ||
      payment.billId?.toLowerCase().includes(searchLower)
    )
    const matchesMethod = methodFilter === "all" || payment.method === methodFilter
    const matchesFrom = !fromDate || (payment.paymentDate && payment.paymentDate >= fromDate)
    const matchesTo = !toDate || (payment.paymentDate && payment.paymentDate <= toDate)
    return matchesSearch && matchesMethod && matchesFrom && matchesTo
  })

  const handleDownloadCsv = () => {
    const header = ["Bill ID", "Vendor", "Property", "Method", "Amount", "Bill Amount", "Balance", "Reference", "Payment Date"]
    const rows = filteredPayments.map((payment) => ([
      payment.billId ?? "",
      payment.vendorName ?? "",
      payment.propertyName ?? "",
      payment.method ?? "",
      payment.amount ?? 0,
      payment.billAmount ?? 0,
      payment.balance ?? 0,
      payment.reference ?? "",
      payment.paymentDate ?? ""
    ]))
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "bill-payments.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalPayments = filteredPayments.length
  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const nowInAccountMs = Date.now() + timezoneOffsetMinutes * 60 * 1000
  const nowInAccount = new Date(nowInAccountMs)
  const currentYear = nowInAccount.getUTCFullYear()
  const currentMonth = nowInAccount.getUTCMonth() + 1
  const paidThisMonth = filteredPayments.reduce((sum, payment) => {
    if (!payment.paymentDate) return sum
    const [yearStr, monthStr] = payment.paymentDate.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (year === currentYear && month === currentMonth) {
      return sum + payment.amount
    }
    return sum
  }, 0)
  const methodBreakdown = filteredPayments.reduce<Record<string, number>>((acc, payment) => {
    const key = payment.method || "unknown"
    acc[key] = (acc[key] || 0) + payment.amount
    return acc
  }, {})
  const methods = Object.keys(methodBreakdown).sort()

  if (error) {
    toast({
      title: "Failed to load bill payments",
      description: "Please try again later.",
      variant: "destructive",
    })
  }

  if (actionsDisabled) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bill Payments</h1>
            <p className="text-muted-foreground">Track payments made toward bills</p>
          </div>
        </div>
        <Card className={`vibrant-card ${cardVariants[(cardSeed + 2) % cardVariants.length]}`}>
          <CardContent className="p-6">
            <div className="rounded-xl border border-white/5 bg-slate-900/30 px-6 py-8">
              <div className="mx-auto max-w-xl text-center space-y-2">
                <div className="flex items-center justify-center">
                  <span
                    className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold shadow-sm animate-pulse ${
                      cardVariants[cardSeed % cardVariants.length]
                    }`}
                  >
                    Please select a client and property filter first.
                  </span>
                </div>
                <div className="text-sm text-muted-foreground animate-[pulse_2.2s_ease-in-out_infinite]">
                  Apply filters in the top nav so I can fetch bill payments.
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
      <div>
        <h1 className="text-3xl font-bold">Bill Payments</h1>
        <p className="text-muted-foreground">Track payments made toward bills</p>
        {actionsDisabled && (
          <p className="text-xs text-amber-600 mt-1">Select a client and property in the header to view payments.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`vibrant-card ${cardVariants[(cardSeed + 1) % cardVariants.length]}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{totalPayments}</div>
              <p className="text-xs text-muted-foreground">Records</p>
            </div>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className={`vibrant-card ${cardVariants[(cardSeed + 2) % cardVariants.length]}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amount Paid</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">KSh {totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className={`vibrant-card ${cardVariants[(cardSeed + 3) % cardVariants.length]}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">KSh {paidThisMonth.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {nowInAccount.toLocaleString("default", { month: "long" })} {currentYear}
              </p>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card className={`vibrant-card ${cardVariants[(cardSeed + 4) % cardVariants.length]}`}>
        <CardHeader>
          <CardTitle>Payment Breakdown</CardTitle>
          <CardDescription>Summary by payment method</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {methods.length === 0 ? (
            <span className="text-sm text-muted-foreground">No payments recorded yet.</span>
          ) : (
            methods.map((method) => (
              <Badge key={method} variant="secondary">
                {method.toUpperCase()}: KSh {methodBreakdown[method].toLocaleString()}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card className={`vibrant-card ${cardVariants[cardSeed % cardVariants.length]}`}>
        <CardHeader>
          <CardTitle>Payments List</CardTitle>
          <CardDescription>Showing {filteredPayments.length} payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search payments..."
                className="pl-9"
              />
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="md:w-[150px]"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="md:w-[150px]"
              />
              <div className="w-full md:w-[200px]">
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    {methods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={handleDownloadCsv}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bill Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Payment Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Loading payments...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No bill payments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.billId?.slice(0, 8)}…</TableCell>
                      <TableCell>{payment.vendorName || "—"}</TableCell>
                      <TableCell>{payment.propertyName || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.method?.toUpperCase() || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>KSh {payment.amount.toLocaleString()}</TableCell>
                      <TableCell>KSh {Number(payment.billAmount ?? 0).toLocaleString()}</TableCell>
                      <TableCell>KSh {Number(payment.balance ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{payment.reference || "—"}</TableCell>
                      <TableCell>
                        {payment.paymentDate
                          ? formatDateWithOffset(payment.paymentDate, timezoneOffsetMinutes)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
