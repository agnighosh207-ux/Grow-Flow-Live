import OpenAI from "openai";
import pino from "pino";
import { z } from "zod";
import { LANGUAGE_INSTRUCTIONS } from "../lib/languages";

import { IS_PRODUCTION } from "../lib/env";

const isProduction = IS_PRODUCTION;

const logger = pino({
  ...(isProduction ? {} : {
    transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss Z", ignore: "pid,hostname" } }
  })
});

export interface GenerateContentOptions {
  messages: any[];
  userPlan?: string;
  userId?: string;
  monthlyGenerationsUsed?: number;
  temperature?: number;
  maxTokens?: number;
  language?: string;
  zodSchema?: z.ZodSchema<any>;
  forceJsonMode?: boolean;
  signal?: AbortSignal;
  useWebSearch?: boolean; // NEW: explicitly request web search mode
}

export function extractJson(text: string): any {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1]); } catch {} }
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) {
    try { return JSON.parse(brace[0]); } catch {}
    try { return JSON.parse(brace[0].replace(/,\s*([}\]])/g, '$1').replace(/\s+/g, ' ')); } catch {}
  }
  return null;
}

// ── Single OpenRouter client for both Perplexity and Gemini ──────────────────
const GEMINI_MODEL = process.env.GEMINI_MODEL_OVERRIDE || "google/gemini-flash-1.5";

const openRouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.PERPLEXITY_AI_API || "",
  defaultHeaders: {
    "HTTP-Referer": "https://growflowai.space",
    "X-Title": "GrowFlow AI",
    "OR-Organization": "growflowai",  // Add this for better rate limits
  },
  timeout: 30000,
  maxRetries: 0,
});

// ── Groq fallback clients ────────────────────────────────────────────────────
const groqPrimary = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
  timeout: 25000,
  maxRetries: 0,
});

const groqSecondary = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY_SECONDARY || process.env.GROQ_API_KEY || "",
  timeout: 25000,
  maxRetries: 0,
});

export const validateAIConfig = () => {
  const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY || process.env.PERPLEXITY_AI_API);
  const hasGroq = !!process.env.GROQ_API_KEY;
  if (!hasOpenRouter) logger.error("[AI] CRITICAL: OPENROUTER_API_KEY missing — Perplexity and Gemini won't work");
  if (!hasGroq) logger.error("[AI] CRITICAL: GROQ_API_KEY missing — fallback won't work");
  if (hasOpenRouter && hasGroq) logger.info("[AI] Config OK: OpenRouter (Perplexity+Gemini) + Groq fallback ready ✓");
};

// ── WEB SEARCH via Perplexity Sonar ─────────────────────────────────────────
export async function webSearch(query: string, signal?: AbortSignal): Promise<string> {
  try {
    const response = await openRouterClient.chat.completions.create({
      model: "perplexity/sonar",
      messages: [
        {
          role: "system",
          content: "You are a real-time web researcher. Fetch the most current trending data, statistics, and facts from the internet for the given query. Return ONLY dense factual summary in max 300 words. No formatting, no social media style."
        },
        { role: "user", content: query }
      ],
      max_tokens: 800,
      temperature: 0.1,
    }, { signal: signal as any });
    return response.choices[0]?.message?.content || "";
  } catch (err: any) {
    logger.warn({ err: err.message }, "[PERPLEXITY] Web search failed — continuing without live data");
    return "";
  }
}

