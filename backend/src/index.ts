import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";

// ─── 1. Load .env BEFORE any application code ────────────────────────────────
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../");
// Use process.env.ROOT_DIR if available (for container environments)
const baseDir = process.env.ROOT_DIR || rootDir;
const envFile = path.join(baseDir, ".env");
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

// ─── 2. Process-level crash handlers ─────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("[CRITICAL] Uncaught Exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[CRITICAL] Unhandled Rejection:", reason);
  // process.exit(1); // Removed: Do not crash the entire app for unhandled promises
});

// ─── 3. Boot diagnostics ─────────────────────────────────────────────────────
// We use direct console for early boot diagnostics before logger is imported
console.log("[BOOT] Starting GrowFlow AI Server...");
console.log("[BOOT] Node:", process.version, "| CWD:", process.cwd());
console.log("[BOOT] NODE_ENV:", process.env.NODE_ENV);
console.log("[BOOT] DATABASE_URL set:", !!process.env.DATABASE_URL);

// ─── 4. Import the Express app AFTER diagnostics ────────────────────────────
import app from "./app.js";
import { initSentry } from "./sentry.js";

import { setShuttingDown } from "./lib/state.js";

initSentry();

// ─── 5. Start Server ────────────────────────────────────────────────────────
// Railway requirement: Must listen on 0.0.0.0 and process.env.PORT
// Containers standard: Default to 8080 if PORT is missing
const FINAL_PORT = Number(process.env.PORT) || 8080;

const startServer = async () => {
  try {
    console.log(`[BOOT] Initializing GrowFlow AI on port ${FINAL_PORT}...`);
    
    // Defensive ESM interop for the Express app
    const requestListener = (app as any).default || app;
    
    if (typeof requestListener !== "function") {
      throw new Error("Express 'app' is not a validated function. Build configuration mismatch.");
    }

    // Use standard app.listen for better Railway/Container compatibility
    const server = requestListener.listen(FINAL_PORT, "0.0.0.0", () => {
      console.log("-----------------------------------------");
      console.log(`[BOOT] ✅ GrowFlow AI is LIVE`);
      console.log(`[BOOT] Internal: http://localhost:${FINAL_PORT}`);
      console.log(`[BOOT] External: 0.0.0.0:${FINAL_PORT} (Railway Proxy)`);
      console.log(`[BOOT] Node: ${process.version}`);
      console.log("-----------------------------------------");
    });

    server.on("error", (err: any) => {
      console.error("[CRITICAL] Server failed to start:", err);
      process.exit(1);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`[SHUTDOWN] Received ${signal}.`);
      setShuttingDown(true);
      
      const forceExit = setTimeout(() => process.exit(1), 10000);
      
      server.close(async () => {
        try {
          const { pool } = await import("@workspace/db");
          if (pool && typeof pool.end === "function") await pool.end();
        } catch (err) {}
        clearTimeout(forceExit);
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (err: any) {
    console.error("[CRITICAL] Fatal boot error:", err.message);
    process.exit(1);
  }
};

// Fire it up
startServer();
