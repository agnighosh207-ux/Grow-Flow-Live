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

