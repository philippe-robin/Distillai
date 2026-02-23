import { create } from 'zustand';
import type {
  ProposalData,
  Language,
  ClientInfo,
  TechSpec,
  WorkPackage,
  TeamMember,
  Deliverable,
  PlanningConfig,
  BudgetConfig,
  AIConfig,
} from './types';

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const defaultProposalData: ProposalData = {
  language: 'fr',

  client: {
    name: '',
    date: new Date().toISOString().slice(0, 10),
    reference: '',
    validity: '',
  },

  context: '',
  need: '',

  techSpecs: [],

  methodology: {
    predictionDescription: '',
    generationDescription: '',
    challengesDescription: '',
    encouragingResearch: '',
    position: '',
  },

  workPackages: [
    {
      id: 'wp-1',
      title: 'Work Package 1',
      durationWeeks: 4,
      objective: '',
      description: '',
      deliverables: [],
    },
    {
      id: 'wp-2',
      title: 'Work Package 2',
      durationWeeks: 4,
      objective: '',
      description: '',
      deliverables: [],
    },
  ],

  team: [
    {
      role: 'Project Director',
      name: 'Philippe Robin',
      contact: '',
    },
    {
      role: 'Project Leader',
      name: 'Jean-Marin Brunet',
      contact: '',
    },
    {
      role: 'Development Team',
      name: '',
      contact: '',
    },
  ],

  deliverables: [
    {
      title: 'Presentation of results and methods',
      format: 'PDF/PPT',
    },
    {
      title: 'Top 15 generated candidates',
      format: 'Excel',
    },
  ],

  planning: {
    startDate: '',
    vacationWeeks: 0,
    totalWeeks: 8,
  },

  budget: {
    dailyRate: 1100,
    fteCount: 1,
    totalWeeks: 8,
    vatRate: 20,
  },

  ai: {
    apiKey: '',
    mode: 'clipboard',
  },
};

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface ProposalStore {
  data: ProposalData;

  // Language
  setLanguage: (lang: Language) => void;

  // Client
  setClient: (client: Partial<ClientInfo>) => void;

  // Context & Need
  setContext: (context: string) => void;
  setNeed: (need: string) => void;

  // Tech specs
  addTechSpec: () => void;
  addTechSpecWithData: (data: { text: string; included: boolean; feasibility: 'green' | 'yellow' | 'red' }) => void;
  removeTechSpec: (id: string) => void;
  updateTechSpec: (id: string, updates: Partial<TechSpec>) => void;

  // Methodology
  setMethodology: (updates: Partial<ProposalData['methodology']>) => void;

  // Work packages
  addWorkPackage: () => void;
  removeWorkPackage: (id: string) => void;
  updateWorkPackage: (id: string, updates: Partial<WorkPackage>) => void;

  // Team
  setTeam: (team: TeamMember[]) => void;
  addTeamMember: () => void;
  removeTeamMember: (index: number) => void;

  // Deliverables
  setDeliverables: (deliverables: Deliverable[]) => void;

  // Planning & Budget
  setPlanning: (updates: Partial<PlanningConfig>) => void;
  setBudget: (updates: Partial<BudgetConfig>) => void;

  // AI
  setAIConfig: (updates: Partial<AIConfig>) => void;

  // Reset
  resetAll: () => void;

  // Computed
  totalBudget: () => number;
}

// ---------------------------------------------------------------------------
// Helper: recompute totalWeeks from work packages
// ---------------------------------------------------------------------------

function computeTotalWeeks(workPackages: WorkPackage[]): number {
  return workPackages.reduce((sum, wp) => sum + wp.durationWeeks, 0);
}

