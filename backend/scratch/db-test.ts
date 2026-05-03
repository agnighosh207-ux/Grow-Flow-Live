import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function test() {
  try {
    console.log("Checking DB connection...");
    const result = await db.execute(sql`SELECT current_database(), current_user`);
    console.log("Connection OK:", result);

    console.log("Listing tables...");
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'
    `);
    console.table(tables);

    console.log("Checking users table columns...");
    const cols = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.table(cols);

    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}

test();
