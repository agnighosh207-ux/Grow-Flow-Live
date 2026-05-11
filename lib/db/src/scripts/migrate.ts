import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../index.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log("[MIGRATE] Starting database migration...");
  try {
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, "../../drizzle"),
    });
    console.log("[MIGRATE] Migration completed successfully!");
  } catch (error) {
    console.error("[MIGRATE] Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
