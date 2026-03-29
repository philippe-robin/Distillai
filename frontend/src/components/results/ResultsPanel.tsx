import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/common/Button";
import { FieldSelector } from "./FieldSelector";
import { ExportDialog } from "./ExportDialog";
import { useViewportStore } from "@/stores/viewportStore";
import { AVAILABLE_COLOR_MAPS } from "@/lib/colorMaps";
import type { ResultField } from "@/types/api";

export function ResultsPanel() {
  const {
    activeField,
    setActiveField,
    colorMap,
    setColorMap,
    fieldRange,
    setFieldRange,
    cutPlane,
    setCutPlane,
    showStreamlines,
    toggleStreamlines,
  } = useViewportStore();

  const [showExport, setShowExport] = useState(false);
  const [cutPlaneEnabled, setCutPlaneEnabled] = useState(cutPlane !== null);
  const [cutAxis, setCutAxis] = useState<"x" | "y" | "z">("x");
  const [cutPosition, setCutPosition] = useState(0);

  const handleCutPlaneToggle = (enabled: boolean) => {
    setCutPlaneEnabled(enabled);
    if (enabled) {
      const normal: [number, number, number] =
        cutAxis === "x"
          ? [1, 0, 0]
          : cutAxis === "y"
            ? [0, 1, 0]
            : [0, 0, 1];
      setCutPlane({ normal, origin: [cutPosition, cutPosition, cutPosition] });
    } else {
      setCutPlane(null);
    }
  };

  const handleCutAxisChange = (axis: "x" | "y" | "z") => {
    setCutAxis(axis);
    if (cutPlaneEnabled) {
      const normal: [number, number, number] =
        axis === "x"
          ? [1, 0, 0]
          : axis === "y"
            ? [0, 1, 0]
            : [0, 0, 1];
      setCutPlane({ normal, origin: [cutPosition, cutPosition, cutPosition] });
    }
  };

  return (
    <div className="flex flex-col">
      {/* Field selector */}
      <div className="panel-section">
        <h3 className="panel-section-title">Field</h3>
        <FieldSelector
          value={activeField}
          onChange={(f) => setActiveField(f as ResultField)}
        />
      </div>

      {/* Color map */}
      <div className="panel-section">
        <h3 className="panel-section-title">Color Map</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {AVAILABLE_COLOR_MAPS.map((map) => (
            <button
              key={map}
              onClick={() => setColorMap(map)}
              className={`rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                colorMap === map
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-bg-primary text-text-secondary hover:border-text-secondary"
              }`}
            >
              {map}
            </button>
          ))}
        </div>
      </div>

      {/* Range */}
      <div className="panel-section">
        <h3 className="panel-section-title">Value Range</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="input-label">Min</label>
            <input
              type="number"
              value={fieldRange.min}
              onChange={(e) =>
                setFieldRange(
                  parseFloat(e.target.value) || 0,
                  fieldRange.max,
                )
              }
              step="any"
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">Max</label>
            <input
              type="number"
              value={fieldRange.max}
              onChange={(e) =>
                setFieldRange(
                  fieldRange.min,
                  parseFloat(e.target.value) || 1,
                )
              }
              step="any"
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Cut plane */}
      <div className="panel-section">
        <h3 className="panel-section-title">Cut Plane</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cutPlaneEnabled}
            onChange={(e) => handleCutPlaneToggle(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-bg-primary accent-accent"
          />
          <span className="text-text-primary">Enable</span>
        </label>

        {cutPlaneEnabled && (
          <div className="mt-3 space-y-2">
            <div>
              <label className="input-label">Axis</label>
              <div className="flex gap-1">
                {(["x", "y", "z"] as const).map((axis) => (
                  <button
                    key={axis}
                    onClick={() => handleCutAxisChange(axis)}
                    className={`flex-1 rounded px-2 py-1 text-xs font-medium uppercase transition-colors ${
                      cutAxis === axis
                        ? "bg-accent/20 text-accent"
                        : "bg-bg-primary text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {axis}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="input-label">
                Position: {cutPosition.toFixed(2)}
              </label>
              <input
                type="range"
                min={-5}
                max={5}
                step={0.01}
                value={cutPosition}
                onChange={(e) => {
                  const pos = parseFloat(e.target.value);
                  setCutPosition(pos);
                  const normal: [number, number, number] =
                    cutAxis === "x"
                      ? [1, 0, 0]
                      : cutAxis === "y"
                        ? [0, 1, 0]
                        : [0, 0, 1];
                  setCutPlane({ normal, origin: [pos, pos, pos] });
                }}
                className="w-full accent-accent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Streamlines */}
      <div className="panel-section">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showStreamlines}
            onChange={toggleStreamlines}
            className="h-4 w-4 rounded border-border bg-bg-primary accent-accent"
          />
          <span className="text-text-primary">Show Streamlines</span>
        </label>
      </div>

      {/* Export */}
      <div className="panel-section">
        <Button
          variant="secondary"
          size="md"
          icon={<Download size={14} />}
          onClick={() => setShowExport(true)}
          className="w-full"
        >
          Export Results
        </Button>
      </div>

      <ExportDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
}
