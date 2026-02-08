import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useFilter } from "@/contexts/FilterContext"
import {
  Settings as SettingsIcon,
  Smartphone,
  CreditCard,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  AlertTriangle,
  Mail
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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getPaletteByIndex } from "@/lib/palette"

interface AlertRule {
  key: string
  label: string
  recipient_type: "landlord" | "system_user" | "tenant"
  alert_type: string
  enable_sms: boolean
  enable_email: boolean
  frequency: string
  threshold_value?: number | null
  schedule_json?: string | null
}

const defaultAlertRules: AlertRule[] = [
  {
    key: "landlord_receipt",
    label: "Receipt alerts",
    recipient_type: "landlord",
    alert_type: "receipt",
    enable_sms: true,
    enable_email: true,
    frequency: "immediate",
  },
  {
    key: "landlord_invoice_summary",
    label: "Invoice alerts (count/amount)",
    recipient_type: "landlord",
    alert_type: "invoice_summary",
    enable_sms: false,
    enable_email: true,
    frequency: "daily",
    schedule_json: JSON.stringify({ invoice_count: 0, invoice_amount: 0 })
  },
  {
    key: "landlord_reminder_sent",
    label: "Reminder sent alerts",
    recipient_type: "landlord",
    alert_type: "reminder_sent",
    enable_sms: true,
    enable_email: true,
    frequency: "immediate",
  },
  {
    key: "landlord_balance_sms",
    label: "SMS balance notifications",
    recipient_type: "landlord",
    alert_type: "balance_sms",
    enable_sms: true,
    enable_email: false,
    frequency: "immediate",
    threshold_value: 0
  },
  {
    key: "landlord_balance_email",
    label: "Email balance notifications",
    recipient_type: "landlord",
    alert_type: "balance_email",
    enable_sms: false,
    enable_email: true,
    frequency: "immediate",
    threshold_value: 0
  },
  {
    key: "system_receipt",
    label: "Receipt alerts",
    recipient_type: "system_user",
    alert_type: "receipt",
    enable_sms: false,
    enable_email: true,
    frequency: "immediate",
  },
  {
    key: "system_invoice_summary",
    label: "Invoice alerts (count/amount)",
    recipient_type: "system_user",
    alert_type: "invoice_summary",
    enable_sms: false,
    enable_email: true,
    frequency: "daily",
    schedule_json: JSON.stringify({ invoice_count: 0, invoice_amount: 0 })
  },
  {
    key: "system_reminder_sent",
    label: "Reminder sent alerts",
    recipient_type: "system_user",
    alert_type: "reminder_sent",
    enable_sms: false,
    enable_email: true,
    frequency: "immediate",
  },
  {
    key: "system_balance_sms",
    label: "SMS balance notifications",
    recipient_type: "system_user",
    alert_type: "balance_sms",
    enable_sms: true,
    enable_email: false,
    frequency: "immediate",
    threshold_value: 0
  },
  {
    key: "system_balance_email",
    label: "Email balance notifications",
    recipient_type: "system_user",
    alert_type: "balance_email",
    enable_sms: false,
    enable_email: true,
    frequency: "immediate",
    threshold_value: 0
  },
  {
    key: "tenant_invoice_reminder",
    label: "Invoice reminder alerts",
    recipient_type: "tenant",
    alert_type: "tenant_invoice_reminder",
    enable_sms: true,
    enable_email: false,
    frequency: "custom",
    schedule_json: JSON.stringify({ before_days: [3, 1], after_days: [3], on_due_date: true, reminder_every_days: 3 })
  },
  {
    key: "tenant_receipt",
    label: "Receipt alerts",
    recipient_type: "tenant",
    alert_type: "tenant_receipt",
    enable_sms: true,
    enable_email: false,
    frequency: "immediate",
  },
  {
    key: "tenant_payment_confirmation",
    label: "Payment confirmation messages",
    recipient_type: "tenant",
    alert_type: "payment_confirmation",
    enable_sms: true,
    enable_email: false,
    frequency: "immediate",
  }
]

