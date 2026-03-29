import { create } from "zustand";
import { SimulationStatus } from "@/types/api";

export const STEP_LABELS = [
  "Geometry",
  "Mesh",
  "Physics",
  "Compute",
  "Results",
] as const;

export type StepIndex = 0 | 1 | 2 | 3 | 4;

interface WorkflowState {
  currentStep: StepIndex;
  stepLabels: readonly string[];
  simulationStatus: SimulationStatus;

  setStep: (step: StepIndex) => void;
  setSimulationStatus: (status: SimulationStatus) => void;
  canAdvance: () => boolean;
  isStepComplete: (step: StepIndex) => boolean;
  isStepAccessible: (step: StepIndex) => boolean;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  currentStep: 0,
  stepLabels: STEP_LABELS,
  simulationStatus: SimulationStatus.Draft,

  setStep(step) {
    if (get().isStepAccessible(step)) {
      set({ currentStep: step });
    }
  },

  setSimulationStatus(status) {
    set({ simulationStatus: status });
  },

  canAdvance() {
    const { currentStep, simulationStatus } = get();
    switch (currentStep) {
      case 0: // Geometry
        return (
          simulationStatus !== SimulationStatus.Draft
        );
      case 1: // Mesh
        return (
          simulationStatus === SimulationStatus.MeshReady ||
          simulationStatus === SimulationStatus.Running ||
          simulationStatus === SimulationStatus.Converged
        );
      case 2: // Physics
        return (
          simulationStatus === SimulationStatus.MeshReady ||
          simulationStatus === SimulationStatus.Running ||
          simulationStatus === SimulationStatus.Converged
        );
      case 3: // Compute
        return simulationStatus === SimulationStatus.Converged;
      case 4: // Results
        return false; // Last step
      default:
        return false;
    }
  },

  isStepComplete(step) {
    const { simulationStatus } = get();
    switch (step) {
      case 0:
        return simulationStatus !== SimulationStatus.Draft;
      case 1:
        return [
          SimulationStatus.MeshReady,
          SimulationStatus.Running,
          SimulationStatus.Converged,
        ].includes(simulationStatus);
      case 2:
        return [
          SimulationStatus.Running,
          SimulationStatus.Converged,
        ].includes(simulationStatus);
      case 3:
        return simulationStatus === SimulationStatus.Converged;
      case 4:
        return false;
      default:
        return false;
    }
  },

  isStepAccessible(step) {
    if (step === 0) return true;
    return get().isStepComplete((step - 1) as StepIndex);
  },

  reset() {
    set({ currentStep: 0, simulationStatus: SimulationStatus.Draft });
  },
}));
