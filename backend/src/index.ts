import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";

// ─── 1. Load .env BEFORE any application code ────────────────────────────────
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../");
const envFiles = [path.join(rootDir, ".env"), path.join(rootDir, ".env.example")];
const loadedEnv = envFiles.find((file) => fs.existsSync(file));
if (loadedEnv) {
  dotenv.config({ path: loadedEnv });
}

// ─── 2. Process-level crash handlers (installed BEFORE any imports can throw) ─
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
console.log("[BOOT] Starting GrowFlow AI Server...");
console.log("[BOOT] Node:", process.version, "| CWD:", process.cwd());
console.log("[BOOT] PORT:", PORT, "| NODE_ENV:", process.env.NODE_ENV);
console.log("[BOOT] DATABASE_URL set:", !!process.env.DATABASE_URL);

// ─── 4. Dynamic-import the Express app AFTER env is ready ────────────────────
const { default: app } = await import("./app.js");
const { initSentry } = await import("./sentry.js");

initSentry();

// ─── 5. Create server with explicit http.createServer + 0.0.0.0 binding ─────
const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[BOOT] ✅ Server listening on 0.0.0.0:${PORT}`);
});

server.on("error", (err: any) => {
  console.error("[CRITICAL] Server failed to start:", err);
  process.exit(1);
});
