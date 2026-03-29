import { useState } from "react";
import { Play, Square, Settings2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ResidualChart } from "./ResidualChart";
import { useSimulationStore } from "@/stores/simulationStore";
import { SimulationStatus } from "@/types/api";

export function ComputePanel() {
  const {
    currentSimulation,
    residuals,
    launchSimulation,
    cancelSimulation,
    isLoading,
  } = useSimulationStore();

  const [maxIterations, setMaxIterations] = useState(
    currentSimulation?.solver_config?.max_iterations ?? 1000,
  );
  const [convergenceCriteria, setConvergenceCriteria] = useState(
    currentSimulation?.solver_config?.convergence_criteria ?? 1e-6,
  );

  const status = currentSimulation?.status ?? SimulationStatus.Draft;
  const isRunning = status === SimulationStatus.Running;
  const isConverged = status === SimulationStatus.Converged;
  const isDiverged = status === SimulationStatus.Diverged;

  const handleLaunch = async () => {
    await launchSimulation();
  };

  const handleCancel = async () => {
    await cancelSimulation();
  };

  return (
    <div className="flex flex-col">
      {/* Status */}
      <div className="panel-section">
        <h3 className="panel-section-title">Simulation Status</h3>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {isRunning && residuals.length > 0 && (
            <span className="text-xs text-text-secondary">
              Iteration {residuals[residuals.length - 1]!.iteration}
            </span>
          )}
        </div>

        {/* Progress bar for running simulations */}
        {isRunning && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-primary">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{
                  width: `${Math.min(100, (residuals.length / maxIterations) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {residuals.length} / {maxIterations} iterations
            </p>
          </div>
        )}
      </div>

      {/* Solver settings */}
      <div className="panel-section">
        <h3 className="panel-section-title">
          <Settings2 size={12} className="mr-1.5 inline" />
          Solver Settings
        </h3>
        <div className="space-y-3">
          <div>
            <label className="input-label">Max Iterations</label>
            <input
              type="number"
              min={1}
              max={100000}
              step={100}
              value={maxIterations}
              onChange={(e) => setMaxIterations(parseInt(e.target.value) || 1000)}
              disabled={isRunning}
              className="input-field disabled:opacity-50"
            />
          </div>
          <div>
            <label className="input-label">Convergence Criteria</label>
            <input
              type="number"
              min={1e-12}
              max={1}
              step="any"
              value={convergenceCriteria}
              onChange={(e) =>
                setConvergenceCriteria(parseFloat(e.target.value) || 1e-6)
              }
              disabled={isRunning}
              className="input-field disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      {currentSimulation?.physics_config && (
        <div className="panel-section">
          <h3 className="panel-section-title">Configuration Summary</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Fluid:</span>
              <span className="text-text-primary">
                {currentSimulation.physics_config.fluid.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Turbulence:</span>
              <span className="text-text-primary">
                {currentSimulation.physics_config.turbulence_model}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">BCs:</span>
              <span className="text-text-primary">
                {currentSimulation.physics_config.boundary_conditions.length}{" "}
                defined
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="panel-section">
        <div className="flex gap-2">
          {!isRunning ? (
            <Button
              variant="primary"
              size="md"
              icon={<Play size={14} />}
              onClick={handleLaunch}
              isLoading={isLoading}
              disabled={isConverged}
              className="flex-1"
            >
              {isConverged || isDiverged ? "Re-run" : "Start Simulation"}
            </Button>
          ) : (
            <Button
              variant="danger"
              size="md"
              icon={<Square size={14} />}
              onClick={handleCancel}
              className="flex-1"
            >
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Residual chart */}
      {residuals.length > 0 && (
        <div className="panel-section">
          <h3 className="panel-section-title">Residuals</h3>
          <ResidualChart data={residuals} />
        </div>
      )}
    </div>
  );
}
