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
const FINAL_PORT = Number(process.env.PORT) || 8080;

const startServer = () => {
  try {
    const requestListener = (app as any).default || app;
    
    const server = http.createServer((req, res) => {
      const url = req.url || "";
      
      // 1. RAW HEALTH CHECK (Bypasses Express entirely)
      if (url === "/api/health" || url === "/healthz" || url === "/health" || url === "/ping") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "alive", timestamp: Date.now() }));
        return;
      }

      // 2. RAW ROOT CHECK (For Railway root verification)
      if (url === "/") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("GrowFlow AI Production Server is Active");
        return;
      }

      // 3. LOG ALL OTHER REQUESTS
      console.log(`[REQ] ${req.method} ${url} | IP: ${req.socket.remoteAddress}`);

      // 4. DELEGATE TO EXPRESS
      if (typeof requestListener === "function") {
        requestListener(req, res);
      } else {
        res.writeHead(500);
        res.end("Internal Server Error: Application Build Mismatch");
      }
    });

    server.listen(FINAL_PORT, "0.0.0.0", () => {
      console.log("=========================================");
      console.log(`[BOOT] ✅ GrowFlow AI is LIVE`);
      console.log(`[BOOT] Port: ${FINAL_PORT}`);
      console.log(`[BOOT] Health Check: http://0.0.0.0:${FINAL_PORT}/api/health`);
      console.log("=========================================");
    });

    server.on("error", (err: any) => {
      console.error("[CRITICAL] Server Socket Error:", err);
      process.exit(1);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`[SHUTDOWN] Received ${signal}.`);
      setShuttingDown(true);
      server.close(async () => {
        try {
          const { pool } = await import("@workspace/db");
          if (pool && typeof pool.end === "function") await pool.end();
        } catch (err) {}
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (err: any) {
    console.error("[CRITICAL] Fatal boot error:", err.message);
    process.exit(1);
  }
};

startServer();
