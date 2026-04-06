import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Pillar, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeCombatMedia(
  fileData: string,
  mimeType: string,
  isPhoto: boolean
): Promise<AnalysisResult> {
  const prompt = `
    Analyze this combat sports ${isPhoto ? "photo" : "video"} using the TCHUNGU 7-Pillar Framework.
    
    The 7 pillars are:
    1. Technique (T): Cleanliness of form, defensive responsibility, precision.
    2. Combat (C): Volume, aggression, engagement rate.
    3. Harmony (H): Balance, fluidity, postural integrity.
    4. Union (U): Integration of striking, grappling, and clinch phases.
    5. Notes (N): Tactical awareness, pattern recognition, IQ.
    6. Gesture (G): Biomechanics, physics, speed, kinetic energy.
    7. Ultimate (U): Impact, finishing potential, knockdown/knockout quality.
    
    Provide a score (0-10) for each pillar, a brief description of why that score was given, and a summary of the overall performance.
    If multiple fighters are visible, identify them as "Red Corner" and "Blue Corner" and score the most prominent action.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: fileData.split(",")[1], // Remove the data:image/png;base64, prefix
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
              },
              required: ["pillar", "score", "description"],
            },
          },
          summary: { type: Type.STRING },
          roundWinner: { type: Type.STRING, enum: ["Red", "Blue"] },
        },
        required: ["scores", "summary"],
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
    
    Use the TCHUNGU 7-Pillar Framework for analysis:
    1. Technique (T): Cleanliness of form, defensive responsibility, precision.
    2. Combat (C): Volume, aggression, engagement rate.
    3. Harmony (H): Balance, fluidity, postural integrity.
    4. Union (U): Integration of striking, grappling, and clinch phases.
    5. Notes (N): Tactical awareness, pattern recognition, IQ.
    6. Gesture (G): Biomechanics, physics, speed, kinetic energy.
    7. Ultimate (U): Impact, finishing potential, knockdown/knockout quality.
    
    Provide a score (0-10) for each pillar, a brief description of why that score was given, and a summary of the overall performance.
    Identify the fighters and score the most prominent action.
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
              },
              required: ["pillar", "score", "description"],
            },
          },
          summary: { type: Type.STRING },
          roundWinner: { type: Type.STRING, enum: ["Red", "Blue"] },
        },
        required: ["scores", "summary"],
      },
    },
  });

  const result = JSON.parse(response.text || "{}");
  return {
    ...result,
    timestamp: new Date().toISOString(),
  };
}

export async function chatWithAICoach(
  message: string,
  history: ChatMessage[],
  context?: AnalysisResult
): Promise<string> {
  const systemInstruction = `
    You are the TCHUNGU AI Coach, a professional specialist in combat sports adjudication and fighter development.
    Your expertise is built on the 7-Pillar Framework:
    
    1. Technique (T): The mechanics of the body. How it moves, coordinates, and reaches goals. Understanding physical strength, joints, and internal energy (organs, nerves, muscles).
    2. Combat (C): Engagement, aggression, and the intelligent exploitation of weaknesses through deceptive movements.
    3. Harmony (H): Balance, fluidity, and postural integrity.
    4. Union (U): Integration of all fighting phases (striking, grappling, clinch).
    5. Notes (N): Tactical IQ, pattern recognition, and psychological warfare.
    6. Gesture (G): Biomechanics, physics, mathematics, and detailed engineering of energy extraction.
    7. Ultimate (U): The final objective, finishing potential, and achieving the peak of combat efficiency.
    
    Your goal is to explain these pillars in depth, providing detailed tracking of what is needed to develop specific skills.
    When an analysis is provided, focus on the gaps identified and provide actionable, intelligent advice based on physics, psychology, and martial arts science.
    
    ${context ? `CONTEXT ANALYSIS:
    Summary: ${context.summary}
    Scores: ${context.scores.map(s => `${s.pillar}: ${s.score}/10 - ${s.description}`).join('\n')}
    ` : ''}
    
    Be precise, professional, and encouraging. Use your knowledge of physics and engineering to explain body mechanics.
  `;

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text || "I'm sorry, I couldn't process that request.";
}
