import { useQuery } from "@tanstack/react-query"
import { Mail, CheckCircle, Clock, AlertCircle, RefreshCw, Filter } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { useLocation } from "wouter"

export function MessagingEmailOutbox() {
  const { selectedPropertyId } = useFilter()
  const [, setLocation] = useLocation()
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const hasPropertyFilter = !!selectedPropertyId && selectedPropertyId !== "all"

  // Fetch Email messages
  const { data: messages = [], isLoading, refetch } = useQuery({ 
    queryKey: ['/api/message-recipients', 'email', hasPropertyFilter ? selectedPropertyId : "all", categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append("channel", "email")
      if (hasPropertyFilter) params.append("propertyId", selectedPropertyId)
      if (categoryFilter !== "all") params.append("category", categoryFilter)
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
    if (type === "admin") {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700">Admin</Badge>
    }
    if (type === "manual") {
      return <Badge variant="outline" className="bg-slate-100 text-slate-700">Manual</Badge>
    }
    if (type === "tenant") {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Tenant</Badge>
    }
    return <Badge variant="outline">Unknown</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="email-outbox-title">Email Outbox</h1>
          <p className="text-muted-foreground">Track email delivery status and history</p>
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
                <SelectItem value="welcome_email">Welcome</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Messages
          </CardTitle>
          <CardDescription>
            {messages.length} email(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email messages found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Recipient</th>
                    <th className="text-left p-2 font-medium">Type</th>
                    <th className="text-left p-2 font-medium">Category</th>
                    <th className="text-left p-2 font-medium">Subject</th>
                    <th className="text-left p-2 font-medium">Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg: any) => (
                    <tr
                      key={msg.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => setLocation(`/message-details/${msg.id}`)}
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(msg.status)}
                          {getStatusBadge(msg.status)}
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="text-sm font-medium">{msg.recipientContact || ""}</p>
                        </div>
                      </td>
                      <td className="p-2">
                        {getRecipientTypeBadge(msg.recipientType || "")}
                      </td>
                      <td className="p-2">
                        {getCategoryBadge(msg.messageCategory || "")}
                      </td>
                      <td className="p-2 max-w-xs">
                        <p className="text-sm truncate" title={msg.subject}>
                          {msg.subject || 'No Subject'}
                        </p>
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : ""}
                      </td>
                    </tr>
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
