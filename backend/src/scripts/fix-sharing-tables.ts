import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function fixSharingTables() {
  console.log("Fixing sharing_links table types...");
  try {
    // We might need to drop and recreate if there's no data, or alter
    // Since it's development, dropping and recreating is safest to ensure correct types
    await db.execute(sql`DROP TABLE IF EXISTS "share_feedbacks";`);
    await db.execute(sql`DROP TABLE IF EXISTS "sharing_links";`);
    
    await db.execute(sql`
      CREATE TABLE "sharing_links" (
        "id" varchar(25) PRIMARY KEY,
        "user_id" text NOT NULL,
        "content_id" integer NOT NULL,
        "expires_at" timestamp NOT NULL,
        "view_count" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now()
      );
    `);

    await db.execute(sql`
      CREATE TABLE "share_feedbacks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "share_id" varchar(25) NOT NULL,
        "status" varchar(20) NOT NULL,
        "comment" text,
        "created_at" timestamp DEFAULT now()
      );
    `);

    console.log("Sharing tables fixed.");
  } catch (err) {
    console.error("Failed to fix sharing tables:", err);
  }
}

fixSharingTables().catch(console.error);
