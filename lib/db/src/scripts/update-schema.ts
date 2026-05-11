import pg from "pg";

const { Pool } = pg;
const connectionString = "postgresql://postgres.kgcbsppffaapzemvuefh:Af2yKCk1AkYv8I4S@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";

const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function updateSchema() {
  console.log("[UPDATE] Connecting to database...");
  const client = await pool.connect();
  try {
    console.log("[UPDATE] Connected! Adding missing columns to 'public.users'...");
    
    const statements = [
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" text;`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "show_on_leaderboard" boolean NOT NULL DEFAULT false;`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "team_id" text;`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "team_role" text DEFAULT 'member';`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "voice_profile_updated_at" timestamp with time zone;`,
      // Add unique constraint for username if it doesn't exist
      // Note: This might fail if there are duplicate nulls or existing data, but we'll try.
      // Actually, let's just add the columns for now to stop the 500s.
    ];

    for (const sql of statements) {
      console.log(`[UPDATE] Executing: ${sql}`);
      await client.query(sql);
    }
    
    console.log("[UPDATE] Schema update completed successfully!");
  } catch (err) {
    console.error("[UPDATE] Failed to update schema:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

updateSchema();
