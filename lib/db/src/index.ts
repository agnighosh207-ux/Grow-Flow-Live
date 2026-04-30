import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../");
const envFiles = [path.join(rootDir, ".env"), path.join(rootDir, ".env.example")];
const loadedEnv = envFiles.find((file) => fs.existsSync(file));
if (loadedEnv) {
  dotenv.config({ path: loadedEnv });
}

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isProduction = process.env.NODE_ENV === "production" || process.env.APP_STATUS === "PRODUCTION";

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Reduced for pooling efficiency
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Supabase Pooler (6543) requires SSL.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
