import { db, usersTable, referralsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { ensureReferralCode } from "../src/utils/referral";

async function testReferralInfo(userId: string) {
  try {
    console.log(`Testing referral info for: ${userId}`);
    
    const code = await ensureReferralCode(userId);
    console.log("Code:", code);

    const [userRow] = await db.select({ hasSeenReferralPopup: usersTable.hasSeenReferralPopup })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    console.log("User row:", userRow);

    const [referralStats] = await db
      .select({ 
        successful: sql<number>`count(CASE WHEN ${referralsTable.rewardGranted} = true THEN 1 END)`,
        total: count()
      })
      .from(referralsTable)
      .where(eq(referralsTable.referrerUserId, userId));
    console.log("Stats row:", referralStats);

    const successfulReferrals = Number(referralStats?.successful ?? 0);
    const totalReferrals = Number(referralStats?.total ?? 0);
    console.log("Parsed Stats:", { successfulReferrals, totalReferrals });

    process.exit(0);
  } catch (err) {
    console.error("Test Error:", err);
    process.exit(1);
  }
}

testReferralInfo("user_3CLbb5vRpZ6kl91ZshgVotvIduV");
