// Direct SQL migration - adds missing columns to production DB
// Run from: lib/db directory
import pkg from "pg";
const { Client } = pkg;
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL not set"); process.exit(1); }

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const migrations = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_reports BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_reminders BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS team_role TEXT DEFAULT 'member'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_profile JSONB`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_profile_updated_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS dunning_reminder_sent_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_reward_last_granted_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS coupon_code TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_amount INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS tool_trials JSONB DEFAULT '{}'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS regional_language_lock TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'English'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_preference TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS tone_preference TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS niche TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_referral_popup BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_used_code TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_streak_date TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS original_trial_start TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS security_flags JSONB DEFAULT '[]'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS violation_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_beta_user BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS product_updates BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_digest BOOLEAN NOT NULL DEFAULT true`,
  // Safe unique constraints using DO block
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique') THEN ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_referral_code_unique') THEN ALTER TABLE users ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code); END IF; END $$`,
];

async function run() {
  await client.connect();
  console.log("✅ Connected to production database\n");

  let ok = 0, skip = 0, fail = 0;
  for (const sql of migrations) {
    const label = sql.replace(/\s+/g, ' ').slice(0, 80);
    try {
      await client.query(sql);
      console.log(`  ✅ ${label}`);
      ok++;
    } catch (e) {
      if (e.message.includes("already exists") || e.message.includes("duplicate column")) {
        console.log(`  ⏭️  Already exists: ${label}`);
        skip++;
      } else {
        console.error(`  ❌ FAIL: ${label}`);
        console.error(`     → ${e.message}`);
        fail++;
      }
    }
  }

  console.log(`\n📊 Done: ${ok} applied, ${skip} skipped, ${fail} failed`);
  await client.end();
  if (fail > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
