import OpenAI from "openai";
import { logger } from "../lib/logger";

/**
 * GrowFlow AI - Perplexity RAG Service
 * Fetches live web data via OpenRouter/Perplexity with aggressive caching
 */

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.PERPLEXITY_AI_API,
  defaultHeaders: {
    "HTTP-Referer": "https://growflow.ai", // Required by OpenRouter for ranking
    "X-Title": "GrowFlow AI",
  },
});

// Aggressive Global Cache: TTL 30 minutes (1,800,000 ms)
const CACHE_TTL = 1800000;
const searchCache = new Map<string, { data: string; timestamp: number }>();
const MAX_CACHE_SIZE = 200;

function pruneCache() {
  if (searchCache.size <= MAX_CACHE_SIZE) return;
  // Delete oldest entries (Map iterates in insertion order)
  const deleteCount = searchCache.size - MAX_CACHE_SIZE;
  let deleted = 0;
  for (const key of searchCache.keys()) {
    if (deleted >= deleteCount) break;
    searchCache.delete(key);
    deleted++;
  }
}

/**
 * Fetches live web context for a specific niche and topic.
 * Uses cache-first strategy to maximize profitability and speed.
 */
export async function fetchLiveContext(niche: string, topic?: string): Promise<string> {
  const cleanNiche = niche.toLowerCase().trim();
  const cleanTopic = topic?.toLowerCase().trim() || "general";
  const cacheKey = `${cleanNiche}:${cleanTopic}`;

  // 1. Check Cache (Cost = $0)
  const cachedEntry = searchCache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    return cachedEntry.data;
  }

  // 2. Fetch Live Data via Perplexity
  try {
    const response = await client.chat.completions.create({
      model: "perplexity/sonar",
      messages: [
        {
          role: "system",
          content: "You are an elite live-web researcher. Fetch the most current, trending, and factual data regarding the user's niche and topic from the live internet. Return ONLY a dense, raw summary of facts, statistics, and breaking trends. Maximum 300 words. Do not format as a social media post."
        },
        {
          role: "user",
          content: `NICHE: ${niche}\nTOPIC: ${topic || "General Trends"}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.2, // Low temperature for factual consistency
    });

    const result = response.choices[0]?.message?.content || "";

    // 3. Update Cache
    if (result) {
      searchCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
      pruneCache();
    }

    return result;
  } catch (error: any) {
    // 4. Graceful Fallback (Protect downstream generators)
    logger.error({ error: error?.message || "Unknown error", niche, topic }, "[PERPLEXITY-SERVICE] Failure");
    return "";
  }
}

/**
 * Optional: Manual cache invalidation for testing or force-refresh
 */
export function invalidateSearchCache(niche: string, topic?: string) {
  const cacheKey = `${niche.toLowerCase().trim()}:${topic?.toLowerCase().trim() || "general"}`;
  searchCache.delete(cacheKey);
}
