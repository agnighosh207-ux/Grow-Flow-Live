import dotenv from "dotenv"; // boot v2
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";

// ─── 1. Load .env BEFORE any application code ────────────────────────────────
function loadEnv() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  let dir = currentDir;
  
  // Search upwards for .env (max 5 levels)
  for (let i = 0; i < 5; i++) {
    const potentialPath = path.join(dir, ".env");
    if (fs.existsSync(potentialPath)) {
      dotenv.config({ path: potentialPath });
      console.log(`[BOOT] Environment loaded from: ${potentialPath}`);
      return true;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

const envLoaded = loadEnv();
if (!envLoaded) {
  console.error("[BOOT] ❌ CRITICAL: Could not find .env file in any parent directory!");
}

import { logger } from "./lib/logger.js";
logger.info("[BOOT] Environment synchronized");

// ─── 2. Process-level crash handlers ─────────────────────────────────────────
process.on("uncaughtException", (err) => {
  logger.error({ err }, "[CRITICAL] Uncaught Exception");
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "[CRITICAL] Unhandled Rejection");
  // process.exit(1); // Removed: Do not crash the entire app for unhandled promises
});

// ─── 3. Boot diagnostics ─────────────────────────────────────────────────────
logger.info("[BOOT] Starting GrowFlow AI Server...");
logger.info(`[BOOT] Node: ${process.version} | CWD: ${process.cwd()}`);
logger.info(`[BOOT] NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`[BOOT] DATABASE_URL set: ${!!process.env.DATABASE_URL}`);

// ─── 4. Import the Express app AFTER diagnostics ────────────────────────────
import app from "./app.js";
import { initSentry } from "./sentry.js";

import { setShuttingDown } from "./lib/state.js";

initSentry();

// ─── 5. Start Server ────────────────────────────────────────────────────────
// Railway requirement: Must listen on 0.0.0.0 and process.env.PORT
// Containers standard: Default to 8080 (Railway Railpack preferred)
const FINAL_PORT = Number(process.env.PORT) || 8080;

const startServer = () => {
  try {
    const requestListener = (app as any).default || app;
    
    const server = http.createServer((req, res) => {
      const url = req.url || "";
      
      // 1. RAW HEALTH CHECK (Absolute Priority)
      if (url === "/api/health" || url === "/healthz" || url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", port: FINAL_PORT }));
        return;
      }

      // 2. LOG REQUESTS FOR DEBUGGING (Essential for monitoring)
      logger.info(`[REQ] ${req.method} ${url}`);

      // 3. DELEGATE TO EXPRESS (Full Application)
      if (typeof requestListener === "function") {
        requestListener(req, res);
      } else {
        res.writeHead(500);
        res.end("Build Error: App function missing");
      }
    });

    // Bind to 0.0.0.0 (Mandatory)
    server.listen(FINAL_PORT, "0.0.0.0", () => {
      logger.info(`[BOOT] ✅ GrowFlow AI is LIVE on port ${FINAL_PORT}`);
    });

    server.on("error", (err: any) => {
      logger.error({ err }, "[CRITICAL] Server error");
      process.exit(1);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`[SHUTDOWN] ${signal}`);
      setShuttingDown(true);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 5000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (err: any) {
    logger.error({ err: err.message }, "[CRITICAL] Boot failed");
    process.exit(1);
  }
};

startServer();
