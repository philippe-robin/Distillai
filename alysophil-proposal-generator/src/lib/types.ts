export type Language = 'fr' | 'en';

export interface ClientInfo {
  name: string;
  date: string; // proposal date
  reference: string; // e.g. "PR2404-0019"
  validity: string; // validity date
}

export interface TechSpec {
  id: string;
  text: string;
  included: boolean; // whether to include in proposal
  feasibility: 'green' | 'yellow' | 'red'; // color coding for feasibility
}

export interface WorkPackage {
  id: string;
  title: string;
  durationWeeks: number;
  objective: string;
  description: string;
  deliverables: string[];
}

export interface TeamMember {
  role: string;
  name: string;
  contact: string;
}

export interface Deliverable {
  title: string;
  format: string;
}

export interface PlanningConfig {
  startDate: string;
  vacationWeeks: number;
  totalWeeks: number; // auto-computed from WPs
}

export interface BudgetConfig {
  dailyRate: number; // €/day/FTE
  fteCount: number;
  totalWeeks: number; // from planning
  vatRate: number; // default 20%
}

export interface AIConfig {
  apiKey: string;
  mode: 'api' | 'clipboard';
}

export interface ProposalData {
  language: Language;
  client: ClientInfo;
  context: string; // rich text context
  need: string; // client need
  techSpecs: TechSpec[];
  methodology: {
    predictionDescription: string;
    generationDescription: string;
    challengesDescription: string;
    encouragingResearch: string;
    position: string;
  };
  workPackages: WorkPackage[];
  team: TeamMember[];
  deliverables: Deliverable[];
  planning: PlanningConfig;
  budget: BudgetConfig;
  ai: AIConfig;
}

export type AISkill = 'scientific' | 'marketing' | 'proposal';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}
