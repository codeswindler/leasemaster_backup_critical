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

const parseDateValue = (value: string | number | Date) => {
  if (value instanceof Date) return value
  if (typeof value === "number") return new Date(value)
  const raw = value.trim()
  if (!raw) return new Date(NaN)
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
  const looksLikeSql = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/.test(raw)
  if (looksLikeSql && !hasTimezone) {
    const iso = raw.includes("T") ? raw : raw.replace(" ", "T")
    return new Date(`${iso}Z`)
  }
  return new Date(raw)
}

export const formatUtcOffset = (minutes: number) => {
  const sign = minutes >= 0 ? "+" : "-"
  const abs = Math.abs(minutes)
  const hours = String(Math.floor(abs / 60)).padStart(2, "0")
  const mins = String(abs % 60).padStart(2, "0")
  return `UTC${sign}${hours}:${mins}`
}

export const getTimeZoneOffsetMinutes = (timeZone: string, date = new Date()) => {
  if (!timeZone) return 0
  if (timeZone.startsWith("UTC")) {
    return parseUtcOffsetToMinutes(timeZone)
  }
  if (!timeZone.includes("/")) return 0
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const lookup: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== "literal") lookup[part.type] = part.value
  }
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second)
  )
  return Math.round((asUtc - date.getTime()) / 60000)
}

export const getSupportedTimeZones = () => {
  if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
    return (Intl as any).supportedValuesOf("timeZone") as string[]
  }
  return [
    "UTC",
    "Africa/Nairobi",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Cairo",
    "Europe/London",
    "Europe/Berlin",
    "Europe/Paris",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Sydney",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "America/Toronto",
  ]
}

export const formatWithOffset = (
  value: string | number | Date | null | undefined,
  offsetMinutes: number,
  options?: Intl.DateTimeFormatOptions
) => {
  if (!value) return "—"
  const date = parseDateValue(value)
  if (Number.isNaN(date.getTime())) return "—"
  const adjusted = new Date(date.getTime() + offsetMinutes * 60 * 1000)
  return adjusted.toLocaleString(undefined, { timeZone: "UTC", ...options })
}

export const formatDateWithOffset = (
  value: string | number | Date | null | undefined,
  offsetMinutes: number,
  options?: Intl.DateTimeFormatOptions
) => {
  if (!value) return "—"
  const date = parseDateValue(value)
  if (Number.isNaN(date.getTime())) return "—"
  const adjusted = new Date(date.getTime() + offsetMinutes * 60 * 1000)
  return adjusted.toLocaleDateString(undefined, { timeZone: "UTC", ...options })
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

  const timezoneOffset =
    invoiceSettingsQuery.data?.timezone_offset ??
    invoiceSettingsQuery.data?.timezoneOffset ??
    "UTC+00:00"
  const timezoneOffsetMinutes = useMemo(
    () => getTimeZoneOffsetMinutes(timezoneOffset),
    [timezoneOffset]
  )

  return {
    timezoneOffset,
    timezoneOffsetMinutes,
    isLoading: invoiceSettingsQuery.isLoading,
  }
}
