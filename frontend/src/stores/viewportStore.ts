import { create } from "zustand";
import type { ResultField } from "@/types/api";

export type DisplayMode = "solid" | "wireframe" | "solid+wireframe";
export type ColorMapName = "viridis" | "jet" | "coolwarm" | "plasma";

interface CutPlane {
  normal: [number, number, number];
  origin: [number, number, number];
}

interface ViewportState {
  displayMode: DisplayMode;
  showMesh: boolean;
  showGrid: boolean;
  showAxes: boolean;
  activeField: ResultField | null;
  colorMap: ColorMapName;
  fieldRange: { min: number; max: number };
  cutPlane: CutPlane | null;
  showStreamlines: boolean;

  setDisplayMode: (mode: DisplayMode) => void;
  toggleMesh: () => void;
  toggleGrid: () => void;
  toggleAxes: () => void;
  setActiveField: (field: ResultField | null) => void;
  setColorMap: (map: ColorMapName) => void;
  setFieldRange: (min: number, max: number) => void;
  setCutPlane: (plane: CutPlane | null) => void;
  toggleStreamlines: () => void;
  reset: () => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  displayMode: "solid",
  showMesh: false,
  showGrid: true,
  showAxes: true,
  activeField: null,
  colorMap: "viridis",
  fieldRange: { min: 0, max: 1 },
  cutPlane: null,
  showStreamlines: false,

  setDisplayMode(mode) {
    set({ displayMode: mode });
  },

  toggleMesh() {
    set((s) => ({ showMesh: !s.showMesh }));
  },

  toggleGrid() {
    set((s) => ({ showGrid: !s.showGrid }));
  },

  toggleAxes() {
    set((s) => ({ showAxes: !s.showAxes }));
  },

  setActiveField(field) {
    set({ activeField: field });
  },

  setColorMap(map) {
    set({ colorMap: map });
  },

  setFieldRange(min, max) {
    set({ fieldRange: { min, max } });
  },

  setCutPlane(plane) {
    set({ cutPlane: plane });
  },

  toggleStreamlines() {
    set((s) => ({ showStreamlines: !s.showStreamlines }));
  },

  reset() {
    set({
      displayMode: "solid",
      showMesh: false,
      showGrid: true,
      showAxes: true,
      activeField: null,
      colorMap: "viridis",
      fieldRange: { min: 0, max: 1 },
      cutPlane: null,
      showStreamlines: false,
    });
  },
}));
