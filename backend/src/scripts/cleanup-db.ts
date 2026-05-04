
import { db, securityLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function cleanup() {
  try {
    console.log("Cleaning up orphaned security logs...");
    await db.delete(securityLogsTable).where(eq(securityLogsTable.userId, "anonymous"));
    console.log("Cleanup finished.");
  } catch (err) {
    console.error("Cleanup failed:", err);
  } finally {
    process.exit(0);
  }
}

cleanup();
