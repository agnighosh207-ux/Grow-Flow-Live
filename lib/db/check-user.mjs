import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const { rows } = await pool.query("SELECT id, email, is_banned, violation_count, plan_tier FROM users");
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

check();
