import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function test() {
  try {
    console.log("Checking users table columns...");
    const cols = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    const columnNames = cols.rows.map((r: any) => r.column_name);
    console.log("Existing columns:", columnNames);

    const missing = [
      'referral_code', 
      'referral_used_code', 
      'has_seen_referral_popup'
    ].filter(c => !columnNames.includes(c));

    console.log("Missing columns:", missing);

    console.log("Checking referrals table...");
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE tablename = 'referrals'
    `);
    console.log("referrals table exists:", tables.length > 0);

    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}

test();
