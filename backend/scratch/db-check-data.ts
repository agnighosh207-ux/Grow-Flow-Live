import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function test() {
  try {
    console.log("Checking for users with referral codes...");
    const users = await db.execute(sql`
      SELECT id, email, referral_code 
      FROM users 
      WHERE referral_code IS NOT NULL
      LIMIT 10
    `);
    console.table(users.rows);

    console.log("Total users with referral codes:", users.rows.length);

    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}

test();
