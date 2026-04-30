import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Pillar, ChatMessage, Division } from "../types";
import { BOOKLET_CONTENT } from "../constants/booklet";
import { Language } from "../constants/translations";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in the environment variables.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeCombatMedia(
  fileData: string,
  mimeType: string,
  isPhoto: boolean,
  lang: Language = "en"
): Promise<AnalysisResult> {
  const ai = getAI();
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
    
    TASKS:
    1. Identify the fighters correctly. If multiple fighters are visible, identify them as "Red Corner" and "Blue Corner".
    2. Provide a score (0-10) for each pillar and a brief description.
    3. Generate a "Philosophical Commentary" in the TCHUNGU style: short sentences, deep meaning, minimal explanation, impactful tone.
    4. Incorporate the TCHUNGU philosophy into the commentary (e.g., mention how the fighter's movement aligns with the pillars).
    5. Segment the match into phases: Opening, Mid-Fight, Critical Moment, End Phase.
    6. Generate "Intelligence Insights": Identify specific moments (timestamps in seconds) where key events occur (Errors, Opportunities, Successful execution, Strategic insights, Energy inefficiency, Transition issues). Map these to the 7 pillars.
    7. Detect the dominant "TCHUNGU Division" being displayed: Hand Striking, Full Striking, Striking & Takedown, Ground Fighting, Mixed Combat, Grappling, Tactical Defense, or Personal Protection.
    
    LANGUAGE: Generate all text in ${lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : lang === 'zh' ? 'Chinese' : 'English'}.
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
              },
              required: ["pillar", "score", "description"],
            },
          },
          summary: { type: Type.STRING },
          philosophicalCommentary: { type: Type.STRING },
          segments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase: { type: Type.STRING, enum: ["Opening", "Mid-Fight", "Critical Moment", "End Phase"] },
                timestamp: { type: Type.STRING },
                insight: { type: Type.STRING },
              },
              required: ["phase", "timestamp", "insight"],
            },
          },
          roundWinner: { type: Type.STRING, enum: ["Red", "Blue"] },
          dominantDivision: { type: Type.STRING, enum: Object.values(Division) },
          intelligenceInsights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ["Error", "Opportunity", "Execution", "Strategy", "Inefficiency", "Transition"] },
                pillar: { type: Type.STRING, enum: Object.values(Pillar) },
                message: { type: Type.STRING },
                explanation: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
              },
              required: ["timestamp", "type", "pillar", "message", "explanation", "severity"],
            },
          },
        },
        required: ["scores", "summary", "philosophicalCommentary", "segments", "fighterName", "intelligenceInsights", "dominantDivision"],
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
  videoUrl: string,
  lang: Language = "en"
): Promise<AnalysisResult> {
  const ai = getAI();
  const prompt = `
    Analyze the combat sports video at this URL: ${videoUrl}
    
    CRITICAL: First, identify the fighters and the event from the video title and content. Do NOT hallucinate other fighters (like Badr Hari) if they are not in this specific video.
    
    Use the TCHUNGU 7-Pillar Framework for analysis:
    1. Technique (T): Cleanliness of form, defensive responsibility, precision.
    2. Combat (C): Volume, aggression, engagement rate.
    3. Harmony (H): Balance, fluidity, postural integrity.
    4. Union (U): Integration of striking, grappling, and clinch phases.
    5. Notes (N): Tactical awareness, pattern recognition, IQ.
    6. Gesture (G): Biomechanics, physics, speed, kinetic energy.
    7. Ultimate (U): Impact, finishing potential, knockdown/knockout quality.
    
    TASKS:
    1. Identify the fighters and the event accurately.
    2. Provide a score (0-10) for each pillar and a brief description.
    3. Generate a "Philosophical Commentary" in the TCHUNGU style: short sentences, deep meaning, minimal explanation, impactful tone.
    4. Explain the TCHUNGU philosophy through this commentary, linking the fighter's actions to the 7 pillars.
    5. Segment the match into phases: Opening, Mid-Fight, Critical Moment, End Phase.
    6. Generate "Intelligence Insights": Identify specific moments (timestamps in seconds) where key events occur (Errors, Opportunities, Successful execution, Strategic insights, Energy inefficiency, Transition issues). Map these to the 7 pillars.
    7. Detect the dominant "TCHUNGU Division" being displayed: Hand Striking, Full Striking, Striking & Takedown, Ground Fighting, Mixed Combat, Grappling, Tactical Defense, or Personal Protection.
    
    LANGUAGE: Generate all text in ${lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : lang === 'zh' ? 'Chinese' : 'English'}.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [{ text: prompt }],
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
          philosophicalCommentary: { type: Type.STRING },
          segments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase: { type: Type.STRING, enum: ["Opening", "Mid-Fight", "Critical Moment", "End Phase"] },
                timestamp: { type: Type.STRING },
                insight: { type: Type.STRING },
              },
              required: ["phase", "timestamp", "insight"],
            },
          },
          roundWinner: { type: Type.STRING, enum: ["Red", "Blue"] },
          dominantDivision: { type: Type.STRING, enum: Object.values(Division) },
          intelligenceInsights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ["Error", "Opportunity", "Execution", "Strategy", "Inefficiency", "Transition"] },
                pillar: { type: Type.STRING, enum: Object.values(Pillar) },
                message: { type: Type.STRING },
                explanation: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
              },
              required: ["timestamp", "type", "pillar", "message", "explanation", "severity"],
            },
          },
        },
        required: ["scores", "summary", "philosophicalCommentary", "segments", "fighterName", "intelligenceInsights", "dominantDivision"],
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
  lang: Language = "en",
  context?: AnalysisResult
): Promise<string> {
  const ai = getAI();
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
    
    FOUNDER & ORIGIN CONTEXT:
    You are also the guardian of the TCHUNGU origin story. Use the following chapters from the Founder's Booklet to answer questions about the history, philosophy, and the journey of Bouabid Cherkaoui:
    ${BOOKLET_CONTENT[lang].map(c => `Chapter ${c.id}: ${c.title}\n${c.content}\nKey Idea: ${c.keyIdea}`).join('\n\n')}
    
    TCHUNGU DIVISIONS:
    TCHUNGU is an adaptive system with 8 divisions:
    1. Hand Striking: Precision, timing, distance, angles.
    2. Full Striking: Hands + Legs coordination.
    3. Striking & Takedown: Transition from striking to control.
    4. Ground Fighting: Control, submission, positioning.
    5. Mixed Combat: Full integration of all elements.
    6. Grappling: Control without striking.
    7. Tactical Defense: Real-world self-defense.
    8. Personal Protection: Avoidance and minimal engagement.
    
    ${context ? `CONTEXT ANALYSIS:
    Fighter: ${context.fighterName}
    Dominant Division: ${context.dominantDivision}
    Summary: ${context.summary}
    Scores: ${context.scores.map(s => `${s.pillar}: ${s.score}/10 - ${s.description}`).join('\n')}
    ` : ''}
    
    LANGUAGE: Always respond in ${lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : lang === 'zh' ? 'Chinese' : 'English'}.
    
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