// ── WRITING via Gemini 1.5 Flash → Groq fallback ────────────────────────────
export const generateContent = async ({
  messages,
  userPlan = "free",
  userId = "anonymous",
  temperature = 0.7,
  maxTokens = 1000,
  language = "English",
  zodSchema,
  forceJsonMode,
  signal,
  useWebSearch = false,
}: GenerateContentOptions) => {
  
  const langInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS] || "";
  
  // Apply language instruction to system message
  let finalMessages = messages.map(m => {
    if (typeof m.content === 'string' && m.content.length > 20000) {
      return { ...m, content: m.content.substring(0, 20000) + "... [TRUNCATED]" };
    }
    return m;
  });
  
  if (langInstruction) {
    const sysIdx = finalMessages.findIndex(m => m.role === 'system');
    if (sysIdx !== -1) {
      // Add at END of system message so it overrides earlier instructions
      finalMessages[sysIdx] = { 
        ...finalMessages[sysIdx], 
        content: `${finalMessages[sysIdx].content}\n\n⚠️ MANDATORY LANGUAGE OVERRIDE — HIGHEST PRIORITY:\n${langInstruction}\nThis language instruction OVERRIDES all previous tone/style instructions. The ENTIRE response must be in the specified language and script.`
      };
    } else {
      finalMessages.unshift({ role: 'system', content: langInstruction });
    }
    // Also reinforce in the last user message
    const lastUserIdx = finalMessages.map(m => m.role).lastIndexOf('user');
    if (lastUserIdx !== -1) {
      finalMessages[lastUserIdx] = {
        ...finalMessages[lastUserIdx],
        content: `${finalMessages[lastUserIdx].content}\n\n[LANGUAGE REMINDER: Write your ENTIRE response in ${language} only. Do NOT use English unless ${language} is English.]`
      };
    }
  }

  const jsonMode = (zodSchema || forceJsonMode) ? { response_format: { type: "json_object" as const } } : {};

  // ── TIER 1: Gemini via OpenRouter ──────────────────────────────
  try {
    if (signal?.aborted) throw new Error("ABORTED");
    const response = await openRouterClient.chat.completions.create({
      model: GEMINI_MODEL,
      messages: finalMessages,
      temperature,
      max_tokens: maxTokens,
      ...jsonMode,
    }, { signal: signal as any });
    
    if (zodSchema) {
      const parsed = extractJson(response.choices[0]?.message?.content || "");
      if (!parsed) throw new Error("JSON_PARSE_FAILED");
      const validated = zodSchema.safeParse(parsed);
      if (!validated.success) throw new Error("SCHEMA_VALIDATION_FAILED");
    }
    logger.debug({ userId, model: GEMINI_MODEL }, "[AI] Generated via Gemini");
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message === 'ABORTED') throw err;
    logger.warn({ userId, err: err.message }, "[AI] Gemini failed, trying Groq primary");
  }

  // ── TIER 2: Groq Primary fallback ────────────────────────────────────────
  try {
    if (signal?.aborted) throw new Error("ABORTED");
    const isInfinity = userPlan?.toUpperCase() === "INFINITY";
    const groqModel = isInfinity ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant";
    const response = await groqPrimary.chat.completions.create({
      model: groqModel,
      messages: finalMessages,
      temperature,
      max_tokens: maxTokens,
      ...jsonMode,
    }, { signal: signal as any });
    
    if (zodSchema) {
      const parsed = extractJson(response.choices[0]?.message?.content || "");
      if (!parsed) throw new Error("JSON_PARSE_FAILED");
      const validated = zodSchema.safeParse(parsed);
      if (!validated.success) throw new Error("SCHEMA_VALIDATION_FAILED");
    }
    logger.info({ userId, model: groqModel }, "[AI] Generated via Groq primary");
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message === 'ABORTED') throw err;
    logger.warn({ userId, err: err.message }, "[AI] Groq primary failed, trying Groq secondary");
  }

  // ── TIER 3: Groq Secondary (different model for rate limit diversity) ─────
  try {
    if (signal?.aborted) throw new Error("ABORTED");
    // Use DIFFERENT model than primary to avoid same rate limit bucket
    const groqSecondaryModel = "llama-3.1-8b-instant"; // Always 8B for secondary
    const response = await groqSecondary.chat.completions.create({
      model: groqSecondaryModel,
      messages: finalMessages,
      temperature: Math.max(0.3, temperature - 0.1), // Slightly lower temp for reliability
      max_tokens: Math.min(maxTokens, 2000), // Reduce tokens to improve success rate
      ...jsonMode,
    }, { signal: signal as any });
    logger.info({ userId, model: groqSecondaryModel }, "[AI] Generated via Groq secondary");
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message === 'ABORTED') throw err;
    logger.error({ userId, err: err.message }, "[AI] ALL providers failed");
  }

  // ── TIER 4: Emergency minimal response ────────────────────────────────────
  // When all AI providers fail, return a helpful error instead of crashing
  throw new Error("ALL_PROVIDERS_FAILED");
};
