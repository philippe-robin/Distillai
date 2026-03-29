import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/common/Button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary p-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-accent">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-text-primary">
          Page Not Found
        </h2>
        <p className="mt-2 text-text-secondary">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            icon={<Home size={16} />}
            onClick={() => navigate("/")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
