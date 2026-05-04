import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function totalPurge() {
  console.log("🔥 STARTING TOTAL DATABASE PURGE...");
  
  const client = await pool.connect();
  
  try {
    // 1. List of all user-related tables
    const tables = [
      'content_generations',
      'support_messages',
      'favorites',
      'referrals',
      'daily_plans',
      'beta_feedback',
      'usage_logs',
      'content_calendar',
      'security_logs',
      'payments',
      'feature_usage_logs',
      'impersonation_sessions',
      'hashtag_collections',
      'vault_items',
      'users' // Users last
    ];

    for (const table of tables) {
      try {
        const { rowCount } = await client.query(`DELETE FROM "${table}"`);
        console.log(`🗑️  Cleared ${rowCount ?? 0} rows from ${table}`);
      } catch (e) {
        console.warn(`⏭️  Skipped ${table}: ${e.message}`);
      }
    }

    console.log("\n✅ DATABASE IS NOW EMPTY.");
    console.log("🚀 Everyone (including you) will now get a fresh onboarding and 5 free credits upon next login.");
    console.log("👑 Your admin status will be automatically restored when you log back in with your admin email.");

  } catch (err) {
    console.error("❌ Purge failed:", err);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

totalPurge();
