import OpenAI from "openai";
import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  },
});

export interface GenerateContentOptions {
  messages: any[];
  userPlan: string;
  userId?: string; // Appended for tracking
  monthlyGenerationsUsed?: number; // Used for Economic Soft Cap
  temperature?: number;
  maxTokens?: number;
}

// In-Memory Burst Tracker: userId -> Array of timestamps
const burstTracker = new Map<string, number[]>();

/**
 * Executes a fallback chain of LLM generation attempting 7 different providers.
 */
export const generateContent = async ({
  messages,
  userPlan,
  userId = "anonymous",
  temperature = 0.7,
  maxTokens = 1000,
  monthlyGenerationsUsed = 0,
}: GenerateContentOptions) => {
  // Phase 4 BOT-DETECTION BURST CHECK (3 reqs / 10s)
  if (userId !== "anonymous") {
    const now = Date.now();
    let history = burstTracker.get(userId) || [];
    
    // Clear timestamps older than 10 seconds
    history = history.filter(ts => (now - ts) < 10000);
    history.push(now);
    burstTracker.set(userId, history);
    
    if (history.length >= 3) {
       logger.warn(`[SECURITY WARNING] Potential Script/Bot detected for User: ${userId}`);
       // Log to DB via import dynamically to prevent circular deps if needed
       import("@workspace/db").then(({ db, securityLogsTable }) => {
          const crypto = require("crypto");
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
      // Connect to the provider utilizing OpenAI Standard Compatibility
      const client = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseURL,
      });

      // Pass request
      const response = await client.chat.completions.create(
        {
          model: provider.model,
          messages,
          temperature,
          max_tokens: maxTokens,
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
