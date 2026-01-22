import { Dashboard } from "@/components/dashboard";

export function ClientPortal() {
  // Client portal reuses the Dashboard component
  // Data filtering will be handled server-side based on user role
  // Clients will only see properties assigned to them (via landlordId or propertyId)
  return <Dashboard />;
}
