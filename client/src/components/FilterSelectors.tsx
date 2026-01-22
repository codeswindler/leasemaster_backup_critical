import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2 } from "lucide-react";
import { useFilter } from "@/contexts/FilterContext";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FilterSelectorsProps {
  currentUser: { id: string; username: string; role?: string } | null;
}

export function FilterSelectors({ currentUser }: FilterSelectorsProps) {
  const { selectedPropertyId, selectedLandlordId, setSelectedPropertyId, setSelectedLandlordId } = useFilter();

  // Fetch landlords (only for admin)
  const { data: landlords = [] } = useQuery({
    queryKey: ["/api/landlords"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/landlords");
      return await response.json();
    },
    enabled: currentUser?.role === "admin",
  });

  // Fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/properties");
      return await response.json();
    },
  });

  return (
    <>
      {/* Landlord Selector - Only for Admin */}
      {currentUser?.role === "admin" && (
        <Select
          value={selectedLandlordId || "all"}
          onValueChange={(value) => {
            if (value === "all") {
              setSelectedLandlordId(null);
            } else {
              setSelectedLandlordId(value);
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
                <SelectItem key={landlord.id} value={landlord.id}>
                  {landlord.username}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}

      {/* Property Selector - Admin sees "View All", Clients see only their property (no "View All" option) */}
      <Select
        value={selectedPropertyId || (currentUser?.role === "client" ? properties?.[0]?.id || "" : "all")}
        onValueChange={(value) => {
          if (value === "all") {
            setSelectedPropertyId(null);
          } else {
            setSelectedPropertyId(value);
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
          {currentUser?.role === "admin" && <SelectItem value="all">View All Properties</SelectItem>}
          {Array.isArray(properties) &&
            properties
              .filter((property: any) => {
                // If landlord is selected, only show properties for that landlord
                if (selectedLandlordId) {
                  return property.landlordId === selectedLandlordId;
                }
                return true;
              })
              .map((property: any) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
        </SelectContent>
      </Select>
    </>
  );
}

