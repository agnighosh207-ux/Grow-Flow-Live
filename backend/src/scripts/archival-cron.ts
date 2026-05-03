import { db, contentGenerationsTable } from "@workspace/db";
import { lt, or } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * PRODUCTION ARCHIVAL JOB
 * Runs every 24 hours to prune content generations older than 15 days
 * OR those soft-deleted more than 7 days ago.
 */
export async function runArchivalJob() {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  logger.info({ cutoffDate: fifteenDaysAgo.toISOString(), trashCutoff: sevenDaysAgo.toISOString() }, "STARTING_CONTENT_ARCHIVAL_JOB");

  try {
    const result = await db.delete(contentGenerationsTable)
      .where(or(
        lt(contentGenerationsTable.createdAt, fifteenDaysAgo),
        lt(contentGenerationsTable.deletedAt, sevenDaysAgo)
      ));

    logger.info({ 
      status: "SUCCESS", 
      message: "Old content generations pruned successfully." 
    }, "ARCHIVAL_JOB_COMPLETE");
  } catch (err: any) {
    logger.error({ err: err?.message }, "ARCHIVAL_JOB_FAILED");
  }
}

// If run directly via node/ts-node
if (require.main === module) {
  runArchivalJob().then(() => process.exit(0)).catch(() => process.exit(1));
}
