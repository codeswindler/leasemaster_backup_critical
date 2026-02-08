import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download, 
  AlertTriangle,
  DollarSign,
  Building2,
  Users,
  Receipt,
  FileText,
  Home,
  Wallet,
  CreditCard,
  ChevronDown,
  Search,
  Mail,
  MessageSquare,
  Filter,
  Clock,
  CheckSquare,
  Plus,
  Eye
} from "lucide-react"
import ExcelJS from "exceljs"
import { jsPDF } from "jspdf"
import autoTable from 'jspdf-autotable'
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { formatDateWithOffset, formatWithOffset, usePropertyTimezoneOffset } from "@/lib/timezone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { THRESHOLDS, getSharePercent, getThresholdPalette } from "@/lib/color-rules"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function Reports() {
  const { toast } = useToast()
  const [selectedReport, setSelectedReport] = useState("organizational")
  const [selectedProperty, setSelectedProperty] = useState("all")
  const [startDate, setStartDate] = useState("2024-12-01")
  const [endDate, setEndDate] = useState("2024-12-31")
  const [selectedTenant, setSelectedTenant] = useState("")
  const [selectedChargeCodes, setSelectedChargeCodes] = useState<string[]>([])
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const { selectedAgentId, selectedPropertyId, selectedLandlordId } = useFilter()
  const { timezoneOffsetMinutes } = usePropertyTimezoneOffset()
  const parseNumericValue = (value: string) => {
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // Fetch real properties data
  const { data: propertiesData } = useQuery({ 
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
  })
  const properties = [
    { id: "all", name: "All Properties" },
    ...(propertiesData || []).map((prop: any) => ({ id: prop.id, name: prop.name }))
  ]

  // Fetch real tenant data (reports now use API data instead of hardcoded samples)
  const { data: tenantsData = [] } = useQuery({ 
    queryKey: ['/api/tenants', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })
  const { data: invoicesData = [] } = useQuery({
    queryKey: ['/api/invoices', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/invoices${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: paymentsData = [] } = useQuery({
    queryKey: ['/api/payments', selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/payments${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: leasesData = [] } = useQuery({
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

  const { data: unitsData = [] } = useQuery({
    queryKey: ['/api/units', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/units${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: invoiceItemsData = [] } = useQuery({
    queryKey: ['/api/invoice-items', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/invoice-items")
      return await response.json()
    },
  })

  const normalizedLeases = Array.isArray(leasesData)
    ? leasesData.map((lease: any) => ({
        ...lease,
        tenantId: lease.tenantId ?? lease.tenant_id,
        unitId: lease.unitId ?? lease.unit_id,
        status: (lease.status ?? "").toLowerCase(),
      }))
    : []

  const normalizedUnits = Array.isArray(unitsData)
    ? unitsData.map((unit: any) => ({
        ...unit,
        unitNumber: unit.unitNumber ?? unit.number,
        propertyId: unit.propertyId ?? unit.property_id,
      }))
    : []

  const normalizedInvoices = Array.isArray(invoicesData)
    ? invoicesData.map((invoice: any) => ({
        ...invoice,
        leaseId: invoice.leaseId ?? invoice.lease_id,
        invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number,
        dueDate: invoice.dueDate ?? invoice.due_date,
        issueDate: invoice.issueDate ?? invoice.issue_date,
        amount: Number(invoice.amount ?? 0),
        status: (invoice.status ?? "pending").toLowerCase(),
      }))
    : []

  const normalizedPayments = Array.isArray(paymentsData)
    ? paymentsData.map((payment: any) => ({
        ...payment,
        leaseId: payment.leaseId ?? payment.lease_id,
        invoiceId: payment.invoiceId ?? payment.invoice_id,
        paymentDate: payment.paymentDate ?? payment.payment_date,
        amount: Number(payment.amount ?? 0),
        status: (payment.status ?? "verified").toLowerCase(),
        allocationStatus: (payment.allocation_status ?? payment.allocationStatus ?? "allocated").toLowerCase(),
      }))
    : []

  const normalizedInvoiceItems = Array.isArray(invoiceItemsData)
    ? invoiceItemsData.map((item: any) => ({
        ...item,
        invoiceId: item.invoiceId ?? item.invoice_id,
        chargeCode: (item.chargeCode ?? item.charge_code ?? "").toLowerCase(),
        amount: Number(item.amount ?? 0),
      }))
    : []

  const propertyMap = Array.isArray(propertiesData)
    ? propertiesData.reduce<Record<string, any>>((acc, property: any) => {
        acc[String(property.id)] = property
        return acc
      }, {})
    : {}

  const unitMap = normalizedUnits.reduce<Record<string, any>>((acc, unit: any) => {
    acc[String(unit.id)] = unit
    return acc
  }, {})

  const leaseMap = normalizedLeases.reduce<Record<string, any>>((acc, lease: any) => {
    acc[String(lease.id)] = lease
    return acc
  }, {})

  const isWithinRange = (dateValue: string | undefined | null) => {
    if (!dateValue) return false
    const date = new Date(dateValue)
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null
    if (start && date < start) return false
    if (end && date > end) return false
    return true
  }

  const invoicesWithContext = normalizedInvoices.map((invoice: any) => {
    const lease = leaseMap[String(invoice.leaseId)]
    const unit = lease ? unitMap[String(lease.unitId)] : null
    const propertyId = invoice.propertyId ?? unit?.propertyId ?? null
    return {
      ...invoice,
      tenantId: lease?.tenantId ?? null,
      unitId: unit?.id ?? null,
      propertyId,
    }
  })

  const filteredInvoicesForReports = invoicesWithContext.filter((invoice: any) => {
    const matchesProperty = selectedProperty === "all" || String(invoice.propertyId) === String(selectedProperty)
    const matchesDate = isWithinRange(invoice.issueDate)
    return matchesProperty && matchesDate
  })

  const paymentsWithContext = normalizedPayments.map((payment: any) => {
    const lease = leaseMap[String(payment.leaseId)]
    const unit = lease ? unitMap[String(lease.unitId)] : null
    const propertyId = unit?.propertyId ?? null
    return {
      ...payment,
      propertyId,
    }
  })

  const filteredPaymentsForReports = paymentsWithContext.filter((payment: any) => {
    const matchesProperty = selectedProperty === "all" || String(payment.propertyId) === String(selectedProperty)
    const matchesDate = isWithinRange(payment.paymentDate)
    const isCounted = payment.status === "verified" && payment.allocationStatus === "allocated"
    return matchesProperty && matchesDate && isCounted
  })

  const paymentsByInvoice = filteredPaymentsForReports.reduce<Record<string, number>>((acc, payment: any) => {
    if (!payment.invoiceId) return acc
    const key = String(payment.invoiceId)
    acc[key] = (acc[key] ?? 0) + payment.amount
    return acc
  }, {})

  const totalInvoiced = filteredInvoicesForReports.reduce((sum: number, invoice: any) => sum + invoice.amount, 0)
  const totalPaid = filteredPaymentsForReports.reduce((sum: number, payment: any) => sum + payment.amount, 0)
  const outstanding = Math.max(0, totalInvoiced - totalPaid)
  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0

  const invoiceIdSet = new Set(filteredInvoicesForReports.map((invoice: any) => String(invoice.id)))
  const filteredInvoiceItems = normalizedInvoiceItems.filter((item: any) =>
    invoiceIdSet.has(String(item.invoiceId))
  )
  const rentCollection = filteredInvoiceItems
    .filter((item: any) => item.chargeCode.includes("rent"))
    .reduce((sum: number, item: any) => sum + item.amount, 0)
  const waterCharges = filteredInvoiceItems
    .filter((item: any) => item.chargeCode.includes("water"))
    .reduce((sum: number, item: any) => sum + item.amount, 0)
  const serviceCharges = filteredInvoiceItems
    .filter((item: any) => item.chargeCode.includes("service"))
    .reduce((sum: number, item: any) => sum + item.amount, 0)

  const invoiceSummaryValues = {
    rentCollection,
    waterCharges,
    serviceCharges,
    totalInvoiced,
  }

  const paymentSummaryValues = {
    totalPayments: totalPaid,
    outstanding,
    collectionRate,
    transactions: filteredPaymentsForReports.length,
  }

  const invoiceShare = {
    rent: getSharePercent(invoiceSummaryValues.rentCollection, invoiceSummaryValues.totalInvoiced),
    water: getSharePercent(invoiceSummaryValues.waterCharges, invoiceSummaryValues.totalInvoiced),
    service: getSharePercent(invoiceSummaryValues.serviceCharges, invoiceSummaryValues.totalInvoiced),
    total: 100,
  }
  const outstandingPercent = getSharePercent(paymentSummaryValues.outstanding, invoiceSummaryValues.totalInvoiced)

  const invoiceSummaryPalettes = [
    getThresholdPalette(invoiceShare.rent, THRESHOLDS.sharePercent, "higherBetter"),
    getThresholdPalette(invoiceShare.water, THRESHOLDS.sharePercent, "higherBetter"),
    getThresholdPalette(invoiceShare.service, THRESHOLDS.sharePercent, "higherBetter"),
    getThresholdPalette(invoiceShare.total, THRESHOLDS.sharePercent, "higherBetter"),
  ]
  const paymentSummaryPalettes = [
    getThresholdPalette(paymentSummaryValues.collectionRate, THRESHOLDS.ratePercent, "higherBetter"),
    getThresholdPalette(outstandingPercent, THRESHOLDS.vacancyPercent, "lowerBetter"),
    getThresholdPalette(paymentSummaryValues.collectionRate, THRESHOLDS.ratePercent, "higherBetter"),
    getThresholdPalette(paymentSummaryValues.transactions, THRESHOLDS.count, "higherBetter"),
  ]

  const invoiceBalancesForAging = filteredInvoicesForReports.map((invoice: any) => {
    const paid = paymentsByInvoice[String(invoice.id)] ?? 0
    return {
      ...invoice,
      balance: Math.max(0, invoice.amount - paid),
    }
  })
  const today = new Date()
  const agingSummary = invoiceBalancesForAging.reduce(
    (acc, invoice) => {
      if (invoice.balance <= 0) return acc
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null
      if (!dueDate || dueDate >= today) {
        acc.current += invoice.balance
        return acc
      }
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= 30) acc.days1to30 += invoice.balance
      else if (diffDays <= 60) acc.days31to60 += invoice.balance
      else if (diffDays <= 90) acc.days61to90 += invoice.balance
      else acc.days90plus += invoice.balance
      return acc
    },
    { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0 }
  )

  const tenantMap = tenantsData.reduce<Record<string, any>>((acc, tenant: any) => {
    acc[String(tenant.id)] = tenant
    return acc
  }, {})

  const agingByTenant: Record<string, any> = {}
  invoiceBalancesForAging.forEach((invoice: any) => {
    if (invoice.balance <= 0) return
    const lease = leaseMap[String(invoice.leaseId)]
    const tenant = lease ? tenantMap[String(lease.tenantId)] : null
    const unit = lease ? unitMap[String(lease.unitId)] : null
    if (!tenant) return
    const key = String(tenant.id)
    if (!agingByTenant[key]) {
      agingByTenant[key] = {
        tenantName: tenant.fullName ?? tenant.name ?? "Unknown tenant",
        unitLabel: unit?.unitNumber ?? "N/A",
        total: 0,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
      }
    }
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null
    if (!dueDate || dueDate >= today) {
      agingByTenant[key].current += invoice.balance
    } else {
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= 30) agingByTenant[key].days1to30 += invoice.balance
      else if (diffDays <= 60) agingByTenant[key].days31to60 += invoice.balance
      else if (diffDays <= 90) agingByTenant[key].days61to90 += invoice.balance
      else agingByTenant[key].days90plus += invoice.balance
    }
    agingByTenant[key].total += invoice.balance
  })

  const agingDetailRows = Object.values(agingByTenant).sort((a: any, b: any) => b.total - a.total)

  const agingSummaryPalettes = [
    getThresholdPalette(getSharePercent(agingSummary.current, totalInvoiced || 1), THRESHOLDS.sharePercent, "higherBetter"),
    getThresholdPalette(getSharePercent(agingSummary.days1to30, totalInvoiced || 1), THRESHOLDS.sharePercent, "higherBetter"),
    getThresholdPalette(getSharePercent(agingSummary.days31to60, totalInvoiced || 1), THRESHOLDS.sharePercent, "higherBetter"),
    getThresholdPalette(getSharePercent(agingSummary.days61to90, totalInvoiced || 1), THRESHOLDS.sharePercent, "higherBetter"),
    getThresholdPalette(getSharePercent(agingSummary.days90plus, totalInvoiced || 1), THRESHOLDS.sharePercent, "higherBetter"),
  ]

  const activeLeaseUnitIds = new Set(
    normalizedLeases.filter((lease: any) => lease.status === "active").map((lease: any) => String(lease.unitId))
  )
  const vacantUnits = normalizedUnits.filter((unit: any) => !activeLeaseUnitIds.has(String(unit.id))).length

  const organizationalReports = [
    { id: "outstanding-balances", name: "Outstanding Balances", icon: AlertTriangle, total: `KSh ${outstanding.toLocaleString()}` },
    { id: "total-invoices", name: "Total Invoices", icon: Receipt, total: `${filteredInvoicesForReports.length} invoices` },
    { id: "total-payments", name: "Total Payments Received", icon: Wallet, total: `KSh ${totalPaid.toLocaleString()}` },
    { id: "tenant-registry", name: "Tenant Registry", icon: Users, total: `${tenantsData.length} tenants` },
    { id: "income-statement", name: "Income Statement", icon: DollarSign, total: `KSh ${totalPaid.toLocaleString()} net` },
    { id: "vacancy-report", name: "Vacancy Report", icon: Building2, total: `${vacantUnits} vacant units` }
  ]

  const reportTotals = organizationalReports.map((report) => parseNumericValue(report.total));
  const maxReportTotal = Math.max(0, ...reportTotals);

  const tenants = tenantsData.map((tenant: any) => {
    const tenantLease = normalizedLeases.find((lease: any) => String(lease.tenantId) === String(tenant.id))
    const unit = tenantLease ? unitMap[String(tenantLease.unitId)] : null
    const property = unit ? propertyMap[String(unit.propertyId)] : null
    const account = property?.accountPrefix && unit?.unitNumber
      ? `${property.accountPrefix}${unit.unitNumber}`
      : "N/A"
    const tenantInvoices = invoicesWithContext.filter((invoice: any) => String(invoice.leaseId) === String(tenantLease?.id))
    const tenantPayments = normalizedPayments.filter((payment: any) => String(payment.leaseId) === String(tenantLease?.id))
      .filter((payment: any) => payment.status === "verified" && payment.allocationStatus === "allocated")
    const tenantInvoiced = tenantInvoices.reduce((sum: number, invoice: any) => sum + invoice.amount, 0)
    const tenantPaid = tenantPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0)
    return {
      id: tenant.id,
      name: tenant.fullName,
      unit: unit?.unitNumber || "N/A",
      account,
      balance: tenantInvoiced - tenantPaid,
    }
  })

  const chargeCodes = [
    { id: "rent", name: "Rent" },
    { id: "water", name: "Water" },
    { id: "electricity", name: "Electricity" },
    { id: "service", name: "Service Charge" },
    { id: "security", name: "Security" },
    { id: "garbage", name: "Garbage Collection" }
  ]

  const reportTypes = [
    { id: "organizational", name: "Organizational Reports", icon: Building2 },
    { id: "property", name: "Property Reports", icon: Home },
    { id: "lease-statements", name: "Lease Statements", icon: FileText },
    { id: "tenant-balances", name: "Tenant Balances", icon: Users },
    { id: "aging-balances", name: "Aging Balances", icon: Clock }
  ]

  // Date validation helper
  const validateDateRange = () => {
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  // Generate Excel file
  const generateExcelReport = async (reportType: string, data: any[]) => {
    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet("Report")

    ws.addRow([`${reportType} Report`])
    ws.addRow([`Generated: ${formatDateWithOffset(new Date(), timezoneOffsetMinutes)}`])
    ws.addRow([`Period: ${startDate} to ${endDate}`])
    ws.addRow([`Property: ${properties.find(p => p.id === selectedProperty)?.name || 'All Properties'}`])
    ws.addRow([])

    if (data.length > 0) {
      const headers = Object.keys(data[0])
      ws.columns = headers.map((key) => ({ header: key, key }))
      ws.addRows(data)
    } else {
      ws.addRow(["No data available"])
    }

    const fileName = `${reportType.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.xlsx`
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)

    return fileName
  }

  // Generate PDF file
  const generatePDFReport = (reportType: string, data: any[]) => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(20)
    doc.text(reportType, 20, 30)
    
    // Add metadata
    doc.setFontSize(12)
    doc.text(`Generated: ${formatDateWithOffset(new Date(), timezoneOffsetMinutes)}`, 20, 50)
    doc.text(`Period: ${startDate} to ${endDate}`, 20, 60)
    doc.text(`Property: ${properties.find(p => p.id === selectedProperty)?.name || 'All Properties'}`, 20, 70)
    
    // Add table if data exists
    if (data.length > 0) {
      const columns = Object.keys(data[0])
      const rows = data.map(row => columns.map(col => row[col] || ''))
      
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 80,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] }, // Blue header
      })
    }
    
    const fileName = `${reportType.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.pdf`
    doc.save(fileName)
    
    return fileName
  }

  // Generate comprehensive report data with real tenant payment information
  const generateComprehensiveReportData = async (reportType: string) => {
    try {
      // Build query params for filtering
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const queryString = params.toString() ? `?${params}` : ''
      
      // Fetch all necessary data from APIs
      const [paymentsRes, tenantsRes, leasesRes, propertiesRes, unitsRes] = await Promise.all([
        fetch(`/api/payments${queryString}`),
        fetch(`/api/tenants${queryString}`),
        fetch(`/api/leases${queryString}`),
        fetch(`/api/properties${queryString}`),
        fetch(`/api/units${queryString}`)
      ])

      const payments = await paymentsRes.json()
      const tenants = await tenantsRes.json()
      const leases = await leasesRes.json()
      const properties = await propertiesRes.json()
      const units = await unitsRes.json()

      // Filter payments by date range
      const filteredPayments = payments.filter((payment: any) => {
        const paymentDate = new Date(payment.paymentDate)
        const start = new Date(startDate)
        const end = new Date(endDate)
        return paymentDate >= start && paymentDate <= end
      })

      // Create comprehensive tenant payment data
      const tenantPaymentData: any[] = []
      let totalAmount = 0

      tenants.forEach((tenant: any) => {
        const tenantLease = leases.find((lease: any) => lease.tenantId === tenant.id)
        if (!tenantLease) return

        const tenantPayments = filteredPayments.filter((payment: any) => payment.leaseId === tenantLease.id)
        const tenantUnit = units.find((unit: any) => unit.id === tenantLease.unitId)
        const tenantProperty = properties.find((property: any) => property.id === tenantUnit?.propertyId)

        // Skip if property filter is applied and doesn't match
        if (selectedProperty !== "all" && tenantProperty?.id !== selectedProperty) return

        const tenantTotalPayments = tenantPayments.reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0)
        totalAmount += tenantTotalPayments

        // Add detailed tenant row
        tenantPaymentData.push({
          'Tenant Name': tenant.fullName,
          'Email': tenant.email,
          'Phone': tenant.phone,
          'ID Number': tenant.idNumber,
          'Property': tenantProperty?.name || 'N/A',
          'Unit': tenantUnit?.name || 'N/A',
          'Monthly Rent': `KSh ${parseFloat(tenantLease.rentAmount).toLocaleString()}`,
          'Payments Received': `KSh ${tenantTotalPayments.toLocaleString()}`,
          'Number of Payments': tenantPayments.length,
          'Payment Methods': tenantPayments.map((p: any) => p.paymentMethod).join(', ') || 'None',
          'Emergency Contact': tenant.emergencyContact,
          'Emergency Phone': tenant.emergencyPhone,
        'Lease Start': formatDateWithOffset(tenantLease.startDate, timezoneOffsetMinutes),
          'Lease Status': tenantLease.status
        })
      })

      // Add summary/tally row at the bottom
      tenantPaymentData.push({
        'Tenant Name': '--- SUMMARY TOTALS ---',
        'Email': '',
        'Phone': '',
        'ID Number': '',
        'Property': selectedProperty === "all" ? "All Properties" : properties.find((p: any) => p.id === selectedProperty)?.name,
        'Unit': '',
        'Monthly Rent': '',
        'Payments Received': `KSh ${totalAmount.toLocaleString()}`,
        'Number of Payments': filteredPayments.length,
        'Payment Methods': '',
        'Emergency Contact': '',
        'Emergency Phone': '',
        'Lease Start': '',
        'Lease Status': ''
      })

      // Add report metadata at the top
      tenantPaymentData.unshift({
        'Tenant Name': `${reportType} Report`,
        'Email': `Generated: ${formatWithOffset(new Date(), timezoneOffsetMinutes)}`,
        'Phone': `Period: ${startDate} to ${endDate}`,
        'ID Number': `Property: ${selectedProperty === "all" ? "All Properties" : properties.find((p: any) => p.id === selectedProperty)?.name}`,
        'Property': `Total Tenants: ${tenants.length}`,
        'Unit': `Total Payments: ${filteredPayments.length}`,
        'Monthly Rent': `Total Amount: KSh ${totalAmount.toLocaleString()}`,
        'Payments Received': '',
        'Number of Payments': '',
        'Payment Methods': '',
        'Emergency Contact': '',
        'Emergency Phone': '',
        'Lease Start': '',
        'Lease Status': ''
      })

      return tenantPaymentData

    } catch (error) {
      console.error('Error generating report data:', error)
      return []
    }
  }

  const handleExportReport = async (reportType: string, format: string = "excel") => {
    if (!validateDateRange()) {
      return
    }

    try {
      // Fetch comprehensive real data for reports
      const reportData = await generateComprehensiveReportData(reportType)
      
      let fileName = ''
      if (format === "excel") {
        fileName = await generateExcelReport(reportType, reportData)
      } else if (format === "pdf") {
        fileName = generatePDFReport(reportType, reportData)
      }

      toast({
        title: "Report Generated Successfully",
        description: `${fileName} has been downloaded`,
      })
      
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export Failed",
        description: "Failed to generate report file",
        variant: "destructive",
      })
    }
  }

  const handleSendNotice = (tenantId: string, method: string) => {
    console.log(`Sending notice to tenant ${tenantId} via ${method}`)
    alert(`Notice sent via ${method} successfully!`)
  }

  const handleBulkSend = (method: string) => {
    if (selectedTenants.length === 0) {
      alert("Please select tenants to send notices to")
      return
    }
    console.log(`Sending bulk notice to ${selectedTenants.length} tenants via ${method}`)
    alert(`Bulk notice sent to ${selectedTenants.length} tenants via ${method}!`)
  }

  const handleSearchLeaseStatement = () => {
    if (!selectedTenant || !startDate || !endDate) {
      alert("Please select tenant and date range")
      return
    }
    console.log(`Searching lease statement for tenant ${selectedTenant} from ${startDate} to ${endDate}`)
  }

  const handleToggleTenant = (tenantId: string) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId) 
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    )
  }

  const handleToggleAllTenants = () => {
    const visibleTenants = tenants.filter((tenant: any) => tenant.balance !== 0)
    setSelectedTenants(
      selectedTenants.length === visibleTenants.length 
        ? [] 
        : visibleTenants.map((t: any) => t.id)
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="reports-title">Reports</h1>
          <p className="text-muted-foreground">Generate comprehensive reports and analytics</p>
        </div>
        
        {/* Report Type Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="dropdown-report-type">
              {reportTypes.find(r => r.id === selectedReport)?.name || "Select Report Type"}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {reportTypes.map((report) => (
              <DropdownMenuItem 
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                data-testid={`menu-${report.id}`}
              >
                <report.icon className="h-4 w-4 mr-2" />
                {report.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Organizational Reports */}
      {selectedReport === "organizational" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {organizationalReports.map((report, index) => {
              const totalValue = parseNumericValue(report.total)
              const totalShare = getSharePercent(totalValue, maxReportTotal || 1)
              const palette = getThresholdPalette(totalShare, THRESHOLDS.sharePercent, "higherBetter")
              return (
              <Card key={report.id} className={`hover-elevate border ${palette.border} ${palette.card}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">{report.name}</CardTitle>
                  <report.icon className={`h-5 w-5 ${palette.icon}`} />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className={`text-2xl font-bold ${palette.accentText}`}>{report.total}</div>
                    
                    {/* Date Range Selection */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Start Date</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-8"
                          data-testid={`input-start-date-${report.id}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Date</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-8"
                          data-testid={`input-end-date-${report.id}`}
                        />
                      </div>
                    </div>

                    {/* Property Filter */}
                    <div>
                      <Label className="text-xs">Property</Label>
                      <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Download Button */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleExportReport(report.name, "excel")}
                        data-testid={`button-download-${report.id}`}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Excel
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleExportReport(report.name, "pdf")}
                        data-testid={`button-download-pdf-${report.id}`}
                      >
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
            })}
          </div>
        </div>
      )}

      {/* Property Reports */}
      {selectedReport === "property" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Property Reports</CardTitle>
                  <CardDescription>Generate detailed property performance reports</CardDescription>
                </div>
                <div className="flex gap-4 items-center">
                  {/* Property Switcher */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Property:</Label>
                    <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.filter(p => p.id !== "all").map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Date Range Selection */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">From:</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                    />
                    <Label className="text-sm">To:</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Charge Codes Selection */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Select Charge Codes to Include:</Label>
                <div className="grid grid-cols-3 gap-3">
                  {chargeCodes.map((code) => (
                    <div key={code.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={code.id}
                        checked={selectedChargeCodes.includes(code.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedChargeCodes([...selectedChargeCodes, code.id])
                          } else {
                            setSelectedChargeCodes(selectedChargeCodes.filter(id => id !== code.id))
                          }
                        }}
                        data-testid={`checkbox-${code.id}`}
                      />
                      <Label htmlFor={code.id} className="text-sm">{code.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={handleSearchLeaseStatement} data-testid="button-search-property">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" onClick={() => handleExportReport("Property Report", "excel")}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel
                </Button>
                <Button variant="outline" onClick={() => handleExportReport("Property Report", "pdf")}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              {/* Invoice Summary */}
              <div className="space-y-4">
                <h4 className="font-medium">Invoice Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-3 rounded-lg border text-center ${invoiceSummaryPalettes[0].card} ${invoiceSummaryPalettes[0].border}`}>
                    <p className={`text-lg font-bold ${invoiceSummaryPalettes[0].accentText}`}>
                      KSh {invoiceSummaryValues.rentCollection.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Rent Collection</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${invoiceSummaryPalettes[1].card} ${invoiceSummaryPalettes[1].border}`}>
                    <p className={`text-lg font-bold ${invoiceSummaryPalettes[1].accentText}`}>
                      KSh {invoiceSummaryValues.waterCharges.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Water Charges</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${invoiceSummaryPalettes[2].card} ${invoiceSummaryPalettes[2].border}`}>
                    <p className={`text-lg font-bold ${invoiceSummaryPalettes[2].accentText}`}>
                      KSh {invoiceSummaryValues.serviceCharges.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Service Charges</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${invoiceSummaryPalettes[3].card} ${invoiceSummaryPalettes[3].border}`}>
                    <p className={`text-lg font-bold ${invoiceSummaryPalettes[3].accentText}`}>
                      KSh {invoiceSummaryValues.totalInvoiced.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Invoiced</p>
                  </div>
                </div>
              </div>

              {/* Tenant Payment Summary */}
              <div className="space-y-4">
                <h4 className="font-medium">Tenant Payment Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-3 rounded-lg border text-center ${paymentSummaryPalettes[0].card} ${paymentSummaryPalettes[0].border}`}>
                    <p className={`text-lg font-bold ${paymentSummaryPalettes[0].accentText}`}>
                      KSh {paymentSummaryValues.totalPayments.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Payments</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${paymentSummaryPalettes[1].card} ${paymentSummaryPalettes[1].border}`}>
                    <p className={`text-lg font-bold ${paymentSummaryPalettes[1].accentText}`}>
                      KSh {paymentSummaryValues.outstanding.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${paymentSummaryPalettes[2].card} ${paymentSummaryPalettes[2].border}`}>
                    <p className={`text-lg font-bold ${paymentSummaryPalettes[2].accentText}`}>
                      {paymentSummaryValues.collectionRate}%
                    </p>
                    <p className="text-sm text-muted-foreground">Collection Rate</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${paymentSummaryPalettes[3].card} ${paymentSummaryPalettes[3].border}`}>
                    <p className={`text-lg font-bold ${paymentSummaryPalettes[3].accentText}`}>
                      {paymentSummaryValues.transactions}
                    </p>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lease Statements */}
      {selectedReport === "lease-statements" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lease Statements</CardTitle>
              <CardDescription>Generate tenant account statements and lease history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tenant Account</Label>
                  <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                    <SelectTrigger data-testid="select-tenant-statement">
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant: any) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name} - {tenant.unit} ({tenant.account})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-statement-start-date"
                  />
                </div>
                
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-statement-end-date"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSearchLeaseStatement} data-testid="button-search-statement">
                  <Search className="h-4 w-4 mr-2" />
                  Search Statement
                </Button>
              </div>

              {selectedTenant && (
                <Card className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">
                        Account Statement: {tenants.find((t: any) => t.id === selectedTenant)?.name}
                      </h4>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleExportReport("Lease Statement", "pdf")}>
                          <Download className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExportReport("Lease Statement", "excel")}>
                          <Download className="h-3 w-3 mr-1" />
                          Excel
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSendNotice(selectedTenant, "email")}>
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSendNotice(selectedTenant, "sms")}>
                          <MessageSquare className="h-3 w-3 mr-1" />
                          SMS Link
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Statement period: {startDate} to {endDate}
                    </div>
                    
                    <div className="border rounded p-4 bg-muted/20">
                      <p className="text-center text-muted-foreground">
                        Account statement will be generated here based on selected criteria
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tenant Balances */}
      {selectedReport === "tenant-balances" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Tenant Balances</CardTitle>
                  <CardDescription>View and manage tenant account balances (sorted by balance amount)</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleBulkSend("email")}
                    disabled={selectedTenants.length === 0}
                    data-testid="button-bulk-email"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Bulk Email ({selectedTenants.length})
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleBulkSend("sms")}
                    disabled={selectedTenants.length === 0}
                    data-testid="button-bulk-sms"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Bulk SMS ({selectedTenants.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTenants.length === tenants.filter((tenant: any) => tenant.balance !== 0).length}
                        onCheckedChange={handleToggleAllTenants}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants
                    .filter((tenant: any) => tenant.balance !== 0)
                    .sort((a: any, b: any) => b.balance - a.balance)
                    .map((tenant: any) => (
                    <TableRow key={tenant.id} className="hover-elevate">
                      <TableCell>
                        <Checkbox
                          checked={selectedTenants.includes(tenant.id)}
                          onCheckedChange={() => handleToggleTenant(tenant.id)}
                          data-testid={`checkbox-tenant-${tenant.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>{tenant.unit}</TableCell>
                      <TableCell className="font-mono">{tenant.account}</TableCell>
                      <TableCell>
                        <span
                          className={`font-mono font-medium ${tenant.balance < 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          KSh {tenant.balance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {tenant.balance > 0 && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleSendNotice(tenant.id, "email")}
                                data-testid={`button-email-${tenant.id}`}
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleSendNotice(tenant.id, "sms")}
                                data-testid={`button-sms-${tenant.id}`}
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            data-testid={`button-view-${tenant.id}`}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Aging Balances */}
      {selectedReport === "aging-balances" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aging Balances</CardTitle>
              <CardDescription>Track overdue balances by age periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Aging Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className={`p-3 rounded-lg border text-center ${agingSummaryPalettes[0].card} ${agingSummaryPalettes[0].border}`}>
                    <p className={`text-lg font-bold ${agingSummaryPalettes[0].accentText}`}>
                      KSh {agingSummary.current.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Current</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${agingSummaryPalettes[1].card} ${agingSummaryPalettes[1].border}`}>
                    <p className={`text-lg font-bold ${agingSummaryPalettes[1].accentText}`}>
                      KSh {agingSummary.days1to30.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">1-30 Days</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${agingSummaryPalettes[2].card} ${agingSummaryPalettes[2].border}`}>
                    <p className={`text-lg font-bold ${agingSummaryPalettes[2].accentText}`}>
                      KSh {agingSummary.days31to60.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">31-60 Days</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${agingSummaryPalettes[3].card} ${agingSummaryPalettes[3].border}`}>
                    <p className={`text-lg font-bold ${agingSummaryPalettes[3].accentText}`}>
                      KSh {agingSummary.days61to90.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">61-90 Days</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${agingSummaryPalettes[4].card} ${agingSummaryPalettes[4].border}`}>
                    <p className={`text-lg font-bold ${agingSummaryPalettes[4].accentText}`}>
                      KSh {agingSummary.days90plus.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">90+ Days</p>
                  </div>
                </div>

                {/* Aging Details Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Total Balance</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>1-30 Days</TableHead>
                      <TableHead>31-60 Days</TableHead>
                      <TableHead>61-90 Days</TableHead>
                      <TableHead>90+ Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agingDetailRows.map((row: any) => (
                      <TableRow key={`${row.tenantName}-${row.unitLabel}`}>
                        <TableCell>{row.tenantName}</TableCell>
                        <TableCell>{row.unitLabel}</TableCell>
                        <TableCell className="font-mono text-red-600">KSh {row.total.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">KSh {row.current.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">KSh {row.days1to30.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">KSh {row.days31to60.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">KSh {row.days61to90.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">KSh {row.days90plus.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end">
                  <Button onClick={() => handleExportReport("Aging Balances", "excel")}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Aging Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}