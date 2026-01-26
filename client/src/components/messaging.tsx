import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Send, MessageSquare, Users, Mail, Smartphone, Eye, CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react"
import { useLocation } from "wouter"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function Messaging() {
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [messageType, setMessageType] = useState<"email" | "sms" | "both">("email")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const { selectedPropertyId, selectedLandlordId } = useFilter()
  const actionsDisabled = !selectedPropertyId || selectedPropertyId === "all"

  // Fetch real tenant data
  const { data: tenantsData = [] } = useQuery({ 
    queryKey: ['/api/tenants', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/tenants${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })
  const { data: units = [] } = useQuery({ 
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
  const { data: leases = [] } = useQuery({ 
    queryKey: ['/api/leases', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/leases${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const tenants = tenantsData.map((tenant: any) => {
    const tenantLease = leases.find((lease: any) => lease.tenantId === tenant.id && lease.status === 'active')
    const tenantUnit = units.find((unit: any) => unit.id === tenantLease?.unitId)
    
    return {
      id: tenant.id,
      name: tenant.fullName,
      email: tenant.email,
      phone: tenant.phone,
      unit: tenantUnit?.unitNumber || 'No unit'
    }
  }).filter((tenant: any) => tenant.name && tenant.email) // Only include tenants with valid data

  // Fetch real message history from new bulk message APIs
  const { data: bulkMessages = [] } = useQuery({ 
    queryKey: ['/api/bulk-messages', selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const url = `/api/bulk-messages${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })
  const { data: messageRecipients = [] } = useQuery({
    queryKey: ['/api/message-recipients', selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/message-recipients${params.toString() ? `?${params}` : ""}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: !actionsDisabled,
  })
  
  const [, setLocation] = useLocation()

  const messageTemplates = [
    {
      id: "rent-reminder",
      name: "Rent Payment Reminder",
      subject: "Monthly Rent Payment Due",
      message: "Dear {tenant_name},\n\nThis is a friendly reminder that your monthly rent payment of {amount} for unit {unit} is due on {due_date}.\n\nPlease make your payment via M-Pesa Paybill: 123456\nAccount Number: {account_number}\n\nThank you."
    },
    {
      id: "maintenance",
      name: "Maintenance Notice",
      subject: "Scheduled Maintenance - {property_name}",
      message: "Dear {tenant_name},\n\nWe will be conducting scheduled maintenance on {date} from {time}.\n\nPlease expect temporary disruption to:\n- Water supply\n- Electricity\n\nWe apologize for any inconvenience.\n\nManagement"
    }
  ]

  const handleRecipientChange = (tenantId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecipients([...selectedRecipients, tenantId])
    } else {
      setSelectedRecipients(selectedRecipients.filter(id => id !== tenantId))
    }
  }

  const handleSelectAll = () => {
    setSelectedRecipients(tenants.map(t => t.id))
  }

  const handleSelectNone = () => {
    setSelectedRecipients([])
  }

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      // First create the bulk message
      const bulkMessage = await apiRequest('POST', '/api/bulk-messages', {
        messageType: data.type,
        subject: data.subject,
        content: data.message,
        totalRecipients: data.recipients.length
      });
      const bulkMessageData = await bulkMessage.json();
      
      // Then create individual recipient records
      const recipientPromises = data.recipients.map((tenantId: string) => {
        const tenant = tenants.find(t => t.id === tenantId);
        if (!tenant) return null;
        
        const channels = data.type === 'both' ? ['email', 'sms'] : [data.type];
        
        return channels.map((channel: string) => {
          const contact = channel === 'email' ? tenant.email : tenant.phone;
          return apiRequest('POST', '/api/message-recipients', {
            bulkMessageId: bulkMessageData.id,
            tenantId: tenant.id,
            channel,
            recipientContact: contact,
            status: 'sent'
          });
        });
      }).flat().filter(Boolean);
      
      await Promise.all(recipientPromises);
      return bulkMessageData;
    },
    onSuccess: () => {
      // Invalidate and refetch message data
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/message-recipients'] });
      
      // Reset form
      setSelectedRecipients([]);
      setSubject("");
      setMessage("");
      
      alert("Message sent successfully!");
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  });

  const handleSendMessage = () => {
    if (selectedRecipients.length === 0 || !message.trim()) return;
    
    sendMessageMutation.mutate({
      recipients: selectedRecipients,
      type: messageType,
      subject,
      message
    });
  };

  const useTemplate = (template: any) => {
    setSubject(template.subject)
    setMessage(template.message)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-blue-500" />
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
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (actionsDisabled) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Messaging</CardTitle>
            <CardDescription>Select a property to send and view messages.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="messaging-title">Messaging</h1>
        <p className="text-muted-foreground">Communicate with your tenants via email and SMS</p>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose" data-testid="tab-compose">Compose Message</TabsTrigger>
          <TabsTrigger value="outbox" data-testid="tab-outbox">Outbox</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recipients Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Recipients
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll} data-testid="button-select-all">
                      All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSelectNone} data-testid="button-select-none">
                      None
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>Select tenants to send message to</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={tenant.id}
                      checked={selectedRecipients.includes(tenant.id)}
                      onCheckedChange={(checked) => handleRecipientChange(tenant.id, !!checked)}
                      data-testid={`checkbox-tenant-${tenant.id}`}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {tenant.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.unit}</p>
                    </div>
                  </div>
                ))}
                
                {selectedRecipients.length > 0 && (
                  <div className="pt-3 border-t">
                    <Badge variant="secondary">
                      {selectedRecipients.length} selected
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message Composition */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Message Details</CardTitle>
                <CardDescription>Compose your message</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Message Type</Label>
                  <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                    <SelectTrigger data-testid="select-message-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Only
                        </div>
                      </SelectItem>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          SMS Only
                        </div>
                      </SelectItem>
                      <SelectItem value="both">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Email & SMS
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(messageType === "email" || messageType === "both") && (
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter email subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      data-testid="input-subject"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    data-testid="textarea-message"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use placeholders: {"{tenant_name}"}, {"{unit}"}, {"{amount}"}, {"{due_date}"}, {"{account_number}"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Quick Templates</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {messageTemplates.map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        onClick={() => useTemplate(template)}
                        data-testid={`button-template-${template.id}`}
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline">Save Draft</Button>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={selectedRecipients.length === 0 || !message.trim()}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outbox" className="space-y-6">
          <Tabs defaultValue="sms" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sms" data-testid="tab-sms-outbox">SMS Outbox</TabsTrigger>
              <TabsTrigger value="email" data-testid="tab-email-outbox">Email Outbox</TabsTrigger>
            </TabsList>

            {/* SMS Outbox */}
            <TabsContent value="sms">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    SMS Messages
                  </CardTitle>
                  <CardDescription>Track SMS delivery status and timing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">ID</th>
                          <th className="text-left p-2 font-medium">Contact</th>
                          <th className="text-left p-2 font-medium">Message</th>
                          <th className="text-left p-2 font-medium">Time Sent</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">TAT</th>
                          <th className="text-left p-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messageRecipients
                          .filter(recipient => recipient.channel === 'sms')
                          .map((recipient) => {
                            const bulkMessage = bulkMessages.find(msg => msg.id === recipient.bulkMessageId);
                            const tenant = tenants.find(t => t.id === recipient.tenantId);
                            const timeTaken = recipient.deliveredAt && recipient.sentAt 
                              ? `${Math.round((new Date(recipient.deliveredAt).getTime() - new Date(recipient.sentAt).getTime()) / 1000)}s`
                              : '-';
                            
                            return (
                              <tr key={recipient.id} className="border-b hover-elevate">
                                <td className="p-2 text-sm font-mono">
                                  {recipient.id.substring(0, 8)}
                                </td>
                                <td className="p-2">
                                  <div>
                                    <p className="text-sm font-medium">{tenant?.name || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">{recipient.recipientContact}</p>
                                  </div>
                                </td>
                                <td className="p-2 max-w-xs">
                                  <p className="text-sm truncate" title={bulkMessage?.content}>
                                    {bulkMessage?.content || 'N/A'}
                                  </p>
                                </td>
                                <td className="p-2 text-sm">
                                  {recipient.sentAt 
                                    ? new Date(recipient.sentAt).toLocaleString()
                                    : 'Pending'
                                  }
                                </td>
                                <td className="p-2">
                                  {getStatusBadge(recipient.status)}
                                </td>
                                <td className="p-2 text-sm font-mono">
                                  {timeTaken}
                                </td>
                                <td className="p-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setLocation(`/message-details/${recipient.id}`)}
                                    data-testid={`button-view-sms-${recipient.id}`}
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        }
                        {messageRecipients.filter(r => r.channel === 'sms').length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                              No SMS messages sent yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Outbox */}
            <TabsContent value="email">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Messages
                  </CardTitle>
                  <CardDescription>Track email delivery status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">ID</th>
                          <th className="text-left p-2 font-medium">Sender</th>
                          <th className="text-left p-2 font-medium">Recipient</th>
                          <th className="text-left p-2 font-medium">Subject</th>
                          <th className="text-left p-2 font-medium">Time Sent</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messageRecipients
                          .filter(recipient => recipient.channel === 'email')
                          .map((recipient) => {
                            const bulkMessage = bulkMessages.find(msg => msg.id === recipient.bulkMessageId);
                            const tenant = tenants.find(t => t.id === recipient.tenantId);
                            
                            return (
                              <tr key={recipient.id} className="border-b hover-elevate">
                                <td className="p-2 text-sm font-mono">
                                  {recipient.id.substring(0, 8)}
                                </td>
                                <td className="p-2 text-sm">
                                  system@rentflow.app
                                </td>
                                <td className="p-2">
                                  <div>
                                    <p className="text-sm font-medium">{tenant?.name || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">{recipient.recipientContact}</p>
                                  </div>
                                </td>
                                <td className="p-2 max-w-xs">
                                  <p className="text-sm truncate" title={bulkMessage?.subject}>
                                    {bulkMessage?.subject || 'No Subject'}
                                  </p>
                                </td>
                                <td className="p-2 text-sm">
                                  {recipient.sentAt 
                                    ? new Date(recipient.sentAt).toLocaleString()
                                    : 'Pending'
                                  }
                                </td>
                                <td className="p-2">
                                  {getStatusBadge(recipient.status)}
                                </td>
                                <td className="p-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setLocation(`/message-details/${recipient.id}`)}
                                    data-testid={`button-view-email-${recipient.id}`}
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        }
                        {messageRecipients.filter(r => r.channel === 'email').length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                              No email messages sent yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}