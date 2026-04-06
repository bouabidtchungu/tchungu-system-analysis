export enum Pillar {
  TECHNIQUE = "Technique",
  COMBAT = "Combat",
  HARMONY = "Harmony",
  UNION = "Union",
  NOTES = "Notes",
  GESTURE = "Gesture",
  ULTIMATE = "Ultimate",
}

export interface PillarScore {
  pillar: Pillar;
  score: number; // 0-10
  description: string;
}

export interface AnalysisResult {
  id?: string;
  fighterId?: string;
  scores: PillarScore[];
  summary: string;
  roundWinner?: "Red" | "Blue";
  timestamp: string;
  ownerId?: string;
  mediaUrl?: string; // Added for context
}

export interface ChatMessage {
  id?: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  analysisId?: string; // Optional context
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
