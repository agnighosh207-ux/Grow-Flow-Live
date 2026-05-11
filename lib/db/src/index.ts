import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.ts";

// Correctly resolve root in both TS (source) and JS (bundled)
const currentFileUrl = fileURLToPath(import.meta.url);
const isSource = currentFileUrl.endsWith('.ts');
// In source: lib/db/src/index.ts (3 levels: src -> db -> lib -> root)
// In dist bundle: backend/dist/index.mjs (2 levels: dist -> backend -> root)
const rootDir = path.resolve(path.dirname(currentFileUrl), isSource ? "../../../" : "../../");

const envFiles = [path.join(rootDir, ".env"), path.join(rootDir, ".env.example")];
const loadedEnv = envFiles.find((file) => fs.existsSync(file));
if (loadedEnv) {
  dotenv.config({ path: loadedEnv });
}

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("[CRITICAL] DATABASE_URL is missing! Database operations will fail. Please provision a database or check environment variables.");
}

const isProduction = process.env.NODE_ENV === "production" || process.env.APP_STATUS === "PRODUCTION";

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy",
  max: 20, // Reduced for pooling efficiency
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Supabase Pooler (6543) requires SSL.
  ssl: process.env.DATABASE_URL?.includes(":6543") || process.env.DATABASE_URL?.includes("supabase")
    ? { rejectUnauthorized: false }
    : (isProduction ? { rejectUnauthorized: false } : false),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
