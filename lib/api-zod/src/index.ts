import * as api from "./generated/api";
import { z } from "zod";

export * from "./generated/api";

export type GenerateContentResponse = z.infer<typeof api.GenerateContentResponse>;
export type GenerateVariationsResponse = z.infer<typeof api.GenerateVariationsResponse>;
export type GetContentHistoryResponse = z.infer<typeof api.GetContentHistoryResponse>;
export type GetHistoryItemResponse = z.infer<typeof api.GetHistoryItemResponse>;
export type DeleteHistoryItemResponse = z.infer<typeof api.DeleteHistoryItemResponse>;
export type GetContentStatsResponse = z.infer<typeof api.GetContentStatsResponse>;

export type {
  ContentStats,
  ContentStatsPlatformBreakdown,
  GenerateContentBodyContentType,
  GenerateContentBodyLanguage,
  GenerateContentBodyTone,
  GeneratedContent,
  GeneratedHooks,
  GenerateHooksBodyTone,
  GenerateVariationsBodyContentType,
  GenerateVariationsBodyLanguage,
  GenerateVariationsBodyPlatform,
  GenerateVariationsBodyTone,
  GetContentHistoryParams,
  HealthStatus,
  HistoryItem,
  HistoryResponse,
  PlatformContent,
  PlatformContentInstagram,
  PlatformContentLinkedin,
  PlatformContentTwitter,
  PlatformContentYoutube
} from './generated/types';

export const IdeasResponseSchema = z.object({
  ideas: z.array(z.string())
});

export const StrategyResponseSchema = z.object({
  plan: z.array(z.object({
    day: z.number(),
    topic: z.string(),
    hook: z.string(),
    description: z.string(),
    format: z.string()
  }))
});

export const RepurposeResponseSchema = z.object({
  repurposedContent: z.string()
});

export const CaptionResponseSchema = z.object({
  diagnosis: z.object({
    mainIssue: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string())
  }),
  fullRewrite: z.object({
    caption: z.string(),
    changesMade: z.array(z.string()),
    whyItWorks: z.string()
  }),
  microEdit: z.object({
    caption: z.string(),
    changesMade: z.array(z.string())
  }),
  hookScore: z.object({
    original: z.number(),
    rewrite: z.number(),
    explanation: z.string()
  })
});

export const DailyResponseSchema = z.object({
  idea: z.string(),
  reasoning: z.string(),
  suggestedFormat: z.string(),
  hook: z.string()
});
