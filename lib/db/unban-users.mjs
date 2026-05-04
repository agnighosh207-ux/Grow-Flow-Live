import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function unban() {
  console.log("🚀 Restoring fair users...");
  const { rowCount } = await pool.query("UPDATE users SET is_banned = false, violation_count = 0 WHERE is_admin = false");
  console.log(`✅ Unbanned ${rowCount} users. All fair users restored.`);
  process.exit(0);
}

unban();
