import { useEffect, useRef, useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { 
  Eye, 
  Edit, 
  Send, 
  Check, 
  X, 
  Filter,
  Search,
  Mail,
  Smartphone,
  FileText,
  Download,
  Loader2,
  Trash2,
  Undo2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { useFilter } from "@/contexts/FilterContext"
import { getPaletteByIndex, getPaletteByKey } from "@/lib/palette"
import { getStatusPalette } from "@/lib/color-rules"
import { formatDateWithOffset, formatWithOffset, parseUtcOffsetToMinutes } from "@/lib/timezone"
import { jsPDF } from "jspdf"
import autoTable from 'jspdf-autotable'
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const invoicesListVariants = [
  "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-blue-900/50",
  "bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-emerald-900/50",
  "bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-rose-900/50",
  "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-amber-900/50",
  "bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-violet-900/50",
  "bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-cyan-900/50",
]

export function Invoices() {
  const invoicesListSeed = useRef(Math.floor(Math.random() * invoicesListVariants.length))
  const penaltyCardSeed = useRef(Math.floor(Math.random() * invoicesListVariants.length))
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false)
  const [penaltyPercent, setPenaltyPercent] = useState("")
  const [penaltySuccess, setPenaltySuccess] = useState(false)
  const [penaltyPromptOpen, setPenaltyPromptOpen] = useState(false)
  const [penaltyInvoiceIds, setPenaltyInvoiceIds] = useState<string[]>([])
  const [isApplyingPenalty, setIsApplyingPenalty] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteInvoice, setNoteInvoice] = useState<any>(null)
  const [noteText, setNoteText] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const { toast } = useToast()
  const { selectedAgentId, selectedPropertyId, selectedLandlordId } = useFilter()
  const isLandlordSelected = !!selectedLandlordId && selectedLandlordId !== "all"
  const actionsDisabled = !selectedPropertyId || !isLandlordSelected
  const pendingDeleteRef = useRef<Record<string, NodeJS.Timeout>>({})
  const latestPaymentActivityRef = useRef<string | null>(null)

  const formatInvoiceId = (id: string | number) => {
    const value = String(id ?? "")
    if (!value) return "INV-UNKNOWN"
    const suffix = value.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()
    return `INV-${suffix}`
  }

  const loadImageAsDataUrl = async (url: string) => {
    const response = await fetch(url)
    const blob = await response.blob()
    if (blob.type === "image/svg+xml") {
      const svgText = await blob.text()
      const svgBlob = new Blob([svgText], { type: "image/svg+xml" })
      const svgUrl = URL.createObjectURL(svgBlob)
      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error("Failed to load SVG logo"))
          img.src = svgUrl
        })
        const canvas = document.createElement("canvas")
        canvas.width = image.naturalWidth || 400
        canvas.height = image.naturalHeight || 200
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          throw new Error("Failed to render SVG logo")
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL("image/png")
      } finally {
        URL.revokeObjectURL(svgUrl)
      }
    }
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read logo"))
      reader.readAsDataURL(blob)
    })
  }

  const getImageDimensions = async (dataUrl: string) => {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error("Failed to load logo dimensions"))
      image.src = dataUrl
    })
  }

  const getConsumptionMonthKey = (dateValue: string) => {
    if (!dateValue) return ""
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return ""
    const consumptionDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)
    return `${consumptionDate.getFullYear()}-${String(consumptionDate.getMonth() + 1).padStart(2, "0")}`
  }

  const getReadingTimestamp = (reading: any) => {
    const timestampValue =
      reading.lastModifiedAt ||
      reading.createdAt ||
      reading.last_modified_at ||
      reading.created_at ||
      reading.readingDate ||
      reading.reading_date
    const timestamp = timestampValue ? new Date(timestampValue).getTime() : 0
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  const getReadingValues = (reading: any) => {
    const currentValue = Number(reading?.current_reading ?? reading?.currentReading ?? 0)
    const previousValue = Number(reading?.previous_reading ?? reading?.previousReading ?? 0)
    const consumption = Number(
      reading?.consumption ?? (Number.isFinite(currentValue) ? currentValue - previousValue : 0)
    )
    return {
      previous: Number.isFinite(previousValue) ? previousValue : 0,
      current: Number.isFinite(currentValue) ? currentValue : 0,
      consumption: Number.isFinite(consumption) ? consumption : 0,
    }
  }

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    await apiRequest("PUT", `/api/invoices/${invoiceId}`, { status })
  }

  // Edit invoice mutation
  const editInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: string, data: any }) => {
      if (actionsDisabled) {
        throw new Error("Select a client and property in the header to edit invoices.")
      }
      return await apiRequest('PUT', `/api/invoices/${invoiceId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-items'] })
      toast({
        title: "Invoice Updated",
        description: "Invoice has been successfully updated.",
      })
      setEditDialogOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update invoice. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (actionsDisabled) {
        throw new Error("Select a client and property in the header to send invoices.")
      }
      return await apiRequest('POST', `/api/invoices/${invoiceId}/send-email`)
    },
    onSuccess: async () => {
      if (selectedInvoice?.id) {
        await updateInvoiceStatus(selectedInvoice.id, "sent")
      }
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      queryClient.invalidateQueries({ queryKey: ['/api/email-balance'] })
      toast({
        title: "Email Sent",
        description: `Sent 1 email successfully.`,
      })
      setSendDialogOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Send Failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Send SMS mutation
  const sendSMSMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (actionsDisabled) {
        throw new Error("Select a client and property in the header to send invoices.")
      }
      return await apiRequest('POST', `/api/invoices/${invoiceId}/send-sms`)
    },
    onSuccess: async () => {
      if (selectedInvoice?.id) {
        await updateInvoiceStatus(selectedInvoice.id, "sent")
      }
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      queryClient.invalidateQueries({ queryKey: ['/api/sms-balance'] })
      toast({
        title: "SMS Sent",
        description: `Sent 1 SMS successfully.`,
      })
      setSendDialogOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Send Failed",
        description: "Failed to send SMS. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Fetch all required data with complete status tracking
  const invoicesQuery = useQuery<any[]>({ 
    queryKey: ['/api/invoices', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoices${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: isLandlordSelected,
  })
  const invoiceItemsQuery = useQuery<any[]>({
    queryKey: ['/api/invoice-items', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoice-items${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: isLandlordSelected,
  })
  const waterReadingsQuery = useQuery<any[]>({
    queryKey: ['/api/water-readings', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/water-readings${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: isLandlordSelected,
  })
  const tenantsQuery = useQuery<any[]>({ 
    queryKey: ['/api/tenants', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: isLandlordSelected,
  })
  const unitsQuery = useQuery<any[]>({ 
    queryKey: ['/api/units', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: isLandlordSelected,
  })
  const propertiesQuery = useQuery({ 
    queryKey: ['/api/properties', selectedLandlordId, selectedPropertyId, selectedAgentId],
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

  const invoiceSettingsQuery = useQuery({
    queryKey: ['/api/settings/invoice', selectedLandlordId, selectedPropertyId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/settings/invoice${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })
  const timezoneOffset = invoiceSettingsQuery.data?.timezone_offset || "UTC+00:00"
  const timezoneOffsetMinutes = parseUtcOffsetToMinutes(timezoneOffset)
  const nowInAccountMs = Date.now() + timezoneOffsetMinutes * 60 * 1000

  const invoiceNotesQuery = useQuery({
    queryKey: ['/api/invoices', noteInvoice?.id, 'notes'],
    queryFn: async () => {
      if (!noteInvoice?.id) return []
      const response = await apiRequest("GET", `/api/invoices/${noteInvoice.id}?action=notes`)
      return await response.json()
    },
    enabled: noteDialogOpen && !!noteInvoice?.id,
  })

  const addInvoiceNoteMutation = useMutation({
    mutationFn: async () => {
      if (!noteInvoice?.id) {
        throw new Error("Select an invoice first.")
      }
      if (!noteText.trim()) {
        throw new Error("Note cannot be empty.")
      }
      const response = await apiRequest("POST", `/api/invoices/${noteInvoice.id}?action=notes`, {
        note: noteText.trim(),
      })
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', noteInvoice?.id, 'notes'] })
      setNoteText("")
      toast({
        title: "Note Saved",
        description: "Invoice note saved successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Note Failed",
        description: error?.message || "Unable to save note.",
        variant: "destructive",
      })
    },
  })

  const paymentActivityQuery = useQuery({
    queryKey: ["/api/activity-logs", "payment", selectedPropertyId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append("type", "payment")
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const response = await apiRequest("GET", `/api/activity-logs?${params.toString()}`)
      return await response.json()
    },
    enabled: Boolean(selectedPropertyId),
    refetchInterval: 30000,
  })

  useEffect(() => {
    const activities = paymentActivityQuery.data
    if (!Array.isArray(activities) || activities.length === 0) return
    const latest = activities[0]
    if (!latestPaymentActivityRef.current) {
      latestPaymentActivityRef.current = latest.id
      return
    }
    if (latest.id !== latestPaymentActivityRef.current) {
      latestPaymentActivityRef.current = latest.id
      toast({
        title: "Payment received",
        description: latest.details || "A new payment was recorded.",
      })
    }
  }, [paymentActivityQuery.data, toast])
  const leasesQuery = useQuery({ 
    queryKey: ['/api/leases', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })
  const paymentsQuery = useQuery({
    queryKey: ['/api/payments', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/payments${params.toString() ? `?${params}` : ""}`)
      return await response.json()
    },
  })

  // Extract data with fallbacks
  const invoicesData = invoicesQuery.data || []
  const invoiceItemsData = invoiceItemsQuery.data || []
  const waterReadings = waterReadingsQuery.data || []
  const tenantsData = tenantsQuery.data || []
  const unitsData = unitsQuery.data || []
  const propertiesData = propertiesQuery.data || []
  const leasesData = leasesQuery.data || []
  const paymentsData = paymentsQuery.data || []

  // Check for complete success - all queries must have succeeded
  const allQueriesSuccessful = [
    invoicesQuery.status === 'success',
    invoiceItemsQuery.status === 'success',
    tenantsQuery.status === 'success', 
    unitsQuery.status === 'success',
    propertiesQuery.status === 'success',
    leasesQuery.status === 'success',
    paymentsQuery.status === 'success'
  ].every(Boolean)

  // Check for any loading or pending states
  const isLoadingAny = [
    invoicesQuery.isLoading,
    invoiceItemsQuery.isLoading,
    tenantsQuery.isLoading,
    unitsQuery.isLoading, 
    propertiesQuery.isLoading,
    leasesQuery.isLoading,
    paymentsQuery.isLoading
  ].some(Boolean)

  // Check for any errors
  const hasAnyError = [
    invoicesQuery.error,
    invoiceItemsQuery.error,
    tenantsQuery.error,
    unitsQuery.error,
    propertiesQuery.error,
    leasesQuery.error,
    paymentsQuery.error
  ].some(Boolean)

  // Show error state FIRST if ANY data failed to load
  if (hasAnyError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="invoices-title">Invoices</h1>
            <p className="text-muted-foreground">Error loading invoice data</p>
          </div>
        </div>
        <Card className={`vibrant-card ${invoicesListVariants[(invoicesListSeed.current + 1) % invoicesListVariants.length]}`}>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <div className="text-destructive">Failed to load invoice data</div>
              <div className="text-sm">
                {invoicesQuery.error && "• Invoices data failed"}
                {invoiceItemsQuery.error && "• Invoice items data failed"}
                {tenantsQuery.error && "• Tenants data failed"}
                {unitsQuery.error && "• Units data failed"}
                {propertiesQuery.error && "• Properties data failed"}
                {leasesQuery.error && "• Leases data failed"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state while ANY data is loading OR not all queries successful
  if (isLoadingAny || !allQueriesSuccessful) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="invoices-title">Invoices</h1>
            <p className="text-muted-foreground">Loading invoice data and related information...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div
              className={`rounded-xl border px-6 py-8 ${invoicesListVariants[(invoicesListSeed.current + 2) % invoicesListVariants.length]}`}
            >
              <div className="mx-auto max-w-xl text-center space-y-2">
                <div className="flex items-center justify-center">
                  <span
                    className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold shadow-sm animate-pulse ${
                      invoicesListVariants[invoicesListSeed.current % invoicesListVariants.length]
                    }`}
                  >
                    Please select a client and property filter first.
                  </span>
                </div>
                <div className="text-sm text-muted-foreground animate-[pulse_2.2s_ease-in-out_infinite]">
                  Apply filters in the top nav so I can fetch invoices.
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {invoicesQuery.isLoading && "• Loading invoices..."}
                {invoiceItemsQuery.isLoading && "• Loading invoice items..."}
                {tenantsQuery.isLoading && "• Loading tenants..."}
                {unitsQuery.isLoading && "• Loading units..."}
                {propertiesQuery.isLoading && "• Loading properties..."}
                {leasesQuery.isLoading && "• Loading leases..."}
                {!isLoadingAny && !allQueriesSuccessful && "• Waiting for all data to be ready..."}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Enrich invoices with related data (only after all data is loaded)
  const normalizedInvoices = Array.isArray(invoicesData)
    ? invoicesData.map((invoice: any) => ({
        ...invoice,
        leaseId: invoice.leaseId ?? invoice.lease_id,
        unitId: invoice.unitId ?? invoice.unit_id,
        propertyId: invoice.propertyId ?? invoice.property_id,
        tenantId: invoice.tenantId ?? invoice.tenant_id,
        dueDate: invoice.dueDate ?? invoice.due_date,
        issueDate: invoice.issueDate ?? invoice.issue_date,
        invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number,
        createdAt: invoice.createdAt ?? invoice.created_at,
      }))
    : []

  const normalizedLeases = Array.isArray(leasesData)
    ? leasesData.map((lease: any) => ({
        ...lease,
        tenantId: lease.tenantId ?? lease.tenant_id,
        unitId: lease.unitId ?? lease.unit_id,
      }))
    : []

  const normalizedTenants = Array.isArray(tenantsData)
    ? tenantsData.map((tenant: any) => ({
        ...tenant,
        fullName: tenant.fullName ?? tenant.full_name,
      }))
    : []

  const normalizedUnits = Array.isArray(unitsData)
    ? unitsData.map((unit: any) => ({
        ...unit,
        unitNumber: unit.unitNumber ?? unit.unit_number,
        propertyId: unit.propertyId ?? unit.property_id,
      }))
    : []

  const normalizedProperties = Array.isArray(propertiesData)
    ? propertiesData.map((property: any) => ({
        ...property,
      }))
    : []

  const normalizedPayments = Array.isArray(paymentsData)
    ? paymentsData.map((payment: any) => ({
        ...payment,
        invoiceId: payment.invoiceId ?? payment.invoice_id,
        amount: parseFloat(payment.amount ?? 0),
      }))
    : []

  const paymentsByInvoice = normalizedPayments.reduce((acc: Record<string, number>, payment: any) => {
    if (!payment.invoiceId) return acc
    acc[payment.invoiceId] = (acc[payment.invoiceId] || 0) + (payment.amount || 0)
    return acc
  }, {})

  const enrichedInvoices = normalizedInvoices.map((invoice: any) => {
    const lease = normalizedLeases.find((l: any) => l.id === invoice.leaseId)
    const tenantId = invoice.tenantId ?? lease?.tenantId
    const tenant = tenantId ? normalizedTenants.find((t: any) => t.id === tenantId) : null
    const unitId = invoice.unitId ?? lease?.unitId
    const unit = unitId ? normalizedUnits.find((u: any) => u.id === unitId) : null
    const propertyId = invoice.propertyId ?? unit?.propertyId
    const property = propertyId ? normalizedProperties.find((p: any) => p.id === propertyId) : null
    const charges = invoiceItemsData.filter((item: any) => item.invoiceId === invoice.id)
    const amount = parseFloat(invoice.amount ?? 0)
    const paidAmount = paymentsByInvoice[invoice.id] || 0
    const bfItem = charges.find((item: any) => (item.chargeCode ?? item.charge_code) === "balance_bf")
    const bfAmount = bfItem ? parseFloat(bfItem.amount ?? 0) : 0
    const currentAmount = Math.max(0, amount - bfAmount)
    const balance = Math.max(0, amount - paidAmount)
    const paymentStatus = balance <= 0 && amount > 0
      ? "paid"
      : paidAmount > 0
        ? "partially_paid"
        : "pending"
    const dueParts = String(invoice.dueDate || "").split("-")
    const dueYear = Number(dueParts[0])
    const dueMonth = Number(dueParts[1])
    const dueDay = Number(dueParts[2])
    const dueEndLocalMs = Number.isFinite(dueYear) && Number.isFinite(dueMonth) && Number.isFinite(dueDay)
      ? Date.UTC(dueYear, dueMonth - 1, dueDay, 23, 59, 59) + timezoneOffsetMinutes * 60 * 1000
      : null
    const isOverdue =
      !!dueEndLocalMs &&
      dueEndLocalMs < nowInAccountMs &&
      balance > 0

    const issueDateValue = invoice.issueDate || invoice.createdAt || invoice.issue_date || invoice.created_at
    const consumptionMonthKey = getConsumptionMonthKey(issueDateValue)
    const waterReading = (() => {
      if (!unitId || !consumptionMonthKey) return null
      let selected = null
      let selectedTs = 0
      waterReadings.forEach((reading: any) => {
        const readingUnitId = reading.unitId ?? reading.unit_id
        if (String(readingUnitId) !== String(unitId)) return
        const readingDateValue = reading.readingDate ?? reading.reading_date ?? reading.createdAt ?? reading.created_at
        const readingDate = new Date(readingDateValue)
        if (Number.isNaN(readingDate.getTime())) return
        const monthKey = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, "0")}`
        if (monthKey !== consumptionMonthKey) return
        const ts = getReadingTimestamp(reading)
        if (!selected || ts > selectedTs) {
          selected = reading
          selectedTs = ts
        }
      })
      return selected
    })()
    const waterSummary = waterReading ? getReadingValues(waterReading) : null

    return {
      ...invoice,
      tenant: tenant?.fullName || 'Direct Billing',
      unit: unit?.unitNumber || 'N/A',
      property: property?.name || 'N/A',
      tenantData: tenant,
      unitData: unit,
      propertyData: property,
      leaseData: lease,
      amount,
      currentAmount,
      paidAmount,
      balance,
      paymentStatus,
      isOverdue,
      workflowStatus: invoice.status,
      charges: charges.map((charge: any) => ({
        name: charge.description,
        amount: parseFloat(charge.amount),
        chargeCode: charge.chargeCode ?? charge.charge_code,
      })),
      waterSummary,
    }
  })

  const filteredInvoices = enrichedInvoices.filter((invoice: any) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm || (
      String(invoice.id || '').toLowerCase().includes(searchLower) ||
      String(invoice.invoiceNumber || '').toLowerCase().includes(searchLower) ||
      (invoice.tenant || '').toLowerCase().includes(searchLower) ||
      (invoice.unit || '').toLowerCase().includes(searchLower) ||
      (invoice.property || '').toLowerCase().includes(searchLower)
    )
    
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "overdue"
          ? invoice.isOverdue
          : invoice.paymentStatus === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Action handlers
  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setViewDialogOpen(true)
  }

  const handleEditInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setEditDialogOpen(true)
  }

  const handleSendInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setSendDialogOpen(true)
  }

  const handleDownloadInvoice = async (invoice: any) => {
    try {
      const doc = new jsPDF()
      const invoiceDate = invoice.issueDate || invoice.createdAt || Date.now()
      const formattedDate = new Date(invoiceDate).toISOString().slice(0, 10)
      const unitLabel = invoice.unit ? String(invoice.unit).replace(/\s+/g, "-") : "unit"
      const invoiceNumber = invoice.invoiceNumber ?? invoice.invoice_number ?? invoice.id
      const invoiceSettings = invoiceSettingsQuery.data || {}
      const resolveSetting = (snakeKey: string, camelKey: string, fallback = "") =>
        invoiceSettings[snakeKey] ?? invoiceSettings[camelKey] ?? fallback
      const defaultLogoUrl = "/leasemaster-c2-svg.svg"
      const logoUrl = resolveSetting("logo_url", "logoUrl") || defaultLogoUrl
      const resolvedLogoUrl =
        logoUrl && logoUrl.startsWith("/")
          ? `${window.location.origin}${logoUrl}`
          : logoUrl
      const companyName = resolveSetting("company_name", "companyName", "Company")
      const companyPhone = resolveSetting("company_phone", "companyPhone")
      const companyEmail = resolveSetting("company_email", "companyEmail")
      const companyAddress = resolveSetting("company_address", "companyAddress")
      const paymentOptions = String(resolveSetting("payment_options", "paymentOptions"))
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
      const properties = Array.isArray(propertiesQuery.data) ? propertiesQuery.data : []
      const propertyMatch = properties.find((property: any) => property.id === invoice.propertyId || property.name === invoice.property)
      const accountPrefix = propertyMatch?.accountPrefix ?? propertyMatch?.account_prefix ?? ""
      const accountNumber = accountPrefix && invoice.unit ? `${accountPrefix}${invoice.unit}` : ""

      const pageWidth = doc.internal.pageSize.getWidth()
      const marginX = 20
      const rightX = pageWidth - marginX
      const leftColX = marginX
      const rightColX = pageWidth / 2 + 22

      if (resolvedLogoUrl) {
        const tryDrawLogo = async (url: string) => {
          const logoDataUrl = await loadImageAsDataUrl(url)
          const format = logoDataUrl.includes("image/png") ? "PNG" : "JPEG"
          const { width: logoW, height: logoH } = await getImageDimensions(logoDataUrl)
          const maxLogoW = 56
          const maxLogoH = 32
          const logoScale = Math.min(maxLogoW / logoW, maxLogoH / logoH, 1)
          const drawW = logoW * logoScale
          const drawH = logoH * logoScale
          doc.addImage(logoDataUrl, format, leftColX, 20, drawW, drawH)
        }
        try {
          await tryDrawLogo(resolvedLogoUrl)
        } catch {
          try {
            const fallbackUrl = `${window.location.origin}${defaultLogoUrl}`
            if (fallbackUrl !== resolvedLogoUrl) {
              await tryDrawLogo(fallbackUrl)
            }
          } catch {
          }
        }
      }
      const headerRightX = rightColX + 10
      doc.setFontSize(11)
      doc.text(`Invoice #${invoiceNumber}`, headerRightX, 20)

      doc.setFontSize(9)
      let detailsY = 26
      if (companyName) {
        doc.text(companyName, headerRightX, detailsY)
        detailsY += 5
      }
      if (companyAddress) {
        doc.text(companyAddress, headerRightX, detailsY)
        detailsY += 5
      }
      if (companyPhone) {
        doc.text(`Tel: ${companyPhone}`, headerRightX, detailsY)
        detailsY += 5
      }
      if (companyEmail) {
        doc.text(`Email: ${companyEmail}`, headerRightX, detailsY)
        detailsY += 5
      }

      const dateY = Math.max(detailsY + 3, 42)
      doc.text(`Date: ${formatDateWithOffset(invoiceDate, timezoneOffsetMinutes)}`, headerRightX, dateY)
      doc.text(`Due: ${formatDateWithOffset(invoice.dueDate, timezoneOffsetMinutes)}`, headerRightX, dateY + 5)

      const lineY = dateY + 7
      doc.line(marginX, lineY, rightX, lineY)

      doc.setFontSize(10)
      const billToY = lineY + 8
      doc.text("BILL TO", leftColX, billToY)
      doc.text(`Name: ${String(invoice.tenant || "Tenant")}`, leftColX, billToY + 6)
      if (invoice.tenantData?.email) doc.text(`Email: ${String(invoice.tenantData.email)}`, leftColX, billToY + 11)
      if (invoice.tenantData?.phone) doc.text(`Phone: ${String(invoice.tenantData.phone)}`, leftColX, billToY + 16)

      doc.text("PROPERTY", headerRightX, billToY)
      doc.text(String(invoice.property || "—"), headerRightX, billToY + 6)
      doc.text(`House: ${invoice.unit || "—"}`, headerRightX, billToY + 11)
      if (accountNumber) doc.text(`Account: ${accountNumber}`, headerRightX, billToY + 16)

      const sortedCharges = invoice.charges
        .map((charge: any, index: number) => ({ charge, index }))
        .sort((a: any, b: any) => {
          const getRank = (entry: any) => {
            const code = String(entry.charge.chargeCode || entry.charge.charge_code || "").toLowerCase()
            const name = String(entry.charge.name || "").toLowerCase()
            if (code === "balance_bf" || name.includes("balance brought forward")) return 4
            if (code === "deposit" || name.includes("deposit")) return 0
            if (code === "rent" || name.includes("rent")) return 1
            if (code === "water" || name.includes("water")) return 2
            return 3
          }
          const rankDiff = getRank(a) - getRank(b)
          if (rankDiff !== 0) return rankDiff
          return a.index - b.index
        })

      const tableData = sortedCharges.map((entry: any, index: number) => {
        const charge = entry.charge
        const isWater = String(charge.chargeCode || "").toLowerCase() === "water" ||
          String(charge.name || "").toLowerCase().includes("water")
        const waterSummary = isWater && invoice.waterSummary
          ? `Prev: ${invoice.waterSummary.previous} | Curr: ${invoice.waterSummary.current} | Consumed: ${invoice.waterSummary.consumption}`
          : ""
        return [
          String(index + 1),
          charge.name,
          waterSummary,
          `KES ${Number(charge.amount || 0).toLocaleString()}`
        ]
      })

      autoTable(doc, {
        head: [["#", "Item", "Description", "Total"]],
        body: tableData,
        startY: billToY + 20,
        theme: "grid",
        headStyles: { fillColor: [0, 105, 80], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: marginX, right: marginX },
      })

      const finalY = (doc as any).lastAutoTable?.finalY || 140
      const bfItem = invoice.charges.find((charge: any) => String(charge.chargeCode || "").toLowerCase() === "balance_bf")
      const paid = Number(invoice.paidAmount || 0)
      const balance = Number(invoice.balance || 0)
      const totalsW = 70
      const totalsX = rightX - totalsW
      const totalsY = finalY + (bfItem ? 12 : 8)
      const totalsH = 24
      doc.setFontSize(10)
      doc.setDrawColor(140, 140, 140)
      doc.rect(totalsX - 2, totalsY - 4, totalsW + 4, totalsH + 8)
      doc.setDrawColor(0, 0, 0)
      doc.setTextColor(0, 105, 80)
      doc.text(`Sub - Total: KES ${Number(invoice.amount || 0).toLocaleString()}`, totalsX, totalsY + 4)
      doc.text(`Paid: KES ${paid.toLocaleString()}`, totalsX, totalsY + 10)
      doc.text(`Balance: KES ${balance.toLocaleString()}`, totalsX, totalsY + 16)

      if (paymentOptions.length) {
        const paymentBlockY = finalY + (bfItem ? 12 : 10)
        doc.text("Payment Options:", leftColX, paymentBlockY)
        paymentOptions.forEach((line, idx) => {
          doc.text(`- ${line}`, leftColX, paymentBlockY + 6 + idx * 5)
        })
      }
      doc.setTextColor(0, 0, 0)

      doc.save(`${unitLabel}-${formattedDate}-invoice.pdf`)
      
      toast({
        title: "Invoice Downloaded",
        description: `Invoice ${invoiceNumber} has been downloaded as PDF.`,
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    }
  }

  const applyPenaltyInvoices = async () => {
    const percent = Number(penaltyPercent)
    if (!Number.isFinite(percent) || percent <= 0) {
      toast({
        title: "Invalid Percentage",
        description: "Enter a valid penalty percentage greater than 0.",
        variant: "destructive",
      })
      return
    }
    const overdueInvoices = enrichedInvoices.filter(
      (inv: any) => selectedInvoices.includes(inv.id) && inv.isOverdue && inv.workflowStatus === "approved"
    )
    if (overdueInvoices.length === 0) {
      toast({
        title: "No Overdue Invoices",
        description: "Select overdue approved invoices to apply penalties.",
      })
      return
    }
    setIsApplyingPenalty(true)
    try {
      const createdInvoiceIds: string[] = []
      for (const invoice of overdueInvoices) {
        const rentAmount = Number(invoice.leaseData?.rentAmount ?? 0)
        if (!Number.isFinite(rentAmount) || rentAmount <= 0) continue
        const penaltyAmount = Math.round((rentAmount * percent) / 100)
        if (penaltyAmount <= 0) continue

        const description = `Penalty (${percent}% of rent) for invoice ${invoice.invoiceNumber || invoice.id}`
        const today = new Date().toISOString().slice(0, 10)
        const invoiceResponse = await apiRequest("POST", "/api/invoices", {
          leaseId: invoice.leaseId,
          description,
          amount: penaltyAmount.toString(),
          dueDate: today,
          issueDate: today,
          status: "approved",
        })
        const createdInvoice = await invoiceResponse.json()
        if (createdInvoice?.id) {
          createdInvoiceIds.push(createdInvoice.id)
          await apiRequest("POST", "/api/invoice-items", {
            invoiceId: createdInvoice.id,
            chargeCode: "penalty",
            description: `Penalty (${percent}% of rent)`,
            quantity: "1",
            unitPrice: penaltyAmount.toString(),
          })
        }
      }

      if (createdInvoiceIds.length === 0) {
        toast({
          title: "No Penalties Applied",
          description: "No penalty invoices were created. Check rent amounts.",
        })
        return
      }

      setPenaltyInvoiceIds(createdInvoiceIds)
      setPenaltySuccess(true)
      setTimeout(() => {
        setPenaltyDialogOpen(false)
        setPenaltyPromptOpen(true)
        setPenaltySuccess(false)
      }, 900)
      toast({
        title: "Penalties Applied",
        description: `Created ${createdInvoiceIds.length} penalty invoice(s).`,
      })
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-items'] })
    } catch (error) {
      toast({
        title: "Penalty Failed",
        description: "Unable to apply penalties. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsApplyingPenalty(false)
    }
  }

  const handleSendEmail = async (invoice: any) => {
    sendEmailMutation.mutate(invoice.id)
  }

  const handleSendSMS = async (invoice: any) => {
    sendSMSMutation.mutate(invoice.id)
  }

  const handleEditSubmit = (invoice: any) => {
    
    // Get form element
    const form = document.getElementById('edit-invoice-form') as HTMLFormElement
    if (!form) {
      console.error('🔧 Frontend: Form not found!')
      return
    }
    
    // Extract data using form elements directly (works better with React components)
    const descriptionElement = form.querySelector('[name="description"]') as HTMLTextAreaElement
    const amountElement = form.querySelector('[name="amount"]') as HTMLInputElement
    const dueDateElement = form.querySelector('[name="dueDate"]') as HTMLInputElement
    const updatedData = {
      description: descriptionElement?.value || invoice.description,
      amount: String(amountElement?.value || invoice.amount),
      dueDate: dueDateElement?.value || invoice.dueDate
    }
    
    console.log('🔧 Frontend: Sending update data:', updatedData)
    console.log('🔧 Frontend: Invoice ID:', invoice.id)
    editInvoiceMutation.mutate({ invoiceId: invoice.id, data: updatedData })
  }

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices([...selectedInvoices, invoiceId])
    } else {
      setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId))
    }
  }

  const handleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id))
    }
  }

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on invoices:`, selectedInvoices)
    switch (action) {
      case "apply-penalty":
        setPenaltyDialogOpen(true)
        return
      case "approve":
        Promise.resolve().then(async () => {
          const invoicesToApprove = filteredInvoices.filter(inv => selectedInvoices.includes(inv.id) && inv.status !== "approved")
          const results = await Promise.allSettled(invoicesToApprove.map(inv => updateInvoiceStatus(inv.id, "approved")))
          const successCount = results.filter(result => result.status === "fulfilled").length
          const failureCount = results.length - successCount
          if (successCount > 0) {
            toast({
              title: "Invoices Approved",
              description: `Approved ${successCount} invoice${successCount === 1 ? "" : "s"} successfully.`,
            })
          }
          if (failureCount > 0) {
            toast({
              title: "Approval Issues",
              description: `${failureCount} invoice${failureCount === 1 ? "" : "s"} failed to approve.`,
              variant: "destructive",
            })
          }
          queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
        })
        break
      case "send-email":
        Promise.resolve().then(async () => {
          const invoicesToSend = filteredInvoices.filter(inv => selectedInvoices.includes(inv.id))
          const results = await Promise.allSettled(invoicesToSend.map(inv => apiRequest('POST', `/api/invoices/${inv.id}/send-email`)))
          const successCount = results.filter(result => result.status === "fulfilled").length
          const failureCount = results.length - successCount
          if (successCount > 0) {
            await Promise.allSettled(invoicesToSend.map(inv => updateInvoiceStatus(inv.id, "sent")))
            toast({
              title: "Emails Sent",
              description: `Sent ${successCount} email${successCount === 1 ? "" : "s"} successfully.`,
            })
          }
          if (failureCount > 0) {
            toast({
              title: "Email Issues",
              description: `${failureCount} email${failureCount === 1 ? "" : "s"} failed to send.`,
              variant: "destructive",
            })
          }
          queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
          queryClient.invalidateQueries({ queryKey: ['/api/email-balance'] })
        })
        break
      case "send-sms":
        Promise.resolve().then(async () => {
          const invoicesToSend = filteredInvoices.filter(inv => selectedInvoices.includes(inv.id))
          const results = await Promise.allSettled(invoicesToSend.map(inv => apiRequest('POST', `/api/invoices/${inv.id}/send-sms`)))
          const successCount = results.filter(result => result.status === "fulfilled").length
          const failureCount = results.length - successCount
          if (successCount > 0) {
            await Promise.allSettled(invoicesToSend.map(inv => updateInvoiceStatus(inv.id, "sent")))
            toast({
              title: "SMS Sent",
              description: `Sent ${successCount} SMS message${successCount === 1 ? "" : "s"} successfully.`,
            })
          }
          if (failureCount > 0) {
            toast({
              title: "SMS Issues",
              description: `${failureCount} SMS message${failureCount === 1 ? "" : "s"} failed to send.`,
              variant: "destructive",
            })
          }
          queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
          queryClient.invalidateQueries({ queryKey: ['/api/sms-balance'] })
        })
        break
      case "delete":
        selectedInvoices.forEach((invoiceId) => scheduleInvoiceDelete(invoiceId))
        break
      default:
        break
    }
    setSelectedInvoices([])
  }

  const scheduleInvoiceDelete = (invoiceId: string) => {
    if (actionsDisabled) {
      toast({
        title: "Property Required",
        description: "Select a property in the header before deleting invoices.",
        variant: "destructive",
      })
      return
    }
    if (pendingDeleteRef.current[invoiceId]) {
      clearTimeout(pendingDeleteRef.current[invoiceId])
    }
    const timeoutId = setTimeout(async () => {
      await apiRequest("DELETE", `/api/invoices/${invoiceId}`)
      delete pendingDeleteRef.current[invoiceId]
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-items'] })
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] })
    }, 5000)
    pendingDeleteRef.current[invoiceId] = timeoutId

    toast({
      title: "Invoice delete scheduled",
      description: "Invoice will be deleted in 5 seconds.",
      action: (
        <ToastAction
          altText="Undo delete"
          onClick={() => {
            clearTimeout(timeoutId)
            delete pendingDeleteRef.current[invoiceId]
            toast({
              title: "Delete canceled",
              description: "The invoice was not deleted.",
            })
          }}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo
        </ToastAction>
      ),
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>
      case "partially_paid":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Partially Paid</Badge>
      default:
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">Pending</Badge>
    }
  }

  const getWorkflowBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>
      case "approved":
        return <Badge variant="default">Approved</Badge>
      case "sent":
        return <Badge variant="outline">Sent</Badge>
      default:
        return null
    }
  }

  const statusCounts = {
    all: enrichedInvoices.length,
    pending: enrichedInvoices.filter((inv: any) => inv.paymentStatus === "pending").length,
    partially_paid: enrichedInvoices.filter((inv: any) => inv.paymentStatus === "partially_paid").length,
    paid: enrichedInvoices.filter((inv: any) => inv.paymentStatus === "paid").length,
    overdue: enrichedInvoices.filter((inv: any) => inv.isOverdue).length
  }

  const formatStatusLabel = (status: string) => {
    if (status === "all") return "Total"
    if (status === "partially_paid") return "Partially Paid"
    if (status === "overdue") return "Overdue"
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <div className="p-6 space-y-6">
      <Dialog open={penaltyDialogOpen} onOpenChange={setPenaltyDialogOpen}>
        <DialogContent
          className={`sm:max-w-[480px] vibrant-card ${invoicesListVariants[penaltyCardSeed.current % invoicesListVariants.length]} border border-red-200 text-red-700`}
        >
          <DialogHeader>
            <DialogTitle className="text-red-700">Apply Penalty</DialogTitle>
            <DialogDescription className="text-red-600">
              Set a penalty percentage based on the tenant's rent amount (not the full invoice).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="penalty-percent" className="text-red-700">Penalty Percentage</Label>
            <div className="relative">
              <Input
                id="penalty-percent"
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 10"
                value={penaltyPercent}
                onChange={(e) => setPenaltyPercent(e.target.value)}
                className="pr-10 text-red-700 placeholder:text-red-400 border-red-200 focus-visible:ring-red-300"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-red-600">
                %
              </span>
            </div>
            <p className="text-xs text-red-500">
              Percentage is applied to each tenant's rent amount.
            </p>
            <div className="text-xs text-red-600">
              Ready for penalty:{" "}
              {enrichedInvoices.filter(
                (inv: any) =>
                  selectedInvoices.includes(inv.id) &&
                  inv.isOverdue &&
                  inv.workflowStatus === "approved"
              ).length}
            </div>
            {enrichedInvoices.some(
              (inv: any) =>
                selectedInvoices.includes(inv.id) &&
                inv.isOverdue &&
                inv.workflowStatus === "draft"
            ) && (
              <div className="text-xs text-red-600">
                Draft invoices cannot be penalized.
              </div>
            )}
            {penaltySuccess && (
              <div className="flex items-center gap-2 text-sm text-red-600 animate-pulse">
                <Check className="h-4 w-4" />
                Penalty submitted.
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPenaltyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={applyPenaltyInvoices}
              disabled={isApplyingPenalty}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isApplyingPenalty ? "Applying..." : "Apply Penalty"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={penaltyPromptOpen} onOpenChange={setPenaltyPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Penalty Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to send penalty notifications by email and SMS now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (penaltyInvoiceIds.length === 0) return
                const emailResults = await Promise.allSettled(
                  penaltyInvoiceIds.map((id) => apiRequest('POST', `/api/invoices/${id}/send-email`))
                )
                const smsResults = await Promise.allSettled(
                  penaltyInvoiceIds.map((id) => apiRequest('POST', `/api/invoices/${id}/send-sms`))
                )
                const emailSuccess = emailResults.filter(r => r.status === "fulfilled").length
                const smsSuccess = smsResults.filter(r => r.status === "fulfilled").length
                toast({
                  title: "Penalty Notifications Sent",
                  description: `Emails: ${emailSuccess}/${penaltyInvoiceIds.length}, SMS: ${smsSuccess}/${penaltyInvoiceIds.length}`,
                })
                queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
              }}
            >
              Yes, send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={noteDialogOpen}
        onOpenChange={(open) => {
          setNoteDialogOpen(open)
          if (!open) {
            setNoteInvoice(null)
            setNoteText("")
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Invoice Notes</DialogTitle>
            <DialogDescription>
              {noteInvoice?.invoiceNumber || noteInvoice?.id || "Selected invoice"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-48 overflow-auto rounded-md border p-3 text-sm">
              {invoiceNotesQuery.isLoading && <div>Loading notes...</div>}
              {!invoiceNotesQuery.isLoading && Array.isArray(invoiceNotesQuery.data) && invoiceNotesQuery.data.length === 0 && (
                <div className="text-muted-foreground">No notes yet.</div>
              )}
              {!invoiceNotesQuery.isLoading && Array.isArray(invoiceNotesQuery.data) && invoiceNotesQuery.data.length > 0 && (
                <div className="space-y-2">
                  {invoiceNotesQuery.data.map((note: any) => (
                    <div key={note.id} className="rounded-md border p-2">
                      <div className="text-xs text-muted-foreground">
                        {note.full_name || note.username || "User"} •{" "}
                        {note.created_at ? formatWithOffset(note.created_at, timezoneOffsetMinutes) : "—"}
                      </div>
                      <div className="mt-1">{note.note}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-note">Add note</Label>
              <Textarea
                id="invoice-note"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note for this invoice..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => addInvoiceNoteMutation.mutate()}
                disabled={addInvoiceNoteMutation.isPending}
              >
                {addInvoiceNoteMutation.isPending ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="invoices-title">Invoices</h1>
          <p className="text-muted-foreground">Review, approve and send invoices to tenants</p>
          {!isLandlordSelected && (
            <p className="text-xs text-amber-600 mt-1">Select a client to manage invoices.</p>
          )}
        </div>
        {selectedInvoices.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-red-600">
              Ready for penalty:{" "}
              {enrichedInvoices.filter(
                (inv: any) =>
                  selectedInvoices.includes(inv.id) &&
                  inv.isOverdue &&
                  inv.workflowStatus === "approved"
              ).length}
            </span>
            {enrichedInvoices.some(
              (inv: any) =>
                selectedInvoices.includes(inv.id) &&
                inv.isOverdue &&
                inv.workflowStatus === "approved"
            ) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction("apply-penalty")}
                data-testid="button-bulk-penalty"
              >
                Apply Penalty
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("approve")}
              data-testid="button-bulk-approve"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve ({selectedInvoices.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("send-email")}
              data-testid="button-bulk-email"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("send-sms")}
              data-testid="button-bulk-sms"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              SMS
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleBulkAction("delete")}
              data-testid="button-bulk-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusCounts).map(([status, count], index) => {
          const palette = getStatusPalette(status || `status-${index}`)
          return (
            <Card 
              key={status}
              className={`cursor-pointer hover-elevate border ${palette.border} ${palette.card} ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${palette.accentText}`}>{count}</div>
                <div className="text-sm text-muted-foreground">
                  {formatStatusLabel(status)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-invoices"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card className={`vibrant-card ${invoicesListVariants[invoicesListSeed.current % invoicesListVariants.length]}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Invoices List
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </CardTitle>
          <CardDescription>
            Showing {filteredInvoices.length} of {enrichedInvoices.length} invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Approval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover-elevate">
                  <TableCell>
                    <Checkbox
                      checked={selectedInvoices.includes(invoice.id)}
                      onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                      data-testid={`checkbox-${invoice.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{formatInvoiceId(invoice.id)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{invoice.tenant}</div>
                    <div className="text-xs text-muted-foreground">{invoice.tenantData?.phone || "—"}</div>
                  </TableCell>
                  <TableCell>{invoice.unit}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.property}</TableCell>
                  <TableCell className="font-mono">KSh {Number(invoice.currentAmount ?? invoice.amount).toLocaleString()}</TableCell>
                  <TableCell className={`font-mono ${invoice.isOverdue ? "text-red-600" : ""}`}>
                    KSh {invoice.balance.toLocaleString()}
                  </TableCell>
                  <TableCell className={invoice.isOverdue ? "text-red-600" : ""}>
                    {invoice.dueDate && !Number.isNaN(new Date(invoice.dueDate).getTime())
                      ? formatDateWithOffset(invoice.dueDate, timezoneOffsetMinutes)
                      : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.paymentStatus)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewInvoice(invoice)}
                        data-testid={`button-view-${invoice.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {invoice.status === "draft" && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditInvoice(invoice)}
                          data-testid={`button-edit-${invoice.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {(invoice.status === "approved" || invoice.status === "draft") && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSendInvoice(invoice)}
                          data-testid={`button-send-${invoice.id}`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownloadInvoice(invoice)}
                        data-testid={`button-download-${invoice.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => scheduleInvoiceDelete(invoice.id)}
                        data-testid={`button-delete-${invoice.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getWorkflowBadge(invoice.workflowStatus) || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No invoices found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : "Create your first invoice to get started"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Complete details for invoice {formatInvoiceId(selectedInvoice?.id)}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Invoice Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Invoice ID:</strong> {formatInvoiceId(selectedInvoice.id)}</div>
                    <div><strong>Date:</strong> {formatDateWithOffset(selectedInvoice.createdAt || Date.now(), timezoneOffsetMinutes)}</div>
                    <div><strong>Due Date:</strong> {formatDateWithOffset(selectedInvoice.dueDate, timezoneOffsetMinutes)}</div>
                    <div><strong>Status:</strong> {getStatusBadge(selectedInvoice.paymentStatus)}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Tenant Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {selectedInvoice.tenant}</div>
                    {selectedInvoice.tenantData?.email && (
                      <div><strong>Email:</strong> {selectedInvoice.tenantData.email}</div>
                    )}
                    {selectedInvoice.tenantData?.phone && (
                      <div><strong>Phone:</strong> {selectedInvoice.tenantData.phone}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Property Information */}
              <div>
                <h3 className="font-semibold mb-2">Property Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Property:</strong> {selectedInvoice.property}</div>
                  <div><strong>Unit:</strong> {selectedInvoice.unit}</div>
                </div>
              </div>

              {/* Charges */}
              <div>
                <h3 className="font-semibold mb-2">Charges</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.charges.map((charge: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{charge.name}</TableCell>
                        <TableCell className="text-right font-mono">KSh {charge.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-right mt-4 text-lg font-semibold">
                  Total: KSh {selectedInvoice.amount.toLocaleString()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => handleDownloadInvoice(selectedInvoice)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {(selectedInvoice.status === "approved" || selectedInvoice.status === "draft") && (
                  <Button variant="outline" onClick={() => { setViewDialogOpen(false); handleSendInvoice(selectedInvoice) }}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invoice
                  </Button>
                )}
                {selectedInvoice.status === "draft" && (
                  <Button variant="outline" onClick={() => { setViewDialogOpen(false); handleEditInvoice(selectedInvoice) }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Invoice
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Invoice Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              Send invoice {selectedInvoice?.id} to {selectedInvoice?.tenant}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Invoice will be sent to:
                <div className="mt-2 p-3 bg-muted rounded">
                  <div><strong>Tenant:</strong> {selectedInvoice.tenant}</div>
                  {selectedInvoice.tenantData?.email && (
                    <div><strong>Email:</strong> {selectedInvoice.tenantData.email}</div>
                  )}
                  {selectedInvoice.tenantData?.phone && (
                    <div><strong>Phone:</strong> {selectedInvoice.tenantData.phone}</div>
                  )}
                  <div><strong>Amount:</strong> KSh {selectedInvoice.amount.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleSendEmail(selectedInvoice)} 
                  className="flex-1"
                  disabled={sendEmailMutation.isPending}
                >
                  {sendEmailMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send via Email
                </Button>
                <Button 
                  onClick={() => handleSendSMS(selectedInvoice)} 
                  variant="outline" 
                  className="flex-1"
                  disabled={sendSMSMutation.isPending}
                >
                  {sendSMSMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" />
                  )}
                  Send via SMS
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Edit invoice {formatInvoiceId(selectedInvoice?.id)}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <form id="edit-invoice-form" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={selectedInvoice.description}
                    className="min-h-20"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (KSh)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    defaultValue={selectedInvoice.amount}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    defaultValue={selectedInvoice.dueDate}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-2">{getStatusBadge(selectedInvoice.paymentStatus)}</div>
                </div>
              </div>
              
              {/* Current charges display */}
              <div>
                <Label>Current Charges</Label>
                <div className="mt-2 p-3 bg-muted rounded text-sm">
                  {selectedInvoice.charges.map((charge: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span>{charge.name}</span>
                      <span>KSh {charge.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 font-semibold flex justify-between">
                    <span>Total</span>
                    <span>KSh {selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  To modify charges, use the invoice items management section.
                </p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button"
                  onClick={() => handleEditSubmit(selectedInvoice)}
                  disabled={editInvoiceMutation.isPending}
                >
                  {editInvoiceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}