import { pgTable, text, timestamp, boolean, jsonb, integer, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userPlanEnum = pgEnum("user_plan", ["FREE", "STARTER", "CREATOR", "INFINITY"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  firstName: text("first_name"),
  razorpayCustomerId: text("razorpay_customer_id"),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  subscriptionStatus: text("subscription_status").notNull().default("free"),
  planType: text("plan_type").notNull().default("free"),
  planTier: userPlanEnum("plan_tier").notNull().default("FREE"),
  planExpiry: timestamp("plan_expiry", { withTimezone: true }),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  violationCount: integer("violation_count").notNull().default(0),
  securityFlags: jsonb("security_flags").$type<string[]>().default([]),
  trialStartDate: timestamp("trial_start_date", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  originalTrialStart: timestamp("original_trial_start", { withTimezone: true }),
  generationsRemaining: integer("generations_remaining").notNull().default(5),
  totalGenerations: integer("total_generations").notNull().default(0),
  lastCreditReset: timestamp("last_credit_reset", { withTimezone: true }).notNull().defaultNow(),
  isBetaUser: boolean("is_beta_user").notNull().default(false),
  billingCycleStart: timestamp("billing_cycle_start", { withTimezone: true }),
  billingPeriod: text("billing_period").default("monthly"),
  subscriptionAmount: integer("subscription_amount").default(0),
  toolTrials: jsonb("tool_trials").$type<Record<string, number>>().default({}),
  deviceId: text("device_id"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  productUpdates: boolean("product_updates").notNull().default(true),
  weeklyDigest: boolean("weekly_digest").notNull().default(true),
  marketingEmails: boolean("marketing_emails").notNull().default(false),
  referralCode: text("referral_code").unique(),
  referralUsedCode: text("referral_used_code"),
  hasSeenReferralPopup: boolean("has_seen_referral_popup").notNull().default(false),
  currentStreak: integer("current_streak").notNull().default(0),
  lastStreakDate: text("last_streak_date"),
  niche: text("niche"),
  tonePreference: text("tone_preference"),
  regionalLanguageLock: text("regional_language_lock"),
  languagePreference: text("language_preference").default("English"),
  platformPreference: text("platform_preference"),
  isFirstLogin: boolean("is_first_login").notNull().default(true),
  couponCode: text("coupon_code"),
  paymentFailedAt: timestamp("payment_failed_at", { withTimezone: true }),
  dunningReminderSentAt: timestamp("dunning_reminder_sent_at", { withTimezone: true }),
  streakRewardLastGrantedAt: timestamp("streak_reward_last_granted_at", { withTimezone: true }),
  voiceProfile: jsonb("voice_profile").$type<{
    sentenceStyle: string;
    vocabularyLevel: string;
    toneFingerprint: string;
    signaturePatterns: string[];
    openingStyle: string;
    closingStyle: string;
    uniqueTraits: string[];
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    generationsRemainingCheck: sql`CHECK (generations_remaining >= 0)`,
  };
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
