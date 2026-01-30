import { GoogleGenAI, Type } from "@google/genai";
import { ElementType, GeneratedComponentConfig } from "../types";

const STORAGE_KEY = "gemini_api_key";

export const getStoredApiKey = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  const key = window.localStorage.getItem(STORAGE_KEY);
  return key || undefined;
};

export const setStoredApiKey = (key?: string) => {
  if (typeof window === "undefined") return;
  if (!key) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, key);
  }
};

// UI Config Generation
export const generateComponentConfig = async (prompt: string): Promise<GeneratedComponentConfig | null> => {
  const apiKey = getStoredApiKey();
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a custom HTML/CSS animated component based on this description: "${prompt}".
      
      Requirements:
      1. Return valid HTML in the 'html' field. Do not include the outer container, just the inner elements.
      2. Return valid CSS in the 'css' field. 
         - **CRITICAL**: Use the class selector ".root" for the main container of your component.
         - You can include @keyframes for animations.
         - Ensure the component is responsive (width/height: 100%) to fit its parent.
      3. The type should be "AI_GENERATED".
      
      Example Prompt: "A red pulsing circle"
      Example Output: { "html": "<div class='circle'></div>", "css": ".root { display:flex; align-items:center; justify-content:center; } .root .circle { width: 50px; height: 50px; background: red; border-radius: 50%; animation: pulse 1s infinite; } @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }", "name": "Red Pulsing Circle", "type": "AI_GENERATED" }
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: [ElementType.AI_GENERATED],
              description: "Always return AI_GENERATED"
            },
            name: {
              type: Type.STRING,
              description: "A short descriptive name for the layer"
            },
            html: {
              type: Type.STRING,
              description: "The HTML string for the component"
            },
            css: {
              type: Type.STRING,
              description: "The CSS string for the component, using .root as the main wrapper class"
            }
          }
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      // Map the flat result to our structure
      return {
          type: ElementType.AI_GENERATED,
          name: result.name,
          props: {
              html: result.html,
              customCss: result.css,
              backgroundColor: 'transparent' // Default to transparent so the component controls bg
          }
      };
    }
    return null;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return null;
  }
};

// Image Generation (Nano Banana)
export const generateImage = async (prompt: string): Promise<string | null> => {
    const apiKey = getStoredApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: { aspectRatio: "16:9" }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
             if (part.inlineData) {
                 return `data:image/png;base64,${part.inlineData.data}`;
             }
        }
        return null;
    } catch (e) {
        console.error("Image Gen Error", e);
        return null;
    }
};
