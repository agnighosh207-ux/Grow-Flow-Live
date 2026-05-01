import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/src/schema";
import dotenv from "dotenv";
import { isNotNull, desc, sql, eq } from "drizzle-orm";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function run() {
  const { usersTable, usageLogsTable, contentGenerationsTable, referralsTable, systemSettingsTable, globalAnnouncementsTable } = schema;
  
  const safeQuery = async <T>(promise: any, fallback: T, label: string): Promise<T> => {
    try {
      return await promise;
    } catch (e: any) {
      console.error(`[ADMIN-STATS] Query failed (${label}):`, e.message);
      return fallback;
    }
  };

  try {
    console.log("Running Promise.all...");
    const [
      totalUsersResult,
      totalEmailsResult,
      totalGenerationsResult,
      recentUsers,
      revenueResult,
      languageStats,
      dauDataList,
      topReferrers,
      generationsDataList,
      settingsResult,
      activeAnnouncements
    ] = await Promise.all([
      safeQuery(db.select({ count: sql<string>`count(*)` }).from(usersTable), [{ count: "0" }], "totalUsers"),
      safeQuery(db.select({ count: sql<string>`count(*)` }).from(usersTable).where(isNotNull(usersTable.email)), [{ count: "0" }], "totalEmails"),
      safeQuery(db.select({ count: sql<string>`count(*)` }).from(contentGenerationsTable), [{ count: "0" }], "totalGenerations"),
      safeQuery(db.select({
        id: usersTable.id,
        email: usersTable.email,
        planType: usersTable.planType,
        subscriptionStatus: usersTable.subscriptionStatus,
        createdAt: usersTable.createdAt
      }).from(usersTable).orderBy(desc(usersTable.createdAt)).limit(100), [], "recentUsers"),
      safeQuery(db.select({
        plan: usersTable.planType,
        totalAmount: sql<number>`SUM(${usersTable.subscriptionAmount})`
      }).from(usersTable).where(eq(usersTable.subscriptionStatus, 'active')).groupBy(usersTable.planType), [], "revenue"),
      safeQuery(db.select({
        name: contentGenerationsTable.contentType,
        value: sql<string>`count(*)`
      }).from(contentGenerationsTable).groupBy(contentGenerationsTable.contentType), [], "languageStats"),
      safeQuery(db.select({
        date: sql<string>`${usersTable.lastLoginAt}::date`,
        activeusers: sql<string>`count(*)`
      })
      .from(usersTable)
      .where(sql`${usersTable.lastLoginAt} >= NOW() - INTERVAL '30 days'`)
      .groupBy(sql`1`)
      .orderBy(sql`1 ASC`), [], "dauData"),
      safeQuery(db.execute(sql`
        SELECT u.id, u.email, COUNT(r.id)::int as referralscount
        FROM users u
        JOIN referrals r ON u.id = r.referrer_user_id
        WHERE r.reward_granted = true
        GROUP BY u.id, u.email
        ORDER BY referralscount DESC
        LIMIT 20
      `), { rows: [] } as any, "topReferrers"),
      safeQuery(db.select({
        date: sql<string>`${contentGenerationsTable.createdAt}::date`,
        generations: sql<string>`count(*)`
      })
      .from(contentGenerationsTable)
      .where(sql`${contentGenerationsTable.createdAt} >= NOW() - INTERVAL '30 days'`)
      .groupBy(sql`1`)
      .orderBy(sql`1 ASC`), [], "generationsData"),
      safeQuery(db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, "global")), [], "settings"),
      safeQuery(db.select()
        .from(globalAnnouncementsTable)
        .where(eq(globalAnnouncementsTable.isActive, true))
        .orderBy(desc(globalAnnouncementsTable.createdAt)), [], "announcements")
    ]);
    console.log("Success! No overall exception.");
  } catch (err: any) {
    console.error("FATAL ERROR IN TRY CATCH:", err);
  } finally {
    await pool.end();
  }
}

run();
