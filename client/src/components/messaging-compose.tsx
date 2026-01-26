import { useEffect, useRef, useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Send, Mail, Smartphone, MessageSquare, Users, Building2, Bold, Italic, Underline, List, Link2, Paperclip, X } from "lucide-react"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { useToast } from "@/hooks/use-toast"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function MessagingCompose() {
  const [recipientType, setRecipientType] = useState<"tenants" | "landlords">("tenants")
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [manualRecipient, setManualRecipient] = useState(false)
  const [manualEmail, setManualEmail] = useState("")
  const [manualPhone, setManualPhone] = useState("")
  const [messageType, setMessageType] = useState<"email" | "sms" | "both">("email")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [emailHtml, setEmailHtml] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const emailEditorRef = useRef<HTMLDivElement | null>(null)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templateForm, setTemplateForm] = useState({
    id: "",
    name: "",
    channel: "sms",
    subject: "",
    content: "",
    isSystem: false
  })
  const { selectedPropertyId, selectedLandlordId } = useFilter()
  const { toast } = useToast()

  // Fetch tenant data
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

  // Fetch landlord data
  const { data: landlordsData = [] } = useQuery({ 
    queryKey: ['/api/landlords'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/landlords")
      return await response.json()
    },
  })

  // Fetch units and leases for tenant info
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

  const { data: properties = [] } = useQuery({ 
    queryKey: ['/api/properties', selectedLandlordId, selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/properties${params.toString() ? `?${params}` : ''}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['/api/message-templates'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/message-templates")
      return await response.json()
    },
  })

  // Transform tenant data with unit info
  const tenants = tenantsData.map((tenant: any) => {
    const tenantLease = leases.find((lease: any) => lease.tenantId === tenant.id && lease.status === 'active')
    const tenantUnit = units.find((unit: any) => unit.id === tenantLease?.unitId)
    
    return {
      id: tenant.id,
      name: tenant.fullName || tenant.full_name,
      email: tenant.email,
      phone: tenant.phone,
      unit: tenantUnit?.unitNumber || 'No unit'
    }
  }).filter((tenant: any) => tenant.name && (tenant.email || tenant.phone))

  // Transform landlord data
  const landlords = landlordsData.map((landlord: any) => {
    // Get associated properties
    const landlordProperties = properties.filter((p: any) => p.landlord_id === landlord.id)
    const phone = landlord.phone ?? (landlordProperties.length > 0 ? landlordProperties[0].landlord_phone : null)
    const name = landlord.fullName || landlord.full_name || landlord.username
    
    return {
      id: landlord.id,
      name,
      email: landlord.username, // username is the email
      phone: phone,
      properties: landlordProperties.length
    }
  }).filter((landlord: any) => landlord.name)

  const recipients = recipientType === "tenants" ? tenants : landlords

  const messageTemplates = templates

  const handleRecipientChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRecipients([...selectedRecipients, id])
    } else {
      setSelectedRecipients(selectedRecipients.filter(r => r !== id))
    }
  }

  const handleSelectAll = () => {
    setSelectedRecipients(recipients.map(r => r.id))
  }

  const handleSelectNone = () => {
    setSelectedRecipients([])
  }

  const useTemplate = (template: any) => {
    const templateChannel = template.channel ?? "sms"
    if (templateChannel === "email" || templateChannel === "sms" || templateChannel === "both") {
      setMessageType(templateChannel)
    }
    setSubject(template.subject || "")
    const content = template.content || template.message || ""
    setMessage(content)
    setEmailHtml(content)
  }

  useEffect(() => {
    if (!emailEditorRef.current) return
    if (emailEditorRef.current.innerHTML !== emailHtml) {
      emailEditorRef.current.innerHTML = emailHtml
    }
  }, [emailHtml])

  const updateEmailHtml = () => {
    if (!emailEditorRef.current) return
    setEmailHtml(emailEditorRef.current.innerHTML)
  }

  const applyEmailFormat = (command: string) => {
    if (!emailEditorRef.current) return
    emailEditorRef.current.focus()
    document.execCommand(command)
    updateEmailHtml()
  }

  const applyEmailLink = () => {
    if (!emailEditorRef.current) return
    const url = window.prompt("Enter link URL")
    if (!url) return
    emailEditorRef.current.focus()
    document.execCommand("createLink", false, url)
    updateEmailHtml()
  }

  const stripHtml = (html: string) => {
    const temp = document.createElement("div")
    temp.innerHTML = html
    return (temp.textContent || temp.innerText || "").trim()
  }

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const totalSize = [...attachments, ...files].reduce((acc, file) => acc + file.size, 0)
    if (totalSize > 10 * 1024 * 1024) {
      toast({
        title: "Attachment too large",
        description: "Total attachments must be 10MB or less.",
        variant: "destructive"
      })
      return
    }
    setAttachments(prev => [...prev, ...files])
    event.target.value = ""
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const gsm7Chars =
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
  const gsm7Extended = "^{}\\[~]|€"

  const getSmsEncoding = (text: string) => {
    for (const char of text) {
      if (gsm7Chars.includes(char)) continue
      if (gsm7Extended.includes(char)) continue
      return "UCS-2"
    }
    return "GSM-7"
  }

  const getSmsLength = (text: string) => {
    let length = 0
    for (const char of text) {
      if (gsm7Chars.includes(char)) {
        length += 1
      } else if (gsm7Extended.includes(char)) {
        length += 2
      } else {
        length += 1
      }
    }
    return length
  }

  const getSmsSegments = (text: string) => {
    if (!text) return { encoding: "GSM-7", length: 0, segments: 0 }
    const encoding = getSmsEncoding(text)
    if (encoding === "UCS-2") {
      const length = text.length
      const perSegment = length <= 70 ? 70 : 67
      return { encoding, length, segments: Math.ceil(length / perSegment) }
    }
    const length = getSmsLength(text)
    const perSegment = length <= 160 ? 160 : 153
    return { encoding, length, segments: Math.ceil(length / perSegment) }
  }

  const smsStats = getSmsSegments(message)
  const requiresEmail = messageType === "email" || messageType === "both"
  const requiresSms = messageType === "sms" || messageType === "both"
  const emailText = stripHtml(emailHtml)
  const emailReady = !requiresEmail || emailText.length > 0
  const smsReady = !requiresSms || message.trim().length > 0

  const resetTemplateForm = () => {
    setTemplateForm({
      id: "",
      name: "",
      channel: "sms",
      subject: "",
      content: "",
      isSystem: false
    })
  }

  const saveTemplateMutation = useMutation({
    mutationFn: async (payload: typeof templateForm) => {
      if (payload.id) {
        const response = await apiRequest("PUT", `/api/message-templates/${payload.id}`, payload)
        return await response.json()
      }
      const response = await apiRequest("POST", "/api/message-templates", payload)
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/message-templates'] })
      toast({ title: "Template saved" })
      resetTemplateForm()
    },
    onError: (error: any) => {
      toast({
        title: "Template error",
        description: error.message || "Failed to save template.",
        variant: "destructive"
      })
    }
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiRequest("DELETE", `/api/message-templates/${templateId}`)
      return response.ok
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/message-templates'] })
      toast({ title: "Template deleted" })
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete template.",
        variant: "destructive"
      })
    }
  })

  const openTemplateEdit = (template: any) => {
    setTemplateForm({
      id: template.id,
      name: template.name || "",
      channel: template.channel || "sms",
      subject: template.subject || "",
      content: template.content || "",
      isSystem: Boolean(template.is_system ?? template.isSystem)
    })
    setIsTemplateDialogOpen(true)
  }

  // Send message mutation using new endpoints
  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const results = []

      const sendEmailRequest = async (payload: Record<string, any>) => {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value))
          }
        })
        attachments.forEach((file) => {
          formData.append("attachments[]", file)
        })
        const response = await fetch("/api/send-email", {
          method: "POST",
          body: formData,
          credentials: "include"
        })
        if (!response.ok) {
          const text = (await response.text()) || response.statusText
          throw new Error(text)
        }
        return await response.json()
      }
      
      // Manual recipient mode
      if (manualRecipient) {
        const channels = data.type === 'both' ? ['email', 'sms'] : [data.type]
        for (const channel of channels) {
          const contact = channel === 'email' ? manualEmail : manualPhone
          if (!contact) {
            results.push({ channel, recipient: 'Manual', success: false, error: `Missing ${channel} recipient` })
            continue
          }
          const endpoint = channel === 'email' ? '/api/send-email' : '/api/send-sms'
          const payload: any = {
            recipientType: recipientType === 'tenants' ? 'tenant' : 'landlord',
            recipientId: null,
            recipientName: 'Manual',
            propertyId: selectedPropertyId || null
          }
          if (channel === 'email') {
            payload.to = contact
            payload.toName = 'Manual'
            payload.subject = data.subject
            payload.messageHtml = data.emailHtml
            payload.isHtml = true
          } else {
            payload.mobile = contact
            payload.message = data.message
          }
          try {
            const result =
              channel === "email"
                ? await sendEmailRequest(payload)
                : await (await apiRequest('POST', endpoint, payload)).json()
            results.push({ channel, recipient: 'Manual', success: result.success, error: result.error })
          } catch (error: any) {
            results.push({ channel, recipient: 'Manual', success: false, error: error.message })
          }
        }
        return results
      }

      for (const recipientId of data.recipients) {
        const recipient = recipients.find(r => r.id === recipientId)
        if (!recipient) continue

        const channels = data.type === 'both' ? ['email', 'sms'] : [data.type]

        for (const channel of channels) {
          const contact = channel === 'email' ? recipient.email : recipient.phone
          if (!contact) {
            results.push({ channel, recipient: recipient.name, success: false, error: `Missing ${channel} contact` })
            continue
          }

          const endpoint = channel === 'email' ? '/api/send-email' : '/api/send-sms'
          const payload: any = {
            recipientType: recipientType === 'tenants' ? 'tenant' : 'landlord',
            recipientId: recipientId,
            recipientName: recipient.name,
            propertyId: selectedPropertyId || null
          }

          if (channel === 'email') {
            payload.to = contact
            payload.toName = recipient.name
            payload.subject = data.subject
            payload.messageHtml = data.emailHtml
            payload.isHtml = true
          } else {
            payload.mobile = contact
            payload.message = data.message
          }

          try {
            const result =
              channel === "email"
                ? await sendEmailRequest(payload)
                : await (await apiRequest('POST', endpoint, payload)).json()
            results.push({ channel, recipient: recipient.name, success: result.success, error: result.error })
          } catch (error: any) {
            results.push({ channel, recipient: recipient.name, success: false, error: error.message })
          }
        }
      }

      return results
    },
    onSuccess: (results) => {
      if (results.length === 0) {
        toast({
          title: "No Recipients",
          description: "No valid recipients were selected.",
          variant: "destructive"
        })
        return
      }
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      queryClient.invalidateQueries({ queryKey: ['/api/message-recipients'] })
      queryClient.invalidateQueries({ queryKey: ['/api/sms-balance'] })
      queryClient.invalidateQueries({ queryKey: ['/api/email-balance'] })

      if (failCount === 0) {
        toast({
          title: "Messages Sent",
          description: `Successfully sent ${successCount} message(s).`
        })
      } else if (successCount > 0) {
        toast({
          title: "Partial Success",
          description: `Sent ${successCount} message(s), ${failCount} failed.`,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Send Failed",
          description: "All messages failed to send.",
          variant: "destructive"
        })
      }

      // Reset form
      setSelectedRecipients([])
      setSubject("")
      setMessage("")
      setEmailHtml("")
      setAttachments([])
      setManualEmail("")
      setManualPhone("")
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send messages.",
        variant: "destructive"
      })
    }
  })

  const handleSendMessage = () => {
    const requiresEmail = messageType === "email" || messageType === "both"
    const requiresSms = messageType === "sms" || messageType === "both"
    const emailText = stripHtml(emailHtml)
    if (requiresEmail && !emailText) return
    if (requiresSms && !message.trim()) return
    if (manualRecipient) {
      if (requiresEmail && !manualEmail.trim()) {
        toast({ title: "Missing Email", description: "Enter a recipient email.", variant: "destructive" })
        return
      }
      if (requiresSms && !manualPhone.trim()) {
        toast({ title: "Missing Phone", description: "Enter a recipient phone number.", variant: "destructive" })
        return
      }
    } else if (selectedRecipients.length === 0) {
      toast({ title: "No Recipients", description: "Select at least one recipient.", variant: "destructive" })
      return
    }
    
    sendMessageMutation.mutate({
      recipients: selectedRecipients,
      type: messageType,
      subject,
      message,
      emailHtml
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="compose-title">Compose Message</h1>
        <p className="text-muted-foreground">Send messages to tenants or landlords via email and SMS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipients Selection */}
        <Card className="vibrant-panel">
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
            <CardDescription>Select recipients to send message to</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recipient Type Toggle */}
            <Tabs value={recipientType} onValueChange={(v) => { setRecipientType(v as "tenants" | "landlords"); setSelectedRecipients([]) }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tenants" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Tenants
                </TabsTrigger>
                <TabsTrigger value="landlords" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Landlords
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {manualRecipient ? (
                <div className="space-y-3">
                  {(messageType === "email" || messageType === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="manual-email">Recipient Email</Label>
                      <Input
                        id="manual-email"
                        type="email"
                        placeholder="recipient@example.com"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        data-testid="input-manual-email"
                      />
                    </div>
                  )}
                  {(messageType === "sms" || messageType === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="manual-phone">Recipient Phone</Label>
                      <Input
                        id="manual-phone"
                        placeholder="+2547XXXXXXXX"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        data-testid="input-manual-phone"
                      />
                    </div>
                  )}
                </div>
              ) : recipients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No {recipientType} found
                </p>
              ) : (
                recipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={recipient.id}
                      checked={selectedRecipients.includes(recipient.id)}
                      onCheckedChange={(checked) => handleRecipientChange(recipient.id, !!checked)}
                      data-testid={`checkbox-${recipientType}-${recipient.id}`}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {recipient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{recipient.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {recipientType === "tenants" ? recipient.unit : `${recipient.properties} properties`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {selectedRecipients.length > 0 && (
              <div className="pt-3 border-t">
                <Badge variant="secondary">
                  {selectedRecipients.length} selected
                </Badge>
              </div>
            )}

            <div className="pt-3 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="manual-recipient"
                  checked={manualRecipient}
                  onCheckedChange={(checked) => {
                    setManualRecipient(!!checked)
                    setSelectedRecipients([])
                  }}
                />
                <Label htmlFor="manual-recipient">Manual recipient</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Composition */}
        <Card className="vibrant-panel lg:col-span-2">
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

            {(messageType === "email" || messageType === "both") && (
              <div className="space-y-2">
                <Label>Email Content</Label>
                <div className="flex flex-wrap items-center gap-2 border rounded-md p-2 bg-muted/20">
                  <Button type="button" variant="ghost" size="icon" onClick={() => applyEmailFormat("bold")}>
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => applyEmailFormat("italic")}>
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => applyEmailFormat("underline")}>
                    <Underline className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => applyEmailFormat("insertUnorderedList")}>
                    <List className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={applyEmailLink}>
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
                <div
                  ref={emailEditorRef}
                  contentEditable
                  onInput={updateEmailHtml}
                  className="min-h-[180px] rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="rich-email-editor"
                />
                <p className="text-xs text-muted-foreground">
                  Use placeholders: {"{tenant_name}"}, {"{unit}"}, {"{amount}"}, {"{due_date}"}
                </p>

                <div className="space-y-2">
                  <Label htmlFor="email-attachments">Attachments (max 10MB)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email-attachments"
                      type="file"
                      multiple
                      onChange={handleAttachmentChange}
                      data-testid="input-email-attachments"
                    />
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span className="truncate">{file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeAttachment(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(messageType === "sms" || messageType === "both") && (
              <div className="space-y-2">
                <Label htmlFor="message">SMS Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your SMS here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  data-testid="textarea-message"
                />
                <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {smsStats.length} chars • {smsStats.segments} SMS • {smsStats.encoding}
                  </span>
                  <span>Use placeholders: {"{tenant_name}"}, {"{unit}"}, {"{amount}"}, {"{due_date}"}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Quick Templates</Label>
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Manage Templates</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{templateForm.id ? "Edit Template" : "New Template"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="template-name">Name</Label>
                          <Input
                            id="template-name"
                            value={templateForm.name}
                            onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Template name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="template-channel">Channel</Label>
                          <Select
                            value={templateForm.channel}
                            onValueChange={(value) => setTemplateForm(prev => ({ ...prev, channel: value }))}
                          >
                            <SelectTrigger id="template-channel">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sms">SMS</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {(templateForm.channel === "email" || templateForm.channel === "both") && (
                        <div className="space-y-2">
                          <Label htmlFor="template-subject">Subject</Label>
                          <Input
                            id="template-subject"
                            value={templateForm.subject}
                            onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="Subject (email only)"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="template-content">Content</Label>
                        <Textarea
                          id="template-content"
                          value={templateForm.content}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                          rows={6}
                        />
                      </div>
                    </div>
                    <DialogFooter className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={resetTemplateForm}
                      >
                        Clear
                      </Button>
                      <Button
                        onClick={() => saveTemplateMutation.mutate(templateForm)}
                        disabled={!templateForm.name.trim() || !templateForm.content.trim()}
                      >
                        {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
                      </Button>
                    </DialogFooter>

                    <div className="border-t pt-4 space-y-3">
                      <Label>Existing Templates</Label>
                      {messageTemplates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No templates yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {messageTemplates.map((template: any) => (
                            <div key={template.id} className="flex items-center justify-between rounded border px-3 py-2">
                              <div>
                                <p className="text-sm font-medium">{template.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{template.channel}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openTemplateEdit(template)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {messageTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No templates available.</p>
                ) : (
                  messageTemplates.map((template: any) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => useTemplate(template)}
                      data-testid={`button-template-${template.id}`}
                    >
                      {template.name}
                    </Button>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                onClick={handleSendMessage}
                disabled={
                  !emailReady ||
                  !smsReady ||
                  sendMessageMutation.isPending ||
                  (manualRecipient
                    ? (requiresEmail && !manualEmail.trim()) || (requiresSms && !manualPhone.trim())
                    : selectedRecipients.length === 0)
                }
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
