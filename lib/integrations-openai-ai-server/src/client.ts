import OpenAI from "openai";

const groqApiKey1 = process.env.GROQ_API_KEY;
const groqApiKey2 = process.env.GROQ_API_KEY_SECONDARY;
const cerebrasApiKey = process.env.CEREBRAS_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

const providers = [
  { name: "Groq Primary", apiKey: groqApiKey1, baseURL: "https://api.groq.com/openai/v1", modelMap: (m: string) => m.includes("70b") ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant" },
  { name: "Groq Secondary", apiKey: groqApiKey2, baseURL: "https://api.groq.com/openai/v1", modelMap: (m: string) => m.includes("70b") ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant" },
  { name: "Cerebras AI", apiKey: cerebrasApiKey, baseURL: "https://api.cerebras.ai/v1", modelMap: (m: string) => m.includes("70b") ? "llama3.1-70b" : "llama3.1-8b" },
  { name: "Gemini", apiKey: geminiApiKey, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", modelMap: (m: string) => "gemini-1.5-flash" },
  { name: "OpenAI", apiKey: openaiApiKey, baseURL: "https://api.openai.com/v1", modelMap: (m: string) => m }
];

export const openai = new OpenAI({ apiKey: openaiApiKey || undefined }) as any;

const originalCreate = openai.chat.completions.create.bind(openai.chat.completions);

openai.chat.completions.create = async (options: any, requestOptions?: any) => {
  let lastError: any = null;
  
  for (const provider of providers) {
    if (!provider.apiKey) continue;
    
    try {
      console.log(`[AI Fallback Engine] Attempting generation via: ${provider.name}`);
      const client = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL });
      
      const providerOptions = { ...options };
      if (provider.modelMap && providerOptions.model) {
        providerOptions.model = provider.modelMap(providerOptions.model);
      }
      
      const response = await client.chat.completions.create(providerOptions, requestOptions);
      console.log(`[AI Fallback Engine] ✅ Success with: ${provider.name}`);
      return response;
    } catch (err: any) {
      console.error(`[AI Fallback Engine] ⚠️ ${provider.name} failed:`, err?.message || "Unknown error");
      // Throttle quickly before falling back
      await new Promise(resolve => setTimeout(resolve, 800));
      lastError = err;
      continue;
    }
  }
  
  console.error("[AI Fallback Engine] ❌ ALL PROXY NETWORKS FAILED.");
  if (!providers.some(provider => provider.apiKey)) {
    throw new Error(
      "No AI provider is configured. Please set one of GROQ_API_KEY, GROQ_API_KEY_SECONDARY, CEREBRAS_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY."
    );
  }
  throw lastError || new Error("All AI providers temporarily unavailable.");
};
