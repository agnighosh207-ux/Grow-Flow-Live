import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFileUrl = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFileUrl), "../../../../");
dotenv.config({ path: path.join(rootDir, ".env") });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[CHECK] DATABASE_URL is missing in environment variables!");
  process.exit(1);
}

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
