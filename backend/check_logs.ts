import { db, securityLogsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

async function main() {
  console.log("Fetching last 50 security logs (Errors only)...");
  const logs = await db.select().from(securityLogsTable)
    .orderBy(desc(securityLogsTable.createdAt))
    .limit(100);
  
  const errors = logs.filter(l => (l.metadata as any)?.statusCode >= 400 || l.eventType === "RATE_LIMIT");
  console.log(JSON.stringify(errors, null, 2));
}

main().catch(console.error);
