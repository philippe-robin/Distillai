import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FlaskConical, ChevronRight, User, LogOut, Settings } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const breadcrumbs = getBreadcrumbs(location.pathname);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-bg-secondary px-4">
      {/* Left: Logo + Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-bg-tertiary"
        >
          <FlaskConical size={20} className="text-accent" />
          <span className="text-sm font-bold tracking-tight text-text-primary">
            AlchemSim
          </span>
        </button>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-text-secondary">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight size={12} />
                <span
                  className={
                    i === breadcrumbs.length - 1
                      ? "text-text-primary"
                      : "cursor-pointer hover:text-text-primary"
                  }
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* Right: User menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-bg-tertiary"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-accent">
            <User size={14} />
          </div>
          <span className="text-sm text-text-primary">
            {user?.full_name ?? user?.email ?? "User"}
          </span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-bg-secondary py-1 shadow-xl">
            <div className="border-b border-border px-3 py-2">
              <p className="text-sm font-medium text-text-primary">
                {user?.full_name ?? "User"}
              </p>
              <p className="text-xs text-text-secondary">{user?.email}</p>
            </div>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              onClick={() => {
                setShowDropdown(false);
              }}
            >
              <Settings size={14} />
              Settings
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-error transition-colors hover:bg-error/10"
              onClick={handleLogout}
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

interface Breadcrumb {
  label: string;
  path?: string;
}

function getBreadcrumbs(pathname: string): Breadcrumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Breadcrumb[] = [];

  if (parts[0] === "workspace" && parts[1]) {
    crumbs.push({ label: "Dashboard", path: "/" });
    crumbs.push({ label: "Workspace" });
  }

  return crumbs;
}
