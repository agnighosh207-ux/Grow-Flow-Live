import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function test() {
  try {
    const expectedTables = [
      'beta_feedback',
      'content_calendar',
      'content_generations',
      'conversations',
      'coupons',
      'daily_plans',
      'early_access_emails',
      'favorites',
      'feature_usage_logs',
      'global_announcements',
      'hashtag_collections',
      'impersonation_sessions',
      'messages',
      'payments',
      'referrals',
      'security_logs',
      'support_messages',
      'system_settings',
      'usage_logs',
      'users',
      'vault_items'
    ];

    console.log("Checking tables in 'public' schema...");
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `);
    const existingTables = tables.rows.map((r: any) => r.tablename);
    console.log("Existing tables:", existingTables);

    const missing = expectedTables.filter(t => !existingTables.includes(t));
    console.log("Missing tables:", missing);

    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}

test();
