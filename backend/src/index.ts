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
console.log("[BOOT] Initializing HTTP server...");

// Initialization continues using PORT defined in Step 3

const server = http.createServer((req, res) => {
  // Direct raw-level health check (Absolute Priority)
  const url = req.url || "";
  if (url === "/api/health" || url === "/healthz" || url === "/health" || url === "/" || url === "/health-check") {
    res.writeHead(200, { "Content-Type": "application/json", "X-App-Status": "Ready" });
    res.end(JSON.stringify({ 
      status: "ok", 
      uptime: process.uptime(), 
      railway: true,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Delegate to Express app
  try {
    const requestListener = (app as any).default || app;
    if (typeof requestListener === "function") {
      requestListener(req, res);
    } else {
      console.error("[CRITICAL] Express 'app' is not a function!");
      res.writeHead(500);
      res.end("Internal Server Error: Application misconfiguration");
    }
  } catch (err: any) {
    console.error("[CRITICAL] Request handling error:", err.message);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

server.on("error", (err: any) => {
  console.error("[CRITICAL] Server socket error:", err);
  process.exit(1);
});

console.log(`[BOOT] Attempting to listen on 0.0.0.0:${PORT}...`);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[BOOT] ✅ GrowFlow AI is LIVE`);
  console.log(`[BOOT] Address: 0.0.0.0:${PORT}`);
  console.log(`[BOOT] Node Version: ${process.version}`);
});

// ─── 6. Graceful Shutdown Handler ──────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`[SHUTDOWN] Received ${signal}.`);
  setShuttingDown(true);

  const timeout = setTimeout(() => {
    process.exit(1);
  }, 10000);

  server.close(async () => {
    try {
      const { pool } = await import("@workspace/db");
      if (pool && typeof pool.end === "function") await pool.end();
    } catch (err) {}
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
