import { useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { WorkflowStepper } from "@/components/layout/WorkflowStepper";
import { Viewport3D } from "@/components/viewport/Viewport3D";
import { GeometryRenderer } from "@/components/viewport/GeometryRenderer";
import { MeshRenderer } from "@/components/viewport/MeshRenderer";
import { CameraFramer } from "@/components/viewport/CameraFramer";
import { GeometryPanel } from "@/components/geometry/GeometryPanel";
import { MeshPanel } from "@/components/mesh/MeshPanel";
import { PhysicsPanel } from "@/components/physics/PhysicsPanel";
import { ComputePanel } from "@/components/compute/ComputePanel";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { Spinner } from "@/components/common/Spinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useSimulationStore } from "@/stores/simulationStore";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { SimulationStatus, type WSMessage, type ResidualData } from "@/types/api";

export function WorkspacePage() {
  const { simulationId } = useParams<{ simulationId: string }>();
  const { currentSimulation, stlData, isLoading, loadSimulation, setSimulation, addResidual } =
    useSimulationStore();
  const { currentStep, setSimulationStatus } = useWorkflowStore();

  // Load simulation on mount
  useEffect(() => {
    if (simulationId) {
      loadSimulation(simulationId);
    }

    return () => {
      useSimulationStore.getState().reset();
      useWorkflowStore.getState().reset();
    };
  }, [simulationId, loadSimulation]);

  // Sync workflow status
  useEffect(() => {
    if (currentSimulation) {
      setSimulationStatus(currentSimulation.status);
    }
  }, [currentSimulation, setSimulationStatus]);

  // WebSocket for live updates
  const handleWSMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case "status_update": {
          const status = msg.data.status as SimulationStatus;
          if (currentSimulation) {
            setSimulation({ ...currentSimulation, status });
            setSimulationStatus(status);
          }
          break;
        }
        case "residual_update": {
          addResidual(msg.data as unknown as ResidualData);
          break;
        }
        case "mesh_progress": {
          // Could update a progress indicator
          break;
        }
        case "completed": {
          // Reload simulation to get final data
          if (simulationId) loadSimulation(simulationId);
          break;
        }
        case "error": {
          console.error("Simulation error:", msg.data);
          break;
        }
      }
    },
    [currentSimulation, setSimulation, setSimulationStatus, addResidual, simulationId, loadSimulation],
  );

  useWebSocket({
    simulationId: simulationId ?? null,
    onMessage: handleWSMessage,
    enabled: !!simulationId,
  });

  if (isLoading && !currentSimulation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size={32} className="text-accent" />
      </div>
    );
  }

  if (!currentSimulation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-text-secondary">Simulation not found</p>
      </div>
    );
  }

  // Render active panel based on current step
  const panels = [
    <GeometryPanel key="geo" />,
    <MeshPanel key="mesh" />,
    <PhysicsPanel key="physics" />,
    <ComputePanel key="compute" />,
    <ResultsPanel key="results" />,
  ];

  return (
    <ErrorBoundary>
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <Sidebar>
          <WorkflowStepper />
          <div className="flex-1 overflow-y-auto">{panels[currentStep]}</div>
        </Sidebar>

        {/* 3D Viewport */}
        <Viewport3D>
          {/* Auto-frame camera when geometry loads */}
          <CameraFramer vertices={stlData?.vertices ?? null} />

          {/* Render geometry if we have STL data */}
          {stlData && (
            <GeometryRenderer
              vertices={stlData.vertices}
              normals={stlData.normals}
            />
          )}

          {/* Render mesh wireframe overlay */}
          {stlData && currentStep >= 1 && (
            <MeshRenderer vertices={stlData.vertices} />
          )}
        </Viewport3D>
      </div>
    </ErrorBoundary>
  );
}
