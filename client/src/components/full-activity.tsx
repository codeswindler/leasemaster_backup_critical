import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { 
  Activity, 
  Download, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Receipt,
  Building2,
  Wallet,
  MessageSquare
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPaletteByIndex } from "@/lib/palette"

type ActivityLog = {
  id?: string
  user_name?: string
  action?: string
  details?: string
  type?: string
  created_at?: string
  status?: string
}

export function FullActivity() {
  const { selectedAgentId, selectedPropertyId } = useFilter()
  const filtersPaletteSeed = useMemo(() => Math.floor(Math.random() * 6), [])
  const logPaletteSeed = useMemo(() => Math.floor(Math.random() * 6), [])
  const filtersPalette = getPaletteByIndex(filtersPaletteSeed)
  const logPalette = getPaletteByIndex(logPaletteSeed)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterUser, setFilterUser] = useState("all")
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - 30)
    return start.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })

  const { data: activities = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs', searchTerm, filterType, selectedPropertyId, selectedAgentId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (filterType !== "all") params.append("type", filterType)
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (startDate) params.append("dateFrom", startDate)
      if (endDate) params.append("dateTo", endDate)
      const url = `/api/activity-logs?${params.toString()}`
      const response = await apiRequest("GET", url)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    }
  })

  const userOptions = Array.from(new Set(
    activities.map((activity) => activity.user_name).filter(Boolean)
  )) as string[]

  const filteredActivities = activities.filter((activity: any) => {
    const matchesSearch = 
      activity.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === "all" || activity.type === filterType
    const matchesUser = filterUser === "all" || activity.user_name === filterUser
    
    return matchesSearch && matchesType && matchesUser
  })

  const formatTimestamp = (value?: string) => {
    if (!value) return "—"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "—"
    return parsed.toLocaleString()
  }

  const getDisplayUser = (activity: any) => {
    return (
      activity.user_name ||
      activity.userName ||
      activity.username ||
      (activity.user_id_int ? `User #${activity.user_id_int}` : null) ||
      (activity.user_id ? `User #${activity.user_id}` : null) ||
      "System"
    )
  }

  const extractAmountFromDetails = (details?: string) => {
    if (!details) return null
    const match = details.match(/KSh\s*([0-9,]+(?:\.[0-9]+)?)/i)
    if (!match) return null
    return match[1]
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <Wallet className="h-4 w-4" />
      case "invoice":
        return <Receipt className="h-4 w-4" />
      case "tenant":
        return <Users className="h-4 w-4" />
      case "property":
        return <Building2 className="h-4 w-4" />
      case "notification":
      case "messaging":
        return <MessageSquare className="h-4 w-4" />
      case "maintenance":
        return <AlertTriangle className="h-4 w-4" />
      case "user":
        return <Users className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "warning":
        return <Badge variant="secondary">Warning</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    const typeColors = {
      payment: "bg-green-100 text-green-800",
      invoice: "bg-blue-100 text-blue-800",
      tenant: "bg-purple-100 text-purple-800",
      property: "bg-orange-100 text-orange-800",
      notification: "bg-yellow-100 text-yellow-800",
      messaging: "bg-indigo-100 text-indigo-800",
      maintenance: "bg-red-100 text-red-800",
      user: "bg-gray-100 text-gray-800"
    }
    
    return (
      <Badge variant="default" className={typeColors[type as keyof typeof typeColors] || "bg-gray-100 text-gray-800"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const handleExportActivity = () => {
    console.log("Exporting activity data")
    alert("Activity log exported successfully!")
  }

  const uniqueUsers = userOptions

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="full-activity-title">Operational Log</h1>
          <p className="text-muted-foreground">Complete system activity with user accountability</p>
        </div>
        <Button onClick={handleExportActivity} data-testid="button-export-activity">
          <Download className="h-4 w-4 mr-2" />
          Export Activity Log
        </Button>
      </div>

      {/* Filters */}
      <Card className={`vibrant-card border-2 ${filtersPalette.border} ${filtersPalette.card}`}>
        <CardHeader>
          <CardTitle>Filter Activity</CardTitle>
          <CardDescription>Search, filter, and audit user actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/70 dark:bg-slate-900/40"
                data-testid="input-search-activity"
              />
            </div>
            
            <div>
              <Label htmlFor="filter-type">Activity Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger
                  data-testid="select-filter-type"
                  className="bg-white/70 dark:bg-slate-900/40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="tenant">Tenants</SelectItem>
                  <SelectItem value="property">Properties</SelectItem>
                  <SelectItem value="notification">Notifications</SelectItem>
                  <SelectItem value="messaging">Messaging</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="user">User Actions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-user">User</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger
                  data-testid="select-filter-user"
                  className="bg-white/70 dark:bg-slate-900/40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/70 dark:bg-slate-900/40"
                data-testid="input-start-date"
              />
            </div>

            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/70 dark:bg-slate-900/40"
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className={`vibrant-card border-2 ${logPalette.border} ${logPalette.card}`}>
        <CardHeader>
          <CardTitle>Operational Log</CardTitle>
          <CardDescription>
            Showing {filteredActivities.length} of {activities.length} activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading activity logs...
                  </TableCell>
                </TableRow>
              ) : (
              filteredActivities.map((activity: any) => (
                <TableRow key={activity.id} className="hover-elevate">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActivityIcon(activity.type)}
                      <span className="font-medium">{activity.action}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(activity.type)}</TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.details || "—"}
                    </p>
                  </TableCell>
                  <TableCell>{getDisplayUser(activity)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatTimestamp(activity.created_at || activity.createdAt)}
                  </TableCell>
                  <TableCell>
                    {activity.amount ? (
                      <span className="font-mono text-sm">{activity.amount}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {extractAmountFromDetails(activity.details) || "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(activity.status)}
                      {getStatusBadge(activity.status)}
                    </div>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}