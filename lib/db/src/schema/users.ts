import { pgTable, text, timestamp, boolean, jsonb, integer, pgEnum } from "drizzle-orm/pg-core";

export const userPlanEnum = pgEnum("user_plan", ["FREE", "STARTER", "CREATOR", "INFINITY"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  razorpayCustomerId: text("razorpay_customer_id"),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  subscriptionStatus: text("subscription_status").notNull().default("free"),
  planType: text("plan_type").notNull().default("free"),
  planTier: userPlanEnum("plan_tier").notNull().default("FREE"),
  planExpiry: timestamp("plan_expiry", { withTimezone: true }),
  isBanned: boolean("is_banned").notNull().default(false),
  violationCount: integer("violation_count").notNull().default(0),
  securityFlags: jsonb("security_flags").$type<string[]>().default([]),
  trialStartDate: timestamp("trial_start_date", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  originalTrialStart: timestamp("original_trial_start", { withTimezone: true }),
  generationsRemaining: integer("generations_remaining").notNull().default(3),
  totalGenerations: integer("total_generations").notNull().default(0),
  creditsRemaining: integer("credits_remaining").notNull().default(5),
  lastCreditReset: timestamp("last_credit_reset", { withTimezone: true }).notNull().defaultNow(),
  isBetaUser: boolean("is_beta_user").notNull().default(false),
  billingCycleStart: timestamp("billing_cycle_start", { withTimezone: true }),
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
  platformPreference: text("platform_preference"),
  isFirstLogin: boolean("is_first_login").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
