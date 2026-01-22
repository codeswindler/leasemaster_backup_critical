import { useQuery } from "@tanstack/react-query"
import { useRoute } from "wouter"
import { ArrowLeft, Mail, Smartphone, CheckCircle, Clock, AlertCircle, User } from "lucide-react"
import type { MessageRecipient, BulkMessage, Tenant } from "@shared/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect } from "react"
import { apiRequest } from "@/lib/queryClient"

export function MessageDetails() {
  const [match, params] = useRoute("/message-details/:id")
  const recipientId = params?.id

  // Fetch message recipient details
  const { data: recipient, isLoading: recipientLoading } = useQuery<MessageRecipient>({ 
    queryKey: ['/api/message-recipients', recipientId],
    enabled: !!recipientId
  })

  const bulkMessageId = (recipient as any)?.bulk_message_id ?? (recipient as any)?.bulkMessageId

  // Fetch bulk message details
  const { data: bulkMessage, isLoading: messageLoading } = useQuery<BulkMessage>({
    queryKey: ['/api/bulk-messages', bulkMessageId],
    enabled: !!bulkMessageId
  })

  const tenantId = (recipient as any)?.tenant_id ?? (recipient as any)?.tenantId

  // Fetch tenant details
  const { data: tenant, isLoading: tenantLoading } = useQuery<Tenant>({
    queryKey: ['/api/tenants', tenantId],
    enabled: !!tenantId
  })

  const isLoading = recipientLoading || messageLoading || tenantLoading

  const recipientContact = (recipient as any)?.recipient_contact ?? (recipient as any)?.recipientContact
  const recipientName = (recipient as any)?.recipient_name ?? (recipient as any)?.recipientName
  const recipientChannel = (recipient as any)?.channel ?? 'sms'
  const recipientStatus = (recipient as any)?.status ?? 'pending'
  const recipientCreatedAt = (recipient as any)?.created_at ?? (recipient as any)?.createdAt
  const recipientSentAt = (recipient as any)?.sent_at ?? (recipient as any)?.sentAt
  const recipientDeliveredAt = (recipient as any)?.delivered_at ?? (recipient as any)?.deliveredAt
  const deliveryStatus = (recipient as any)?.delivery_status ?? (recipient as any)?.deliveryStatus
  const deliveryTimestamp = (recipient as any)?.delivery_timestamp ?? (recipient as any)?.deliveryTimestamp
  const senderShortcode = (recipient as any)?.sender_shortcode ?? (recipient as any)?.senderShortcode
  const sentByName = (recipient as any)?.sent_by_name ?? (recipient as any)?.sentByName
  const messageSubject = (recipient as any)?.subject ?? (bulkMessage as any)?.subject
  const messageContent = (recipient as any)?.content ?? (bulkMessage as any)?.content
  const errorMessage = (recipient as any)?.error_message ?? (recipient as any)?.errorMessage

  const timeTaken = recipientDeliveredAt && recipientSentAt 
    ? `${Math.round((new Date(recipientDeliveredAt).getTime() - new Date(recipientSentAt).getTime()) / 1000)} seconds`
    : null

  useEffect(() => {
    if (!recipientId || !recipient) return
    apiRequest("POST", "/api/activity-logs", {
      action: "Message Viewed",
      details: `Viewed message ${recipientId}`,
      type: "messaging",
      status: "success"
    })
  }, [recipientId, recipient])

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
      case "sent":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Sent</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (!match) return <div>Route not found</div>

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!recipient) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Message Not Found</h2>
            <p className="text-muted-foreground">The message details you're looking for could not be found.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {recipientChannel === 'email' ? (
              <Mail className="h-6 w-6" />
            ) : (
              <Smartphone className="h-6 w-6" />
            )}
            Message Details
          </h1>
          <p className="text-muted-foreground">
            {recipientChannel.toUpperCase()} message sent to {tenant?.fullName || recipientName || 'Unknown'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Message Content</CardTitle>
            <CardDescription>
              {recipientChannel === 'email' ? 'Email content and details' : 'SMS message content'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recipientChannel === 'email' && messageSubject && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Subject</label>
                <p className="text-lg font-medium">{messageSubject}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Message</label>
              <div className="mt-2 p-4 bg-muted rounded-lg">
                <p className="whitespace-pre-wrap">{messageContent || "N/A"}</p>
              </div>
            </div>

            {errorMessage && (
              <div>
                <label className="text-sm font-medium text-red-600">Error Message</label>
                <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{errorMessage}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recipient & Status Info */}
        <div className="space-y-6">
          {/* Recipient Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Recipient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {tenant?.fullName?.split(" ").map(n => n[0]).join("") || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{tenant?.fullName || recipientName || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{recipientContact || 'N/A'}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Channel:</span>
                  <span className="font-medium capitalize">{recipientChannel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-mono">{recipientContact || 'N/A'}</span>
                </div>
                {senderShortcode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sender:</span>
                    <span className="font-mono">{senderShortcode}</span>
                  </div>
                )}
                {sentByName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent By:</span>
                    <span>{sentByName}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Status */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(recipientStatus)}
                {getStatusBadge(recipientStatus)}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{recipientCreatedAt ? new Date(recipientCreatedAt).toLocaleString() : "N/A"}</span>
                </div>
                
                {recipientSentAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent:</span>
                    <span>{new Date(recipientSentAt).toLocaleString()}</span>
                  </div>
                )}
                
                {recipientDeliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivered:</span>
                    <span>{new Date(recipientDeliveredAt).toLocaleString()}</span>
                  </div>
                )}

                {timeTaken && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TAT:</span>
                    <span className="font-mono">{timeTaken}</span>
                  </div>
                )}
                {deliveryStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DLR:</span>
                    <span className="font-mono">{deliveryStatus}</span>
                  </div>
                )}
                {deliveryTimestamp && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DLR Time:</span>
                    <span>{new Date(deliveryTimestamp).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Info */}
          <Card>
            <CardHeader>
              <CardTitle>Message Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Message ID:</span>
                <span className="font-mono">{(recipient as any)?.id?.substring?.(0, 8) || "N/A"}</span>
              </div>
              {bulkMessage?.id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bulk Message ID:</span>
                  <span className="font-mono">{bulkMessage.id.substring(0, 8)}</span>
                </div>
              )}
              {bulkMessage?.totalRecipients && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Recipients:</span>
                  <span>{bulkMessage.totalRecipients}</span>
                </div>
              )}
              {bulkMessage?.messageType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Message Type:</span>
                  <span className="capitalize">{bulkMessage.messageType}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}