import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route
            path="workspace/:simulationId"
            element={<WorkspacePage />}
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
