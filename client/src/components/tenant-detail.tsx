import { useQuery, useMutation } from "@tanstack/react-query"
import { useRoute, useLocation } from "wouter"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, User, Phone, Mail, Home, FileText, CreditCard, Pencil, Undo2, Send } from "lucide-react"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ToastAction } from "@/components/ui/toast"
import { getPaletteByKey, getSessionSeed } from "@/lib/palette"
import { formatDateWithOffset, usePropertyTimezoneOffset } from "@/lib/timezone"
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

const tenantDetailVariants = [
  "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-blue-900/50",
  "bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-emerald-900/50",
  "bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-rose-900/50",
  "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-amber-900/50",
  "bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-violet-900/50",
  "bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-cyan-900/50",
]

const TypewriterText = ({
  text,
  className,
  speed = 18,
}: {
  text: string
  className?: string
  speed?: number
}) => {
  const [displayText, setDisplayText] = useState("")

  useEffect(() => {
    setDisplayText("")
    if (!text) return
    let index = 0
    const intervalId = setInterval(() => {
      index += 1
      setDisplayText(text.slice(0, index))
      if (index >= text.length) {
        clearInterval(intervalId)
      }
    }, speed)
    return () => clearInterval(intervalId)
  }, [text, speed])

  return <span className={className}>{displayText}</span>
}

