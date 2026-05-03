import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";

// ─── 1. Load .env BEFORE any application code ────────────────────────────────
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../");
const envFile = path.join(rootDir, ".env");
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
  process.exit(1);
});

// ─── 3. Boot diagnostics ─────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
// We use direct console for early boot diagnostics before logger is imported
console.log("[BOOT] Starting GrowFlow AI Server...");
console.log("[BOOT] Node:", process.version, "| CWD:", process.cwd());
console.log("[BOOT] PORT:", PORT, "| NODE_ENV:", process.env.NODE_ENV);
console.log("[BOOT] DATABASE_URL set:", !!process.env.DATABASE_URL);

// ─── 4. Dynamic-import the Express app AFTER env is ready ────────────────────
const { default: app } = await import("./app.js");
const { initSentry } = await import("./sentry.js");

initSentry();

// ─── 5. Create HTTP server with raw-level health check ───────────────────────
// The raw handler ensures /api/health responds INSTANTLY without going through
// any Express middleware (Clerk, CORS, helmet, etc.) which could hang.
const server = http.createServer((req, res) => {
  // Raw health check — bypasses ALL Express middleware
  if (req.url === "/api/health" || req.url === "/healthz" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    return;
  }
  // Forward everything else to Express
  app(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[BOOT] ✅ Server listening on 0.0.0.0:${PORT}`);
});

server.on("error", (err: any) => {
  console.error("[CRITICAL] Server failed to start:", err);
  process.exit(1);
});

// ─── 6. Graceful Shutdown Handler ──────────────────────────────────────────
const shutdown = async (signal: string) => {
  const { logger } = await import("./lib/logger.js");
  const { setShuttingDown } = await import("./app.js");

  logger.info(`[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);
  setShuttingDown(true);

  const timeout = setTimeout(() => {
    logger.error("[SHUTDOWN] Forced shutdown after 10s timeout.");
    process.exit(1);
  }, 10000);

  server.close(async () => {
    logger.info("[SHUTDOWN] HTTP server closed.");
    try {
      const { db } = await import("@workspace/db");
      if ((db as any).$client?.end) {
        await (db as any).$client.end();
        logger.info("[SHUTDOWN] Database connection pool closed.");
      }
    } catch (err) {
      logger.error({ err }, "[SHUTDOWN] Error closing database connection");
    }
    clearTimeout(timeout);
    logger.info("[SHUTDOWN] Cleanup complete. Exiting.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
