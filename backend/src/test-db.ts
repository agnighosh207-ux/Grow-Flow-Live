import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function test() {
  try {
    const result = await db.select({ count: sql`count(*)` }).from(usersTable);
    console.log("DB OK:", result);
    process.exit(0);
  } catch (err) {
    console.error("DB FAIL:", err);
    process.exit(1);
  }
}

test();
