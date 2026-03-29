import { useState } from "react";

interface MeshSettingsProps {
  elementSize: number;
  onElementSizeChange: (size: number) => void;
}

export function MeshSettings({
  elementSize,
  onElementSizeChange,
}: MeshSettingsProps) {
  const [enableBoundaryLayers, setEnableBoundaryLayers] = useState(false);

  return (
    <div className="space-y-4">
      {/* Global element size */}
      <div>
        <label className="input-label">
          Global Element Size: {elementSize.toFixed(3)}
        </label>
        <input
          type="range"
          min={0.01}
          max={1.0}
          step={0.01}
          value={elementSize}
          onChange={(e) => onElementSizeChange(parseFloat(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="mt-1 flex justify-between text-xs text-text-secondary">
          <span>0.01 (fine)</span>
          <span>1.00 (coarse)</span>
        </div>
      </div>

      {/* Manual input */}
      <div>
        <label className="input-label">Element Size (manual)</label>
        <input
          type="number"
          min={0.001}
          max={10}
          step={0.001}
          value={elementSize}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > 0) onElementSizeChange(val);
          }}
          className="input-field"
        />
      </div>

      {/* Min element size */}
      <div>
        <label className="input-label">Min Element Size</label>
        <input
          type="number"
          min={0.001}
          max={elementSize}
          step={0.001}
          defaultValue={elementSize * 0.1}
          className="input-field"
        />
      </div>

      {/* Boundary layers */}
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enableBoundaryLayers}
            onChange={(e) => setEnableBoundaryLayers(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-bg-primary accent-accent"
          />
          <span className="text-text-primary">Boundary Layers</span>
        </label>

        {enableBoundaryLayers && (
          <div className="mt-3 ml-6 space-y-3">
            <div>
              <label className="input-label">First Layer Thickness</label>
              <input
                type="number"
                defaultValue={0.001}
                step={0.0001}
                min={0.0001}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Growth Rate</label>
              <input
                type="number"
                defaultValue={1.2}
                step={0.05}
                min={1.0}
                max={3.0}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Number of Layers</label>
              <input
                type="number"
                defaultValue={5}
                step={1}
                min={1}
                max={30}
                className="input-field"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
