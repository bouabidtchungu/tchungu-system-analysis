import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Pillar } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeCombatMedia(
  fileData: string,
  mimeType: string,
  isPhoto: boolean
): Promise<AnalysisResult> {
    const prompt = `
    Analyze this combat sports ${isPhoto ? "photo" : "video"} using the TCHUNGU Hierarchical Analysis Model.
    
    CRITICAL INSTRUCTIONS:
    1. FIGHTER IDENTIFICATION: Focus precisely on the person in the media. Observe their movements and skills.
    2. NO HALLUCINATIONS: Do NOT assign names that do not exist or are not explicitly confirmed in the video. If the name is not certain, identify the fighter by what they are wearing (e.g., "Fighter in Red Shorts", "Fighter in Black Gloves").
    3. NO BIAS: Do NOT base analysis on personalities mentioned in commentary (e.g., if a commentator mentions Tyson while showing a different fighter, ignore Tyson and focus on the person on screen).
    4. METICULOUS ANALYSIS: Every skill must be assigned its appropriate representation within the 7 pillars and their branches. Every movement has implications that must be analyzed meticulously.
    5. OBJECTIVE ADJUDICATION: Act as a precise, objective adjudicator with skills beyond human judges. Focus on biomechanical physics and neural combat data.
    6. COACH-LEVEL DEPTH: Provide an in-depth analysis that would be convincing to a professional coach. Detail movements, reactions, and all other specifics down to the smallest detail.
    
    The 7 pillars are:
    1. Technique (T): Mechanics (stability, COG), Execution (accuracy, efficiency), Timing, Distance, Angles, Reflex.
    2. Combat (C): Strategy detection, Pressure response, Initiative control, Cage/ring control, Adaptation, Effectiveness.
    3. Harmony (H): Flow continuity, Energy efficiency, Rhythm detection, Balance in motion, Resistance vs redirection.
    4. Union (U): Decision speed, Cognitive-motor synchronization, Hesitation detection, Awareness consistency.
    5. Nodes (N): Strategic targeting, Anatomical vulnerability mapping, High-value strike zones, Critical control points.
    6. Gestuelle (G): Psychological presence, Non-verbal deception, Feints effectiveness, Body language impact.
    7. Ultimate (U): Flow state detection, Instinctive behavior ratio, Total adaptation index, Performance peak zones.
    
    For EACH pillar, provide a score (0-10) and decompose it into its primary components and sub-components as defined in the TCHUNGU expansion system.
    Provide a detailed, evidence-based description for each pillar and its components.
    
    Also include:
    - A summary of the overall performance.
    - 3-5 tactical insights.
    - Top 3 strengths and top 3 weaknesses.
    - A list of KEY MOVEMENTS with specific timestamps (if video), describing the movement, the opponent's reaction, and the impact on the fight.
    
    If multiple fighters are visible, identify them as "Red Corner" and "Blue Corner" (or by clothing color) and score the most prominent action.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: fileData.split(",")[1],
              mimeType: mimeType,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fighterName: { type: Type.STRING },
          scores: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pillar: { type: Type.STRING, enum: Object.values(Pillar) },
                score: { type: Type.NUMBER },
                description: { type: Type.STRING },
                components: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      subComponents: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            score: { type: Type.NUMBER },
                            description: { type: Type.STRING },
                          },
                          required: ["name", "score", "description"],
                        },
                      },
                    },
                    required: ["name", "score", "subComponents"],
                  },
                },
              },
              required: ["pillar", "score", "description", "components"],
            },
          },
          summary: { type: Type.STRING },
          roundWinner: { type: Type.STRING, enum: ["Red", "Blue"] },
          tacticalInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyMovements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.STRING },
                movement: { type: Type.STRING },
                reaction: { type: Type.STRING },
                pillar: { type: Type.STRING, enum: Object.values(Pillar) },
                impact: { type: Type.STRING },
              },
              required: ["timestamp", "movement", "reaction", "pillar", "impact"],
            },
          },
        },
        required: ["scores", "summary", "tacticalInsights", "strengths", "weaknesses", "keyMovements"],
      },
    },
  });

  const result = JSON.parse(response.text || "{}");
  return {
    ...result,
    timestamp: new Date().toISOString(),
  };
}

export async function analyzeCombatVideoUrl(
  videoUrl: string
): Promise<AnalysisResult> {
    const prompt = `
    Analyze the combat sports video at this URL: ${videoUrl}
    
    CRITICAL INSTRUCTIONS:
    1. FIGHTER IDENTIFICATION: Focus precisely on the person in the video. Observe their movements and skills.
    2. NO HALLUCINATIONS: Do NOT assign names that do not exist or are not explicitly confirmed in the video. If the name is not certain, identify the fighter by what they are wearing (e.g., "Fighter in Red Shorts", "Fighter in Black Gloves").
    3. NO BIAS: Do NOT base analysis on personalities mentioned in commentary (e.g., if a commentator mentions Tyson while showing a different fighter, ignore Tyson and focus on the person on screen).
    4. METICULOUS ANALYSIS: Every skill must be assigned its appropriate representation within the 7 pillars and their branches. Every movement has implications that must be analyzed meticulously.
    5. OBJECTIVE ADJUDICATION: Act as a precise, objective adjudicator with skills beyond human judges. Focus on biomechanical physics and neural combat data.
    6. COACH-LEVEL DEPTH: Provide an in-depth analysis that would be convincing to a professional coach. Detail movements, reactions, and all other specifics down to the smallest detail.
    
    Use the TCHUNGU Hierarchical Analysis Model:
    1. Technique (T): Mechanics (stability, COG), Execution (accuracy, efficiency), Timing, Distance, Angles, Reflex.
    2. Combat (C): Strategy detection, Pressure response, Initiative control, Cage/ring control, Adaptation, Effectiveness.
    3. Harmony (H): Flow continuity, Energy efficiency, Rhythm detection, Balance in motion, Resistance vs redirection.
    4. Union (U): Decision speed, Cognitive-motor synchronization, Hesitation detection, Awareness consistency.
    5. Nodes (N): Strategic targeting, Anatomical vulnerability mapping, High-value strike zones, Critical control points.
    6. Gestuelle (G): Psychological presence, Non-verbal deception, Feints effectiveness, Body language impact.
    7. Ultimate (U): Flow state detection, Instinctive behavior ratio, Total adaptation index, Performance peak zones.
    
    For EACH pillar, provide a score (0-10) and decompose it into its primary components and sub-components.
    Provide a detailed, evidence-based description for each pillar and its components.
    
    Also include:
    - A summary of the overall performance.
    - 3-5 tactical insights.
    - Top 3 strengths and top 3 weaknesses.
    - A list of KEY MOVEMENTS with specific timestamps, describing the movement, the opponent's reaction, and the impact on the fight.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }, { urlContext: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fighterName: { type: Type.STRING },
          scores: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pillar: { type: Type.STRING, enum: Object.values(Pillar) },
                score: { type: Type.NUMBER },
                description: { type: Type.STRING },
                components: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      subComponents: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            score: { type: Type.NUMBER },
                            description: { type: Type.STRING },
                          },
                          required: ["name", "score", "description"],
                        },
                      },
                    },
                    required: ["name", "score", "subComponents"],
                  },
                },
              },
              required: ["pillar", "score", "description", "components"],
            },
          },
          summary: { type: Type.STRING },
          roundWinner: { type: Type.STRING, enum: ["Red", "Blue"] },
          tacticalInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyMovements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.STRING },
                movement: { type: Type.STRING },
                reaction: { type: Type.STRING },
                pillar: { type: Type.STRING, enum: Object.values(Pillar) },
                impact: { type: Type.STRING },
              },
              required: ["timestamp", "movement", "reaction", "pillar", "impact"],
            },
          },
        },
        required: ["scores", "summary", "tacticalInsights", "strengths", "weaknesses", "keyMovements"],
      },
    },
  });

  const result = JSON.parse(response.text || "{}");
  return {
    ...result,
    timestamp: new Date().toISOString(),
  };
}
