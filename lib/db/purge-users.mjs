// Purge all users except admin — uses raw pg connection string
// Run: npx tsx backend/purge-users.mjs

import 'dotenv/config';

// Dynamically import pg since it's in the workspace
const pgModule = await import('pg');
const Pool = pgModule.default?.Pool || pgModule.Pool;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'agnighosh207@gmail.com';

async function purge() {
  console.log(`\n🚀 Starting Global Purge (Keeping: ${ADMIN_EMAIL})...\n`);
  
  const client = await pool.connect();
  
  try {
    // 1. Get Admin user ID
    const { rows } = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [ADMIN_EMAIL]);
    if (rows.length === 0) {
      console.error(`❌ Admin user not found with email: ${ADMIN_EMAIL}. Aborting.`);
      return;
    }
    const adminId = rows[0].id;
    console.log(`✅ Admin ID: ${adminId}\n`);

    // 2. Delete from all dependent tables first (foreign keys)
    const dependentTables = [
      'content_generations',
      'support_messages',
      'favorites',
      'referrals',
      'daily_plans',
      'beta_feedback',
      'usage_logs',
      'content_calendar',
      'security_logs',
      'payments',
      'feature_usage_logs',
      'impersonation_sessions',
      'hashtag_collections',
      'vault_items',
    ];

    for (const table of dependentTables) {
      try {
        const { rowCount } = await client.query(`DELETE FROM "${table}" WHERE user_id != $1`, [adminId]);
        console.log(`🗑️  Purged ${rowCount ?? 0} rows from ${table}`);
      } catch (e) {
        // Try admin_id for session tables
        try {
          const { rowCount } = await client.query(`DELETE FROM "${table}" WHERE admin_id != $1`, [adminId]);
          console.log(`🗑️  Purged ${rowCount ?? 0} rows from ${table} (admin_id)`);
        } catch {
          console.warn(`⏭️  Skipped ${table}: Table might not exist or has different schema.`);
        }
      }
    }

    // 3. Now delete all non-admin users
    const { rowCount: userCount } = await client.query('DELETE FROM users WHERE id != $1', [adminId]);
    console.log(`\n👤 Purged ${userCount ?? 0} non-admin users.`);

    // 4. Reset Admin to pristine INFINITY state
    await client.query(`
      UPDATE users 
      SET generations_remaining = 9999, 
          total_generations = 0,
          plan_tier = 'INFINITY',
          plan_type = 'infinity',
          subscription_status = 'active',
          is_admin = true,
          is_banned = false,
          violation_count = 0
      WHERE id = $1
    `, [adminId]);
    console.log(`✨ Admin account reset to INFINITY.\n`);
    console.log('🏁 ✅ PURGE COMPLETE — All non-admin users and their data have been removed.\n');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Purge FAILED:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

purge();
