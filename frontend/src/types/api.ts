// ── User & Auth ──────────────────────────────────────────────

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ── Project ──────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  workspace_id: string;
  owner_id: string;
  simulation_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  workspace_id?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
}

// ── Simulation ───────────────────────────────────────────────

export enum SimulationStatus {
  Draft = "draft",
  GeometryUploaded = "geometry_uploaded",
  Meshing = "meshing",
  MeshReady = "mesh_ready",
  Running = "running",
  Converged = "converged",
  Diverged = "diverged",
  Failed = "failed",
  Cancelled = "cancelled",
}

export enum SimulationType {
  InternalFlow = "internal_flow",
  ExternalFlow = "external_flow",
  HeatTransfer = "heat_transfer",
  Mixing = "mixing",
  Custom = "custom",
}

export interface Simulation {
  id: string;
  name: string;
  description: string;
  project_id: string;
  owner_id: string;
  status: SimulationStatus;
  simulation_type: SimulationType;
  physics_config: PhysicsConfig | null;
  solver_config: SolverConfig | null;
  created_at: string;
  updated_at: string;
}

export interface SimulationCreate {
  name: string;
  description?: string;
  project_id: string;
  simulation_type: SimulationType;
}

export interface SimulationUpdate {
  name?: string;
  description?: string;
  physics_config?: PhysicsConfig;
  solver_config?: SolverConfig;
}

// ── Geometry ─────────────────────────────────────────────────

export enum GeometryFormat {
  STL = "stl",
  STEP = "step",
  Primitive = "primitive",
}

export interface Geometry {
  id: string;
  simulation_id: string;
  filename: string | null;
  format: GeometryFormat;
  file_size: number | null;
  bounding_box: {
    min: [number, number, number];
    max: [number, number, number];
  } | null;
  face_count: number | null;
  vertex_count: number | null;
  primitive_config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ── Mesh ─────────────────────────────────────────────────────

export interface RefinementZone {
  name: string;
  type: "box" | "sphere" | "cylinder";
  center: [number, number, number];
  size: [number, number, number];
  element_size: number;
}

export interface MeshGenerateRequest {
  element_size: number;
  min_element_size?: number;
  refinement_zones?: RefinementZone[];
  boundary_layers?: {
    enabled: boolean;
    first_layer_thickness: number;
    growth_rate: number;
    num_layers: number;
  };
}

export interface Mesh {
  id: string;
  simulation_id: string;
  element_count: number | null;
  node_count: number | null;
  min_quality: number | null;
  avg_quality: number | null;
  max_quality: number | null;
  quality_histogram: number[] | null;
  patches: string[] | null;
  mesh_config: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
}

// ── Physics ──────────────────────────────────────────────────

export interface FluidProperties {
  name: string;
  density: number;
  viscosity: number;
  specific_heat?: number;
  thermal_conductivity?: number;
}

export type BoundaryConditionType =
  | "inlet"
  | "outlet"
  | "wall"
  | "symmetry"
  | "farfield";

export interface BoundaryCondition {
  patch: string;
  type: BoundaryConditionType;
  velocity?: [number, number, number];
  flow_rate?: number;
  pressure?: number;
  temperature?: number;
}

export enum TurbulenceModel {
  Laminar = "laminar",
  KEpsilon = "k-epsilon",
  KOmegaSST = "k-omega-sst",
}

export interface PhysicsConfig {
  fluid: FluidProperties;
  turbulence_model: TurbulenceModel;
  boundary_conditions: BoundaryCondition[];
  reference_pressure: number;
  gravity?: [number, number, number];
  heat_transfer_enabled: boolean;
}

export interface SolverConfig {
  type: "steady" | "transient";
  max_iterations: number;
  convergence_criteria: number;
  time_step?: number;
  end_time?: number;
  relaxation_factors?: Record<string, number>;
}

// ── Results ──────────────────────────────────────────────────

export enum ResultField {
  Pressure = "pressure",
  VelocityMagnitude = "velocity_magnitude",
  VelocityX = "velocity_x",
  VelocityY = "velocity_y",
  VelocityZ = "velocity_z",
  Temperature = "temperature",
  TurbulentKineticEnergy = "tke",
  TurbulentDissipation = "epsilon",
}

export interface Result {
  id: string;
  simulation_id: string;
  iteration: number;
  fields: ResultField[];
  residuals: Record<string, number>;
  created_at: string;
}

export interface ResidualData {
  iteration: number;
  pressure: number;
  Ux: number;
  Uy: number;
  Uz: number;
  [key: string]: number;
}

// ── Pagination ───────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ── WebSocket Messages ───────────────────────────────────────

export interface WSMessage {
  type:
    | "status_update"
    | "residual_update"
    | "mesh_progress"
    | "error"
    | "completed";
  data: Record<string, unknown>;
}

// ── Task ─────────────────────────────────────────────────────

export interface TaskResponse {
  task_id: string;
  status: string;
}
