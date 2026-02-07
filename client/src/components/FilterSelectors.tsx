import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2, UserCog } from "lucide-react";
import { useFilter } from "@/contexts/FilterContext";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FilterSelectorsProps {
  currentUser: { id: string; username: string; role?: string } | null;
}

export function FilterSelectors({ currentUser }: FilterSelectorsProps) {
  const {
    selectedAgentId,
    selectedPropertyId,
    selectedLandlordId,
    setSelectedAgentId,
    setSelectedPropertyId,
    setSelectedLandlordId,
  } = useFilter();
  const role = (currentUser?.role || "").toLowerCase();
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || role === "super_admin" || role === "administrator" || role === "agent";
  const normalizeId = (value: any) => (value === null || value === undefined ? null : String(value));
  const normalizedAgentId = normalizeId(selectedAgentId);
  const normalizedLandlordId = normalizeId(selectedLandlordId);
  const normalizedPropertyId = normalizeId(selectedPropertyId);

  // Fetch landlords (only for admin)
  const { data: landlords = [] } = useQuery({
    queryKey: ["/api/landlords", normalizedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (normalizedAgentId) {
        params.append("agentId", normalizedAgentId);
      }
      const response = await apiRequest("GET", `/api/landlords${params.toString() ? `?${params}` : ""}`);
      return await response.json();
    },
    enabled: isAdmin,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["/api/users", "agents"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users?role=agent");
      return await response.json();
    },
    enabled: isSuperAdmin,
  });

  // Fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties", normalizedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (normalizedAgentId) {
        params.append("agentId", normalizedAgentId);
      }
      const response = await apiRequest("GET", `/api/properties${params.toString() ? `?${params}` : ""}`);
      return await response.json();
    },
  });

  const getPropertyLandlordId = (property: any) => property?.landlordId ?? property?.landlord_id;
  const getPropertyAgentId = (property: any) => property?.adminId ?? property?.admin_id;
  const getLandlordAgentId = (landlord: any) => landlord?.adminId ?? landlord?.admin_id;

  useEffect(() => {
    if (!selectedPropertyId) return;
    const matchProperty = (properties as any[]).find((property: any) => normalizeId(property.id) === normalizedPropertyId);
    if (!matchProperty) return;
    const ownerId = normalizeId(getPropertyLandlordId(matchProperty));
    const propertyAgentId = normalizeId(getPropertyAgentId(matchProperty));
    if (ownerId && ownerId !== normalizedLandlordId) {
      setSelectedLandlordId(ownerId);
    }
    if (propertyAgentId && propertyAgentId !== normalizedAgentId) {
      setSelectedAgentId(propertyAgentId);
    }
    queryClient.invalidateQueries();
  }, [
    normalizedPropertyId,
    properties,
    normalizedLandlordId,
    normalizedAgentId,
    setSelectedLandlordId,
    setSelectedAgentId,
  ]);

  useEffect(() => {
    if (!normalizedLandlordId) return;
    if (isSuperAdmin && Array.isArray(landlords)) {
      const matchLandlord = (landlords as any[]).find(
        (landlord: any) => normalizeId(landlord.id) === normalizedLandlordId
      );
      const landlordAgentId = normalizeId(getLandlordAgentId(matchLandlord));
      if (landlordAgentId && landlordAgentId !== normalizedAgentId) {
        setSelectedAgentId(landlordAgentId);
      }
    }
    const ownedProperties = (properties as any[]).filter((property: any) => normalizeId(getPropertyLandlordId(property)) === normalizedLandlordId);
    if (ownedProperties.length === 1) {
      const onlyPropertyId = normalizeId(ownedProperties[0].id);
      if (onlyPropertyId && normalizedPropertyId !== onlyPropertyId) {
        setSelectedPropertyId(onlyPropertyId);
        queryClient.invalidateQueries();
      }
      return;
    }
    if (ownedProperties.length > 1 && normalizedPropertyId && !ownedProperties.find((p: any) => normalizeId(p.id) === normalizedPropertyId)) {
      setSelectedPropertyId(null);
      queryClient.invalidateQueries();
    }
  }, [
    normalizedLandlordId,
    normalizedPropertyId,
    normalizedAgentId,
    properties,
    landlords,
    isSuperAdmin,
    setSelectedPropertyId,
    setSelectedAgentId,
  ]);

  useEffect(() => {
    const role = (currentUser?.role || "").toLowerCase();
    if (role !== "client" && role !== "landlord") return;
    if (normalizedPropertyId) return;
    const firstProperty = (properties as any[])[0];
    const firstPropertyId = normalizeId(firstProperty?.id);
    if (firstPropertyId) {
      setSelectedPropertyId(firstPropertyId);
      queryClient.invalidateQueries();
    }
  }, [currentUser?.role, properties, normalizedPropertyId, setSelectedPropertyId]);

  return (
    <>
      {/* Agent Selector - Only for Super Admin */}
      {isSuperAdmin && (
        <Select
          value={normalizedAgentId || "all"}
          onValueChange={(value) => {
            if (value === "all") {
              setSelectedAgentId(null);
            } else {
              setSelectedAgentId(normalizeId(value));
            }
            setSelectedLandlordId(null);
            setSelectedPropertyId(null);
            queryClient.invalidateQueries();
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <UserCog className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">View Agents</SelectItem>
            {Array.isArray(agents) &&
              agents.map((agent: any) => (
                <SelectItem key={agent.id} value={String(agent.id)}>
                  {agent.username}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}

      {/* Landlord Selector - Only for Admin */}
      {isAdmin && (
        <Select
          value={normalizedLandlordId || "all"}
          onValueChange={(value) => {
            if (value === "all") {
              setSelectedLandlordId(null);
            } else {
              setSelectedLandlordId(normalizeId(value));
            }
            // Clear property selection when landlord changes
            setSelectedPropertyId(null);
            // Invalidate all queries to refresh data
            queryClient.invalidateQueries();
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <Users className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select Landlord" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">View Clients</SelectItem>
            {Array.isArray(landlords) &&
              landlords.map((landlord: any) => (
                <SelectItem key={landlord.id} value={String(landlord.id)}>
                  {landlord.username}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}

      {/* Property Selector - Admin sees "View All", Clients see only their property */}
      <Select
        value={normalizedPropertyId || "all"}
        onValueChange={(value) => {
          if (value === "all") {
            setSelectedPropertyId(null);
          } else {
            setSelectedPropertyId(normalizeId(value));
          }
          // Invalidate all queries to refresh data
          queryClient.invalidateQueries();
        }}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <Building2 className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Select Property" />
        </SelectTrigger>
        <SelectContent>
          {isAdmin && <SelectItem value="all">View All Properties</SelectItem>}
          {Array.isArray(properties) &&
            properties
              .filter((property: any) => {
                // If landlord is selected, only show properties for that landlord
                if (normalizedLandlordId) {
                  return normalizeId(getPropertyLandlordId(property)) === normalizedLandlordId;
                }
                return true;
              })
              .map((property: any) => (
                <SelectItem key={property.id} value={String(property.id)}>
                  {property.name}
                </SelectItem>
              ))}
        </SelectContent>
      </Select>
    </>
  );
}

