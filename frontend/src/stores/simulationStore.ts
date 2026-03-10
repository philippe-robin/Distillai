import { create } from "zustand";
import * as simApi from "@/api/simulations";
import * as geoApi from "@/api/geometry";
import * as meshApi from "@/api/mesh";
import { parseSTL, parseSTLFile } from "@/lib/stlParser";
import type {
  Simulation,
  Geometry,
  Mesh,
  PhysicsConfig,
  SolverConfig,
  ResidualData,
} from "@/types/api";

export interface STLData {
  vertices: Float32Array;
  normals: Float32Array;
}

interface SimulationState {
  currentSimulation: Simulation | null;
  geometry: Geometry | null;
  mesh: Mesh | null;
  stlData: STLData | null;
  residuals: ResidualData[];
  isLoading: boolean;
  error: string | null;

  loadSimulation: (id: string) => Promise<void>;
  updatePhysics: (config: PhysicsConfig) => Promise<void>;
  updateSolver: (config: SolverConfig) => Promise<void>;
  launchSimulation: () => Promise<void>;
  cancelSimulation: () => Promise<void>;
  uploadGeometry: (file: File) => Promise<void>;
  generateMesh: (elementSize: number) => Promise<void>;
  addResidual: (data: ResidualData) => void;
  clearResiduals: () => void;
  setSimulation: (sim: Simulation) => void;
  setGeometry: (geo: Geometry | null) => void;
  setMesh: (mesh: Mesh | null) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  currentSimulation: null,
  geometry: null,
  mesh: null,
  stlData: null,
  residuals: [],
  isLoading: false,
  error: null,

  async loadSimulation(id) {
    set({ isLoading: true, error: null });
    try {
      const sim = await simApi.getSimulation(id);
      set({ currentSimulation: sim, isLoading: false });

      // Try to load related geometry and mesh
      try {
        const geo = await geoApi.getGeometryBySimulation(sim.id);
        set({ geometry: geo });

        // Download and parse STL for 3D preview (stl and primitive formats both store STL files)
        if (geo.format === "stl" || geo.format === "primitive") {
          try {
            const blob = await geoApi.downloadGeometry(geo.id);
            const buffer = await blob.arrayBuffer();
            const result = parseSTL(buffer);
            set({ stlData: { vertices: result.vertices, normals: result.normals } });
          } catch {
            // Preview not available, non-blocking
          }
        }
      } catch {
        set({ geometry: null });
      }

      try {
        const mesh = await meshApi.getMesh(sim.id);
        set({ mesh });
      } catch {
        set({ mesh: null });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load simulation";
      set({ isLoading: false, error: message });
    }
  },

  async updatePhysics(config) {
    const sim = get().currentSimulation;
    if (!sim) return;

    const updated = await simApi.updateSimulation(sim.id, {
      physics_config: config,
    });
    set({ currentSimulation: updated });
  },

  async updateSolver(config) {
    const sim = get().currentSimulation;
    if (!sim) return;

    const updated = await simApi.updateSimulation(sim.id, {
      solver_config: config,
    });
    set({ currentSimulation: updated });
  },

  async launchSimulation() {
    const sim = get().currentSimulation;
    if (!sim) return;

    set({ isLoading: true });
    try {
      await simApi.launchSimulation(sim.id);
      const updated = await simApi.getSimulation(sim.id);
      set({ currentSimulation: updated, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to launch simulation";
      set({ isLoading: false, error: message });
    }
  },

  async cancelSimulation() {
    const sim = get().currentSimulation;
    if (!sim) return;

    await simApi.cancelSimulation(sim.id);
    const updated = await simApi.getSimulation(sim.id);
    set({ currentSimulation: updated });
  },

  async uploadGeometry(file) {
    const sim = get().currentSimulation;
    if (!sim) return;

    set({ isLoading: true });

    // Parse STL locally for 3D preview FIRST (independent of backend)
    const isSTL = file.name.toLowerCase().endsWith(".stl");
    if (isSTL) {
      try {
        const result = await parseSTLFile(file);
        set({ stlData: { vertices: result.vertices, normals: result.normals } });
      } catch (e) {
        console.error("STL parse error:", e);
      }
    }

    // Upload to backend (may fail if MinIO is down, etc.)
    try {
      const geo = await geoApi.uploadGeometry(file, sim.id);
      set({ geometry: geo, isLoading: false });
      // Refresh simulation status
      const updated = await simApi.getSimulation(sim.id);
      set({ currentSimulation: updated });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload geometry";
      set({ isLoading: false, error: message });
    }
  },

  async generateMesh(elementSize) {
    const sim = get().currentSimulation;
    if (!sim) return;

    set({ isLoading: true });
    try {
      await meshApi.generateMesh(sim.id, { element_size: elementSize });
      set({ isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate mesh";
      set({ isLoading: false, error: message });
    }
  },

  addResidual(data) {
    set((state) => ({ residuals: [...state.residuals, data] }));
  },

  clearResiduals() {
    set({ residuals: [] });
  },

  setSimulation(sim) {
    set({ currentSimulation: sim });
  },

  setGeometry(geo) {
    set({ geometry: geo });
  },

  setMesh(mesh) {
    set({ mesh });
  },

  reset() {
    set({
      currentSimulation: null,
      geometry: null,
      mesh: null,
      stlData: null,
      residuals: [],
      isLoading: false,
      error: null,
    });
  },
}));
