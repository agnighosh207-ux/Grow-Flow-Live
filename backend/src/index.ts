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
const PORT = Number(process.env.PORT) || 3000;
// We use direct console for early boot diagnostics before logger is imported
console.log("[BOOT] Starting GrowFlow AI Server...");
console.log("[BOOT] Node:", process.version, "| CWD:", process.cwd());
console.log("[BOOT] PORT:", PORT, "| NODE_ENV:", process.env.NODE_ENV);
console.log("[BOOT] DATABASE_URL set:", !!process.env.DATABASE_URL);

// ─── 4. Import the Express app AFTER diagnostics ────────────────────────────
import app from "./app.js";
import { initSentry } from "./sentry.js";

import { setShuttingDown } from "./lib/state.js";

initSentry();

// ─── 5. Start Server ────────────────────────────────────────────────────────
// Railway requirement: Must listen on 0.0.0.0 and process.env.PORT
const server = http.createServer();

const startServer = () => {
  try {
    const requestListener = (app as any).default || app;
    
    server.on("request", (req, res) => {
      // Direct raw-level health check for Railway/Load Balancers
      if (req.url === "/api/health" || req.url === "/healthz" || req.url === "/health" || req.url === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", uptime: process.uptime(), railway: true }));
        return;
      }
      
      if (typeof requestListener === "function") {
        requestListener(req, res);
      } else {
        console.error("[CRITICAL] Express 'app' is not a function! Build mismatch.");
        res.writeHead(500);
        res.end("Internal Server Error: Application misconfiguration");
      }
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[BOOT] ✅ GrowFlow AI is LIVE`);
      console.log(`[BOOT] Listening on: 0.0.0.0:${PORT}`);
      console.log(`[BOOT] Health Check: http://0.0.0.0:${PORT}/api/health`);
    });
  } catch (err) {
    console.error("[CRITICAL] Failed to start HTTP server:", err);
    process.exit(1);
  }
};

startServer();

server.on("error", (err: any) => {
  console.error("[CRITICAL] Server failed to start:", err);
  process.exit(1);
});

// ─── 6. Graceful Shutdown Handler ──────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);
  setShuttingDown(true);

  const timeout = setTimeout(() => {
    console.error("[SHUTDOWN] Forced shutdown after 10s timeout.");
    process.exit(1);
  }, 10000);

  server.close(async () => {
    console.log("[SHUTDOWN] HTTP server closed.");
    try {
      const { pool } = await import("@workspace/db");
      if (pool && typeof pool.end === "function") {
        await pool.end();
        console.log("[SHUTDOWN] Database connection pool closed.");
      }
    } catch (err) {
      console.error("[SHUTDOWN] Error closing database connection:", err);
    }
    clearTimeout(timeout);
    console.log("[SHUTDOWN] Cleanup complete. Exiting.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
