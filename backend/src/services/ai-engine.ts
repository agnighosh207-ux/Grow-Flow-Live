import OpenAI from "openai";
import pino from "pino";
import crypto from "crypto";
import { z } from "zod";
import { LANGUAGE_INSTRUCTIONS } from "../lib/languages";

const isProduction = process.env.NODE_ENV === "production" || process.env.APP_STATUS === "PRODUCTION";

const logger = pino({
  ...(isProduction ? {} : {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  })
});

export interface GenerateContentOptions {
  messages: any[];
  userPlan: string;
  userId?: string; 
  monthlyGenerationsUsed?: number;
  temperature?: number;
  maxTokens?: number;
  language?: string;
  zodSchema?: z.ZodSchema<any>;
}

// In-Memory Burst Tracker
const burstTracker = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();
  for (const [userId, history] of burstTracker.entries()) {
    const validHistory = history.filter(ts => (now - ts) < 10000);
    if (validHistory.length === 0) burstTracker.delete(userId);
    else burstTracker.set(userId, validHistory);
  }
}, 60000);

/**
 * Robust JSON extraction from AI string
 */
export function extractJson(text: string): any {
  if (!text) return null;
  
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Attempt to extract from markdown blocks or braces
    let jsonStr = text;
    
    // 1. Remove markdown code blocks if present
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    } else {
      // 2. Fallback to extracting anything between the first { and last }
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        jsonStr = braceMatch[0];
      }
    }

    try {
      return JSON.parse(jsonStr);
    } catch (innerErr) {
      // 3. Last ditch effort: basic cleaning of common LLM artifacts
      const cleaned = jsonStr
        .replace(/\\n/g, " ")
        .replace(/\s+/g, " ")
        .replace(/,\s*\}/g, "}") // trailing commas in objects
        .replace(/,\s*\]/g, "]"); // trailing commas in arrays
      
      try {
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  }
}

export const generateContent = async ({
  messages,
  userPlan,
  userId = "anonymous",
  temperature = 0.7,
  maxTokens = 1000,
  monthlyGenerationsUsed = 0,
  language = "English",
  zodSchema,
}: GenerateContentOptions) => {
  
  if (userId !== "anonymous") {
    const now = Date.now();
    let history = burstTracker.get(userId) || [];
    history = history.filter(ts => (now - ts) < 10000);
    history.push(now);
    burstTracker.set(userId, history);
    
    if (history.length >= 5) { // Relaxed slightly from 3
       logger.warn(`[SECURITY] High burst for User: ${userId}`);
    }
  }

  let isInfinity = userPlan.toUpperCase() === "INFINITY";
  const usage = monthlyGenerationsUsed || 0;
  
  if (isInfinity) {
    if (usage >= 10000) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else if (usage >= 8000) {
      isInfinity = false; // Economic fallback
    }
  }

  const providers = [
    {
      name: "Groq Primary",
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      model: isInfinity ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant",
    },
    {
      name: "Groq Secondary",
      apiKey: process.env.GROQ_API_KEY_SECONDARY,
      baseURL: "https://api.groq.com/openai/v1",
      model: isInfinity ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant",
    },
    {
      name: "Together AI",
      apiKey: process.env.TOGETHER_API_KEY || process.env.TOGETHER_AI_API_KEY,
      baseURL: "https://api.together.xyz/v1",
      model: isInfinity ? "meta-llama/Llama-3.3-70B-Instruct-Turbo" : "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    },
    {
      name: "Cerebras",
      apiKey: process.env.CEREBRAS_API_KEY,
      baseURL: "https://api.cerebras.ai/v1",
      model: isInfinity ? "llama-3.3-70b" : "llama3.1-8b",
    },
    {
      name: "OpenRouter",
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      model: isInfinity ? "meta-llama/llama-3.3-70b-instruct" : "meta-llama/llama-3.1-8b-instruct",
    },
    {
      name: "Gemini",
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      model: "gemini-1.5-flash",
    },
    {
      name: "SambaNova",
      apiKey: process.env.SAMBANOVA_API_KEY,
      baseURL: "https://api.sambanova.ai/v1",
      model: isInfinity ? "Meta-Llama-3.1-70B-Instruct" : "Meta-Llama-3.1-8B-Instruct",
    },
    {
       name: "Groq Llama 3.1 70B",
       apiKey: process.env.GROQ_API_KEY,
       baseURL: "https://api.groq.com/openai/v1",
       model: "llama-3.1-70b-versatile",
    }
  ];

  let lastError: any = null;

  for (const provider of providers) {
    if (!provider.apiKey) continue;

    const client = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL });

    // Each provider gets up to 2 attempts if JSON parsing fails
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const langInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS] || "";
        let finalMessages = messages.map(m => ({ ...m }));
        
        if (langInstruction) {
          const systemMsgIdx = finalMessages.findIndex(m => m.role === 'system');
          if (systemMsgIdx !== -1) {
            finalMessages[systemMsgIdx].content = `${langInstruction}\n\n${finalMessages[systemMsgIdx].content}`;
          } else {
            finalMessages.unshift({ role: 'system', content: langInstruction });
          }
        }

        const response = await client.chat.completions.create(
          {
            model: provider.model,
            messages: finalMessages,
            temperature: attempt > 0 ? 0.3 : temperature, // Reduce temp on retry for stability
            max_tokens: maxTokens,
            response_format: zodSchema ? { type: "json_object" } : undefined,
          },
          { timeout: 60000 }
        );

        const content = response.choices[0]?.message?.content || "";
        
        if (zodSchema) {
          const parsed = extractJson(content);
          if (!parsed) throw new Error("JSON_PARSE_FAILED");
          
          const validated = zodSchema.safeParse(parsed);
          if (!validated.success) {
             logger.warn({ errors: validated.error.errors }, "Zod validation failed");
             throw new Error("SCHEMA_VALIDATION_FAILED");
          }
          return response; // We return the full response so caller can get content
        }

        return response;
      } catch (err: any) {
        lastError = err;
        logger.warn(`[AI-ENGINE] ${provider.name} attempt ${attempt + 1} failed: ${err.message}`);
        
        if (err.message === "JSON_PARSE_FAILED" || err.message === "SCHEMA_VALIDATION_FAILED") {
          continue; // Try again with same provider (reduced temp)
        }
        break; // Network/API error, move to next provider
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw lastError || new Error("AI engine exhausted all providers.");
};
 
