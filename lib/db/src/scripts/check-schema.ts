import pg from "pg";

const { Pool } = pg;
const connectionString = "postgresql://postgres.kgcbsppffaapzemvuefh:Af2yKCk1AkYv8I4S@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";

const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function checkSchema() {
  console.log("[CHECK] Connecting to database...");
  try {
    const client = await pool.connect();
    console.log("[CHECK] Connected! Listing columns for 'public.users' table...");
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    console.log("[CHECK] Columns found in public.users:", res.rows.map(r => r.column_name).join(", "));
    client.release();
  } catch (err) {
    console.error("[CHECK] Failed to check schema:", err);
  } finally {
    await pool.end();
  }
}

checkSchema();