let nextId = 1;
function uid(): string {
  return `id-${Date.now()}-${nextId++}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProposalStore = create<ProposalStore>()((set, get) => ({
  data: { ...defaultProposalData },

  // ------ Language ------
  setLanguage: (language) =>
    set((state) => ({ data: { ...state.data, language } })),

  // ------ Client ------
  setClient: (updates) =>
    set((state) => ({
      data: { ...state.data, client: { ...state.data.client, ...updates } },
    })),

  // ------ Context & Need ------
  setContext: (context) =>
    set((state) => ({ data: { ...state.data, context } })),
  setNeed: (need) =>
    set((state) => ({ data: { ...state.data, need } })),

  // ------ Tech specs ------
  addTechSpec: () =>
    set((state) => ({
      data: {
        ...state.data,
        techSpecs: [
          ...state.data.techSpecs,
          { id: uid(), text: '', included: true, feasibility: 'green' },
        ],
      },
    })),

  addTechSpecWithData: (specData) =>
    set((state) => ({
      data: {
        ...state.data,
        techSpecs: [
          ...state.data.techSpecs,
          { id: uid(), ...specData },
        ],
      },
    })),

  removeTechSpec: (id) =>
    set((state) => ({
      data: {
        ...state.data,
        techSpecs: state.data.techSpecs.filter((s) => s.id !== id),
      },
    })),

  updateTechSpec: (id, updates) =>
    set((state) => ({
      data: {
        ...state.data,
        techSpecs: state.data.techSpecs.map((s) =>
          s.id === id ? { ...s, ...updates } : s,
        ),
      },
    })),

  // ------ Methodology ------
  setMethodology: (updates) =>
    set((state) => ({
      data: {
        ...state.data,
        methodology: { ...state.data.methodology, ...updates },
      },
    })),

  // ------ Work packages ------
  addWorkPackage: () =>
    set((state) => {
      const wpCount = state.data.workPackages.length + 1;
      const workPackages = [
        ...state.data.workPackages,
        {
          id: uid(),
          title: `Work Package ${wpCount}`,
          durationWeeks: 4,
          objective: '',
          description: '',
          deliverables: [],
        },
      ];
      const totalWeeks = computeTotalWeeks(workPackages);
      return {
        data: {
          ...state.data,
          workPackages,
          planning: { ...state.data.planning, totalWeeks },
          budget: { ...state.data.budget, totalWeeks },
        },
      };
    }),

  removeWorkPackage: (id) =>
    set((state) => {
      const workPackages = state.data.workPackages.filter((wp) => wp.id !== id);
      const totalWeeks = computeTotalWeeks(workPackages);
      return {
        data: {
          ...state.data,
          workPackages,
          planning: { ...state.data.planning, totalWeeks },
          budget: { ...state.data.budget, totalWeeks },
        },
      };
    }),

  updateWorkPackage: (id, updates) =>
    set((state) => {
      const workPackages = state.data.workPackages.map((wp) =>
        wp.id === id ? { ...wp, ...updates } : wp,
      );
      const totalWeeks = computeTotalWeeks(workPackages);
      return {
        data: {
          ...state.data,
          workPackages,
          planning: { ...state.data.planning, totalWeeks },
          budget: { ...state.data.budget, totalWeeks },
        },
      };
    }),

  // ------ Team ------
  setTeam: (team) =>
    set((state) => ({ data: { ...state.data, team } })),

  addTeamMember: () =>
    set((state) => ({
      data: {
        ...state.data,
        team: [...state.data.team, { role: '', name: '', contact: '' }],
      },
    })),

  removeTeamMember: (index) =>
    set((state) => ({
      data: {
        ...state.data,
        team: state.data.team.filter((_, i) => i !== index),
      },
    })),

  // ------ Deliverables ------
  setDeliverables: (deliverables) =>
    set((state) => ({ data: { ...state.data, deliverables } })),

  // ------ Planning ------
  setPlanning: (updates) =>
    set((state) => ({
      data: {
        ...state.data,
        planning: { ...state.data.planning, ...updates },
      },
    })),

  // ------ Budget ------
  setBudget: (updates) =>
    set((state) => ({
      data: {
        ...state.data,
        budget: { ...state.data.budget, ...updates },
      },
    })),

  // ------ AI ------
  setAIConfig: (updates) =>
    set((state) => ({
      data: {
        ...state.data,
        ai: { ...state.data.ai, ...updates },
      },
    })),

  // ------ Reset ------
  resetAll: () => set({ data: { ...defaultProposalData } }),

  // ------ Computed ------
  totalBudget: () => {
    const { dailyRate, fteCount, totalWeeks } = get().data.budget;
    return totalWeeks * 5 * fteCount * dailyRate;
  },
}));
