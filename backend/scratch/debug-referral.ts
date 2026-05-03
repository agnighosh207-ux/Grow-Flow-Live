import { db, usersTable, referralsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { ensureReferralCode } from "../src/utils/referral";

async function testReferral(email: string) {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      console.log("User not found:", email);
      return;
    }
    console.log("Found user:", user.id, "Plan:", user.planType);
    
    const code = await ensureReferralCode(user.id);
    console.log("Referral Code:", code);

    const [stats] = await db
      .select({ 
        successful: sql<number>`count(CASE WHEN ${referralsTable.rewardGranted} = true THEN 1 END)`,
        total: count()
      })
      .from(referralsTable)
      .where(eq(referralsTable.referrerUserId, user.id));
    
    console.log("Stats:", stats);
  } catch (err) {
    console.error("Test error:", err);
  }
  process.exit(0);
}

testReferral("agnighosh207@gmail.com");
