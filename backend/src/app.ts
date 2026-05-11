import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import { authSyncMiddleware } from "./middlewares/authSyncMiddleware";
import { enforceGenerationLimit } from "./middlewares/generationLimiter";
import { guardianMiddleware } from "./middlewares/guardian";
import router from "./routes";
import { logger } from "./lib/logger";
import { db, systemSettingsTable, securityLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { validateAIConfig } from "./services/ai-engine";

validateAIConfig();

import { isShuttingDown } from "./lib/state.js";

const app: Express = express();

// ─── 1. HEALTH CHECK — Must be the absolute first route (no middleware) ──────
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ─── 2. Standard middleware ──────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req: any) => req.url === "/api/health" },
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ─── 2.2 Graceful shutdown check ───────────────────────────────────────────
app.use((req, res, next) => {
  if (isShuttingDown && req.path.startsWith("/api/")) {
    res.status(503).json({ error: "Server is restarting, please retry in a moment" });
    return;
  }
  next();
});

// ─── 3. Clerk proxy (must be before express.json) ────────────────────────────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ─── 4. CORS ─────────────────────────────────────────────────────────────────
const defaultOrigins = ["https://growflowai.space", "https://www.growflowai.space"];
const allowedOrigins = [
  ...defaultOrigins,
  ...(process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean).map(o => o.trim())
];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // 1. Explicitly reject "null" origin (security risk from file:// or sandboxed iframes)
      if (origin === "null") {
        return callback(new Error(`Origin "null" not allowed by CORS`));
      }

      // 2. Allow requests with no origin (e.g. server-to-server, mobile apps, or curl)
      if (!origin) {
        return callback(null, true);
      }
      
      // 3. Check allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== "production" && (origin.startsWith("http://localhost:") || origin.endsWith(".vercel.app"))) {
        // Allow localhost and Vercel previews in non-production
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  }),
);

// ─── 5. Body parsing ────────────────────────────────────────────────────────
app.use(express.json({
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// ─── 6. Auth (with timeout protection) ──────────────────────────────────────
app.use(clerkMiddleware());
app.use(authSyncMiddleware);
app.use(guardianMiddleware);

// ─── 7. Security logging (Throttled to avoid DB saturation) ─────────
const securityLogThrottle = new Map<string, number>();

app.use((req: any, res, next) => {
  if (req.path.startsWith("/api/") && req.path !== "/api/health") {
    res.on("finish", async () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        const ip = req.ip || "unknown";
        const throttleKey = `${ip}:${res.statusCode}:${req.path}`;
        const now = Date.now();
        const lastLog = securityLogThrottle.get(throttleKey) || 0;
        
        // Log at most once every 5 minutes per IP/path combo for auth failures
        if (now - lastLog > 5 * 60 * 1000) {
          securityLogThrottle.set(throttleKey, now);
          try {
            await db.insert(securityLogsTable).values({
              id: crypto.randomUUID(),
              userId: (req as any).userId || "anonymous",
              eventType: "AUTH_FAILURE",
              ipAddress: ip,
              userAgent: req.get("User-Agent") || "unknown",
              metadata: { method: req.method, path: req.path, statusCode: res.statusCode }
            });
          } catch (err) {
            logger.error({ err, path: req.path }, "FAILED_TO_WRITE_SECURITY_LOG");
          }
        }
      } else if (res.statusCode >= 500) {
        // Log server errors to aggregator but NOT to DB
        logger.error({ 
          userId: (req as any).userId || "anonymous", 
          path: req.path, 
          method: req.method, 
          statusCode: res.statusCode 
        }, "SERVER_ERROR_DETECTED");
      }
    });
  }
  next();
});

// ─── 8. Maintenance mode (cached) ──────────────────────────────────────────
let maintenanceModeCache = { value: false, lastChecked: 0 };

app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    if (req.path.startsWith("/api/admin") || req.path === "/api/health") {
      return next(); 
    }
    
    const now = Date.now();
    if (now - maintenanceModeCache.lastChecked > 30000) {
      try {
        const [settings] = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, "global"));
        maintenanceModeCache = { value: !!settings?.maintenanceMode, lastChecked: now };
      } catch (err) {
        logger.error({ err }, "Maintenance mode DB check failed — preserving last known state");
        // Preserve last known state rather than assuming maintenance
        // This prevents a brief DB timeout from locking out all users
        maintenanceModeCache = { value: maintenanceModeCache.value, lastChecked: now - 25000 };
      }
    }

    if (maintenanceModeCache.value) {
      res.status(503).json({ 
        error: "Service Unavailable: Maintenance Mode",
        message: "We are currently performing scheduled maintenance. Please check back in a few minutes."
      });
      return;
    }
  }
  next();
});

