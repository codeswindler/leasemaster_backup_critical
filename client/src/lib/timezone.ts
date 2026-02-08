import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useFilter } from "@/contexts/FilterContext"
import { apiRequest } from "@/lib/queryClient"

export const parseUtcOffsetToMinutes = (offset?: string) => {
  if (!offset) return 0
  const match = offset.match(/^UTC([+-])(\d{2}):(\d{2})$/)
  if (!match) return 0
  const sign = match[1] === "-" ? -1 : 1
  const hours = Number(match[2])
  const minutes = Number(match[3])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0
  return sign * (hours * 60 + minutes)
}

export const formatWithOffset = (
  value: string | number | Date | null | undefined,
  offsetMinutes: number,
  options?: Intl.DateTimeFormatOptions
) => {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const adjusted = new Date(date.getTime() + offsetMinutes * 60 * 1000)
  return adjusted.toLocaleString(undefined, options)
}

export const formatDateWithOffset = (
  value: string | number | Date | null | undefined,
  offsetMinutes: number,
  options?: Intl.DateTimeFormatOptions
) => {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const adjusted = new Date(date.getTime() + offsetMinutes * 60 * 1000)
  return adjusted.toLocaleDateString(undefined, options)
}

export const usePropertyTimezoneOffset = () => {
  const { selectedPropertyId, selectedLandlordId, selectedAgentId } = useFilter()

  const invoiceSettingsQuery = useQuery({
    queryKey: ["/api/settings/invoice", selectedLandlordId, selectedPropertyId, selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAgentId) params.append("agentId", selectedAgentId)
      if (selectedLandlordId) params.append("landlordId", selectedLandlordId)
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId)
      const url = `/api/settings/invoice${params.toString() ? `?${params}` : ""}`
      const response = await apiRequest("GET", url)
      return await response.json()
    },
    enabled: Boolean(selectedPropertyId),
  })

  const timezoneOffset = invoiceSettingsQuery.data?.timezone_offset || "UTC+00:00"
  const timezoneOffsetMinutes = useMemo(() => parseUtcOffsetToMinutes(timezoneOffset), [timezoneOffset])

  return {
    timezoneOffset,
    timezoneOffsetMinutes,
    isLoading: invoiceSettingsQuery.isLoading,
  }
}
