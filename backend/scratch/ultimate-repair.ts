import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function ultimateRepair() {
  console.log("🚀 Starting Ultimate Database Repair...");

  try {
    // 1. Fix content_generations
    console.log("Checking content_generations...");
    await db.execute(sql`ALTER TABLE content_generations ADD COLUMN IF NOT EXISTS source TEXT;`);
    await db.execute(sql`ALTER TABLE content_generations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS content_generations_user_id_idx ON content_generations(user_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS content_generations_created_at_idx ON content_generations(created_at);`);
    
    // 2. Fix hashtag_collections
    console.log("Checking hashtag_collections...");
    // Check if platform is NOT NULL, if so we need to handle existing rows
    await db.execute(sql`ALTER TABLE hashtag_collections ADD COLUMN IF NOT EXISTS platform TEXT;`);
    await db.execute(sql`UPDATE hashtag_collections SET platform = 'Instagram' WHERE platform IS NULL;`);
    await db.execute(sql`ALTER TABLE hashtag_collections ALTER COLUMN platform SET NOT NULL;`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS hashtag_collections_user_id_idx ON hashtag_collections(user_id);`);

    // 3. Fix impersonation_sessions
    console.log("Checking impersonation_sessions...");
    await db.execute(sql`ALTER TABLE impersonation_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;`);
    await db.execute(sql`ALTER TABLE impersonation_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;`);
    await db.execute(sql`ALTER TABLE impersonation_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);

    // 4. Ensure Conversations has standard serial ID (Drizzle serial uses SERIAL in PG)
    // No changes needed if already created with SERIAL.

    // 5. Fix Referral constraint if missing (referred_user_id should be unique)
    console.log("Checking referrals constraints...");
    try {
      await db.execute(sql`ALTER TABLE referrals ADD CONSTRAINT referrals_referred_user_id_unique UNIQUE (referred_user_id);`);
    } catch (e) {
      // Ignore if already exists
    }

    console.log("✅ Repair Complete! Syncing credits for all users...");
    
    // Give everyone 20 generations just in case
    await db.execute(sql`UPDATE users SET generations_remaining = generations_remaining + 20 WHERE generations_remaining < 50;`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Repair Failed:", err);
    process.exit(1);
  }
}

ultimateRepair();