// ─── 9. Rate limiting ──────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again." },
  skip: (req) => req.path.startsWith(CLERK_PROXY_PATH),
  validate: false,
});

app.use("/api", generalLimiter);

// ─── 10. API router ─────────────────────────────────────────────────────────
app.use("/api", router);

// ─── 11. Frontend serving (production only) ─────────────────────────────────
const isProd = process.env.NODE_ENV === "production" || 
               process.env.APP_STATUS === "PRODUCTION" || 
               process.env.APP_STATUS === "BETA" ||
               process.env.RAILWAY_ENVIRONMENT; // Include Railway auto-detect

if (isProd) {
  // ESM-safe path resolution
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // Structure: backend/dist/index.mjs -> ../../frontend/dist/public
  const frontendPath = path.resolve(currentDir, "../../frontend/dist/public");
  
  console.log(`[BOOT] Production mode: Serving frontend from ${frontendPath}`);
  
  // Static assets (hashed files) can be cached for a long time
  app.use(express.static(frontendPath, {
    maxAge: '1y',
    etag: true,
    immutable: true,
    index: false 
  }));
  
  // SPA catch-all
  app.get(/(.*)/, (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    
    // Ensure index.html is NEVER cached so users always get the latest version
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const indexPath = path.join(frontendPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`[ERROR] Failed to send index.html from ${indexPath}:`, err.message);
        res.status(200).send(`
          <html>
            <body style="background: #050111; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
              <div style="text-align: center; border: 1px solid #1e293b; padding: 40px; border-radius: 12px; background: #0a051d;">
                <h1 style="color: #00F2FF;">GrowFlow AI</h1>
                <p>API is healthy, but frontend assets are missing.</p>
                <p style="font-size: 12px; color: #475569;">Path: ${frontendPath}</p>
              </div>
            </body>
          </html>
        `);
      }
    });
  });
} else {
  console.log("[BOOT] Development mode: API only server. Start frontend separately.");
}

// ─── DEBUG ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.get("/api/debug-db", (req: any, res, next) => {
    if (!req.user?.isAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  }, async (req, res) => {
    try {
      const { db, usersTable } = await import("@workspace/db");
      const { sql } = await import("drizzle-orm");
      const countResult = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
      res.json({ success: true, count: countResult[0].count });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

// ─── 12. Error handler (RECOVERY MODE: Exposing errors) ──────────────────────
app.use((err: any, req: any, res: any, _next: any) => {
  const isDev = process.env.NODE_ENV === "development";
  const errorDetails = {
    error: "Internal Server Error",
    message: isDev ? (err.message || "Unknown error") : "Something went wrong. Please try again.",
    path: req.path,
    method: req.method,
    stack: isDev ? err.stack : undefined, // ONLY expose stack in dev
    timestamp: new Date().toISOString()
  };

  logger.error(errorDetails, "SYSTEMIC_FAILURE_DETECTED");
  console.error("[GLOBAL_ERROR_RECOVERY]", errorDetails);

  if (!res.headersSent) {
    res.status(500).json(errorDetails);
  }
});

export default app;
