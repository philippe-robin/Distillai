import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-bg-primary">
      <TopBar />
      <main className="flex flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
