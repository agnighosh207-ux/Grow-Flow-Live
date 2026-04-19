import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function unbanUser(userId: string) {
  if (!userId) {
    console.error("❌ Error: Missing User ID.");
    console.log("Usage: npm run unban <user_id>");
    process.exit(1);
  }

  console.log(`[Guardian] Attempting to unban and clear flags for: ${userId}`);

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    
    if (!user) {
      console.error(`❌ User not found: ${userId}`);
      process.exit(1);
    }

    await db.update(usersTable)
      .set({
        isBanned: false,
        violationCount: 0,
        securityFlags: [],
      })
      .where(eq(usersTable.id, userId));

    console.log(`✅ SUCCESS: User ${userId} has been completely restored.`);
    console.log(`Flags cleared. Violation count reset to 0.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Database Error:", error);
    process.exit(1);
  }
}

const targetUser = process.argv[2];
unbanUser(targetUser);
