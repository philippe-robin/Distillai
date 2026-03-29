import { useEffect } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useAuthStore } from "@/stores/authStore";

export function DashboardPage() {
  const { user, fetchUser } = useAuthStore();

  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  return <Dashboard />;
}
