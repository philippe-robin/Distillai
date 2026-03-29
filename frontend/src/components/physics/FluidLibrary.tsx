import { useState } from "react";
import type { FluidProperties } from "@/types/api";
import { PRESET_FLUIDS } from "@/lib/constants";

interface FluidLibraryProps {
  fluid: FluidProperties;
  onFluidChange: (fluid: FluidProperties) => void;
}

export function FluidLibrary({ fluid, onFluidChange }: FluidLibraryProps) {
  const [isCustom, setIsCustom] = useState(
    !PRESET_FLUIDS.some((f) => f.name === fluid.name),
  );

  const handlePresetSelect = (preset: FluidProperties) => {
    setIsCustom(false);
    onFluidChange({ ...preset });
  };

  return (
    <div className="space-y-3">
      {/* Preset fluids */}
      <div className="grid grid-cols-2 gap-1.5">
        {PRESET_FLUIDS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => handlePresetSelect(preset)}
            className={`rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
              fluid.name === preset.name && !isCustom
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-bg-primary text-text-secondary hover:border-text-secondary"
            }`}
          >
            <span className="block font-medium">{preset.name}</span>
            <span className="block text-[10px] opacity-70">
              rho={preset.density} mu={preset.viscosity.toExponential(1)}
            </span>
          </button>
        ))}

        {/* Custom option */}
        <button
          onClick={() => {
            setIsCustom(true);
            onFluidChange({
              name: "Custom",
              density: fluid.density,
              viscosity: fluid.viscosity,
            });
          }}
          className={`rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
            isCustom
              ? "border-accent bg-accent/10 text-accent"
              : "border-border bg-bg-primary text-text-secondary hover:border-text-secondary"
          }`}
        >
          <span className="block font-medium">Custom</span>
          <span className="block text-[10px] opacity-70">
            Define properties
          </span>
        </button>
      </div>

      {/* Fluid properties display/edit */}
      <div className="space-y-2">
        <div>
          <label className="input-label">Density [kg/m3]</label>
          <input
            type="number"
            step={0.1}
            value={fluid.density}
            onChange={(e) =>
              onFluidChange({
                ...fluid,
                density: parseFloat(e.target.value) || 0,
              })
            }
            disabled={!isCustom}
            className="input-field disabled:opacity-50"
          />
        </div>
        <div>
          <label className="input-label">Dynamic Viscosity [Pa.s]</label>
          <input
            type="number"
            step={0.0001}
            value={fluid.viscosity}
            onChange={(e) =>
              onFluidChange({
                ...fluid,
                viscosity: parseFloat(e.target.value) || 0,
              })
            }
            disabled={!isCustom}
            className="input-field disabled:opacity-50"
          />
        </div>
        {isCustom && (
          <>
            <div>
              <label className="input-label">Specific Heat [J/(kg.K)]</label>
              <input
                type="number"
                step={1}
                value={fluid.specific_heat ?? ""}
                onChange={(e) =>
                  onFluidChange({
                    ...fluid,
                    specific_heat: parseFloat(e.target.value) || undefined,
                  })
                }
                className="input-field"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="input-label">
                Thermal Conductivity [W/(m.K)]
              </label>
              <input
                type="number"
                step={0.001}
                value={fluid.thermal_conductivity ?? ""}
                onChange={(e) =>
                  onFluidChange({
                    ...fluid,
                    thermal_conductivity:
                      parseFloat(e.target.value) || undefined,
                  })
                }
                className="input-field"
                placeholder="Optional"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
