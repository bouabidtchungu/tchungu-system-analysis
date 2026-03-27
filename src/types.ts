export enum Pillar {
  TECHNIQUE = "Technique",
  COMBAT = "Combat",
  HARMONY = "Harmony",
  UNION = "Union",
  NODES = "Nodes",
  GESTUELLE = "Gestuelle",
  ULTIMATE = "Ultimate",
}

export interface SubComponentScore {
  name: string;
  score: number; // 0-10
  description: string;
}

export interface ComponentScore {
  name: string;
  score: number; // 0-10
  subComponents: SubComponentScore[];
}

export interface PillarScore {
  pillar: Pillar;
  score: number; // 0-10
  description: string;
  components: ComponentScore[];
}

export interface KeyMovement {
  timestamp: string; // e.g., "0:45"
  movement: string;
  reaction: string;
  pillar: Pillar;
  impact: string;
}

export interface AnalysisResult {
  id?: string;
  fighterId?: string;
  scores: PillarScore[];
  summary: string;
  roundWinner?: "Red" | "Blue";
  timestamp: string;
  ownerId?: string;
  tacticalInsights?: string[];
  strengths?: string[];
  weaknesses?: string[];
  keyMovements?: KeyMovement[];
}

export interface Fighter {
  id?: string;
  name: string;
  stance: "Orthodox" | "Southpaw" | "Switch";
  reach?: number;
  height?: number;
  weight?: number;
  record?: {
    wins: number;
    losses: number;
    draws: number;
  };
  ownerId: string;
  createdAt: string;
  notes?: string;
  photoUrl?: string;
}
