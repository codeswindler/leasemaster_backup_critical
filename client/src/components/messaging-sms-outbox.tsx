import { useQuery } from "@tanstack/react-query"
import { Smartphone, CheckCircle, Clock, AlertCircle, RefreshCw, Filter } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { useLocation } from "wouter"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export function MessagingSmsOutbox() {
  const { selectedPropertyId } = useFilter()
  const [, setLocation] = useLocation()
  const hasPropertyFilter = !!selectedPropertyId && selectedPropertyId !== "all"
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [senderFilter, setSenderFilter] = useState("")
  const [exportFrom, setExportFrom] = useState("")
  const [exportTo, setExportTo] = useState("")
  const [exportSearch, setExportSearch] = useState("")
  const [exportSender, setExportSender] = useState("")

  // Fetch SMS messages
  const { data: messages = [], isLoading, refetch } = useQuery({ 
    queryKey: ['/api/message-recipients', 'sms', hasPropertyFilter ? selectedPropertyId : "all", categoryFilter, searchTerm, senderFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append("channel", "sms")
      if (hasPropertyFilter) params.append("propertyId", selectedPropertyId)
      if (categoryFilter !== "all") params.append("category", categoryFilter)
      if (searchTerm) params.append("search", searchTerm)
      if (senderFilter) params.append("sender", senderFilter)
      const url = `/api/message-recipients?${params.toString()}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "sent":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge variant="default" className="bg-green-100 text-green-800">Delivered</Badge>
      case "sent":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Sent</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getDisplayStatus = (msg: any) => {
    if (msg.delivery_status) {
      const statusUpper = String(msg.delivery_status).toUpperCase()
      if (["DELIVRD", "DELIVERED", "SUCCESS", "SUCCESSFUL"].includes(statusUpper)) {
        return "delivered"
      }
      if (["UNDELIV", "FAILED", "REJECTD", "REJECTED", "FAIL", "EXPIRED"].includes(statusUpper)) {
        return "failed"
      }
    }
    return msg.status || "pending"
  }

  const getCategoryBadge = (category: string) => {
    const categoryLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      manual: { label: "Manual", variant: "outline" },
      otp: { label: "OTP", variant: "secondary" },
      login_credentials: { label: "Login Credentials", variant: "secondary" },
      password_reset: { label: "Password Reset", variant: "secondary" },
      welcome_email: { label: "Welcome", variant: "secondary" }
    }
    const cat = categoryLabels[category] || { label: category, variant: "outline" }
    return <Badge variant={cat.variant}>{cat.label}</Badge>
  }

  const getRecipientTypeBadge = (type: string) => {
    if (type === "landlord") {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700">Landlord</Badge>
    }
    return <Badge variant="outline" className="bg-blue-50 text-blue-700">Tenant</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="sms-outbox-title">SMS Outbox</h1>
          <p className="text-muted-foreground">Track SMS delivery status and history</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="otp">OTP</SelectItem>
                <SelectItem value="login_credentials">Login Credentials</SelectItem>
                <SelectItem value="password_reset">Password Reset</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Search mobile or name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[220px]"
          />
          <Input
            placeholder="Sender shortcode"
            value={senderFilter}
            onChange={(e) => setSenderFilter(e.target.value)}
            className="w-[180px]"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await apiRequest("POST", "/api/sms-dlr-refresh", {
                propertyId: selectedPropertyId || null
              })
              refetch()
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Export</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export SMS Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="export-from">From (required)</Label>
                    <Input
                      id="export-from"
                      type="date"
                      value={exportFrom}
                      onChange={(e) => setExportFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="export-to">To (required)</Label>
                    <Input
                      id="export-to"
                      type="date"
                      value={exportTo}
                      onChange={(e) => setExportTo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="export-search">Mobile (optional)</Label>
                    <Input
                      id="export-search"
                      value={exportSearch}
                      onChange={(e) => setExportSearch(e.target.value)}
                      placeholder="Mobile or name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="export-sender">Sender (optional)</Label>
                    <Input
                      id="export-sender"
                      value={exportSender}
                      onChange={(e) => setExportSender(e.target.value)}
                      placeholder="Shortcode"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    const params = new URLSearchParams()
                    params.append("channel", "sms")
                    params.append("dateFrom", exportFrom)
                    params.append("dateTo", exportTo)
                    if (exportSearch) params.append("search", exportSearch)
                    if (exportSender) params.append("sender", exportSender)
                    if (selectedPropertyId) params.append("propertyId", selectedPropertyId)

                    const response = await fetch(`/api/message-export?${params.toString()}`, {
                      credentials: "include"
                    })
                    const blob = await response.blob()
                    const url = window.URL.createObjectURL(blob)
                    const link = document.createElement("a")
                    link.href = url
                    link.download = `sms-export-${exportFrom}-to-${exportTo}.csv`
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                    window.URL.revokeObjectURL(url)
                  }}
                  disabled={!exportFrom || !exportTo}
                >
                  Download CSV
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            SMS Messages
          </CardTitle>
          <CardDescription>
            {messages.length} message(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No SMS messages found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Delivery Status</th>
                    <th className="text-left p-2 font-medium">Recipient</th>
                    <th className="text-left p-2 font-medium">Type</th>
                    <th className="text-left p-2 font-medium">Category</th>
                    <th className="text-left p-2 font-medium">Sender</th>
                    <th className="text-left p-2 font-medium">Message</th>
                    <th className="text-left p-2 font-medium">Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg: any) => (
                    (() => {
                      const displayStatus = getDisplayStatus(msg)
                      return (
                    <tr
                      key={msg.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => setLocation(`/message-details/${msg.id}`)}
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(displayStatus)}
                          {getStatusBadge(displayStatus)}
                        </div>
                      </td>
                      <td className="p-2 text-sm">
                        {msg.delivery_status ? (
                          <Badge variant="outline" className="text-xs">
                            {msg.delivery_status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Pending DLR</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="text-sm font-medium">{msg.recipient_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{msg.recipient_contact}</p>
                        </div>
                      </td>
                      <td className="p-2">
                        {getRecipientTypeBadge(msg.recipient_type)}
                      </td>
                      <td className="p-2">
                        {getCategoryBadge(msg.message_category)}
                      </td>
                      <td className="p-2 text-sm">
                        {msg.sender_shortcode || <span className="text-muted-foreground text-xs">N/A</span>}
                      </td>
                      <td className="p-2 max-w-xs">
                        <p className="text-sm truncate" title={msg.content}>
                          {msg.content || 'N/A'}
                        </p>
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {msg.sent_at 
                          ? new Date(msg.sent_at).toLocaleString()
                          : 'Pending'
                        }
                      </td>
                    </tr>
                      )
                    })()
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
