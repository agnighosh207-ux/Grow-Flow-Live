import OpenAI from "openai";
import pino from "pino";
import crypto from "crypto";

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
  userId?: string; // Appended for tracking
  monthlyGenerationsUsed?: number; // Used for Economic Soft Cap
  temperature?: number;
  maxTokens?: number;
  language?: string;
}

// In-Memory Burst Tracker: userId -> Array of timestamps
const burstTracker = new Map<string, number[]>();

// Periodic Cleanup to prevent memory leaks (Flaw 6)
setInterval(() => {
  const now = Date.now();
  for (const [userId, history] of burstTracker.entries()) {
    const validHistory = history.filter(ts => (now - ts) < 10000);
    if (validHistory.length === 0) {
      burstTracker.delete(userId);
    } else {
      burstTracker.set(userId, validHistory);
    }
  }
}, 60000); // Evict stale users every 60 seconds

/**
 * Executes a fallback chain of LLM generation attempting 7 different providers.
 */
import { LANGUAGE_INSTRUCTIONS } from "../lib/languages";

export const generateContent = async ({
  messages,
  userPlan,
  userId = "anonymous",
  temperature = 0.7,
  maxTokens = 1000,
  monthlyGenerationsUsed = 0,
  language = "English",
}: GenerateContentOptions) => {
  // Phase 4 BOT-DETECTION BURST CHECK (3 reqs / 10s)
  if (userId !== "anonymous") {
    const now = Date.now();
    let history = burstTracker.get(userId) || [];
    
    // Clear timestamps older than 10 seconds
    history = history.filter(ts => (now - ts) < 10000);
    history.push(now);
    burstTracker.set(userId, history);
    
    // Cleanup burst tracker if it gets too large (Polish 5)
    if (burstTracker.size > 10000) {
      const cleanupNow = Date.now();
      for (const [key, timestamps] of burstTracker.entries()) {
        if (timestamps.every(ts => cleanupNow - ts > 60000)) burstTracker.delete(key);
      }
    }
    
    if (history.length >= 3) {
       logger.warn(`[SECURITY WARNING] Potential Script/Bot detected for User: ${userId}`);
       // Log to DB via import dynamically to prevent circular deps if needed
       import("@workspace/db").then(({ db, securityLogsTable }) => {
          db.insert(securityLogsTable).values({
             id: crypto.randomUUID(),
             userId,
             eventType: "SUSPICIOUS_SPEED",
             metadata: { warning: "3 requests in under 10 seconds" }
          }).catch(e => console.error("Burst log error:", e));
       });
    }
  }

  let isInfinity = userPlan === "INFINITY";

  // PHASE 1: AI ECONOMICS (The "Soft Cap")
  const usage = monthlyGenerationsUsed || 0;
  
  if (isInfinity) {
    if (usage >= 10000) {
      logger.warn(`[AI ECONOMICS] User ${userId} hit the BOT GATE (10k+). Forcing 5s artificial throttle.`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Flagging to db could happen here contextually
    } else if (usage >= 5000) {
      logger.info(`[AI ECONOMICS] User ${userId} deprioritized to 8B due to high volume (5k+).`);
      isInfinity = false; // Graceful fallback to 8B models to save rate limits
    }
  }

  // Provider Queue
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
      name: "SambaNova",
      apiKey: process.env.SAMBANOVA_API_KEY,
      baseURL: "https://api.sambanova.ai/v1", // Fallback URL commonly mapped with SambaNova
      model: isInfinity ? "Meta-Llama-3.3-70B-Instruct" : "Meta-Llama-3.1-8B-Instruct",
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
      model: isInfinity ? "meta-llama/llama-3.3-70b-instruct:free" : "meta-llama/llama-3.1-8b-instruct:free",
    },
    {
      name: "Gemini",
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      model: "gemini-1.5-flash", // Cost effective & highly tolerant 
    },
  ];

  let lastError: any = null;

  for (const provider of providers) {
    if (!provider.apiKey) {
      continue;
    }

    try {
      console.log(`[AI-ENGINE] Attempting generation. Language: ${language}, Provider: ${provider.name}`);
      // Inject language instructions aggressively into system AND final user message
      const langInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS] || "";
      let finalMessages = messages.map(m => ({ ...m })); // Deep copy messages to avoid mutation
      
      if (langInstruction) {
        const systemMsgIdx = finalMessages.findIndex(m => m.role === 'system');
        if (systemMsgIdx !== -1) {
          // Prepend to system message for maximum priority
          finalMessages[systemMsgIdx].content = `${langInstruction}\n\n${finalMessages[systemMsgIdx].content}`;
        } else {
          finalMessages.unshift({ role: 'system', content: langInstruction });
        }
        
        // Also append a "MANDATORY" reminder to the last user message
        const lastUserIdx = [...finalMessages].reverse().findIndex(m => m.role === 'user');
        if (lastUserIdx !== -1) {
          const idx = finalMessages.length - 1 - lastUserIdx;
          finalMessages[idx].content += `\n\nIMPORTANT: Use the language and script specified in the system prompt. DO NOT use English letters to write native words. Everything must be native.`;
        }
      }

      // Pass request
      const response = await client.chat.completions.create(
        {
          model: provider.model,
          messages: finalMessages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        },
        { timeout: 15000 } // Limit time spent per network attempt
      );

      // Success Logging
      logger.info(
        { provider: provider.name, model: provider.model },
        `[AI Fallback Engine] ✅ Success with: ${provider.name}`
      );

      return response;
    } catch (err: any) {
      // Error Logging
      logger.warn(
        `[AI Fallback Engine] ⚠️ ${provider.name} failed: ${err?.message || "Unknown error"}`
      );

      // Force minimum 800ms throttle before blasting the next node
      await new Promise((resolve) => setTimeout(resolve, 800));
      lastError = err;
    }
  }

  // Complete Failure Sequence
  logger.error("[AI Fallback Engine] ❌ ALL PROXY NETWORKS FAILED.");
  throw lastError || new Error("All AI providers temporarily unavailable.");
};
