// Direct migration: adds any missing columns to the users table
// Run with: node scripts/migrate-missing-columns.mjs
import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Each migration: {desc, sql, okIfAlreadyExists: true}
const migrations = [
  { desc: "Add email_reports column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_reports BOOLEAN NOT NULL DEFAULT true` },
  { desc: "Add streak_reminders column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_reminders BOOLEAN NOT NULL DEFAULT true` },
  { desc: "Add scheduled_deletion_at column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ` },
  { desc: "Add team_role column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS team_role TEXT DEFAULT 'member'` },
  { desc: "Add team_id column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id TEXT` },
  { desc: "Add voice_profile column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_profile JSONB` },
  { desc: "Add voice_profile_updated_at column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_profile_updated_at TIMESTAMPTZ` },
  { desc: "Add payment_failed_at column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ` },
  { desc: "Add dunning_reminder_sent_at column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS dunning_reminder_sent_at TIMESTAMPTZ` },
  { desc: "Add streak_reward_last_granted_at column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_reward_last_granted_at TIMESTAMPTZ` },
  { desc: "Add coupon_code column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS coupon_code TEXT` },
  { desc: "Add device_id column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT` },
  { desc: "Add billing_period column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly'` },
  { desc: "Add billing_cycle_start column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ` },
  { desc: "Add subscription_amount column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_amount INTEGER DEFAULT 0` },
  { desc: "Add tool_trials column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS tool_trials JSONB DEFAULT '{}'::jsonb` },
  { desc: "Add regional_language_lock column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS regional_language_lock TEXT` },
  { desc: "Add language_preference column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'English'` },
  { desc: "Add platform_preference column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_preference TEXT` },
  { desc: "Add tone_preference column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS tone_preference TEXT` },
  { desc: "Add niche column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS niche TEXT` },
  { desc: "Add has_seen_referral_popup column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_referral_popup BOOLEAN NOT NULL DEFAULT false` },
  { desc: "Add referral_used_code column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_used_code TEXT` },
  { desc: "Add referral_code column (unique)", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT` },
  { desc: "Add is_first_login column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT true` },
  { desc: "Add current_streak column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0` },
  { desc: "Add last_streak_date column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_streak_date TEXT` },
  { desc: "Add original_trial_start column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS original_trial_start TIMESTAMPTZ` },
  { desc: "Add security_flags column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS security_flags JSONB DEFAULT '[]'::jsonb` },
  { desc: "Add violation_count column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS violation_count INTEGER NOT NULL DEFAULT 0` },
  { desc: "Add is_banned column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false` },
  { desc: "Add is_beta_user column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_beta_user BOOLEAN NOT NULL DEFAULT false` },
  { desc: "Add marketing_emails column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN NOT NULL DEFAULT false` },
  { desc: "Add product_updates column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS product_updates BOOLEAN NOT NULL DEFAULT true` },
  { desc: "Add email_notifications column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true` },
  { desc: "Add weekly_digest column", sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_digest BOOLEAN NOT NULL DEFAULT true` },
  // Unique constraint on username (safe if no duplicates exist)
  { desc: "Add unique constraint on username", sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique') THEN ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username); END IF; END $$` },
  // Unique constraint on referral_code
  { desc: "Add unique constraint on referral_code", sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_referral_code_unique') THEN ALTER TABLE users ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code); END IF; END $$` },
];

async function run() {
  await client.connect();
  console.log("✅ Connected to database\n");

  let success = 0, skip = 0, fail = 0;

  for (const m of migrations) {
    try {
      await client.query(m.sql);
      console.log(`  ✅ ${m.desc}`);
      success++;
    } catch (err) {
      if (err.message.includes("already exists") || err.message.includes("duplicate column")) {
        console.log(`  ⏭️  Skip (already exists): ${m.desc}`);
        skip++;
      } else {
        console.error(`  ❌ FAILED: ${m.desc}`);
        console.error(`     Error: ${err.message}`);
        fail++;
      }
    }
  }

  console.log(`\n📊 Migration complete: ${success} applied, ${skip} skipped, ${fail} failed`);
  
  if (fail > 0) {
    console.error("\n⚠️  Some migrations failed. Check errors above.");
    process.exit(1);
  } else {
    console.log("\n🎉 All migrations successful! The backend should recover automatically.");
  }

  await client.end();
}

run().catch(err => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
