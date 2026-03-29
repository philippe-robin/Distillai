import { SimulationStatus, SimulationType, TurbulenceModel, ResultField } from "@/types/api";
import type { FluidProperties } from "@/types/api";

export const API_BASE = "/api/v1";
export const WS_BASE =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`
    : "ws://localhost:8000/api/ws";

export const STEP_LABELS = [
  "Geometry",
  "Mesh",
  "Physics",
  "Compute",
  "Results",
] as const;

export const SIMULATION_STATUSES: Record<
  SimulationStatus,
  { label: string; color: string }
> = {
  [SimulationStatus.Draft]: { label: "Draft", color: "gray" },
  [SimulationStatus.GeometryUploaded]: {
    label: "Geometry Uploaded",
    color: "blue",
  },
  [SimulationStatus.Meshing]: { label: "Meshing", color: "blue" },
  [SimulationStatus.MeshReady]: { label: "Mesh Ready", color: "green" },
  [SimulationStatus.Running]: { label: "Running", color: "blue" },
  [SimulationStatus.Converged]: { label: "Converged", color: "green" },
  [SimulationStatus.Diverged]: { label: "Diverged", color: "red" },
  [SimulationStatus.Failed]: { label: "Failed", color: "red" },
  [SimulationStatus.Cancelled]: { label: "Cancelled", color: "gray" },
};

export const SIMULATION_TYPES: Record<SimulationType, string> = {
  [SimulationType.InternalFlow]: "Internal Flow",
  [SimulationType.ExternalFlow]: "External Flow",
  [SimulationType.HeatTransfer]: "Heat Transfer",
  [SimulationType.Mixing]: "Mixing",
  [SimulationType.Custom]: "Custom",
};

export const TURBULENCE_MODELS: Record<TurbulenceModel, string> = {
  [TurbulenceModel.Laminar]: "Laminar",
  [TurbulenceModel.KEpsilon]: "k-epsilon",
  [TurbulenceModel.KOmegaSST]: "k-omega SST",
};

export const RESULT_FIELDS: Record<ResultField, string> = {
  [ResultField.Pressure]: "Pressure",
  [ResultField.VelocityMagnitude]: "Velocity Magnitude",
  [ResultField.VelocityX]: "Velocity X",
  [ResultField.VelocityY]: "Velocity Y",
  [ResultField.VelocityZ]: "Velocity Z",
  [ResultField.Temperature]: "Temperature",
  [ResultField.TurbulentKineticEnergy]: "Turbulent Kinetic Energy",
  [ResultField.TurbulentDissipation]: "Turbulent Dissipation",
};

export const PRESET_FLUIDS: FluidProperties[] = [
  { name: "Water (20C)", density: 998.2, viscosity: 1.002e-3, specific_heat: 4182, thermal_conductivity: 0.598 },
  { name: "Air (20C)", density: 1.204, viscosity: 1.825e-5, specific_heat: 1006, thermal_conductivity: 0.0257 },
  { name: "Ethanol", density: 789.0, viscosity: 1.2e-3, specific_heat: 2440, thermal_conductivity: 0.167 },
  { name: "Glycerol", density: 1261.0, viscosity: 1.412, specific_heat: 2430, thermal_conductivity: 0.285 },
  { name: "Toluene", density: 867.0, viscosity: 5.9e-4, specific_heat: 1700, thermal_conductivity: 0.131 },
  { name: "Hexane", density: 655.0, viscosity: 3.0e-4, specific_heat: 2270, thermal_conductivity: 0.124 },
];

export const ACCEPTED_GEOMETRY_FORMATS = [".stl", ".step", ".stp"];
export const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100 MB
