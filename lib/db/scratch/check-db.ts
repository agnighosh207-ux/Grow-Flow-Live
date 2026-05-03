import { db } from "../src/index";
import { sql } from "drizzle-orm";

async function check() {
  try {
    const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
    console.log("Columns in users table:");
    console.log(result.rows.map((r: any) => r.column_name).join(", "));
    
    const hasVoice = result.rows.some((r: any) => r.column_name === 'voice_profile');
    console.log("\nHas voice_profile:", hasVoice);
  } catch (err) {
    console.error("Check failed:", err);
  }
  process.exit(0);
}

check();
