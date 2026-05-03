import { db } from "../src/index";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("🚀 Starting manual migration...");
  
  try {
    // 1. Create vault_items table
    console.log("Creating vault_items table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "vault_items" (
        "id" text PRIMARY KEY,
        "title" text NOT NULL,
        "platform" text NOT NULL,
        "niche" text NOT NULL,
        "content_type" text NOT NULL,
        "hook_text" text NOT NULL,
        "body_text" text,
        "why_it_works" text NOT NULL,
        "estimated_reach" text NOT NULL,
        "format" text NOT NULL,
        "tags" jsonb NOT NULL DEFAULT '[]',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("✅ vault_items table ready.");

    // 2. Add voice_profile to users table
    console.log("Adding voice_profile to users table...");
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "voice_profile" jsonb;`);
      console.log("✅ voice_profile column added.");
    } catch (e: any) {
      console.warn("⚠️ Failed to add voice_profile:", e.message);
    }

    // 3. Update content_calendar table (check and add columns)
    console.log("Updating content_calendar table...");
    const columnsToAdd = [
      { name: "platform", type: "text" },
      { name: "status", type: "text", default: "'planned'" },
      { name: "generation_id", type: "text" },
      { name: "notes", type: "text" },
      { name: "scheduled_time", type: "text" },
      { name: "color", type: "text" }
    ];

    for (const col of columnsToAdd) {
      try {
        const query = `ALTER TABLE "content_calendar" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}${col.default ? ` DEFAULT ${col.default}` : ""};`;
        await db.execute(sql.raw(query));
        console.log(`✅ Column ${col.name} added.`);
      } catch (e: any) {
        console.warn(`⚠️ Failed to add ${col.name}:`, e.message);
      }
    }

    // 4. Update content_generations table
    console.log("Updating content_generations table...");
    try {
      await db.execute(sql`ALTER TABLE "content_generations" ADD COLUMN IF NOT EXISTS "source" text;`);
      console.log("✅ source column added to content_generations.");
    } catch (e: any) {
      console.warn("⚠️ Failed to add source column:", e.message);
    }

    // 5. Create hashtag_collections table
    console.log("Creating hashtag_collections table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hashtag_collections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "platform" text NOT NULL,
        "tags" jsonb NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("✅ hashtag_collections table ready.");

    console.log("\n🎉 Manual migration finished successfully.");
  } catch (err: any) {
    console.error("\n❌ Migration failed:", err.message);
  }
  process.exit(0);
}

migrate();
