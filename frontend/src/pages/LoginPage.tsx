import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useAuthStore } from "@/stores/authStore";

type Tab = "login" | "register";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      navigate("/");
    } catch {
      // Error is set in the store
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10">
            <FlaskConical size={28} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            AlchemSim
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            CFD Simulation Platform
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-bg-secondary p-6 shadow-xl">
          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-bg-primary p-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  clearError();
                }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-bg-tertiary text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="input-label">Full Name</label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input-field pl-10"
                  required
                  minLength={6}
                  autoComplete={
                    tab === "login" ? "current-password" : "new-password"
                  }
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
            >
              {tab === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-secondary">
          AlchemSim v0.1.0 &mdash; Computational Fluid Dynamics
        </p>
      </div>
    </div>
  );
}
