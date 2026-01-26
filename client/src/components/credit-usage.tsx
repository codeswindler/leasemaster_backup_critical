import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useFilter } from "@/contexts/FilterContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Mail, MessageSquare } from "lucide-react"
import { getPaletteByIndex } from "@/lib/palette"

export function CreditUsage() {
  const { selectedPropertyId, selectedLandlordId } = useFilter()
  const smsPalette = getPaletteByIndex(0)
  const emailPalette = getPaletteByIndex(1)

  const { data: smsBalance } = useQuery({
    queryKey: ["/api/sms-balance", selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const response = await apiRequest("GET", `/api/sms-balance${params.toString() ? `?${params}` : ""}`)
      return await response.json()
    },
  })

  const { data: emailBalance } = useQuery({
    queryKey: ["/api/email-balance", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/email-balance${params.toString() ? `?${params}` : ""}`)
      return await response.json()
    },
  })

  const { data: usage = [] } = useQuery({
    queryKey: ["/api/credit-usage", selectedPropertyId, selectedLandlordId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      const response = await apiRequest("GET", `/api/credit-usage${params.toString() ? `?${params}` : ""}`)
      return await response.json()
    },
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Credit Usage</h1>
        <p className="text-muted-foreground">SMS and email balances with consumption history</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={`border ${smsPalette.border} ${smsPalette.card}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className={`h-4 w-4 ${smsPalette.icon}`} />
                SMS Balance
              </CardTitle>
              <CardDescription>Live balance from SMS provider</CardDescription>
            </div>
            <Badge variant="outline">KES</Badge>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${smsPalette.accentText}`}>
              {smsBalance?.balance ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${emailPalette.border} ${emailPalette.card}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className={`h-4 w-4 ${emailPalette.icon}`} />
                Email Balance
              </CardTitle>
              <CardDescription>Internal email credits</CardDescription>
            </div>
            <Badge variant="outline">Units</Badge>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${emailPalette.accentText}`}>
              {emailBalance?.balance ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
          <CardDescription>Latest SMS and email consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(usage) && usage.length > 0 ? (
                usage.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="capitalize">{row.channel}</TableCell>
                    <TableCell>{row.units}</TableCell>
                    <TableCell>{row.balance_after ?? "—"}</TableCell>
                    <TableCell>
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No usage recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
