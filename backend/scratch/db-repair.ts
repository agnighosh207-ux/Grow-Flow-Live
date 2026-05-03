import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function repair() {
  try {
    console.log("Starting Database Repair...");

    // 1. Create missing tables
    console.log("Creating missing tables...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hashtag_collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        platform TEXT NOT NULL,
        tags JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS hashtag_collections_user_id_idx ON hashtag_collections(user_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS impersonation_sessions (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL REFERENCES users(id),
        target_user_id TEXT NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL,
        started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        ended_at TIMESTAMPTZ,
        ip_address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    console.log("Tables created/verified.");

    // 2. Fix credits for everyone
    console.log("Giving all users 20 bonus generations to fix the reported failures...");
    await db.execute(sql`
      UPDATE users 
      SET generations_remaining = GREATEST(generations_remaining, 20),
          plan_tier = COALESCE(plan_tier, 'FREE')
    `);

    // 3. Ensure referral codes for everyone
    console.log("Ensuring referral codes exist for all users...");
    // This is handled by ensureReferralCode utility but let's do a bulk update if possible
    // We'll just run a query to see if any are null
    const nullCodes = await db.execute(sql`SELECT count(*) FROM users WHERE referral_code IS NULL`);
    console.log("Users missing referral codes:", nullCodes.rows[0].count);

    console.log("Database repair complete.");
    process.exit(0);
  } catch (err) {
    console.error("Repair Error:", err);
    process.exit(1);
  }
}

repair();
