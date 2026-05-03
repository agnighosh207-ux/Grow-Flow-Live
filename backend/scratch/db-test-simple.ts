import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function test() {
  try {
    console.log("Checking DB connection...");
    const result = await db.execute(sql`SELECT current_database(), current_user`);
    console.log("Connection OK:", result);

    console.log("Checking users table for referral_code column...");
    const cols = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'referral_code'
    `);
    console.log("referral_code exists:", cols.length > 0);
    if (cols.length > 0) {
      console.log("Column details:", cols[0]);
    }

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
