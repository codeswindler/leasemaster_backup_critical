import { useState } from "react"
import { 
  Settings as SettingsIcon, 
  Smartphone,
  CreditCard,
  Eye,
  EyeOff,
  Save,
  TestTube,
  CheckCircle,
  AlertTriangle,
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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function Settings() {
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [isTestingSms, setIsTestingSms] = useState(false)
  const [isTestingMpesa, setIsTestingMpesa] = useState(false)
  
  const [smsSettings, setSmsSettings] = useState({
    apiKey: "",
    apiSecret: "",
    senderId: "PROPERTY",
    environment: "sandbox",
    enabled: true
  })

  const [mpesaSettings, setMpesaSettings] = useState({
    consumerKey: "",
    consumerSecret: "",
    passkey: "",
    shortcode: "174379",
    environment: "sandbox",
    enabled: true,
    callbackUrl: "https://your-app.replit.app/api/mpesa/callback"
  })

  const [systemSettings, setSystemSettings] = useState({
    companyName: "Property Management System",
    companyEmail: "admin@propertymanager.com",
    companyPhone: "+254700123456",
    timezone: "Africa/Nairobi",
    currency: "KES",
    autoInvoiceGeneration: true,
    paymentReminders: true,
    latePaymentFees: true
  })

  const [timezoneSearch, setTimezoneSearch] = useState("")

  const timezones = (() => {
    if (typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function") {
      return (Intl as any).supportedValuesOf("timeZone") as string[]
    }
    return ["Africa/Nairobi", "UTC", "America/New_York"]
  })()

  const getGmtLabel = (timezone: string) => {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "short"
      })
      const parts = formatter.formatToParts(new Date())
      const tzName = parts.find((p) => p.type === "timeZoneName")?.value || ""
      return tzName.replace("GMT", "GMT").replace("UTC", "UTC")
    } catch {
      return "UTC"
    }
  }

  const filteredTimezones = timezones.filter((timezone) => {
    if (!timezoneSearch.trim()) return true
    const search = timezoneSearch.toLowerCase()
    const label = `${timezone} (${getGmtLabel(timezone)})`.toLowerCase()
    return label.includes(search)
  })

  const handleTestSms = async () => {
    setIsTestingSms(true)
    // Simulate API test
    setTimeout(() => {
      setIsTestingSms(false)
      alert("SMS test successful! Test message sent.")
    }, 2000)
  }

  const handleTestMpesa = async () => {
    setIsTestingMpesa(true)
    // Simulate API test
    setTimeout(() => {
      setIsTestingMpesa(false)
      alert("M-Pesa connection test successful!")
    }, 2000)
  }

  const handleSaveSettings = (settingsType: string) => {
    console.log(`Saving ${settingsType} settings`)
    alert(`${settingsType} settings saved successfully!`)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="settings-title">Settings</h1>
          <p className="text-muted-foreground">Configure system settings and API integrations</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowApiKeys(!showApiKeys)}
          data-testid="button-toggle-api-keys"
        >
          {showApiKeys ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showApiKeys ? "Hide" : "Show"} API Keys
        </Button>
      </div>

      <Tabs defaultValue="sms" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sms" data-testid="tab-sms">SMS Integration</TabsTrigger>
          <TabsTrigger value="mpesa" data-testid="tab-mpesa">M-Pesa Integration</TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">System Settings</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* SMS Integration Settings */}
        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                <div>
                  <CardTitle>Advanta SMS Integration</CardTitle>
                  <CardDescription>Configure SMS notifications using Advanta SMS API</CardDescription>
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
                  <Label htmlFor="sms-api-key">API Key</Label>
                  <Input
                    id="sms-api-key"
                    type={showApiKeys ? "text" : "password"}
                    value={showApiKeys ? smsSettings.apiKey : "••••••••••••••••••••••••••••••••"}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    data-testid="input-sms-api-key"
                  />
                </div>
                <div>
                  <Label htmlFor="sms-api-secret">API Secret</Label>
                  <Input
                    id="sms-api-secret"
                    type={showApiKeys ? "text" : "password"}
                    value={showApiKeys ? smsSettings.apiSecret : "••••••••••••••••••••••••••••••••"}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, apiSecret: e.target.value }))}
                    data-testid="input-sms-api-secret"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sms-sender-id">Sender ID</Label>
                  <Input
                    id="sms-sender-id"
                    value={smsSettings.senderId}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, senderId: e.target.value }))}
                    placeholder="PROPERTY"
                    data-testid="input-sms-sender-id"
                  />
                </div>
                <div>
                  <Label htmlFor="sms-environment">Environment</Label>
                  <Select 
                    value={smsSettings.environment} 
                    onValueChange={(value) => setSmsSettings(prev => ({ ...prev, environment: value }))}
                  >
                    <SelectTrigger data-testid="select-sms-environment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="sms-enabled"
                  checked={smsSettings.enabled}
                  onCheckedChange={(checked) => setSmsSettings(prev => ({ ...prev, enabled: checked }))}
                  data-testid="switch-sms-enabled"
                />
                <Label htmlFor="sms-enabled">Enable SMS notifications</Label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={handleTestSms} 
                  disabled={isTestingSms || !smsSettings.enabled}
                  data-testid="button-test-sms"
                >
                  {isTestingSms ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test SMS
                </Button>
                <Button onClick={() => handleSaveSettings("SMS")} data-testid="button-save-sms">
                  <Save className="h-4 w-4 mr-2" />
                  Save SMS Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SMS Documentation */}
          <Card>
            <CardHeader>
              <CardTitle>Advanta SMS API Documentation</CardTitle>
              <CardDescription>Integration guidelines and endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div>
                  <strong>Base URL:</strong> <code className="bg-muted px-2 py-1 rounded">https://api.advantasms.com</code>
                </div>
                <div>
                  <strong>Send SMS Endpoint:</strong> <code className="bg-muted px-2 py-1 rounded">POST /v1/sms/send</code>
                </div>
                <div>
                  <strong>Balance Check:</strong> <code className="bg-muted px-2 py-1 rounded">GET /v1/account/balance</code>
                </div>
                <div>
                  <strong>Required Headers:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Authorization: Bearer {"{API_KEY}"}</li>
                    <li>Content-Type: application/json</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* M-Pesa Integration Settings */}
        <TabsContent value="mpesa" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <div>
                  <CardTitle>M-Pesa Integration</CardTitle>
                  <CardDescription>Configure M-Pesa payments using Safaricom Daraja API</CardDescription>
                </div>
                <div className="ml-auto">
                  {mpesaSettings.enabled ? (
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
                  <Label htmlFor="mpesa-consumer-key">Consumer Key</Label>
                  <Input
                    id="mpesa-consumer-key"
                    type={showApiKeys ? "text" : "password"}
                    value={showApiKeys ? mpesaSettings.consumerKey : "••••••••••••••••••••••••••••••••"}
                    onChange={(e) => setMpesaSettings(prev => ({ ...prev, consumerKey: e.target.value }))}
                    data-testid="input-mpesa-consumer-key"
                  />
                </div>
                <div>
                  <Label htmlFor="mpesa-consumer-secret">Consumer Secret</Label>
                  <Input
                    id="mpesa-consumer-secret"
                    type={showApiKeys ? "text" : "password"}
                    value={showApiKeys ? mpesaSettings.consumerSecret : "••••••••••••••••••••••••••••••••"}
                    onChange={(e) => setMpesaSettings(prev => ({ ...prev, consumerSecret: e.target.value }))}
                    data-testid="input-mpesa-consumer-secret"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mpesa-passkey">Passkey</Label>
                  <Input
                    id="mpesa-passkey"
                    type={showApiKeys ? "text" : "password"}
                    value={showApiKeys ? mpesaSettings.passkey : "••••••••••••••••••••••••••••••••"}
                    onChange={(e) => setMpesaSettings(prev => ({ ...prev, passkey: e.target.value }))}
                    data-testid="input-mpesa-passkey"
                  />
                </div>
                <div>
                  <Label htmlFor="mpesa-shortcode">Business Shortcode</Label>
                  <Input
                    id="mpesa-shortcode"
                    value={mpesaSettings.shortcode}
                    onChange={(e) => setMpesaSettings(prev => ({ ...prev, shortcode: e.target.value }))}
                    data-testid="input-mpesa-shortcode"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="mpesa-callback">Callback URL</Label>
                <Input
                  id="mpesa-callback"
                  value={mpesaSettings.callbackUrl}
                  onChange={(e) => setMpesaSettings(prev => ({ ...prev, callbackUrl: e.target.value }))}
                  data-testid="input-mpesa-callback"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mpesa-environment">Environment</Label>
                  <Select 
                    value={mpesaSettings.environment} 
                    onValueChange={(value) => setMpesaSettings(prev => ({ ...prev, environment: value }))}
                  >
                    <SelectTrigger data-testid="select-mpesa-environment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="mpesa-enabled"
                    checked={mpesaSettings.enabled}
                    onCheckedChange={(checked) => setMpesaSettings(prev => ({ ...prev, enabled: checked }))}
                    data-testid="switch-mpesa-enabled"
                  />
                  <Label htmlFor="mpesa-enabled">Enable M-Pesa payments</Label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={handleTestMpesa} 
                  disabled={isTestingMpesa || !mpesaSettings.enabled}
                  data-testid="button-test-mpesa"
                >
                  {isTestingMpesa ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                <Button onClick={() => handleSaveSettings("M-Pesa")} data-testid="button-save-mpesa">
                  <Save className="h-4 w-4 mr-2" />
                  Save M-Pesa Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* M-Pesa Documentation */}
          <Card>
            <CardHeader>
              <CardTitle>Safaricom Daraja API Documentation</CardTitle>
              <CardDescription>M-Pesa integration endpoints and requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div>
                  <strong>Sandbox URL:</strong> <code className="bg-muted px-2 py-1 rounded">https://sandbox.safaricom.co.ke</code>
                </div>
                <div>
                  <strong>Production URL:</strong> <code className="bg-muted px-2 py-1 rounded">https://api.safaricom.co.ke</code>
                </div>
                <div>
                  <strong>STK Push:</strong> <code className="bg-muted px-2 py-1 rounded">POST /mpesa/stkpush/v1/processrequest</code>
                </div>
                <div>
                  <strong>Account Balance:</strong> <code className="bg-muted px-2 py-1 rounded">POST /mpesa/accountbalance/v1/query</code>
                </div>
                <div>
                  <strong>Authentication:</strong> <code className="bg-muted px-2 py-1 rounded">GET /oauth/v1/generate?grant_type=client_credentials</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General System Settings</CardTitle>
              <CardDescription>Configure basic system preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={systemSettings.companyName}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, companyName: e.target.value }))}
                    data-testid="input-company-name"
                  />
                </div>
                <div>
                  <Label htmlFor="company-email">Company Email</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={systemSettings.companyEmail}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, companyEmail: e.target.value }))}
                    data-testid="input-company-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company-phone">Company Phone</Label>
                  <Input
                    id="company-phone"
                    value={systemSettings.companyPhone}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, companyPhone: e.target.value }))}
                    data-testid="input-company-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={systemSettings.timezone} 
                    onValueChange={(value) => setSystemSettings(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          value={timezoneSearch}
                          onChange={(e) => setTimezoneSearch(e.target.value)}
                          placeholder="Search timezone or GMT"
                        />
                      </div>
                      {filteredTimezones.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone} ({getGmtLabel(timezone)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="currency">Default Currency</Label>
                <Select 
                  value={systemSettings.currency} 
                  onValueChange={(value) => setSystemSettings(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-invoice"
                    checked={systemSettings.autoInvoiceGeneration}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, autoInvoiceGeneration: checked }))}
                    data-testid="switch-auto-invoice"
                  />
                  <Label htmlFor="auto-invoice">Automatic invoice generation</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="payment-reminders"
                    checked={systemSettings.paymentReminders}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, paymentReminders: checked }))}
                    data-testid="switch-payment-reminders"
                  />
                  <Label htmlFor="payment-reminders">Send payment reminders</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="late-fees"
                    checked={systemSettings.latePaymentFees}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, latePaymentFees: checked }))}
                    data-testid="switch-late-fees"
                  />
                  <Label htmlFor="late-fees">Apply late payment fees</Label>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={() => handleSaveSettings("System")} data-testid="button-save-system">
                  <Save className="h-4 w-4 mr-2" />
                  Save System Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure when and how notifications are sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Payment Reminders</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reminder-1">Send 3 days before due date</Label>
                      <Switch id="reminder-1" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reminder-2">Send on due date</Label>
                      <Switch id="reminder-2" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reminder-3">Send 3 days after due date</Label>
                      <Switch id="reminder-3" defaultChecked />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Invoice Notifications</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="invoice-created">New invoice created</Label>
                      <Switch id="invoice-created" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="invoice-paid">Invoice payment received</Label>
                      <Switch id="invoice-paid" defaultChecked />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">System Notifications</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="new-tenant">New tenant registration</Label>
                      <Switch id="new-tenant" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maintenance-request">Maintenance requests</Label>
                      <Switch id="maintenance-request" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="low-sms-balance">Low SMS balance alert</Label>
                      <Switch id="low-sms-balance" defaultChecked />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={() => handleSaveSettings("Notifications")} data-testid="button-save-notifications">
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
