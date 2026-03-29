import { Box, Grid3x3, Axis3D } from "lucide-react";
import clsx from "clsx";
import { useViewportStore, type DisplayMode } from "@/stores/viewportStore";

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={clsx(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-accent/20 text-accent"
          : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary",
      )}
    >
      <Icon size={16} />
    </button>
  );
}

const displayModes: { mode: DisplayMode; label: string }[] = [
  { mode: "solid", label: "Solid" },
  { mode: "wireframe", label: "Wireframe" },
  { mode: "solid+wireframe", label: "Both" },
];

/**
 * Floating toolbar rendered as an HTML overlay above the Canvas.
 * Does NOT use any React Three Fiber hooks.
 */
export function ViewportToolbar() {
  const {
    displayMode,
    setDisplayMode,
    showGrid,
    showAxes,
    showMesh,
    toggleGrid,
    toggleAxes,
    toggleMesh,
  } = useViewportStore();

  return (
    <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-border bg-bg-secondary/90 px-2 py-1 backdrop-blur-sm">
      {/* Display mode */}
      <div className="flex items-center gap-0.5 rounded-md bg-bg-primary/50 p-0.5">
        {displayModes.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setDisplayMode(mode)}
            title={label}
            className={clsx(
              "rounded px-2 py-1 text-xs transition-colors",
              displayMode === mode
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton
        icon={Grid3x3}
        label="Toggle Grid"
        active={showGrid}
        onClick={toggleGrid}
      />
      <ToolbarButton
        icon={Axis3D}
        label="Toggle Axes"
        active={showAxes}
        onClick={toggleAxes}
      />
      <ToolbarButton
        icon={Box}
        label="Toggle Mesh"
        active={showMesh}
        onClick={toggleMesh}
      />
    </div>
  );
}