const parseSchedule = (value?: string | null) => {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

const timezoneOffsets = [
  "UTC-12:00", "UTC-11:00", "UTC-10:00", "UTC-09:00", "UTC-08:00", "UTC-07:00",
  "UTC-06:00", "UTC-05:00", "UTC-04:00", "UTC-03:00", "UTC-02:00", "UTC-01:00",
  "UTC+00:00", "UTC+01:00", "UTC+02:00", "UTC+03:00", "UTC+04:00", "UTC+05:00",
  "UTC+05:30", "UTC+06:00", "UTC+07:00", "UTC+08:00", "UTC+09:00", "UTC+09:30",
  "UTC+10:00", "UTC+11:00", "UTC+12:00", "UTC+13:00", "UTC+14:00"
]

export function Settings() {
  const { selectedAgentId, selectedPropertyId, selectedLandlordId } = useFilter()
  const tabsSeed = useRef(Math.floor(Math.random() * 6))
  const tabsPalette = getPaletteByIndex(tabsSeed.current)
  const settingsVariants = [
    "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-blue-900/50",
    "bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-emerald-900/50",
    "bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-rose-900/50",
    "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-amber-900/50",
    "bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-violet-900/50",
    "bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100/70 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-cyan-900/50",
  ]
  const settingsSeed = useRef(Math.floor(Math.random() * settingsVariants.length))
  const { toast } = useToast()
  const [showFields, setShowFields] = useState<Record<string, boolean>>({})
  const settingsDisabled = !selectedPropertyId || selectedPropertyId === "all"

  const scopeParams = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedAgentId) params.append("agentId", selectedAgentId)
    if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
    if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
    return params.toString() ? `?${params}` : ""
  }, [selectedAgentId, selectedPropertyId, selectedLandlordId])

  const { data: smsData } = useQuery({
    queryKey: ["/api/settings/sms", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/settings/sms${scopeParams}`)
      return await response.json()
    },
  })

  const { data: emailData } = useQuery({
    queryKey: ["/api/settings/email", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/settings/email${scopeParams}`)
      return await response.json()
    },
  })

  const { data: mpesaData } = useQuery({
    queryKey: ["/api/settings/mpesa", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/settings/mpesa${scopeParams}`)
      return await response.json()
    },
  })

  const { data: invoiceData } = useQuery({
    queryKey: ["/api/settings/invoice", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/settings/invoice${scopeParams}`)
      return await response.json()
    },
  })

  const { data: alertsData } = useQuery({
    queryKey: ["/api/settings/alerts", selectedPropertyId, selectedLandlordId, selectedAgentId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/settings/alerts${scopeParams}`)
      return await response.json()
    },
  })

  const [smsSettings, setSmsSettings] = useState({
    api_url: "",
    api_key: "",
    partner_id: "",
    shortcode: "",
    sender_id: "",
    balance_threshold: "",
    enabled: false
  })

  const [emailSettings, setEmailSettings] = useState({
    smtp_host: "",
    smtp_port: "",
    smtp_user: "",
    smtp_pass: "",
    smtp_secure: "tls",
    from_email: "",
    from_name: "",
    credit_balance: "",
    credit_threshold: "",
    enabled: false
  })

  const [mpesaSettings, setMpesaSettings] = useState({
    consumer_key: "",
    consumer_secret: "",
    passkey: "",
    shortcode: "",
    account_reference: "",
    stk_callback_url: "",
    balance_callback_url: "",
    initiator_name: "",
    security_credential: "",
    enabled: false
  })

  const [invoiceSettings, setInvoiceSettings] = useState({
    company_name: "",
    company_phone: "",
    company_email: "",
    company_address: "",
    payment_options: "",
    logo_url: "",
    timezone_offset: "UTC+00:00"
  })

  const [alertRules, setAlertRules] = useState<AlertRule[]>(defaultAlertRules)
  const [balanceInfo, setBalanceInfo] = useState<string>("")
  const [logoUploading, setLogoUploading] = useState(false)

  useEffect(() => {
    if (smsData && typeof smsData === "object") {
      setSmsSettings({
        api_url: smsData.api_url ?? "",
        api_key: smsData.api_key ?? "",
        partner_id: smsData.partner_id ?? "",
        shortcode: smsData.shortcode ?? "",
        sender_id: smsData.sender_id ?? "",
        balance_threshold: smsData.balance_threshold ?? "",
        enabled: !!smsData.enabled
      })
    }
  }, [smsData])

  useEffect(() => {
    if (emailData && typeof emailData === "object") {
      setEmailSettings({
        smtp_host: emailData.smtp_host ?? "",
        smtp_port: emailData.smtp_port ?? "",
        smtp_user: emailData.smtp_user ?? "",
        smtp_pass: emailData.smtp_pass ?? "",
        smtp_secure: emailData.smtp_secure ?? "tls",
        from_email: emailData.from_email ?? "",
        from_name: emailData.from_name ?? "",
        credit_balance: emailData.credit_balance ?? "",
        credit_threshold: emailData.credit_threshold ?? "",
        enabled: !!emailData.enabled
      })
    }
  }, [emailData])

  useEffect(() => {
    if (mpesaData && typeof mpesaData === "object") {
      setMpesaSettings({
        consumer_key: mpesaData.consumer_key ?? "",
        consumer_secret: mpesaData.consumer_secret ?? "",
        passkey: mpesaData.passkey ?? "",
        shortcode: mpesaData.shortcode ?? "",
        account_reference: mpesaData.account_reference ?? "",
        stk_callback_url: mpesaData.stk_callback_url ?? "",
        balance_callback_url: mpesaData.balance_callback_url ?? "",
        initiator_name: mpesaData.initiator_name ?? "",
        security_credential: mpesaData.security_credential ?? "",
        enabled: !!mpesaData.enabled
      })
    }
  }, [mpesaData])

  useEffect(() => {
    if (invoiceData && typeof invoiceData === "object") {
      setInvoiceSettings({
        company_name: invoiceData.company_name ?? "",
        company_phone: invoiceData.company_phone ?? "",
        company_email: invoiceData.company_email ?? "",
        company_address: invoiceData.company_address ?? "",
        payment_options: invoiceData.payment_options ?? "",
        logo_url: invoiceData.logo_url ?? "",
        timezone_offset: invoiceData.timezone_offset ?? "UTC+00:00"
      })
    }
  }, [invoiceData])

  const toggleFieldVisibility = (key: string) => {
    setShowFields((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderSecretInput = (
    key: string,
    value: string,
    onChange: (value: string) => void,
    placeholder?: string
  ) => (
    <div className="relative">
      <Input
        type={showFields[key] ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => toggleFieldVisibility(key)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-label={showFields[key] ? "Hide value" : "Show value"}
      >
        {showFields[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )

  useEffect(() => {
    if (Array.isArray(alertsData) && alertsData.length > 0) {
      const existing = new Map(alertsData.map((alert: any) => [`${alert.recipient_type}:${alert.alert_type}`, alert]))
      setAlertRules(
        defaultAlertRules.map((rule) => {
          const match = existing.get(`${rule.recipient_type}:${rule.alert_type}`)
          if (!match) return rule
          return {
            ...rule,
            enable_sms: !!match.enable_sms,
            enable_email: !!match.enable_email,
            frequency: match.frequency ?? rule.frequency,
            threshold_value: match.threshold_value ?? rule.threshold_value,
            schedule_json: match.schedule_json ?? rule.schedule_json
          }
        })
      )
    }
  }, [alertsData])

  const saveMutation = useMutation({
    mutationFn: async ({ section, payload }: { section: string; payload: any }) => {
      const response = await apiRequest("PUT", `/api/settings/${section}${scopeParams}`, payload)
      return await response.json()
    },
    onSuccess: (data, variables) => {
      const section = variables.section
      queryClient.invalidateQueries({ queryKey: [`/api/settings/${section}`, selectedPropertyId, selectedLandlordId, selectedAgentId] })
      if (section === "invoice" && data && typeof data === "object") {
        setInvoiceSettings({
          company_name: data.company_name ?? "",
          company_phone: data.company_phone ?? "",
          company_email: data.company_email ?? "",
          company_address: data.company_address ?? "",
          payment_options: data.payment_options ?? "",
          logo_url: data.logo_url ?? "",
          timezone_offset: data.timezone_offset ?? "UTC+00:00"
        })
      }
      toast({ title: "Settings saved" })
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Unable to save settings",
        variant: "destructive",
      })
    }
  })

  const balanceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/mpesa/balance${scopeParams}`)
      return await response.json()
    },
    onSuccess: (data: any) => {
      setBalanceInfo(data?.balance ? `KES ${data.balance}` : data?.message || "Balance fetched")
      toast({
        title: "M-Pesa balance",
        description: data?.balance ? `Balance: KES ${data.balance}` : data?.message || "Balance fetched",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Balance check failed",
        description: error?.message || "Unable to fetch balance",
        variant: "destructive",
      })
    }
  })

  const saveSection = (section: string, payload: any) => {
    saveMutation.mutate({ section, payload })
  }

  const handleLogoUpload = async (file?: File | null) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Logo too large",
        description: "Maximum logo size is 5MB.",
        variant: "destructive",
      })
      return
    }
    const formData = new FormData()
    formData.append("logo", file)
    setLogoUploading(true)
    try {
      const response = await fetch(`/api/settings/invoice-logo${scopeParams}`, {
        method: "POST",
        body: formData,
        credentials: "include"
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Logo upload failed")
      }
      setInvoiceSettings((prev) => ({ ...prev, logo_url: data.logo_url || "" }))
      toast({ title: "Logo uploaded" })
    } catch (error: any) {
      toast({
        title: "Logo upload failed",
        description: error?.message || "Unable to upload logo.",
        variant: "destructive"
      })
    } finally {
      setLogoUploading(false)
    }
  }

  const handleLogoRemove = async () => {
    if (!invoiceSettings.logo_url) return
    setLogoUploading(true)
    try {
      const response = await fetch(`/api/settings/invoice-logo${scopeParams}`, {
        method: "DELETE",
        credentials: "include"
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Logo removal failed")
      }
      setInvoiceSettings((prev) => ({ ...prev, logo_url: "" }))
      toast({ title: "Logo removed" })
    } catch (error: any) {
      toast({
        title: "Logo removal failed",
        description: error?.message || "Unable to remove logo.",
        variant: "destructive"
      })
    } finally {
      setLogoUploading(false)
    }
  }

  const updateRule = (key: string, updater: (rule: AlertRule) => AlertRule) => {
    setAlertRules((prev) => prev.map((rule) => (rule.key === key ? updater(rule) : rule)))
  }

  const renderAlertRow = (rule: AlertRule) => {
    const schedule = parseSchedule(rule.schedule_json)

    return (
      <div key={rule.key} className="flex flex-col gap-3 border rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>{rule.label}</Label>
            <p className="text-xs text-muted-foreground">{rule.recipient_type.replace("_", " ")} • {rule.alert_type.replace(/_/g, " ")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={rule.enable_sms}
              onCheckedChange={(checked) => updateRule(rule.key, (prevRule) => ({ ...prevRule, enable_sms: checked }))}
            />
            <span className="text-xs">SMS</span>
            <Switch
              checked={rule.enable_email}
              onCheckedChange={(checked) => updateRule(rule.key, (prevRule) => ({ ...prevRule, enable_email: checked }))}
            />
            <span className="text-xs">Email</span>
          </div>
        </div>

        {rule.alert_type === "invoice_summary" && (
          <p className="text-sm text-muted-foreground">
            Summary includes invoice count, total amount, and sender details. Alerts send immediately when invoices are sent.
          </p>
        )}

        {rule.alert_type === "balance_sms" || rule.alert_type === "balance_email" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Threshold</Label>
              <Input
                value={rule.threshold_value ?? ""}
                onChange={(event) => updateRule(rule.key, (prevRule) => ({ ...prevRule, threshold_value: Number(event.target.value || 0) }))}
              />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select
                value={rule.frequency}
                onValueChange={(value) => updateRule(rule.key, (prevRule) => ({ ...prevRule, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        {rule.alert_type === "tenant_invoice_reminder" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Days before due (comma separated)</Label>
              <Input
                value={(schedule.before_days || []).join(",")}
                onChange={(event) => {
                  const days = event.target.value.split(",").map((d: string) => Number(d.trim())).filter((n: number) => !Number.isNaN(n))
                  const next = { ...schedule, before_days: days }
                  updateRule(rule.key, (prevRule) => ({ ...prevRule, schedule_json: JSON.stringify(next) }))
                }}
              />
            </div>
            <div>
              <Label>Days after due (comma separated)</Label>
              <Input
                value={(schedule.after_days || []).join(",")}
                onChange={(event) => {
                  const days = event.target.value.split(",").map((d: string) => Number(d.trim())).filter((n: number) => !Number.isNaN(n))
                  const next = { ...schedule, after_days: days }
                  updateRule(rule.key, (prevRule) => ({ ...prevRule, schedule_json: JSON.stringify(next) }))
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={!!schedule.on_due_date}
                onCheckedChange={(checked) => {
                  const next = { ...schedule, on_due_date: checked }
                  updateRule(rule.key, (prevRule) => ({ ...prevRule, schedule_json: JSON.stringify(next) }))
                }}
              />
              <span className="text-sm">Send on due date</span>
            </div>
            <div>
              <Label>Repeat every (days)</Label>
              <Input
                value={schedule.reminder_every_days ?? ""}
                onChange={(event) => {
                  const next = { ...schedule, reminder_every_days: Number(event.target.value || 0) }
                  updateRule(rule.key, (prevRule) => ({ ...prevRule, schedule_json: JSON.stringify(next) }))
                }}
              />
            </div>
          </div>
        )}

        {rule.alert_type === "reminder_sent" && (
          <p className="text-sm text-muted-foreground">
            Summary includes reminder count, total amount, and sender details. Alerts send immediately when reminders are sent.
          </p>
        )}
      </div>
    )
  }

  const groupedRules = {
    landlord: alertRules.filter((rule) => rule.recipient_type === "landlord"),
    system_user: alertRules.filter((rule) => rule.recipient_type === "system_user"),
    tenant: alertRules.filter((rule) => rule.recipient_type === "tenant")
  }

  if (settingsDisabled) {
    return (
      <div className="p-6">
        <Card className={`vibrant-panel ${settingsVariants[settingsSeed.current % settingsVariants.length]}`}>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Select a client and property to manage settings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="settings-title">Settings</h1>
        <p className="text-muted-foreground">Configure SMS, email, M-Pesa, invoices, and alerts</p>
      </div>

      <Tabs defaultValue="sms" className="space-y-6">
        <TabsList
          className={`grid w-full grid-cols-5 border-2 ${tabsPalette.border} ${tabsPalette.card} text-foreground/90`}
        >
          <TabsTrigger
            value="sms"
            className="text-foreground/80 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-foreground/40"
          >
            SMS
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="text-foreground/80 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-foreground/40"
          >
            Email
          </TabsTrigger>
          <TabsTrigger
            value="mpesa"
            className="text-foreground/80 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-foreground/40"
          >
            M-Pesa
          </TabsTrigger>
          <TabsTrigger
            value="invoice"
            className="text-foreground/80 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-foreground/40"
          >
            Invoice
          </TabsTrigger>
          <TabsTrigger
            value="alerts"
            className="text-foreground/80 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-foreground/40"
          >
            Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sms">
          <Card className={`vibrant-card ${settingsVariants[(settingsSeed.current + 1) % settingsVariants.length]}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                <div>
                  <CardTitle>SMS Integration</CardTitle>
                  <CardDescription>Configure SMS provider credentials</CardDescription>
                </div>
                <div className="ml-auto">
                  {smsSettings.enabled ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>API URL</Label>
                  <Input value={smsSettings.api_url} onChange={(e) => setSmsSettings(prev => ({ ...prev, api_url: e.target.value }))} />
                </div>
                <div>
                  <Label>API Key</Label>
                  {renderSecretInput("sms_api_key", smsSettings.api_key, (value) => setSmsSettings(prev => ({ ...prev, api_key: value })))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Partner ID</Label>
                  {renderSecretInput("sms_partner_id", smsSettings.partner_id, (value) => setSmsSettings(prev => ({ ...prev, partner_id: value })))}
                </div>
                <div>
                  <Label>Shortcode</Label>
                  <Input value={smsSettings.shortcode} onChange={(e) => setSmsSettings(prev => ({ ...prev, shortcode: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sender ID</Label>
                  <Input value={smsSettings.sender_id} onChange={(e) => setSmsSettings(prev => ({ ...prev, sender_id: e.target.value }))} />
                </div>
                <div>
                  <Label>Balance threshold</Label>
                  <Input value={smsSettings.balance_threshold} onChange={(e) => setSmsSettings(prev => ({ ...prev, balance_threshold: e.target.value }))} />
                </div>
              </div>
              <div className={`flex items-center justify-between border rounded-lg p-3 ${tabsPalette.accentBg}`}>
                <div>
                  <Label>Enable SMS</Label>
                  <p className="text-xs text-muted-foreground">Use this provider for alerts</p>
                </div>
                <Switch checked={smsSettings.enabled} onCheckedChange={(checked) => setSmsSettings(prev => ({ ...prev, enabled: checked }))} />
              </div>
              <Button onClick={() => saveSection("sms", smsSettings)}>
                <Save className="h-4 w-4 mr-2" />
                Save SMS Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card className={`vibrant-card ${settingsVariants[(settingsSeed.current + 2) % settingsVariants.length]}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <div>
                  <CardTitle>Email Integration</CardTitle>
                  <CardDescription>Configure SMTP settings and credit balance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SMTP Host</Label>
                  <Input value={emailSettings.smtp_host} onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_host: e.target.value }))} />
                </div>
                <div>
                  <Label>SMTP Port</Label>
                  <Input value={emailSettings.smtp_port} onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_port: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SMTP User</Label>
                  <Input value={emailSettings.smtp_user} onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_user: e.target.value }))} />
                </div>
                <div>
                  <Label>SMTP Password</Label>
                  {renderSecretInput("smtp_pass", emailSettings.smtp_pass, (value) => setEmailSettings(prev => ({ ...prev, smtp_pass: value })))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Email</Label>
                  <Input value={emailSettings.from_email} onChange={(e) => setEmailSettings(prev => ({ ...prev, from_email: e.target.value }))} />
                </div>
                <div>
                  <Label>From Name</Label>
                  <Input value={emailSettings.from_name} onChange={(e) => setEmailSettings(prev => ({ ...prev, from_name: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email credit balance</Label>
                  <Input value={emailSettings.credit_balance} onChange={(e) => setEmailSettings(prev => ({ ...prev, credit_balance: e.target.value }))} />
                </div>
                <div>
                  <Label>Balance threshold</Label>
                  <Input value={emailSettings.credit_threshold} onChange={(e) => setEmailSettings(prev => ({ ...prev, credit_threshold: e.target.value }))} />
                </div>
              </div>
              <div className={`flex items-center justify-between border rounded-lg p-3 ${tabsPalette.accentBg}`}>
                <div>
                  <Label>Enable Email</Label>
                  <p className="text-xs text-muted-foreground">Use SMTP for alerts</p>
                </div>
                <Switch checked={emailSettings.enabled} onCheckedChange={(checked) => setEmailSettings(prev => ({ ...prev, enabled: checked }))} />
              </div>
              <Button onClick={() => saveSection("email", emailSettings)}>
                <Save className="h-4 w-4 mr-2" />
                Save Email Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mpesa">
          <Card className={`vibrant-card ${settingsVariants[(settingsSeed.current + 3) % settingsVariants.length]}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <div>
                  <CardTitle>M-Pesa STK Push</CardTitle>
                  <CardDescription>Configure paybill credentials</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Consumer Key</Label>
                  {renderSecretInput("mpesa_consumer_key", mpesaSettings.consumer_key, (value) => setMpesaSettings(prev => ({ ...prev, consumer_key: value })))}
                </div>
                <div>
                  <Label>Consumer Secret</Label>
                  {renderSecretInput("mpesa_consumer_secret", mpesaSettings.consumer_secret, (value) => setMpesaSettings(prev => ({ ...prev, consumer_secret: value })))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Passkey</Label>
                  {renderSecretInput("mpesa_passkey", mpesaSettings.passkey, (value) => setMpesaSettings(prev => ({ ...prev, passkey: value })))}
                </div>
                <div>
                  <Label>Shortcode</Label>
                  <Input value={mpesaSettings.shortcode} onChange={(e) => setMpesaSettings(prev => ({ ...prev, shortcode: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Account Reference</Label>
                  <Input value={mpesaSettings.account_reference} onChange={(e) => setMpesaSettings(prev => ({ ...prev, account_reference: e.target.value }))} />
                </div>
                <div>
                  <Label>STK Callback URL</Label>
                  <Input value={mpesaSettings.stk_callback_url} onChange={(e) => setMpesaSettings(prev => ({ ...prev, stk_callback_url: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Balance Callback URL</Label>
                  <Input value={mpesaSettings.balance_callback_url} onChange={(e) => setMpesaSettings(prev => ({ ...prev, balance_callback_url: e.target.value }))} />
                </div>
                <div>
                  <Label>Initiator Name</Label>
                  <Input value={mpesaSettings.initiator_name} onChange={(e) => setMpesaSettings(prev => ({ ...prev, initiator_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Security Credential</Label>
                {renderSecretInput("mpesa_security_credential", mpesaSettings.security_credential, (value) => setMpesaSettings(prev => ({ ...prev, security_credential: value })))}
              </div>
              <div className={`flex items-center justify-between border rounded-lg p-3 ${tabsPalette.accentBg}`}>
                <div>
                  <Label>Enable M-Pesa</Label>
                  <p className="text-xs text-muted-foreground">Enable STK push</p>
                </div>
                <Switch checked={mpesaSettings.enabled} onCheckedChange={(checked) => setMpesaSettings(prev => ({ ...prev, enabled: checked }))} />
              </div>
              <Button onClick={() => saveSection("mpesa", mpesaSettings)}>
                <Save className="h-4 w-4 mr-2" />
                Save M-Pesa Settings
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => balanceMutation.mutate()} disabled={balanceMutation.isPending}>
                  Check Paybill Balance
                </Button>
                {balanceInfo && (
                  <span className="text-sm text-muted-foreground">{balanceInfo}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice">
          <Card className={`vibrant-card ${settingsVariants[(settingsSeed.current + 4) % settingsVariants.length]}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                <div>
                  <CardTitle>Invoice Settings</CardTitle>
                  <CardDescription>Company details and payment options</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <Input value={invoiceSettings.company_name} onChange={(e) => setInvoiceSettings(prev => ({ ...prev, company_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Company Phone</Label>
                  <Input value={invoiceSettings.company_phone} onChange={(e) => setInvoiceSettings(prev => ({ ...prev, company_phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Company Email</Label>
                  <Input value={invoiceSettings.company_email} onChange={(e) => setInvoiceSettings(prev => ({ ...prev, company_email: e.target.value }))} />
                </div>
                <div>
                  <Label>Company Address</Label>
                  <Input value={invoiceSettings.company_address} onChange={(e) => setInvoiceSettings(prev => ({ ...prev, company_address: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Account Timezone</Label>
                  <Select
                    value={invoiceSettings.timezone_offset}
                    onValueChange={(value) => setInvoiceSettings(prev => ({ ...prev, timezone_offset: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone offset" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezoneOffsets.map((offset) => (
                        <SelectItem key={offset} value={offset}>
                          {offset}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used to determine overdue invoices by local account time.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <Label>Invoice Logo (max 5MB)</Label>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                    disabled={logoUploading}
                  />
                  {invoiceSettings.logo_url && (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2"
                      onClick={handleLogoRemove}
                      disabled={logoUploading}
                    >
                      Remove Logo
                    </Button>
                  )}
                </div>
                <div className="rounded-lg border p-3">
                  <Label className="text-sm text-muted-foreground">Preview</Label>
                  {invoiceSettings.logo_url ? (
                    <img
                      src={invoiceSettings.logo_url}
                      alt="Invoice logo"
                      className="mt-2 h-16 w-auto object-contain"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No logo uploaded.</p>
                  )}
                </div>
              </div>
              <div>
                <Label>Payment Options (one per line)</Label>
                <Textarea rows={4} value={invoiceSettings.payment_options} onChange={(e) => setInvoiceSettings(prev => ({ ...prev, payment_options: e.target.value }))} />
              </div>
              <Button onClick={() => saveSection("invoice", invoiceSettings)}>
                <Save className="h-4 w-4 mr-2" />
                Save Invoice Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className={`vibrant-card ${settingsVariants[(settingsSeed.current + 5) % settingsVariants.length]}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                <div>
                  <CardTitle>Alert Settings</CardTitle>
                  <CardDescription>Landlord, system user, and tenant rules</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Landlord Alerts</Label>
                {groupedRules.landlord.map(renderAlertRow)}
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">System User Alerts</Label>
                {groupedRules.system_user.map(renderAlertRow)}
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tenant Alerts</Label>
                {groupedRules.tenant.map(renderAlertRow)}
              </div>
              <Button onClick={() => saveSection("alerts", { alerts: alertRules.map((rule) => ({
                ...rule,
                channel: "multi",
                frequency: ["invoice_summary", "reminder_sent", "receipt", "payment_confirmation", "tenant_receipt"].includes(rule.alert_type) ? "immediate" : rule.frequency,
                enabled: rule.enable_sms || rule.enable_email
              })) })}>
                <Save className="h-4 w-4 mr-2" />
                Save Alert Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
