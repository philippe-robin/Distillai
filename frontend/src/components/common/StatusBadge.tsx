import clsx from "clsx";
import { SimulationStatus } from "@/types/api";
import { SIMULATION_STATUSES } from "@/lib/constants";

interface StatusBadgeProps {
  status: SimulationStatus;
  className?: string;
}

const colorClasses: Record<string, string> = {
  gray: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
};

const pulseStatuses = new Set([
  SimulationStatus.Meshing,
  SimulationStatus.Running,
]);

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = SIMULATION_STATUSES[status];
  const isPulsing = pulseStatuses.has(status);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        colorClasses[config.color],
        className,
      )}
    >
      {isPulsing && (
        <span className="relative flex h-2 w-2">
          <span
            className={clsx(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              config.color === "blue" ? "bg-blue-400" : "bg-green-400",
            )}
          />
          <span
            className={clsx(
              "relative inline-flex h-2 w-2 rounded-full",
              config.color === "blue" ? "bg-blue-400" : "bg-green-400",
            )}
          />
        </span>
      )}
      {config.label}
    </span>
  );
}
