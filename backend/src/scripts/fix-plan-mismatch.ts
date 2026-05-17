import { db, usersTable } from "@workspace/db";
import { ne, sql } from "drizzle-orm";

async function fixPlanMismatch() {
  // Find all users where planTier doesn't match planType (case-insensitive)
  const users = await db.select({
    id: usersTable.id,
    planType: usersTable.planType,
    planTier: usersTable.planTier,
    generationsRemaining: usersTable.generationsRemaining,
  }).from(usersTable);
  
  const TIER_CREDITS: Record<string, number> = {
    FREE: 5, STARTER: 25, CREATOR: 150, INFINITY: 999999, AGENCY: 1000
  };
  
  let fixed = 0;
  for (const user of users) {
    const expectedTier = (user.planType || "free").toUpperCase() as "FREE" | "STARTER" | "CREATOR" | "INFINITY" | "AGENCY";
    if (user.planTier !== expectedTier) {
      const correctCredits = TIER_CREDITS[expectedTier] || 5;
      await db.update(usersTable)
        .set({ 
          planTier: expectedTier,
          generationsRemaining: correctCredits
        })
        .where(sql`${usersTable.id} = ${user.id}`);
      console.log(`Fixed user ${user.id}: ${user.planTier} → ${expectedTier}, credits: ${correctCredits}`);
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} users with planTier/planType mismatch`);
}

fixPlanMismatch().catch(console.error);
