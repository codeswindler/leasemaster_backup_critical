import { Dashboard } from "@/components/dashboard";

export function AdminPortal() {
  // Admin portal simply reuses the Dashboard component
  // Dashboard component will show all data (no filtering for admin role)
  return <Dashboard />;
}
