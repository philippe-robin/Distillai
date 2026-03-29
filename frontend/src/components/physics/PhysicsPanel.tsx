import { useState, useEffect } from "react";
import { useSimulationStore } from "@/stores/simulationStore";
import { FluidLibrary } from "./FluidLibrary";
import { BoundaryConditions } from "./BoundaryConditions";
import { Button } from "@/components/common/Button";
import { Save } from "lucide-react";
import {
  TurbulenceModel,
  type PhysicsConfig,
  type FluidProperties,
  type BoundaryCondition,
} from "@/types/api";
import { TURBULENCE_MODELS } from "@/lib/constants";

export function PhysicsPanel() {
  const { currentSimulation, mesh, updatePhysics, isLoading } =
    useSimulationStore();

  const existing = currentSimulation?.physics_config;

  const [solverType, setSolverType] = useState<"steady" | "transient">(
    currentSimulation?.solver_config?.type ?? "steady",
  );
  const [turbulenceModel, setTurbulenceModel] = useState<TurbulenceModel>(
    existing?.turbulence_model ?? TurbulenceModel.Laminar,
  );
  const [fluid, setFluid] = useState<FluidProperties>(
    existing?.fluid ?? {
      name: "Water (20C)",
      density: 998.2,
      viscosity: 1.002e-3,
    },
  );
  const [boundaryConditions, setBoundaryConditions] = useState<
    BoundaryCondition[]
  >(existing?.boundary_conditions ?? []);
  const [heatTransfer, setHeatTransfer] = useState(
    existing?.heat_transfer_enabled ?? false,
  );

  // Initialize BCs from mesh patches
  useEffect(() => {
    if (mesh?.patches && boundaryConditions.length === 0) {
      setBoundaryConditions(
        mesh.patches.map((patch) => ({
          patch,
          type: "wall",
        })),
      );
    }
  }, [mesh, boundaryConditions.length]);

  const handleSave = async () => {
    const config: PhysicsConfig = {
      fluid,
      turbulence_model: turbulenceModel,
      boundary_conditions: boundaryConditions,
      reference_pressure: 0,
      heat_transfer_enabled: heatTransfer,
    };
    await updatePhysics(config);
  };

  return (
    <div className="flex flex-col">
      {/* Solver type */}
      <div className="panel-section">
        <h3 className="panel-section-title">Solver</h3>
        <div className="flex gap-2">
          {(["steady", "transient"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSolverType(type)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                solverType === type
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "bg-bg-primary text-text-secondary border border-border hover:border-text-secondary"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Turbulence model */}
      <div className="panel-section">
        <h3 className="panel-section-title">Turbulence Model</h3>
        <select
          value={turbulenceModel}
          onChange={(e) =>
            setTurbulenceModel(e.target.value as TurbulenceModel)
          }
          className="input-field"
        >
          {Object.entries(TURBULENCE_MODELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Fluid */}
      <div className="panel-section">
        <h3 className="panel-section-title">Fluid Properties</h3>
        <FluidLibrary fluid={fluid} onFluidChange={setFluid} />
      </div>

      {/* Heat transfer */}
      <div className="panel-section">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={heatTransfer}
            onChange={(e) => setHeatTransfer(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-bg-primary accent-accent"
          />
          <span className="text-text-primary">Enable Heat Transfer</span>
        </label>
      </div>

      {/* Boundary conditions */}
      <div className="panel-section">
        <h3 className="panel-section-title">Boundary Conditions</h3>
        <BoundaryConditions
          conditions={boundaryConditions}
          onChange={setBoundaryConditions}
        />
      </div>

      {/* Save button */}
      <div className="panel-section">
        <Button
          variant="primary"
          size="md"
          icon={<Save size={14} />}
          onClick={handleSave}
          isLoading={isLoading}
          className="w-full"
        >
          Save Physics Configuration
        </Button>
      </div>
    </div>
  );
}