export function TenantDetail() {
  const [match, params] = useRoute("/tenants/:id")
  const tenantId = params?.id
  const [, setLocation] = useLocation()
  const { selectedPropertyId } = useFilter()
  const { timezoneOffsetMinutes } = usePropertyTimezoneOffset()
  const { toast } = useToast()
  const actionsDisabled = !selectedPropertyId
  const [isEditing, setIsEditing] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [selectedLeaseId, setSelectedLeaseId] = useState("all")
  const pendingTerminateRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [assignValues, setAssignValues] = useState({
    unitId: "",
    startDate: "",
    endDate: "",
    rentAmount: "",
    depositAmount: "",
    waterRatePerUnit: "15.50",
  })
  const [editValues, setEditValues] = useState<any>({
    fullName: "",
    email: "",
    phone: "",
    idNumber: "",
    emergencyContact: "",
    emergencyPhone: "",
    secondaryContactName: "",
    secondaryContactPhone: "",
    secondaryContactEmail: "",
    notifySecondary: "false",
  })
  const tenantDetailSeed = useRef(Math.floor(Math.random() * tenantDetailVariants.length))
  const terminateDialogSeed = useMemo(() => getSessionSeed("terminate-lease-dialog"), [])
  const terminateDialogPalette = useMemo(
    () => getPaletteByKey("terminate-lease", terminateDialogSeed),
    [terminateDialogSeed]
  )

  const parseAmount = (value: any) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["/api/tenants", tenantId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/tenants/${tenantId}`)
      return await response.json()
    },
    enabled: !!tenantId,
  })

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/check")
      return await response.json()
    },
  })
  const currentUser = authData?.authenticated ? authData.user : null
  const isAdminUser = currentUser && (currentUser.role === "admin" || currentUser.role === "super_admin" || currentUser.role === "agent")
  const userPermissions = (() => {
    if (!currentUser?.permissions) return []
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions
    if (typeof currentUser.permissions === "string") {
      try {
        const parsed = JSON.parse(currentUser.permissions)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  })()
  const canSendTenantLogin =
    isAdminUser ||
    userPermissions.includes("tenants.send_login") ||
    userPermissions.includes("tenants.bulk_send_login")

  useEffect(() => {
    if (!tenant) return
    setEditValues({
      fullName: tenant.fullName ?? tenant.full_name ?? "",
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      idNumber: tenant.idNumber ?? tenant.id_number ?? "",
      emergencyContact: tenant.emergencyContact ?? tenant.emergency_contact ?? "",
      emergencyPhone: tenant.emergencyPhone ?? tenant.emergency_phone ?? "",
      secondaryContactName: tenant.secondaryContactName ?? tenant.secondary_contact_name ?? "",
      secondaryContactPhone: tenant.secondaryContactPhone ?? tenant.secondary_contact_phone ?? "",
      secondaryContactEmail: tenant.secondaryContactEmail ?? tenant.secondary_contact_email ?? "",
      notifySecondary: tenant.notifySecondary ?? tenant.notify_secondary ?? "false",
    })
  }, [tenant])

  const updateTenantMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header before editing tenants.")
      }
      const response = await apiRequest("PUT", `/api/tenants/${tenantId}`, payload)
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] })
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId] })
      setIsEditing(false)
    },
  })

  const sendTenantLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/send-login-details`, {
        generateNewAccessCode: true,
        sendSms: true,
        sendEmail: true,
      })
      return await response.json()
    },
    onSuccess: (data) => {
      const channels = []
      if (data?.sent?.sms) channels.push("SMS")
      if (data?.sent?.email) channels.push("Email")
      const channelLabel = channels.length ? channels.join(" & ") : "no channels"
      const accessCode = data?.accessCode || ""
      toast({
        title: "Tenant login details sent",
        description: (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span>
                Access Code:{" "}
                <span className="font-mono font-semibold select-text">{accessCode || "—"}</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!accessCode) return
                  try {
                    await navigator.clipboard.writeText(accessCode)
                    toast({ title: "Copied", description: "Access code copied to clipboard." })
                  } catch {
                    toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" })
                  }
                }}
                disabled={!accessCode}
              >
                Copy
              </Button>
            </div>
            <div>Sent via {channelLabel}</div>
          </div>
        ),
        duration: 1000000,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send tenant login",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    },
  })

  const { data: leases = [] } = useQuery({
    queryKey: ["/api/leases", tenantId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/leases?tenantId=${tenantId}`)
      return await response.json()
    },
    enabled: !!tenantId,
  })

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/units")
      return await response.json()
    },
  })

  const { data: houseTypes = [] } = useQuery({
    queryKey: ["/api/house-types"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/house-types")
      return await response.json()
    },
  })

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/properties")
      return await response.json()
    },
  })

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/invoices")
      return await response.json()
    },
  })

  const { data: invoiceItems = [] } = useQuery({
    queryKey: ["/api/invoice-items"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/invoice-items")
      return await response.json()
    },
  })

  const { data: payments = [] } = useQuery({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payments")
      return await response.json()
    },
  })

  const normalizedLeases = Array.isArray(leases)
    ? leases.map((lease: any) => ({
      id: lease.id,
      unitId: lease.unitId ?? lease.unit_id,
      tenantId: lease.tenantId ?? lease.tenant_id,
      startDate: lease.startDate ?? lease.start_date,
      endDate: lease.endDate ?? lease.end_date,
      rentAmount: lease.rentAmount ?? lease.rent_amount,
      depositAmount: lease.depositAmount ?? lease.deposit_amount,
      waterRatePerUnit: lease.waterRatePerUnit ?? lease.water_rate_per_unit,
      status: lease.status,
    }))
    : []

  const normalizedUnits = Array.isArray(units)
    ? units.map((unit: any) => ({
      id: unit.id,
      propertyId: unit.propertyId ?? unit.property_id,
      houseTypeId: unit.houseTypeId ?? unit.house_type_id,
      unitNumber: unit.unitNumber ?? unit.unit_number,
      rentAmount: unit.rentAmount ?? unit.rent_amount,
      rentDepositAmount: unit.rentDepositAmount ?? unit.rent_deposit_amount,
      waterRateAmount: unit.waterRateAmount ?? unit.water_rate_amount ?? unit.water_rate_per_unit,
      status: unit.status,
    }))
    : []

  const normalizedHouseTypes = Array.isArray(houseTypes)
    ? houseTypes.map((houseType: any) => ({
      id: houseType.id,
      propertyId: houseType.propertyId ?? houseType.property_id,
      name: houseType.name,
      baseRentAmount: houseType.baseRentAmount ?? houseType.base_rent_amount,
      rentDepositAmount: houseType.rentDepositAmount ?? houseType.rent_deposit_amount,
      waterRateType: houseType.waterRateType ?? houseType.water_rate_type,
      waterRatePerUnit: houseType.waterRatePerUnit ?? houseType.water_rate_per_unit,
      waterFlatRate: houseType.waterFlatRate ?? houseType.water_flat_rate,
    }))
    : []

  const normalizedProperties = Array.isArray(properties)
    ? properties.map((property: any) => ({
      id: property.id,
      name: property.name,
      address: property.address,
    }))
    : []

  const normalizedInvoices = Array.isArray(invoices)
    ? invoices.map((invoice: any) => ({
      id: invoice.id,
      leaseId: invoice.leaseId ?? invoice.lease_id,
      amount: invoice.amount,
      issueDate: invoice.issueDate ?? invoice.issue_date,
      dueDate: invoice.dueDate ?? invoice.due_date,
      status: invoice.status,
      description: invoice.description,
      invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number,
    }))
    : []

  const normalizedInvoiceItems = Array.isArray(invoiceItems)
    ? invoiceItems.map((item: any) => ({
      invoiceId: item.invoiceId ?? item.invoice_id,
      description: item.description ?? item.itemDescription ?? item.item_description ?? "Invoice item",
      amount: parseAmount(item.amount),
    }))
    : []

  const invoiceItemsByInvoice = normalizedInvoiceItems.reduce((acc: Record<string, any[]>, item: any) => {
    if (!item.invoiceId) return acc
    acc[item.invoiceId] = acc[item.invoiceId] || []
    acc[item.invoiceId].push(item)
    return acc
  }, {})

  const normalizedPayments = Array.isArray(payments)
    ? payments.map((payment: any) => ({
      id: payment.id,
      leaseId: payment.leaseId ?? payment.lease_id,
      invoiceId: payment.invoiceId ?? payment.invoice_id,
      amount: payment.amount,
      paymentDate: payment.paymentDate ?? payment.payment_date,
      paymentMethod: payment.paymentMethod ?? payment.payment_method,
      reference: payment.reference,
    }))
    : []

  const leaseSummaries = normalizedLeases.map((lease: any) => {
    const unit = normalizedUnits.find((u: any) => u.id === lease.unitId)
    const property = normalizedProperties.find((p: any) => p.id === unit?.propertyId)
    return {
      lease,
      unit,
      property,
    }
  })

  const selectedLeaseSummary =
    selectedLeaseId === "all"
      ? leaseSummaries.find((entry) => entry.lease.status === "active") || leaseSummaries[0]
      : leaseSummaries.find((entry) => entry.lease.id === selectedLeaseId)

  const availableUnits = normalizedUnits.filter((unit: any) => {
    const matchesProperty = selectedPropertyId ? unit.propertyId === selectedPropertyId : true
    return matchesProperty && unit.status === "vacant"
  }).map((unit: any) => {
    const houseType = normalizedHouseTypes.find((ht: any) => ht.id === unit.houseTypeId)
    return {
      ...unit,
      houseType,
    }
  })

  const leaseIds = new Set(normalizedLeases.map((lease: any) => lease.id))
  const tenantInvoices = normalizedInvoices.filter((invoice: any) => leaseIds.has(invoice.leaseId))
  const tenantPayments = normalizedPayments.filter((payment: any) => leaseIds.has(payment.leaseId))

  const filteredInvoices = selectedLeaseId === "all"
    ? tenantInvoices
    : tenantInvoices.filter((invoice: any) => invoice.leaseId === selectedLeaseId)
  const filteredPayments = selectedLeaseId === "all"
    ? tenantPayments
    : tenantPayments.filter((payment: any) => payment.leaseId === selectedLeaseId)

  const totalInvoiced = filteredInvoices.reduce((sum: number, invoice: any) => sum + parseAmount(invoice.amount), 0)
  const totalPaid = filteredPayments.reduce((sum: number, payment: any) => sum + parseAmount(payment.amount), 0)
  const balance = totalInvoiced - totalPaid
  const balanceClass = balance < 0 ? "text-green-600" : balance > 0 ? "text-red-500" : "text-muted-foreground"

  const statementRows = [
    ...filteredInvoices.flatMap((invoice: any) => {
      const items = invoiceItemsByInvoice[invoice.id] || []
      if (!items.length) {
        return [{
          id: `invoice-${invoice.id}`,
          date: invoice.issueDate || invoice.dueDate,
          type: "Invoice",
          description: invoice.description || invoice.invoiceNumber,
          debit: parseAmount(invoice.amount),
          credit: 0,
        }]
      }
      return items.map((item: any, index: number) => ({
        id: `invoice-${invoice.id}-${index}`,
        date: invoice.issueDate || invoice.dueDate,
        type: "Invoice",
        description: `${invoice.invoiceNumber} • ${item.description}`,
        debit: parseAmount(item.amount),
        credit: 0,
      }))
    }),
    ...filteredPayments.map((payment: any) => ({
      id: `payment-${payment.id}`,
      date: payment.paymentDate,
      type: "Payment",
      description: payment.reference || payment.paymentMethod,
      debit: 0,
      credit: parseAmount(payment.amount),
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let runningBalance = 0
  const statementWithBalance = statementRows.map((row) => {
    runningBalance += row.debit - row.credit
    return { ...row, balance: runningBalance }
  })

  const createLeaseMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header before assigning a unit.")
      }
      const response = await apiRequest("POST", "/api/leases", payload)
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      setIsAssignOpen(false)
      setAssignValues({
        unitId: "",
        startDate: "",
        endDate: "",
        rentAmount: "",
        depositAmount: "",
        waterRatePerUnit: "15.50",
      })
      toast({
        title: "Lease created",
        description: "Tenant has been assigned to the selected unit.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create lease",
        description: error.message || "Please check the lease details.",
        variant: "destructive",
      })
    },
  })

  const terminateLeaseMutation = useMutation({
    mutationFn: async (leaseId: string) => {
      if (actionsDisabled) {
        throw new Error("Select a property in the header before terminating leases.")
      }
      const today = new Date().toISOString().split("T")[0]
      const response = await apiRequest("PUT", `/api/leases/${leaseId}`, {
        status: "terminated",
        endDate: today,
      })
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] })
      queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      toast({
        title: "Lease terminated",
        description: "The tenant has been marked as moved out.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to terminate lease",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    },
  })

  const scheduleLeaseTermination = (leaseId: string) => {
    const pending = pendingTerminateRef.current[leaseId]
    if (pending) {
      clearTimeout(pending)
    }
    const timeoutId = setTimeout(() => {
      terminateLeaseMutation.mutate(leaseId)
      delete pendingTerminateRef.current[leaseId]
    }, 5000)
    pendingTerminateRef.current[leaseId] = timeoutId

    toast({
      title: "Termination scheduled",
      description: "Lease will be terminated in 5 seconds.",
      action: (
        <ToastAction
          altText="Undo termination"
          onClick={() => {
            clearTimeout(timeoutId)
            delete pendingTerminateRef.current[leaseId]
            toast({
              title: "Termination canceled",
              description: "The lease was not terminated.",
            })
          }}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo
        </ToastAction>
      ),
    })
  }

  if (!match) return null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation("/tenants")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenants
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{tenant?.fullName || "Tenant"}</h1>
            <p className="text-muted-foreground">Tenant profile, invoices, and payments</p>
          </div>
        </div>
        {tenant?.status && (
          <Badge variant={tenant.status === "active" ? "default" : "secondary"}>{tenant.status}</Badge>
        )}
      </div>

      {tenantLoading ? (
        <div className="text-sm text-muted-foreground">Loading tenant...</div>
      ) : !tenant ? (
        <div className="text-sm text-muted-foreground">
          Tenant not found.{" "}
          <Button variant="ghost" onClick={() => setLocation("/tenants")}>
            Back to Tenants
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="statement">Statement</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              <Card className={`min-h-[240px] vibrant-card ${tenantDetailVariants[tenantDetailSeed.current % tenantDetailVariants.length]}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Tenant Info
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {canSendTenantLogin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendTenantLoginMutation.mutate()}
                        disabled={sendTenantLoginMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Generate & Send Login
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing((prev) => !prev)}
                      disabled={updateTenantMutation.isPending}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {isEditing ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {isEditing ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          value={editValues.fullName}
                          onChange={(event) => setEditValues({ ...editValues, fullName: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={editValues.email}
                          onChange={(event) => setEditValues({ ...editValues, email: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={editValues.phone}
                          onChange={(event) => setEditValues({ ...editValues, phone: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ID Number</Label>
                        <Input
                          value={editValues.idNumber}
                          onChange={(event) => setEditValues({ ...editValues, idNumber: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Emergency Contact</Label>
                        <Input
                          value={editValues.emergencyContact}
                          onChange={(event) => setEditValues({ ...editValues, emergencyContact: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Emergency Phone</Label>
                        <Input
                          value={editValues.emergencyPhone}
                          onChange={(event) => setEditValues({ ...editValues, emergencyPhone: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secondary Contact Name</Label>
                        <Input
                          value={editValues.secondaryContactName}
                          onChange={(event) => setEditValues({ ...editValues, secondaryContactName: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secondary Contact Phone</Label>
                        <Input
                          value={editValues.secondaryContactPhone}
                          onChange={(event) => setEditValues({ ...editValues, secondaryContactPhone: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Secondary Contact Email</Label>
                        <Input
                          type="email"
                          value={editValues.secondaryContactEmail}
                          onChange={(event) => setEditValues({ ...editValues, secondaryContactEmail: event.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between border rounded-md p-3 lg:col-span-2">
                        <div>
                          <Label>Notify Secondary Contact</Label>
                          <p className="text-xs text-muted-foreground">Enable notifications for secondary contact</p>
                        </div>
                        <Checkbox
                          checked={editValues.notifySecondary === "true"}
                          onCheckedChange={(checked) => setEditValues({ ...editValues, notifySecondary: checked ? "true" : "false" })}
                        />
                      </div>
                      <div className="lg:col-span-2 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => updateTenantMutation.mutate(editValues)}
                          disabled={actionsDisabled || updateTenantMutation.isPending}
                        >
                          Save Changes
                        </Button>
                      </div>
                      {actionsDisabled && (
                        <p className="text-xs text-muted-foreground lg:col-span-2">
                          Select a property in the header to enable editing.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{tenant?.email || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{tenant?.phone || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedLeaseSummary?.property?.name || "No property"}</span>
                      </div>
                      <div>
                        Emergency Contact: {editValues.emergencyContact || "—"}
                      </div>
                      <div>
                        Emergency Phone: {editValues.emergencyPhone || "—"}
                      </div>
                      <div>
                        Secondary Contact: {editValues.secondaryContactName || "—"}
                      </div>
                      <div>
                        Secondary Phone: {editValues.secondaryContactPhone || "—"}
                      </div>
                      <div className="lg:col-span-2">
                        Secondary Email: {editValues.secondaryContactEmail || "—"}
                      </div>
                      <div className="lg:col-span-2">
                        Notify Secondary: {editValues.notifySecondary === "true" ? "Yes" : "No"}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className={`min-h-[220px] vibrant-card ${tenantDetailVariants[(tenantDetailSeed.current + 1) % tenantDetailVariants.length]}`}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Lease Summary
                  </CardTitle>
                  <div />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {leaseSummaries.length === 0 && (
                    <div className="text-muted-foreground">No leases found for this tenant.</div>
                  )}
                  {leaseSummaries.map((entry) => {
                    const isTerminated = entry.lease.status === "terminated"
                    const headerText = `${entry.unit?.unitNumber || "Unit"}${entry.property?.name ? ` • ${entry.property.name}` : ""}`
                    const rentText = `Rent: KSh ${parseAmount(entry.lease.rentAmount).toLocaleString()}`
                    const depositText = `Deposit: KSh ${parseAmount(entry.lease.depositAmount).toLocaleString()}`
                    const waterText = `Water Rate: KSh ${parseAmount(entry.lease.waterRatePerUnit).toLocaleString()} / m³`
                    const leaseText = `Lease: ${entry.lease.startDate ? formatDateWithOffset(entry.lease.startDate, timezoneOffsetMinutes) : "—"} - ${entry.lease.endDate ? formatDateWithOffset(entry.lease.endDate, timezoneOffsetMinutes) : "—"}`

                    return (
                    <div
                      key={entry.lease.id}
                      className={`border rounded-md p-3 space-y-2 ${
                        isTerminated ? "border-red-500/70 bg-red-950/20 text-red-500" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {isTerminated ? (
                            <TypewriterText text={headerText} className="text-red-500" />
                          ) : (
                            headerText
                          )}
                        </div>
                        <Badge
                          variant={entry.lease.status === "active" ? "default" : "secondary"}
                          className={isTerminated ? "bg-red-600 text-white" : undefined}
                        >
                          {entry.lease.status}
                        </Badge>
                      </div>
                      <div>{isTerminated ? <TypewriterText text={rentText} className="text-red-500" /> : rentText}</div>
                      <div>{isTerminated ? <TypewriterText text={depositText} className="text-red-500" /> : depositText}</div>
                      <div>{isTerminated ? <TypewriterText text={waterText} className="text-red-500" /> : waterText}</div>
                      <div>{isTerminated ? <TypewriterText text={leaseText} className="text-red-500" /> : leaseText}</div>
                      {entry.lease.status === "active" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={actionsDisabled || terminateLeaseMutation.isPending}
                            >
                              Terminate Lease
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className={`vibrant-card ${terminateDialogPalette.card} ${terminateDialogPalette.border}`}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Terminate lease?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will schedule the lease termination and mark the tenant as moved out.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => scheduleLeaseTermination(entry.lease.id)}>
                                Confirm Termination
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  )})}
                  <div className="border-t pt-4 space-y-2">
                    <div className="text-sm font-medium">Assign New Unit</div>
                    <div className="text-xs text-muted-foreground">
                      Tenants can hold multiple active leases. Assign another unit if needed.
                    </div>
                    <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={actionsDisabled}>
                          Assign New Unit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Assign Unit</DialogTitle>
                            <DialogDescription>Assign a vacant unit and create a lease.</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2 md:col-span-2">
                              <Label>Available Unit</Label>
                              <Select
                                value={assignValues.unitId}
                                onValueChange={(value) => {
                                  const selectedUnit = availableUnits.find((unit: any) => unit.id === value)
                                  const unitRent = selectedUnit?.rentAmount ?? selectedUnit?.houseType?.baseRentAmount ?? ""
                                  const unitDeposit = selectedUnit?.rentDepositAmount ?? selectedUnit?.houseType?.rentDepositAmount ?? ""
                                  const unitWater = selectedUnit?.waterRateAmount
                                    ?? (selectedUnit?.houseType?.waterRateType === "unit_based"
                                      ? selectedUnit?.houseType?.waterRatePerUnit
                                      : selectedUnit?.houseType?.waterFlatRate)
                                    ?? "15.50"
                                  setAssignValues((prev) => ({
                                    ...prev,
                                    unitId: value,
                                    rentAmount: unitRent,
                                    depositAmount: unitDeposit,
                                    waterRatePerUnit: unitWater,
                                  }))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableUnits.map((unit: any) => (
                                    <SelectItem key={unit.id} value={unit.id}>
                                      {unit.unitNumber} {unit.houseType?.name ? `- ${unit.houseType.name}` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                              <div className="space-y-2">
                                <Label>Lease Start Date</Label>
                                <Input
                                  type="date"
                                  value={assignValues.startDate}
                                  onChange={(event) => setAssignValues((prev) => ({ ...prev, startDate: event.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Lease End Date</Label>
                                <Input
                                  type="date"
                                  value={assignValues.endDate}
                                  onChange={(event) => setAssignValues((prev) => ({ ...prev, endDate: event.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Monthly Rent (KSH)</Label>
                                <Input
                                  type="number"
                                  value={assignValues.rentAmount}
                                  onChange={(event) => setAssignValues((prev) => ({ ...prev, rentAmount: event.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Security Deposit (KSH)</Label>
                                <Input
                                  type="number"
                                  value={assignValues.depositAmount}
                                  onChange={(event) => setAssignValues((prev) => ({ ...prev, depositAmount: event.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Water Rate per Unit (KSH)</Label>
                                <Input
                                  type="number"
                                  value={assignValues.waterRatePerUnit}
                                  onChange={(event) => setAssignValues((prev) => ({ ...prev, waterRatePerUnit: event.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={() => {
                                  if (!assignValues.unitId || !assignValues.startDate || !assignValues.endDate) {
                                    toast({
                                      title: "Missing details",
                                      description: "Select a unit and lease dates before creating the lease.",
                                      variant: "destructive",
                                    })
                                    return
                                  }
                                  createLeaseMutation.mutate({
                                    ...assignValues,
                                    tenantId,
                                  })
                                }}
                                disabled={createLeaseMutation.isPending}
                              >
                                Create Lease
                              </Button>
                            </div>
                          </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {actionsDisabled && (
                    <div className="text-xs text-muted-foreground">
                      Select a property in the header to manage leases.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <Card
              className={`vibrant-card ${tenantDetailVariants[(tenantDetailSeed.current + 1) % tenantDetailVariants.length]}`}
            >
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                {leaseSummaries.length > 0 && (
                  <div className="pt-2">
                    <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
                      <SelectTrigger className="h-8 w-[200px]">
                        <SelectValue placeholder="All leases" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All leases</SelectItem>
                        {leaseSummaries.map((entry) => (
                          <SelectItem key={entry.lease.id} value={entry.lease.id}>
                            {entry.unit?.unitNumber || "Unit"} ({entry.lease.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">{invoice.invoiceNumber || invoice.id}</TableCell>
                        <TableCell>{invoice.description}</TableCell>
                        <TableCell>{invoice.issueDate ? formatDateWithOffset(invoice.issueDate, timezoneOffsetMinutes) : "—"}</TableCell>
                        <TableCell>{invoice.dueDate ? formatDateWithOffset(invoice.dueDate, timezoneOffsetMinutes) : "—"}</TableCell>
                        <TableCell>{invoice.status}</TableCell>
                        <TableCell className="text-right font-mono">KSh {parseAmount(invoice.amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card
              className={`vibrant-card ${tenantDetailVariants[(tenantDetailSeed.current + 2) % tenantDetailVariants.length]}`}
            >
              <CardHeader>
                <CardTitle>Payments</CardTitle>
                {leaseSummaries.length > 0 && (
                  <div className="pt-2">
                    <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
                      <SelectTrigger className="h-8 w-[200px]">
                        <SelectValue placeholder="All leases" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All leases</SelectItem>
                        {leaseSummaries.map((entry) => (
                          <SelectItem key={entry.lease.id} value={entry.lease.id}>
                            {entry.unit?.unitNumber || "Unit"} ({entry.lease.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.paymentDate ? formatDateWithOffset(payment.paymentDate, timezoneOffsetMinutes) : "—"}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>{payment.reference || "—"}</TableCell>
                        <TableCell className="text-right font-mono">KSh {parseAmount(payment.amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statement">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <Card
                className={`vibrant-card ${tenantDetailVariants[(tenantDetailSeed.current + 3) % tenantDetailVariants.length]}`}
              >
                <CardHeader>
                  <CardTitle>Total Invoiced</CardTitle>
                </CardHeader>
                <CardContent className="text-xl font-mono">KSh {totalInvoiced.toLocaleString()}</CardContent>
              </Card>
              <Card
                className={`vibrant-card ${tenantDetailVariants[(tenantDetailSeed.current + 4) % tenantDetailVariants.length]}`}
              >
                <CardHeader>
                  <CardTitle>Total Paid</CardTitle>
                </CardHeader>
                <CardContent className="text-xl font-mono">KSh {totalPaid.toLocaleString()}</CardContent>
              </Card>
              <Card
                className={`vibrant-card ${tenantDetailVariants[(tenantDetailSeed.current + 5) % tenantDetailVariants.length]}`}
              >
                <CardHeader>
                  <CardTitle>Current Balance</CardTitle>
                </CardHeader>
                <CardContent className={`text-xl font-mono ${balanceClass}`}>
                  {balance < 0 ? `-KSh ${Math.abs(balance).toLocaleString()}` : `KSh ${balance.toLocaleString()}`}
                </CardContent>
              </Card>
            </div>

            <Card
              className={`vibrant-card ${tenantDetailVariants[(tenantDetailSeed.current + 6) % tenantDetailVariants.length]}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Statement
                </CardTitle>
                {leaseSummaries.length > 0 && (
                  <div className="pt-2">
                    <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
                      <SelectTrigger className="h-8 w-[200px]">
                        <SelectValue placeholder="All leases" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All leases</SelectItem>
                        {leaseSummaries.map((entry) => (
                          <SelectItem key={entry.lease.id} value={entry.lease.id}>
                            {entry.unit?.unitNumber || "Unit"} ({entry.lease.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statementWithBalance.map((row) => {
                      const rowBalanceClass = row.balance < 0 ? "text-green-600" : row.balance > 0 ? "text-red-500" : "text-muted-foreground"
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{row.date ? formatDateWithOffset(row.date, timezoneOffsetMinutes) : "—"}</TableCell>
                          <TableCell>{row.type}</TableCell>
                          <TableCell>{row.description}</TableCell>
                          <TableCell className="text-right font-mono">
                            {row.debit ? `KSh ${row.debit.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.credit ? `KSh ${row.credit.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${rowBalanceClass}`}>
                            {row.balance < 0 ? `-KSh ${Math.abs(row.balance).toLocaleString()}` : `KSh ${row.balance.toLocaleString()}`}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
